export function Sidebar({ vistaActual, setVistaActual }) {
  const opciones = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'inventario', label: 'Inventario', icon: '📦' },
    { id: 'categorias', label: 'Categorías', icon: '🏷️' },
    { id: 'caja', label: 'Caja', icon: '💰' },
    { id: 'creditos', label: 'Créditos', icon: '📋' },
    { id: 'movimientos', label: 'Movimientos', icon: '🔄' },
  ];

  return (
    <aside className="w-64 bg-gray-900 text-gray-300 flex flex-col p-4 border-r border-gray-800">
      <div className="text-xl font-bold text-white mb-8 px-2 tracking-wide">
        Nex<span className="text-blue-500">Stock</span>
      </div>
      <nav className="space-y-2 flex-1">
        {opciones.map((op) => (
          <button
            key={op.id}
            onClick={() => setVistaActual(op.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              vistaActual === op.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'hover:bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <span>{op.icon}</span>
            {op.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}