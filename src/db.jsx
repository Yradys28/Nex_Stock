import Database from '@tauri-apps/plugin-sql';

// Variable global para mantener la conexión activa
let dbInstance = null;

// Función para obtener la conexión a la base de datos
export async function getDB() {
  if (!dbInstance) {
    // Esto crea o abre un archivo llamado 'nexstock.db' de forma segura
    dbInstance = await Database.load('sqlite:nexstock.db');
  }
  return dbInstance;
}

// Función para inicializar y crear todas las tablas necesarias al abrir la app
export async function initDatabase() {
  const db = await getDB();

  // 1. Tabla de Productos
  await db.execute(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      categoria TEXT NOT NULL,
      stock INTEGER NOT NULL,
      precio REAL NOT NULL
    );
  `);

  // 2. Tabla de Créditos (Cuentas por cobrar)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS creditos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      apellido TEXT NOT NULL,
      telefono TEXT NOT NULL,
      fecha TEXT NOT NULL,
      estado TEXT NOT NULL,
      total REAL NOT NULL,
      abono_inicial REAL NOT NULL DEFAULT 0,
      restante REAL NOT NULL DEFAULT 0
    );
  `);

  // Migración para bases creadas antes del control de abonos (silencioso si ya existen)
  try {
    await db.execute("ALTER TABLE creditos ADD COLUMN abono_inicial REAL NOT NULL DEFAULT 0");
  } catch (e) { /* la columna ya existe */ }
  try {
    await db.execute("ALTER TABLE creditos ADD COLUMN restante REAL NOT NULL DEFAULT 0");
  } catch (e) { /* la columna ya existe */ }
  // Créditos antiguos: el restante de un pendiente es el total; el de un pagado, 0
  await db.execute(
    "UPDATE creditos SET restante = CASE WHEN estado = 'Pagado' THEN 0 ELSE total END WHERE restante = 0 AND estado = 'Pendiente' AND total > 0"
  );

  // 3. Tabla de Ítems del Crédito
  await db.execute(`
    CREATE TABLE IF NOT EXISTS credito_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      credito_id INTEGER NOT NULL,
      nombre_producto TEXT NOT NULL,
      precio REAL NOT NULL,
      cantidad INTEGER NOT NULL,
      FOREIGN KEY(credito_id) REFERENCES creditos(id) ON DELETE CASCADE
    );
  `);

  // 4. Tabla de Movimientos
  await db.execute(`
    CREATE TABLE IF NOT EXISTS movimientos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      monto REAL NOT NULL,
      fecha TEXT NOT NULL
    );
  `);

  // 5. Tabla de Categorías
  await db.execute(`
    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE
    );
  `);

  // 5.1 Migración única de categorías (controlada por la tabla "ajustes"):
  //  - Elimina las categorías por defecto anteriores (Accesorios, Audio,
  //    Herramientas, Iluminación), reasignando sus productos a "General".
  //  - Crea las 3 categorías iniciales: Alimentos, Bebidas y General.
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS ajustes (
        clave TEXT PRIMARY KEY,
        valor TEXT NOT NULL
      );
    `);
    const marca = await db.select(
      "SELECT valor FROM ajustes WHERE clave = $1",
      ['categorias_iniciales_v1']
    );
    if (!marca || marca.length === 0) {
      const categoriasViejas = ['Accesorios', 'Audio', 'Herramientas', 'Iluminación'];
      await db.execute(
        "UPDATE productos SET categoria = 'General' WHERE categoria IN ($1, $2, $3, $4)",
        categoriasViejas
      );
      await db.execute(
        "DELETE FROM categorias WHERE nombre IN ($1, $2, $3, $4)",
        categoriasViejas
      );
      for (const nombre of ['Alimentos', 'Bebidas', 'General']) {
        await db.execute("INSERT OR IGNORE INTO categorias (nombre) VALUES ($1)", [nombre]);
      }
      await db.execute(
        "INSERT OR IGNORE INTO ajustes (clave, valor) VALUES ($1, $2)",
        ['categorias_iniciales_v1', '1']
      );
      console.log("Migración de categorías aplicada ✅");
    }
  } catch (e) {
    console.error("Error en la migración de categorías:", e);
  }

  // 6. Tabla de Abonos (historial de pagos de cada crédito: inicial, cuotas, cobro total)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS abonos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      credito_id INTEGER NOT NULL,
      monto REAL NOT NULL,
      fecha TEXT NOT NULL,
      tipo TEXT NOT NULL,
      movimiento_id INTEGER,
      FOREIGN KEY(credito_id) REFERENCES creditos(id) ON DELETE CASCADE
    );
  `);

  console.log("Base de datos inicializada correctamente 🚀");
}

