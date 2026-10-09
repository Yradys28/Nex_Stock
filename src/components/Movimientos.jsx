import { useState } from 'react';

export function Movimientos({ movimientos = [], onLimpiar }) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroTiempo, setFiltroTiempo] = useState('todo'); // 'hoy', 'semana', 'mes', 'todo'

  // Asegurar que movimientos sea un arreglo válido
  const listaMovimientos = Array.isArray(movimientos) ? movimientos : [];

  // Función auxiliar para simular o evaluar fechas (puedes ajustar según cómo guardes la fecha ej. 'YYYY-MM-DD' o timestamps)
  const filtrarPorTiempo = (mov) => {
    if (filtroTiempo === 'todo') return true;
    
    // Interpretamos 'YYYY-MM-DD' como fecha local para que los filtros
    // "Hoy", "Semana" y "Mes" coincidan con el día real del negocio
    let fechaMov;
    if (mov.fecha && /^\d{4}-\d{2}-\d{2}$/.test(mov.fecha)) {
      const [anio, mes, dia] = mov.fecha.split('-').map(Number);
      fechaMov = new Date(anio, mes - 1, dia);
    } else {
      fechaMov = new Date(mov.fecha || Date.now());
    }
    const hoy = new Date();

    if (filtroTiempo === 'hoy') {
      return fechaMov.toDateString() === hoy.toDateString();
    }
    if (filtroTiempo === 'semana') {
      const unaSemanaAntes = new Date();
      unaSemanaAntes.setDate(hoy.getDate() - 7);
      return fechaMov >= unaSemanaAntes;
    }
    if (filtroTiempo === 'mes') {
      return fechaMov.getMonth() === hoy.getMonth() && fechaMov.getFullYear() === hoy.getFullYear();
    }
    return true;
  };

  // Filtrar movimientos por texto y por tiempo seleccionado
  const movimientosFiltrados = listaMovimientos.filter(m => {
    const cumpleTexto = (
      (m.descripcion?.toLowerCase() || '').includes(busqueda.toLowerCase()) ||
      (m.tipo?.toLowerCase() || '').includes(busqueda.toLowerCase()) ||
      (m.fecha?.toLowerCase() || '').includes(busqueda.toLowerCase())
    );
    return cumpleTexto && filtrarPorTiempo(m);
  });

  // Calcular acumulados de dinero basados en el filtro actual
  const movimientosCalculo = listaMovimientos.filter(filtrarPorTiempo);

  const totalRecaudado = movimientosCalculo
    .filter(m => m.tipo === 'VENTA' && typeof m.monto === 'number')
    .reduce((acc, m) => acc + m.monto, 0);

  return (
    <div className="p-8 text-gray-100 max-w-7xl mx-auto">
      {/* Cabecera */}
      <div className="mb-8 border-b border-gray-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Historial de Movimientos</h1>
          <p className="text-gray-400 mt-1">Registro cronológico de ventas, entradas y salidas de mercancía.</p>
        </div>

        {/* Botones de Filtro por Tiempo */}
        <div className="flex bg-gray-900 border border-gray-800 p-1.5 rounded-xl gap-1">
          <button onClick={() => setFiltroTiempo('hoy')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${filtroTiempo === 'hoy' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>Hoy</button>
          <button onClick={() => setFiltroTiempo('semana')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${filtroTiempo === 'semana' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>Semana</button>
          <button onClick={() => setFiltroTiempo('mes')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${filtroTiempo === 'mes' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>Mes</button>
          <button onClick={() => setFiltroTiempo('todo')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${filtroTiempo === 'todo' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>Todo</button>
        </div>

        {/* Botón para vaciar todo el historial de movimientos (reinicio con el cliente) */}
        <button
          onClick={onLimpiar}
          disabled={listaMovimientos.length === 0}
          title="Elimina todos los movimientos del historial para empezar desde cero"
          className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer bg-red-950/60 hover:bg-red-900/60 border border-red-800/60 text-red-300 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          🗑️ Limpiar reporte
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 text-sm">🔍</span>
          <input type="text" placeholder="Buscar movimiento..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm shadow-inner" />
        </div>
      </div>

      {/* Tarjetas de Resumen Financiero Dinámicas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm font-medium">Total Recaudado ({filtroTiempo.toUpperCase()})</p>
            <h3 className="text-3xl font-bold text-green-400 mt-1">${totalRecaudado.toFixed(2)}</h3>
          </div>
          <div className="p-4 bg-green-950/40 border border-green-800/40 rounded-2xl text-2xl">💰</div>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm font-medium">Movimientos en el periodo</p>
            <h3 className="text-3xl font-bold text-blue-400 mt-1">{movimientosCalculo.length}</h3>
          </div>
          <div className="p-4 bg-blue-950/40 border border-blue-800/40 rounded-2xl text-2xl">📊</div>
        </div>
      </div>

      {/* Tabla de Movimientos */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-800/60 text-gray-400 text-xs uppercase tracking-wider border-b border-gray-800">
              <th className="py-4 px-6">Tipo</th>
              <th className="py-4 px-6">Descripción / Detalle</th>
              <th className="py-4 px-6 text-center">Fecha y Hora</th>
              <th className="py-4 px-6 text-right">Monto / Impacto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 text-base">
            {movimientosFiltrados.length > 0 ? (
              movimientosFiltrados.map((mov, index) => (
                <tr key={mov.id || index} className="hover:bg-gray-800/40 transition-colors">
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${
                      mov.tipo === 'VENTA' 
                        ? 'text-green-400 bg-green-950/50 border border-green-800/50' 
                        : 'text-blue-400 bg-blue-950/50 border border-blue-800/50'
                    }`}>
                      {mov.tipo || 'MOVIMIENTO'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-semibold text-white text-sm">{mov.descripcion}</div>
                  </td>
                  <td className="py-4 px-6 text-center text-sm text-gray-400">
                    {mov.fecha || 'Hoy'}
                  </td>
                  <td className="py-4 px-6 text-right font-bold text-white text-sm">
                    {mov.monto ? `$${mov.monto.toFixed(2)}` : '-'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center py-16 text-gray-500 text-base">
                  No hay movimientos registrados para este periodo.<br/>
                  <span className="text-xs text-gray-600">Prueba cambiando el filtro de tiempo arriba a la derecha.</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}