import { useState } from 'react';

export function Dashboard({ productos = [], movimientos = [] }) {
  // Blindaje de seguridad para las listas
  const listaProductos = Array.isArray(productos) ? productos : [];
  const listaMovimientos = Array.isArray(movimientos) ? movimientos : [];

  // Cálculos de métricas clave
  const totalProductos = listaProductos.length;
  const stockTotalUnidades = listaProductos.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);
  const valorInventarioTotal = listaProductos.reduce((acc, p) => acc + ((Number(p.stock) || 0) * (Number(p.precio) || 0)), 0);
  const productosBajoStock = listaProductos.filter(p => (Number(p.stock) || 0) <= 5);

  return (
    <div className="p-8 text-gray-100 max-w-7xl mx-auto space-y-8">
      {/* Cabecera de Bienvenida */}
      <div className="border-b border-gray-800 pb-6">
        <h1 className="text-3xl font-bold text-white tracking-tight">Panel Principal (Dashboard)</h1>
        <p className="text-gray-400 mt-1">Resumen general del estado de tu inventario y actividad reciente del negocio.</p>
      </div>

      {/* Tarjetas de Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Tarjeta 1: Total Productos */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400">Variedad de Productos</p>
            <h3 className="text-3xl font-bold text-white mt-1">{totalProductos}</h3>
            <span className="text-xs text-blue-400 mt-2 inline-block">Artículos registrados</span>
          </div>
          <div className="bg-blue-950/60 border border-blue-800/60 p-4 rounded-2xl text-2xl">📦</div>
        </div>

        {/* Tarjeta 2: Stock Total */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400">Unidades en Stock</p>
            <h3 className="text-3xl font-bold text-white mt-1">{stockTotalUnidades}</h3>
            <span className="text-xs text-green-400 mt-2 inline-block">Piezas físicas totales</span>
          </div>
          <div className="bg-green-950/60 border border-green-800/60 p-4 rounded-2xl text-2xl">📊</div>
        </div>

        {/* Tarjeta 3: Valor del Inventario */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400">Valor del Inventario</p>
            <h3 className="text-3xl font-bold text-white mt-1">${valorInventarioTotal.toFixed(2)}</h3>
            <span className="text-xs text-purple-400 mt-2 inline-block">Capital en mercancía</span>
          </div>
          <div className="bg-purple-950/60 border border-purple-800/60 p-4 rounded-2xl text-2xl">💰</div>
        </div>

        {/* Tarjeta 4: Alertas de Stock Bajo */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400">Alertas de Stock</p>
            <h3 className={`text-3xl font-bold mt-1 ${productosBajoStock.length > 0 ? 'text-red-400' : 'text-white'}`}>{productosBajoStock.length}</h3>
            <span className="text-xs text-red-400 mt-2 inline-block">Productos por agotarse</span>
          </div>
          <div className="bg-red-950/60 border border-red-800/60 p-4 rounded-2xl text-2xl">⚠️</div>
        </div>

      </div>

      {/* Sección Inferior: Productos con Stock Crítico y Actividad Reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Columna Izquierda: Alertas de stock crítico */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl flex flex-col">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><span>🚨</span> Productos con Stock Crítico (≤ 5 un.)</h2>
          
          <div className="flex-1 overflow-y-auto max-h-72">
            {productosBajoStock.length > 0 ? (
              <div className="space-y-3">
                {productosBajoStock.map((prod) => (
                  <div key={prod.id} className="bg-gray-800/50 border border-gray-700/60 rounded-xl p-3 flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-white text-sm">{prod.nombre}</div>
                      <span className="text-xs text-gray-400 bg-gray-900 px-2 py-0.5 rounded border border-gray-700">{prod.categoria}</span>
                    </div>
                    <span className="px-3 py-1 bg-red-950/60 border border-red-800/60 text-red-400 rounded-lg text-xs font-bold">
                      {prod.stock} disponibles
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-gray-500 text-sm">
                ¡Excelente! No hay productos con stock crítico en este momento.
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Últimos Movimientos */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl flex flex-col">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><span>🕒</span> Actividad Reciente</h2>
          
          <div className="flex-1 overflow-y-auto max-h-72">
            {listaMovimientos.length > 0 ? (
              <div className="space-y-3">
                {listaMovimientos.slice(0, 5).map((mov, idx) => (
                  <div key={mov.id || idx} className="bg-gray-800/50 border border-gray-700/60 rounded-xl p-3 flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-white text-sm">{mov.descripcion}</div>
                      <span className="text-xs text-gray-400">{mov.fecha || 'Hoy'}</span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${mov.tipo === 'VENTA' ? 'text-green-400 bg-green-950/50' : 'text-blue-400 bg-blue-950/50'}`}>
                      {mov.monto ? `$${mov.monto.toFixed(2)}` : mov.tipo}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-gray-500 text-sm">
                Aún no hay movimientos registrados. Las ventas aparecerán aquí.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}