// Obtener todos los productos de la base de datos
export async function getProductosDb() {
  const db = await getDB();
  const productos = await db.select("SELECT * FROM productos ORDER BY id DESC");
  return productos;
}

// Guardar un nuevo producto en la base de datos
export async function guardarProductoDb(producto) {
  const db = await getDB();
  await db.execute(
    "INSERT INTO productos (nombre, categoria, stock, precio) VALUES ($1, $2, $3, $4)",
    [producto.nombre, producto.categoria, producto.stock, producto.precio]
  );
}

// --- FUNCIONES DE CRÉDITOS ---
export async function getCreditosDb() {
  const db = await getDB();
  // Traemos todos los créditos (más recientes primero)
  const creditos = await db.select("SELECT * FROM creditos ORDER BY id DESC");
  // Adjuntamos los productos que llevó cada crédito (para el modal de detalle)
  for (const credito of creditos) {
    credito.items = await db.select(
      "SELECT nombre_producto AS nombre, precio, cantidad FROM credito_items WHERE credito_id = $1 ORDER BY id",
      [credito.id]
    );
  }
  return creditos;
}

export async function guardarCreditoDb(credito) {
  const db = await getDB();
  const total = Number(credito.total) || 0;
  const abonoInicial = Math.max(0, Number(credito.abono_inicial) || 0);
  const restante = Math.max(0, Math.round((total - abonoInicial) * 100) / 100);
  const estado = restante <= 0 ? 'Pagado' : 'Pendiente';
  // Guardamos el crédito principal y obtenemos su ID
  const resultado = await db.execute(
    "INSERT INTO creditos (nombre, apellido, telefono, fecha, estado, total, abono_inicial, restante) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    [credito.nombre, credito.apellido, credito.telefono, credito.fecha, estado, total, abonoInicial, restante]
  );
  const creditoId = resultado.lastInsertId;
  // Guardamos también los productos que llevó el cliente
  const items = Array.isArray(credito.items) ? credito.items : [];
  for (const item of items) {
    await db.execute(
      "INSERT INTO credito_items (credito_id, nombre_producto, precio, cantidad) VALUES ($1, $2, $3, $4)",
      [creditoId, item.nombre, item.precio, item.cantidad]
    );
  }
  // El abono inicial se cobra en el momento: se registra en el libro de abonos
  // y como movimiento de ingreso en caja/transacciones
  if (abonoInicial > 0) {
    const descripcion = `Abono inicial a crédito #${creditoId} - ${credito.nombre} ${credito.apellido}`;
    const mov = await db.execute(
      "INSERT INTO movimientos (tipo, descripcion, monto, fecha) VALUES ($1, $2, $3, $4)",
      ['VENTA', descripcion, abonoInicial, credito.fecha]
    );
    await db.execute(
      "INSERT INTO abonos (credito_id, monto, fecha, tipo, movimiento_id) VALUES ($1, $2, $3, $4, $5)",
      [creditoId, abonoInicial, credito.fecha, 'INICIAL', mov.lastInsertId]
    );
  }
  return creditoId;
}

export async function actualizarEstadoCreditoDb(id, nuevoEstado) {
  const db = await getDB();
  await db.execute(
    "UPDATE creditos SET estado = $1 WHERE id = $2",
    [nuevoEstado, id]
  );
}

// --- FUNCIONES DE MOVIMIENTOS ---
export async function getMovimientosDb() {
  const db = await getDB();
  return await db.select("SELECT * FROM movimientos ORDER BY id DESC");
}

export async function guardarMovimientoDb(movimiento) {
  const db = await getDB();
  await db.execute(
    "INSERT INTO movimientos (tipo, descripcion, monto, fecha) VALUES ($1, $2, $3, $4)",
    [movimiento.tipo, movimiento.descripcion, movimiento.monto, movimiento.fecha]
  );
}

export async function actualizarStockDb(id, nuevoStock) {
  const db = await getDB();
  await db.execute(
    "UPDATE productos SET stock = $1 WHERE id = $2",
    [nuevoStock, id]
  );
}

// Actualizar un producto completo (nombre, categoría, stock, precio)
export async function actualizarProductoDb(id, producto) {
  const db = await getDB();
  await db.execute(
    "UPDATE productos SET nombre = $1, categoria = $2, stock = $3, precio = $4 WHERE id = $5",
    [producto.nombre, producto.categoria, producto.stock, producto.precio, id]
  );
}

