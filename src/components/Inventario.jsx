import { useState } from 'react';

export function Inventario({ productos = [], categorias = [], onGuardar, onEliminar }) {
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);

  // Estados para el formulario (Crear / Editar)
  const [idEditando, setIdEditando] = useState(null); // Si tiene valor, estamos editando
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaCategoria, setNuevaCategoria] = useState('General');
  const [nuevoStock, setNuevoStock] = useState('');
  const [nuevoPrecio, setNuevoPrecio] = useState('');

  // Opciones dinámicas para el selector de categorías (incluye la actual por si acaso)
  const opcionesCategorias = [...new Set([...categorias, nuevaCategoria])]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'es'));

  // Abrir modal para crear nuevo
  const abrirModalCrear = () => {
    setIdEditando(null);
    setNuevoNombre('');
    setNuevaCategoria('General');
    setNuevoStock('');
    setNuevoPrecio('');
    setModalAbierto(true);
  };

  // Abrir modal para editar un producto existente
  const abrirModalEditar = (producto) => {
    setIdEditando(producto.id);
    setNuevoNombre(producto.nombre);
    setNuevaCategoria(producto.categoria);
    setNuevoStock(producto.stock.toString());
    setNuevoPrecio(producto.precio.toString());
    setModalAbierto(true);
  };

  // Guardar (Crear o Actualizar) en SQLite a través de App.jsx
  const handleGuardarProducto = (e) => {
    e.preventDefault();
    if (!nuevoNombre || !nuevoStock || !nuevoPrecio) {
      alert('Por favor, completa el nombre, la cantidad y el precio.');
      return;
    }

    const producto = {
      nombre: nuevoNombre,
      categoria: nuevaCategoria,
      stock: parseInt(nuevoStock, 10) || 0,
      precio: parseFloat(nuevoPrecio) || 0.00,
    };

    if (onGuardar) {
      onGuardar(producto, idEditando);
    }

    setModalAbierto(false);
  };

  // Eliminar producto con confirmación sencilla (se elimina también de SQLite)
  const handleEliminarProducto = (id, nombre) => {
    if (window.confirm(`¿Estás seguro de eliminar "${nombre}" del inventario?`)) {
      if (onEliminar) {
        onEliminar(id);
      }
    }
  };

  // Filtrar productos
  const productosFiltrados = productos.filter(p => 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.categoria.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="p-6 max-w-[1600px] mx-auto text-slate-100">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span>
            Inventario de Productos
          </h1>
          <p className="text-sm text-slate-400">Visualiza lo que tienes en stock y administra tus artículos fácilmente.</p>
        </div>
        <button 
          onClick={abrirModalCrear}
          className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white px-4 py-3 rounded-xl font-medium transition shadow-md flex items-center gap-2 cursor-pointer text-[15px]"
        >
          <span>➕</span> Agregar Nuevo Producto
        </button>
      </div>

      {/* Barra de búsqueda y Controles */}
      <div className="mb-6">
        <div className="w-full md:w-80">
          <input 
            type="text" 
            placeholder="Buscar por nombre o categoría..." 
            value={busqueda} 
            onChange={(e) => setBusqueda(e.target.value)} 
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition shadow-inner" 
          />
        </div>
      </div>

      {/* Tabla de Inventario */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <th className="py-3 px-4">Nombre del Producto</th>
              <th className="py-3 px-4">Categoría</th>
              <th className="py-3 px-4 text-center">Cantidad en Stock</th>
              <th className="py-3 px-4 text-right">Precio ($)</th>
              <th className="py-3 px-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm">
            {productosFiltrados.length > 0 ? (
              productosFiltrados.map((producto) => (
                <tr key={producto.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-medium text-slate-200">{producto.nombre}</td>
                  <td className="py-3.5 px-4 text-slate-300">
                    <span className="bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-md text-xs">
                      {producto.categoria}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      producto.stock <= 5 
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/25 animate-pulse' 
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {producto.stock} un. {producto.stock <= 5 ? '⚠️ (Bajo)' : ''}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-emerald-400">
                    ${producto.precio.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex justify-center items-center gap-1.5">
                      <button 
                        onClick={() => abrirModalEditar(producto)} 
                        title="Modificar precio o datos" 
                        className="p-1.5 bg-slate-800 hover:bg-blue-600/30 text-slate-300 hover:text-blue-400 rounded-lg transition border border-slate-700 cursor-pointer"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleEliminarProducto(producto.id, producto.nombre)}
                        title="Eliminar producto"
                        className="p-1.5 bg-slate-800 hover:bg-rose-600/30 text-slate-300 hover:text-rose-400 rounded-lg transition border border-slate-700 cursor-pointer"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center py-12 text-slate-500">
                  No hay productos registrados todavía. ¡Haz clic en "Agregar Nuevo Producto" para empezar!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Formulario / Modal para Crear o Editar */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-5 border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white">
                {idEditando !== null ? 'Modificar Producto' : 'Nuevo Producto'}
              </h2>
              <button 
                onClick={() => setModalAbierto(false)} 
                className="text-slate-400 hover:text-white text-xl font-bold px-2 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleGuardarProducto} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nombre del producto *</label>
                <input 
                  type="text" 
                  placeholder="Ej. Bombillo LED" 
                  value={nuevoNombre} 
                  onChange={(e) => setNuevoNombre(e.target.value)} 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition" 
                  required 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Categoría</label>
                <select 
                  value={nuevaCategoria} 
                  onChange={(e) => setNuevaCategoria(e.target.value)} 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition"
                >
                  {opcionesCategorias.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Cantidad (Stock) *</label>
                  <input 
                    type="number" 
                    placeholder="Ej. 10" 
                    value={nuevoStock} 
                    onChange={(e) => setNuevoStock(e.target.value)} 
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Precio ($) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="Ej. 15.00" 
                    value={nuevoPrecio} 
                    onChange={(e) => setNuevoPrecio(e.target.value)} 
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition" 
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-800 mt-5">
                <button 
                  type="button" 
                  onClick={() => setModalAbierto(false)} 
                  className="flex-1 px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 text-xs font-semibold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition shadow-md cursor-pointer"
                >
                  {idEditando !== null ? 'Guardar Cambios' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}