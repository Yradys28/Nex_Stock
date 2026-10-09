import { useState } from 'react';
import { actualizarStockDb, guardarMovimientoDb, getProductosDb, guardarCreditoDb } from '../db';

export function Caja({ productos = [], setProductos, onGuardarCredito, onVentaRegistrada }) {
  const [carrito, setCarrito] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarModalCredito, setMostrarModalCredito] = useState(false);
  const [nombreCliente, setNombreCliente] = useState('');
  const [apellidoCliente, setApellidoCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [abonoInicial, setAbonoInicial] = useState('');

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.categoria.toLowerCase().includes(busqueda.toLowerCase())
  );

  const agregarAlCarrito = (producto) => {
    if (producto.stock <= 0) { alert('Sin stock'); return; }
    const ex = carrito.find(i => i.id === producto.id);
    if (ex) {
      if (ex.cantidad >= producto.stock) { alert('Sin stock suficiente'); return; }
      setCarrito(carrito.map(i => i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i));
    } else {
      setCarrito([...carrito, { ...producto, cantidad: 1 }]);
    }
  };

  const cambiarCantidad = (id, cant) => {
    const cantNum = parseInt(cant, 10);
    const original = productos.find(p => p.id === id);
    if (isNaN(cantNum) || cantNum <= 0) { setCarrito(carrito.filter(i => i.id !== id)); return; }
    if (cantNum > original.stock) { alert('Stock insuficiente'); return; }
    setCarrito(carrito.map(i => i.id === id ? { ...i, cantidad: cantNum } : i));
  };

  const quitarDelCarrito = (id) => setCarrito(carrito.filter(i => i.id !== id));

  const totalVenta = carrito.reduce((a, i) => a + i.precio * i.cantidad, 0);

  // Abono inicial (lo que el cliente paga ahora) y restante por pagar del crédito
  const abonoRaw = parseFloat(abonoInicial) || 0;
  const abonoNum = Math.min(totalVenta, Math.max(0, abonoRaw));
  const restanteNum = Math.max(0, Math.round((totalVenta - abonoNum) * 100) / 100);

  function fechaISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  const procesarCobro = async () => {
    if (carrito.length === 0) return;
    if (!window.confirm(`Confirmar cobro por $${totalVenta.toFixed(2)}?`)) return;
    try {
      for (const item of carrito) {
        const nuevo = item.stock - item.cantidad;
        await actualizarStockDb(item.id, nuevo);
      }
      const movimiento = {
        tipo: 'VENTA',
        descripcion: `Venta en caja - ${carrito.length} producto(s)`,
        monto: totalVenta,
        fecha: fechaISO()
      };
      await guardarMovimientoDb(movimiento);
      // Refrescar la lista de movimientos en App.jsx (Dashboard / Historial)
      if (onVentaRegistrada) await onVentaRegistrada();
      const actualizados = await getProductosDb();
      setProductos(actualizados);
      setCarrito([]);
      alert('Venta registrada con éxito');
    } catch (e) {
      console.error(e);
      alert('Error al registrar la venta');
    }
  };

  const confirmarCredito = async (e) => {
    e.preventDefault();
    if (!nombreCliente.trim() || !apellidoCliente.trim() || !telefonoCliente.trim()) {
      alert('Complete los datos del cliente');
      return;
    }
    if (abonoRaw < 0 || abonoRaw > totalVenta) {
      alert('El abono inicial debe estar entre $0.00 y el total de la venta');
      return;
    }
    const nuevo = {
      nombre: nombreCliente.trim(),
      apellido: apellidoCliente.trim(),
      telefono: telefonoCliente.trim(),
      items: carrito.map(i => ({ nombre: i.nombre, precio: i.precio, cantidad: i.cantidad })),
      total: totalVenta,
      abono_inicial: abonoNum,
      restante: restanteNum,
      fecha: fechaISO(),
      estado: restanteNum > 0 ? 'Pendiente' : 'Pagado'
    };
    try {
      // 1. Descontar el stock de cada producto en SQLite (persistente)
      for (const item of carrito) {
        await actualizarStockDb(item.id, item.stock - item.cantidad);
      }
      // 2. Guardar el crédito con sus productos en SQLite y refrescar la lista en App
      if (onGuardarCredito) {
        await onGuardarCredito(nuevo);
      } else {
        await guardarCreditoDb(nuevo);
      }
      // 3. Recargar los productos desde la BD para reflejar el descuento real
      setProductos(await getProductosDb());
      setCarrito([]);
      setNombreCliente('');
      setApellidoCliente('');
      setTelefonoCliente('');
      setAbonoInicial('');
      setMostrarModalCredito(false);
      alert('Cuenta por cobrar registrada');
    } catch (err) {
      console.error(err);
      alert('No se pudo guardar el crédito');
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto text-slate-100">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
            Caja y Facturación
          </h1>
          <p className="text-sm text-slate-400">Selecciona productos para armar el ticket o procesar ventas directas.</p>
        </div>
        <div className="w-full md:w-80">
          <input
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            placeholder="Buscar por nombre o categoría..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      {/* Grid Principal: Izquierda Productos / Derecha Carrito POS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Catálogo de Productos */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col h-[70vh] shadow-lg">
          <h2 className="text-md font-semibold text-slate-300 mb-3 uppercase tracking-wider text-xs">Catálogo Disponible</h2>
          <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 text-xs uppercase tracking-wider sticky top-0 z-10">
                  <th className="p-3 rounded-l-lg">Producto</th>
                  <th className="p-3 text-center">Stock</th>
                  <th className="p-3 text-right">Precio</th>
                  <th className="p-3 text-center rounded-r-lg">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {productosFiltrados.length > 0 ? (
                  productosFiltrados.map(p => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-medium text-slate-200">{p.nombre}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.stock > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/25'}`}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="p-3 text-right font-semibold text-emerald-400">${p.precio.toFixed(2)}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => agregarAlCarrito(p)}
                          disabled={p.stock <= 0}
                          className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-40 disabled:hover:bg-blue-600 disabled:cursor-not-allowed shadow-sm"
                        >
                          Agregar
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center py-10 text-slate-500">No se encontraron productos disponibles.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sección Carrito / POS Ticket */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col h-[70vh] shadow-xl justify-between">
          <div>
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
              <h2 className="text-md font-semibold text-white flex items-center gap-2">
                🛒 Ticket Actual
              </h2>
              <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-md">
                {carrito.reduce((acc, item) => acc + item.cantidad, 0)} ítems
              </span>
            </div>

            {/* Items del Carrito */}
            <div className="overflow-y-auto max-h-[38vh] space-y-2.5 pr-1">
              {carrito.length > 0 ? (
                carrito.map(item => (
                  <div key={item.id} className="bg-slate-800/50 border border-slate-800 p-3 rounded-lg flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{item.nombre}</p>
                      <p className="text-xs text-emerald-400">${item.precio.toFixed(2)} c/u</p>
                    </div>
                    
                    {/* Controles de cantidad */}
                    <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg p-1">
                      <button 
                        onClick={() => cambiarCantidad(item.id, item.cantidad - 1)} 
                        disabled={item.cantidad <= 1}
                        className="w-6 h-6 flex items-center justify-center text-slate-300 hover:bg-slate-800 rounded disabled:opacity-30 transition text-xs font-bold"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold w-6 text-center text-white">{item.cantidad}</span>
                      <button 
                        onClick={() => cambiarCantidad(item.id, item.cantidad + 1)} 
                        disabled={item.cantidad >= item.stock}
                        className="w-6 h-6 flex items-center justify-center text-slate-300 hover:bg-slate-800 rounded disabled:opacity-30 transition text-xs font-bold"
                      >
                        +
                      </button>
                    </div>

                    <button 
                      onClick={() => quitarDelCarrito(item.id)}
                      className="text-rose-400 hover:text-rose-300 p-1 text-xs transition ml-1"
                      title="Quitar"
                    >
                      ✕
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 text-slate-500 border border-dashed border-slate-800 rounded-lg">
                  <p className="text-sm">El carrito está vacío</p>
                  <p className="text-xs text-slate-600 mt-1">Haz clic en "Agregar" en el catálogo.</p>
                </div>
              )}
            </div>
          </div>

          {/* Totales y Botones de Acción */}
          <div className="border-t border-slate-800 pt-4 mt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-slate-400">Total a Pagar:</span>
              <span className="text-2xl font-black text-emerald-400">${totalVenta.toFixed(2)}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={procesarCobro} 
                disabled={carrito.length === 0} 
                className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white py-2.5 px-4 rounded-xl text-xs font-semibold transition disabled:opacity-40 disabled:hover:bg-emerald-600 disabled:cursor-not-allowed shadow-md"
              >
                Cobrar y Registrar
              </button>
              <button 
                onClick={() => { setAbonoInicial(''); setMostrarModalCredito(true); }} 
                disabled={carrito.length === 0} 
                className="bg-amber-600 hover:bg-amber-500 active:scale-95 text-white py-2.5 px-4 rounded-xl text-xs font-semibold transition disabled:opacity-40 disabled:hover:bg-amber-600 disabled:cursor-not-allowed shadow-md"
              >
                Añadir a Crédito
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Crédito */}
      {mostrarModalCredito && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-lg font-bold mb-1 text-white">Registrar Cuenta por Cobrar</h2>
            <p className="text-xs text-slate-400 mb-5">Completa los datos del cliente para asociar el crédito.</p>
            
            <form onSubmit={confirmarCredito} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nombre</label>
                <input 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition" 
                  placeholder="Ej. Juan" 
                  value={nombreCliente} 
                  onChange={(e) => setNombreCliente(e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Apellido</label>
                <input 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition" 
                  placeholder="Ej. Pérez" 
                  value={apellidoCliente} 
                  onChange={(e) => setApellidoCliente(e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Teléfono</label>
                <input 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition" 
                  placeholder="Ej. 0414..." 
                  type="tel" 
                  value={telefonoCliente} 
                  onChange={(e) => setTelefonoCliente(e.target.value)} 
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Monto Inicial / Abono (opcional)</label>
                <input
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                  placeholder="Ej. 20.00 (lo que paga ahora)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={abonoInicial}
                  onChange={(e) => setAbonoInicial(e.target.value)}
                />
                <p className="text-[11px] text-slate-500 mt-1">Se registrará automáticamente como ingreso en caja.</p>
              </div>

              <div className="bg-slate-800/50 p-3 rounded-lg space-y-1.5 border border-slate-800">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Total Crédito:</span>
                  <span className="text-lg font-bold text-amber-400">${totalVenta.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Abono Inicial:</span>
                  <span className="text-sm font-semibold text-emerald-400">${abonoNum.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-700/60 pt-1.5">
                  <span className="text-xs text-slate-400">Restante por Pagar:</span>
                  <span className="text-sm font-bold text-white">${restanteNum.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => { setAbonoInicial(''); setMostrarModalCredito(false); }} 
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-2.5 rounded-xl text-xs font-semibold transition shadow-md"
                >
                  Guardar Crédito
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}