// Eliminar un producto del inventario
export async function eliminarProductoDb(id) {
  const db = await getDB();
  await db.execute("DELETE FROM productos WHERE id = $1", [id]);
}

// --- FUNCIONES DE CATEGORÍAS ---

// Listar todas las categorías guardadas (orden alfabético)
export async function getCategoriasDb() {
  const db = await getDB();
  const filas = await db.select("SELECT nombre FROM categorias ORDER BY nombre");
  return filas.map(f => f.nombre);
}

// Crear una categoría nueva (valida que no esté vacía ni duplicada)
export async function crearCategoriaDb(nombre) {
  const db = await getDB();
  const limpio = (nombre || '').trim();
  if (!limpio) throw new Error('El nombre de la categoría no puede estar vacío');
  const existentes = await db.select(
    "SELECT nombre FROM categorias WHERE LOWER(nombre) = LOWER($1)",
    [limpio]
  );
  if (existentes.length > 0) throw new Error(`La categoría "${limpio}" ya existe`);
  await db.execute("INSERT INTO categorias (nombre) VALUES ($1)", [limpio]);
  return limpio;
}

// Renombrar una categoría y actualizar todos los productos que la usaban
export async function editarCategoriaDb(nombreActual, nuevoNombre) {
  const db = await getDB();
  const viejo = (nombreActual || '').trim();
  const nuevo = (nuevoNombre || '').trim();
  if (!viejo) throw new Error('Categoría de origen inválida');
  if (!nuevo) throw new Error('El nombre de la categoría no puede estar vacío');
  if (viejo === nuevo) return nuevo;

  const soloCambioDeMayusculas = viejo.toLowerCase() === nuevo.toLowerCase();
  if (!soloCambioDeMayusculas) {
    const duplicada = await db.select(
      "SELECT nombre FROM categorias WHERE LOWER(nombre) = LOWER($1)",
      [nuevo]
    );
    if (duplicada.length > 0) throw new Error(`Ya existe una categoría llamada "${nuevo}"`);
  }

  await db.execute("UPDATE categorias SET nombre = $1 WHERE nombre = $2", [nuevo, viejo]);
  await db.execute("UPDATE productos SET categoria = $1 WHERE categoria = $2", [nuevo, viejo]);
  return nuevo;
}

// Eliminar una categoría; sus productos se reasignan a "General"
export async function eliminarCategoriaDb(nombre) {
  const db = await getDB();
  const cat = (nombre || '').trim();
  if (!cat) throw new Error('Categoría inválida');
  if (cat.toLowerCase() === 'general') {
    throw new Error('La categoría "General" es obligatoria y no se puede eliminar');
  }
  // Aseguramos que la categoría destino exista antes de reasignar
  await db.execute("INSERT OR IGNORE INTO categorias (nombre) VALUES ('General')");
  await db.execute("UPDATE productos SET categoria = 'General' WHERE categoria = $1", [cat]);
  await db.execute("DELETE FROM categorias WHERE nombre = $1", [cat]);
}

// Garantiza que cada nombre de la lista exista en la BD (sin borrar nada):
// se usa al arrancar para incorporar las categorías que ya usan los productos
export async function sincronizarCategoriasDb(lista) {
  const db = await getDB();
  const unicas = [...new Set((lista || []).map(c => (c || '').trim()).filter(Boolean))];
  for (const nombre of unicas) {
    await db.execute("INSERT OR IGNORE INTO categorias (nombre) VALUES ($1)", [nombre]);
  }
}

// Eliminar el movimiento de cobro de un crédito (al anular su pago)
export async function eliminarMovimientoPorDescripcionDb(descripcion) {
  const db = await getDB();
  await db.execute("DELETE FROM movimientos WHERE descripcion = $1", [descripcion]);
}

// Fecha local en formato YYYY-MM-DD
function fechaHoy() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// --- FUNCIONES DE ABONOS / CUOTAS DE CRÉDITOS ---

