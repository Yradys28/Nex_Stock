import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Inventario } from './components/Inventario';
import { Categorias } from './components/Categorias';
import { Caja } from './components/Caja';
import { Movimientos } from './components/Movimientos';
import { CreditsViews } from './components/CreditsViews';
import {
  initDatabase, getProductosDb, guardarProductoDb, actualizarProductoDb, eliminarProductoDb,
  guardarCreditoDb, getCreditosDb, getMovimientosDb,
  registrarAbonoDb, anularUltimoPagoDb,
  getCategoriasDb, sincronizarCategoriasDb, crearCategoriaDb, editarCategoriaDb, eliminarCategoriaDb,
  limpiarCreditosDb, limpiarMovimientosDb
} from './db';

export function App() {
  const [vistaActual, setVistaActual] = useState('dashboard');

  // Inicializamos en vacío, se llenarán con SQLite
  const [productos, setProductos] = useState([]);
  const [creditos, setCreditos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [categorias, setCategoriasEstado] = useState([]);

  // 1. Al arrancar la aplicación, inicializamos la BD y cargamos TODOS los datos
  useEffect(() => {
    async function iniciarSistema() {
      try {
        await initDatabase(); // Crea las tablas si no existen

        // Leemos TODO desde SQLite para que nada se pierda al cerrar la app
        const productosCargados = await getProductosDb();
        const creditosCargados = await getCreditosDb();
        const movimientosCargados = await getMovimientosDb();

        setProductos(productosCargados);
        setCreditos(creditosCargados);
        setMovimientos(movimientosCargados);

        // Categorías: unimos las guardadas en BD con las que ya usan los productos
        const categoriasGuardadas = await getCategoriasDb();
        const categoriasDeProductos = productosCargados.map(p => p.categoria).filter(Boolean);
        const union = [...new Set([...categoriasGuardadas, ...categoriasDeProductos])];
        setCategoriasEstado(union);
        await sincronizarCategoriasDb(union);
      } catch (error) {
        console.error("Error al inicializar la base de datos:", error);
      }
    }

    iniciarSistema();
  }, []);

  // Guardar producto nuevo o editado desde el inventario hacia SQLite
  const guardarProducto = async (producto, idEditando = null) => {
    try {
      if (idEditando !== null && idEditando !== undefined) {
        await actualizarProductoDb(idEditando, producto);
      } else {
        await guardarProductoDb(producto);
      }
      setProductos(await getProductosDb());
    } catch (error) {
      console.error("Error al guardar producto:", error);
      alert('No se pudo guardar el producto en la base de datos');
    }
  };

  // Eliminar producto del inventario en SQLite
  const eliminarProducto = async (id) => {
    try {
      await eliminarProductoDb(id);
      setProductos(await getProductosDb());
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      alert('No se pudo eliminar el producto');
    }
  };

  // Función para guardar un nuevo crédito (con su abono inicial, si lo hay)
  const guardarCredito = async (nuevoCredito) => {
    try {
      await guardarCreditoDb(nuevoCredito);
      const creditosActualizados = await getCreditosDb();
      setCreditos(creditosActualizados);
      // Si el crédito tiene abono inicial, guardarCreditoDb crea su movimiento de ingreso en caja
      setMovimientos(await getMovimientosDb());
    } catch (error) {
      console.error("Error al guardar crédito:", error);
      throw error; // Propagamos el error para que Caja.jsx avise al usuario
    }
  };

  // Función para manejar el cobro total / anulación de pago de un crédito
  const manejarCambioEstadoCredito = async (id) => {
    const creditoObjetivo = creditos.find(c => c.id === id);
    if (!creditoObjetivo) return;

    try {
      if (creditoObjetivo.estado === 'Pendiente') {
        // Cobro total: se registra un abono por TODO el restante y la cuenta queda "Pagada"
        const restante = Number(creditoObjetivo.restante) || 0;
        const confirmar = window.confirm(
          `¿Cobrar el restante de $${restante.toFixed(2)} de ${creditoObjetivo.nombre} ${creditoObjetivo.apellido} y marcar la cuenta como PAGADA?`
        );
        if (!confirmar) return;
        await registrarAbonoDb(id, restante, 'COBRO_TOTAL');
      } else {
        // Anular: se revierte el último pago (abono inicial, cuota o cobro total)
        const confirmar = window.confirm(
          '¿Anular el último pago de este crédito? El saldo volverá a quedar pendiente y se retirará el ingreso de caja.'
        );
        if (!confirmar) return;
        await anularUltimoPagoDb(id);
      }

      // Recargamos todo desde la BD para que todas las vistas queden sincronizadas
      setCreditos(await getCreditosDb());
      setMovimientos(await getMovimientosDb());
    } catch (error) {
      console.error("Error al actualizar el crédito:", error);
      alert('No se pudo actualizar el crédito');
    }
  };

  // Registrar un abono / cuota parcial a una cuenta por cobrar (desde CreditsViews)
  const registrarAbono = async (credito, monto) => {
    try {
      await registrarAbonoDb(credito.id, monto, 'CUOTA');
      setCreditos(await getCreditosDb());
      setMovimientos(await getMovimientosDb());
    } catch (error) {
      console.error("Error al registrar abono:", error);
      alert('No se pudo registrar el abono');
      throw error; // Propagamos para que CreditsViews avise al usuario
    }
  };

  // --- LIMPIEZA DE REPORTES (para reiniciar la app y entregarla "desde cero") ---

  // Vacía por completo el reporte de créditos: créditos, sus ítems, el
  // historial de abonos y los movimientos de caja que generaron
  const limpiarReporteCreditos = async () => {
    if (creditos.length === 0) {
      alert('El reporte de créditos ya está vacío');
      return;
    }
    const confirmar = window.confirm(
      `¿Eliminar TODOS los créditos del reporte (${creditos.length} en total)?\n\n` +
      'Se borrarán los créditos, sus productos, el historial de abonos y los movimientos de caja asociados.\n' +
      'El inventario y las categorías NO se ven afectados.\n\nEsta acción no se puede deshacer.'
    );
    if (!confirmar) return;
    try {
      await limpiarCreditosDb();
      setCreditos(await getCreditosDb());
      setMovimientos(await getMovimientosDb());
      alert('Reporte de créditos limpiado con éxito');
    } catch (error) {
      console.error("Error al limpiar el reporte de créditos:", error);
      alert('No se pudo limpiar el reporte de créditos');
    }
  };

  // Vacía por completo el historial de movimientos de la sección Movimientos
  const limpiarReporteMovimientos = async () => {
    if (movimientos.length === 0) {
      alert('El reporte de movimientos ya está vacío');
      return;
    }
    const confirmar = window.confirm(
      `¿Eliminar TODOS los movimientos del historial (${movimientos.length} en total)?\n\n` +
      'Se borrará el registro de ventas y abonos, y los totales de la sección volverán a cero.\n' +
      'El inventario y los créditos NO se ven afectados.\n\nEsta acción no se puede deshacer.'
    );
    if (!confirmar) return;
    try {
      await limpiarMovimientosDb();
      setMovimientos(await getMovimientosDb());
      alert('Reporte de movimientos limpiado con éxito');
    } catch (error) {
      console.error("Error al limpiar el reporte de movimientos:", error);
      alert('No se pudo limpiar el reporte de movimientos');
    }
  };

  // --- CRUD DE CATEGORÍAS (operaciones reales sobre SQLite) ---

  // Crear una categoría nueva desde la vista de Categorías
  const agregarCategoria = async (nombre) => {
    try {
      await crearCategoriaDb(nombre);
      setCategoriasEstado(await getCategoriasDb());
    } catch (error) {
      console.error("Error al crear categoría:", error);
      throw error; // Propagamos para que Categorias.jsx avise al usuario
    }
  };

  // Renombrar una categoría (también actualiza los productos que la usaban)
  const editarCategoria = async (nombreActual, nuevoNombre) => {
    try {
      await editarCategoriaDb(nombreActual, nuevoNombre);
      setCategoriasEstado(await getCategoriasDb());
      setProductos(await getProductosDb()); // los productos quedan con el nuevo nombre
    } catch (error) {
      console.error("Error al editar categoría:", error);
      throw error;
    }
  };

  // Eliminar una categoría (sus productos pasan a "General")
  const eliminarCategoria = async (nombre) => {
    try {
      await eliminarCategoriaDb(nombre);
      setCategoriasEstado(await getCategoriasDb());
      setProductos(await getProductosDb()); // productos reasignados a "General"
    } catch (error) {
      console.error("Error al eliminar categoría:", error);
      throw error;
    }
  };

  // Refrescar movimientos cuando Caja registra una venta en efectivo
  const refrescarMovimientos = async () => {
    setMovimientos(await getMovimientosDb());
  };

  // Función auxiliar para obtener una fecha en formato ISO local (YYYY-MM-DD)
  function fechaISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  const renderizarVista = () => {
    switch (vistaActual) {
      case 'dashboard':
        return <Dashboard productos={productos} movimientos={movimientos} />;
      case 'inventario':
        return <Inventario productos={productos} categorias={categorias} onGuardar={guardarProducto} onEliminar={eliminarProducto} />;
      case 'categorias':
        return <Categorias productos={productos} categorias={categorias} onAgregar={agregarCategoria} onEditar={editarCategoria} onEliminar={eliminarCategoria} />;
      case 'caja':
        return <Caja productos={productos} setProductos={setProductos} onGuardarCredito={guardarCredito} onVentaRegistrada={refrescarMovimientos} />;
      case 'creditos':
        return <CreditsViews creditos={creditos} onCambiarEstado={manejarCambioEstadoCredito} onRegistrarAbono={registrarAbono} onLimpiar={limpiarReporteCreditos} />;
      case 'movimientos':
        return <Movimientos movimientos={movimientos} onLimpiar={limpiarReporteMovimientos} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden font-sans">
      <Sidebar vistaActual={vistaActual} setVistaActual={setVistaActual} />
      <main className="flex-1 overflow-y-auto bg-gray-900">
        {renderizarVista()}
      </main>
    </div>
  );
}

export default App;