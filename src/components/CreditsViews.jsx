import { useState } from 'react';

export function CreditsViews({ creditos = [], onCambiarEstado, onRegistrarAbono, onLimpiar }) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos'); // 'todos', 'Pendiente', 'Pagado'
  const [creditoSeleccionado, setCreditoSeleccionado] = useState(null); // Para ver el modal de detalles
  const [creditoAbonar, setCreditoAbonar] = useState(null); // Crédito para registrar un abono/cuota
  const [montoAbono, setMontoAbono] = useState(''); // Monto del abono a registrar

  // Filtrar créditos por nombre, apellido y estado
  const creditosFiltrados = creditos.filter(c => {
    const cumpleBusqueda = 
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.apellido.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.telefono.includes(busqueda);
    
    if (filtroEstado === 'todos') return cumpleBusqueda;
    return cumpleBusqueda && c.estado === filtroEstado;
  });

  // Cambiar estado del crédito llamando a la función global del App.jsx
  const cambiarEstadoCredito = (id) => {
    if (onCambiarEstado) {
      onCambiarEstado(id);
    }
  };

  // Abrir el modal para registrar un abono / cuota parcial
  const abrirModalAbono = (credito) => {
    setCreditoAbonar(credito);
    setMontoAbono('');
  };

  // Validar y registrar el abono parcial vía App.jsx (persiste en SQLite)
  const confirmarAbono = async (e) => {
    e.preventDefault();
    if (!creditoAbonar || !onRegistrarAbono) return;

    const restante = Number(creditoAbonar.restante) || 0;
    const monto = parseFloat(montoAbono);

    if (isNaN(monto) || monto <= 0) {
      alert('Ingresa un monto válido mayor a 0');
      return;
    }
    if (monto > restante) {
      alert(`El abono no puede superar el restante de $${restante.toFixed(2)}`);
      return;
    }
    const confirmar = window.confirm(
      `¿Registrar abono de $${monto.toFixed(2)} al crédito de ${creditoAbonar.nombre} ${creditoAbonar.apellido}?`
    );
    if (!confirmar) return;

    try {
      await onRegistrarAbono(creditoAbonar, monto);
      setCreditoAbonar(null);
      setMontoAbono('');
      alert('Abono registrado con éxito');
    } catch (error) {
      console.error(error); // App.jsx ya muestra el alert de error
    }
  };

  // Calcular totales generales para métricas rápidas
  // "Por Cobrar" = suma de los saldos pendientes (restantes) de los créditos impagos
  const totalPendiente = creditos
    .filter(c => c.estado === 'Pendiente')
    .reduce((acc, c) => acc + (Number(c.restante) || 0), 0);

  // "Total Cobrado" = lo realmente cobrado en cada crédito (total - restante)
  const totalCobrado = creditos
    .reduce((acc, c) => acc + (c.total - (Number(c.restante) || 0)), 0);

  // Datos frescos del crédito abierto en el modal de detalle (siempre desde el estado actual)
  const creditoDetalle = creditoSeleccionado
    ? (creditos.find(c => c.id === creditoSeleccionado.id) || creditoSeleccionado)
    : null;
  const restanteDetalle = creditoDetalle ? (Number(creditoDetalle.restante) || 0) : 0;
  const abonoInicialDetalle = creditoDetalle ? (Number(creditoDetalle.abono_inicial) || 0) : 0;

  return (
    <div className="p-8 text-gray-100 max-w-7xl mx-auto relative">
      {/* Cabecera */}
      <div className="mb-8 border-b border-gray-800 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Cuentas por Cobrar (Créditos)</h1>
          <p className="text-gray-400 mt-1">Administra los fiados y saldos pendientes de tus clientes.</p>
        </div>

        {/* Tarjetas de Resumen Rápido */}
        <div className="flex gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-3 shadow-lg">
            <div className="text-xs text-gray-400 font-medium uppercase">Por Cobrar (Pendiente)</div>
            <div className="text-xl font-bold text-amber-400 mt-0.5">${totalPendiente.toFixed(2)}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-3 shadow-lg">
            <div className="text-xs text-gray-400 font-medium uppercase">Total Cobrado</div>
            <div className="text-xl font-bold text-green-400 mt-0.5">${totalCobrado.toFixed(2)}</div>
          </div>
        </div>

        {/* Botón para vaciar todo el reporte de créditos (reinicio con el cliente) */}
        <button
          onClick={onLimpiar}
          disabled={creditos.length === 0}
          title="Elimina todos los créditos del reporte para empezar desde cero"
          className="px-4 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer bg-red-950/60 hover:bg-red-900/60 border border-red-800/60 text-red-300 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          🗑️ Limpiar reporte
        </button>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-center">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 text-lg">🔍</span>
          <input
            type="text"
            placeholder="Buscar por cliente o teléfono..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-base shadow-inner"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={() => setFiltroEstado('todos')}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              filtroEstado === 'todos' ? 'bg-blue-600 text-white' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFiltroEstado('Pendiente')}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              filtroEstado === 'Pendiente' ? 'bg-amber-600 text-white' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setFiltroEstado('Pagado')}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              filtroEstado === 'Pagado' ? 'bg-green-600 text-white' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Pagados
          </button>
        </div>
      </div>

      {/* Tabla de Créditos */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-800/60 text-gray-400 text-xs uppercase tracking-wider border-b border-gray-800">
              <th className="py-4 px-6">Cliente</th>
              <th className="py-4 px-6">Teléfono</th>
              <th className="py-4 px-6">Fecha</th>
              <th className="py-4 px-6 text-center">Estado</th>
              <th className="py-4 px-6 text-right">Monto Total</th>
              <th className="py-4 px-6 text-right">Restante</th>
              <th className="py-4 px-6 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 text-base">
            {creditosFiltrados.length > 0 ? (
              creditosFiltrados.map((credito) => {
                const restanteCredito = Number(credito.restante) || 0;
                return (
                <tr key={credito.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="py-4 px-6 font-semibold text-white">
                    {credito.nombre} {credito.apellido}
                  </td>
                  <td className="py-4 px-6 text-gray-300 font-mono text-sm">
                    {credito.telefono}
                  </td>
                  <td className="py-4 px-6 text-gray-400 text-sm">
                    {credito.fecha}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      credito.estado === 'Pendiente' 
                        ? 'bg-amber-950/60 text-amber-400 border border-amber-800/50' 
                        : 'bg-green-950/60 text-green-400 border border-green-800/50'
                    }`}>
                      {credito.estado}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right font-bold text-white">
                    ${credito.total.toFixed(2)}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className={`font-bold ${restanteCredito > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                      ${restanteCredito.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center space-x-2">
                    <button
                      onClick={() => setCreditoSeleccionado(credito)}
                      className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                      title="Ver qué productos compró"
                    >
                      👁️ Detalle
                    </button>
                    <button
                      onClick={() => cambiarEstadoCredito(credito.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        credito.estado === 'Pendiente'
                          ? 'bg-green-600 hover:bg-green-500 text-white shadow-md shadow-green-900/30'
                          : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-900/30'
                      }`}
                    >
                      {credito.estado === 'Pendiente' ? '✅ Cobrar' : '↩️ Anular Pago'}
                    </button>
                    {credito.estado === 'Pendiente' && (
                      <button
                        onClick={() => abrirModalAbono(credito)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-md shadow-blue-900/30"
                        title="Registrar un pago parcial"
                      >
                        💰 Registrar Abono
                      </button>
                    )}
                  </td>
                </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className="text-center py-16 text-gray-500 text-base">
                  No se encontraron cuentas por cobrar registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para ver el Detalle de la Compra a Crédito */}
      {creditoSeleccionado && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-4 border-b border-gray-800 pb-3">
              <div>
                <h3 className="text-xl font-bold text-white">Detalle del Crédito</h3>
                <p className="text-gray-400 text-sm">
                  Cliente: <span className="text-white font-semibold">{creditoSeleccionado.nombre} {creditoSeleccionado.apellido}</span>
                </p>
              </div>
              <button
                onClick={() => setCreditoSeleccionado(null)}
                className="text-gray-400 hover:text-white p-1 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 space-y-1 text-sm text-gray-300 bg-gray-800/40 p-3 rounded-xl border border-gray-800">
              <div>📞 Teléfono: <span className="font-mono text-white">{creditoSeleccionado.telefono}</span></div>
              <div>📅 Fecha de registro: <span className="text-white">{creditoSeleccionado.fecha}</span></div>
              <div>📌 Estado actual: <span className={`font-bold ${creditoSeleccionado.estado === 'Pendiente' ? 'text-amber-400' : 'text-green-400'}`}>{creditoSeleccionado.estado}</span></div>
              <div>💵 Abono inicial: <span className="text-green-400 font-semibold">${abonoInicialDetalle.toFixed(2)}</span></div>
              <div>⚖️ Restante por pagar: <span className="text-amber-400 font-bold">${restanteDetalle.toFixed(2)}</span></div>
            </div>

            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Productos llevados:</h4>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 mb-6">
              {creditoSeleccionado.items.map((item, index) => (
                <div key={index} className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-3 flex justify-between items-center text-sm">
                  <div>
                    <div className="font-semibold text-white">{item.nombre}</div>
                    <div className="text-xs text-gray-400">${item.precio.toFixed(2)} c/u × {item.cantidad} un.</div>
                  </div>
                  <div className="font-bold text-white">
                    ${(item.precio * item.cantidad).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div className={`p-4 rounded-xl flex justify-between items-center mb-6 border ${restanteDetalle > 0 ? 'bg-amber-950/40 border-amber-800/50' : 'bg-green-950/40 border-green-800/50'}`}>
              <span className="text-gray-300 font-medium">Restante por Pagar:</span>
              <span className={`text-2xl font-bold ${restanteDetalle > 0 ? 'text-amber-400' : 'text-green-400'}`}>${restanteDetalle.toFixed(2)}</span>
            </div>

            <button
              onClick={() => setCreditoSeleccionado(null)}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2.5 rounded-xl transition-colors cursor-pointer text-sm"
            >
              Cerrar Detalle
            </button>
          </div>
        </div>
      )}

      {/* Modal para registrar un Abono / Cuota parcial */}
      {creditoAbonar && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-4 border-b border-gray-800 pb-3">
              <div>
                <h3 className="text-xl font-bold text-white">Registrar Abono / Cuota</h3>
                <p className="text-gray-400 text-sm">
                  Cliente: <span className="text-white font-semibold">{creditoAbonar.nombre} {creditoAbonar.apellido}</span>
                </p>
              </div>
              <button
                onClick={() => setCreditoAbonar(null)}
                className="text-gray-400 hover:text-white p-1 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 space-y-1 text-sm text-gray-300 bg-gray-800/40 p-3 rounded-xl border border-gray-800">
              <div>🧾 Total de la compra: <span className="text-white font-semibold">${creditoAbonar.total.toFixed(2)}</span></div>
              <div>💵 Ya pagado: <span className="text-green-400 font-semibold">${(creditoAbonar.total - (Number(creditoAbonar.restante) || 0)).toFixed(2)}</span></div>
              <div>⚖️ Restante por pagar: <span className="text-amber-400 font-bold">${(Number(creditoAbonar.restante) || 0).toFixed(2)}</span></div>
            </div>

            <form onSubmit={confirmarAbono} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Monto a abonar</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Ej. 25.00"
                  value={montoAbono}
                  onChange={(e) => setMontoAbono(e.target.value)}
                  autoFocus
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 text-sm shadow-inner"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setCreditoAbonar(null)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-md shadow-green-900/30"
                >
                  Registrar Abono
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}