// Registra un pago parcial (cuota) o el cobro total de un crédito:
// descuenta del restante, cambia el estado a 'Pagado' si llega a 0
// y crea el movimiento de ingreso correspondiente en caja.
// tipo: 'CUOTA' | 'COBRO_TOTAL'
export async function registrarAbonoDb(creditoId, monto, tipo = 'CUOTA') {
  const db = await getDB();
  const montoLimpio = Math.round(Number(monto) * 100) / 100;
  if (!montoLimpio || montoLimpio <= 0) {
    throw new Error('Monto de abono inválido');
  }
  const creditos = await db.select("SELECT * FROM creditos WHERE id = $1", [creditoId]);
  const credito = creditos[0];
  if (!credito) throw new Error('Crédito no encontrado');

  const restanteActual = Number(credito.restante) || 0;
  const restante = Math.max(0, Math.round((restanteActual - montoLimpio) * 100) / 100);
  const estado = restante <= 0 ? 'Pagado' : 'Pendiente';
  const fecha = fechaHoy();
  const descripcion = tipo === 'COBRO_TOTAL'
    ? `Cobro de crédito #${creditoId} - ${credito.nombre} ${credito.apellido}`
    : `Abono a crédito #${creditoId} - ${credito.nombre} ${credito.apellido}`;

  const mov = await db.execute(
    "INSERT INTO movimientos (tipo, descripcion, monto, fecha) VALUES ($1, $2, $3, $4)",
    ['VENTA', descripcion, montoLimpio, fecha]
  );
  await db.execute(
    "INSERT INTO abonos (credito_id, monto, fecha, tipo, movimiento_id) VALUES ($1, $2, $3, $4, $5)",
    [creditoId, montoLimpio, fecha, tipo, mov.lastInsertId]
  );
  await db.execute(
    "UPDATE creditos SET restante = $1, estado = $2 WHERE id = $3",
    [restante, estado, creditoId]
  );
  return { restante, estado };
}

// Anula el último pago registrado de un crédito (inicial, cuota o cobro total):
// revierte el restante, elimina su movimiento de caja y borra el registro del libro.
export async function anularUltimoPagoDb(creditoId) {
  const db = await getDB();
  const creditos = await db.select("SELECT * FROM creditos WHERE id = $1", [creditoId]);
  const credito = creditos[0];
  if (!credito) throw new Error('Crédito no encontrado');
  if (credito.estado !== 'Pagado') {
    throw new Error('Solo se puede anular el pago de un crédito pagado');
  }

  const ultimos = await db.select(
    "SELECT * FROM abonos WHERE credito_id = $1 ORDER BY id DESC LIMIT 1",
    [creditoId]
  );
  const ultimo = ultimos[0];

  // Crédito antiguo sin libro de abonos: anula el cobro por descripción y restaura el total
  if (!ultimo) {
    const descripcionCobro = `Cobro de crédito #${creditoId} - ${credito.nombre} ${credito.apellido}`;
    await db.execute("DELETE FROM movimientos WHERE descripcion = $1", [descripcionCobro]);
    const restante = Number(credito.total) || 0;
    await db.execute(
      "UPDATE creditos SET restante = $1, estado = $2 WHERE id = $3",
      [restante, 'Pendiente', creditoId]
    );
    return { restante, estado: 'Pendiente' };
  }

  const restante = Math.min(
    Number(credito.total) || 0,
    Math.round(((Number(credito.restante) || 0) + Number(ultimo.monto)) * 100) / 100
  );
  const estado = restante <= 0 ? 'Pagado' : 'Pendiente';

  await db.execute(
    "UPDATE creditos SET restante = $1, estado = $2 WHERE id = $3",
    [restante, estado, creditoId]
  );
  if (ultimo.movimiento_id) {
    await db.execute("DELETE FROM movimientos WHERE id = $1", [ultimo.movimiento_id]);
  }
  await db.execute("DELETE FROM abonos WHERE id = $1", [ultimo.id]);
  return { restante, estado };
}

// --- FUNCIONES DE MANTENIMIENTO (LIMPIEZA DE REPORTES) ---

// Vacía por completo el reporte de créditos: borra los abonos, los ítems y
// los créditos, y retira de la caja los movimientos que generaron
// (abonos iniciales, cuotas y cobros) para no dejar registros huérfanos.
export async function limpiarCreditosDb() {
  const db = await getDB();
  await db.execute("DELETE FROM abonos");
  await db.execute("DELETE FROM credito_items");
  await db.execute("DELETE FROM creditos");
  await db.execute("DELETE FROM movimientos WHERE descripcion LIKE '%crédito #%'");
  // Reiniciamos los contadores para que los próximos créditos arranquen desde #1
  try {
    await db.execute("DELETE FROM sqlite_sequence WHERE name IN ('creditos', 'credito_items', 'abonos')");
  } catch (e) { /* la tabla de secuencias aún no existe */ }
}

// Vacía por completo el historial de movimientos (ingresos y egresos de caja).
export async function limpiarMovimientosDb() {
  const db = await getDB();
  await db.execute("DELETE FROM movimientos");
  // Reiniciamos el contador para que los movimientos nuevos arranquen desde #1
  try {
    await db.execute("DELETE FROM sqlite_sequence WHERE name = 'movimientos'");
  } catch (e) { /* la tabla de secuencias aún no existe */ }
}

