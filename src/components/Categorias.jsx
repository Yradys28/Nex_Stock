import { useState } from 'react';

export function Categorias({ productos = [], categorias = [], onAgregar, onEditar, onEliminar }) {
  // Modo edición: nombre original que se está editando (null = creando)
  const [editando, setEditando] = useState(null);
  // Estado local para el input de nueva categoría
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  // Estado para la categoría seleccionada y ver sus productos
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);

  // Lista ordenada alfabéticamente para mostrar
  const categoriasOrdenadas = [...categorias].sort((a, b) => a.localeCompare(b, 'es'));

  // Enviar el formulario: crea una categoría nueva o guarda la edición en curso
  const guardarFormulario = async (e) => {
    e.preventDefault();
    const nombre = nuevaCategoria.trim();
    if (!nombre) return;

    if (editando === null) {
      // --- Crear ---
      if (categorias.some(c => c.toLowerCase() === nombre.toLowerCase())) {
        alert('Esta categoría ya existe.');
        return;
      }
      try {
        await onAgregar(nombre);
        setNuevaCategoria('');
      } catch (error) {
        alert(error.message || 'No se pudo crear la categoría');
      }
    } else {
      // --- Editar (renombrar) ---
      if (nombre.toLowerCase() !== editando.toLowerCase() &&
          categorias.some(c => c.toLowerCase() === nombre.toLowerCase())) {
        alert('Ya existe una categoría con ese nombre.');
        return;
      }
      try {
        await onEditar(editando, nombre);
        if (categoriaSeleccionada === editando) setCategoriaSeleccionada(nombre);
        cancelarEdicion();
      } catch (error) {
        alert(error.message || 'No se pudo editar la categoría');
      }
    }
  };

  // Poner una categoría en modo edición (carga su nombre en el formulario)
  const iniciarEdicion = (cat) => {
    setEditando(cat);
    setNuevaCategoria(cat);
  };

  // Salir del modo edición sin guardar
  const cancelarEdicion = () => {
    setEditando(null);
    setNuevaCategoria('');
  };

  // Eliminar categoría con confirmación previa (sus productos pasan a "General")
  const eliminarCategoria = async (catAEliminar) => {
    if (catAEliminar === 'General') {
      alert('La categoría "General" es obligatoria y no se puede eliminar.');
      return;
    }
    const enUso = productos.filter(p => p.categoria === catAEliminar).length;
    const mensaje = enUso > 0
      ? `¿Seguro que deseas eliminar la categoría "${catAEliminar}"?\n\n${enUso} producto(s) asociados pasarán a "General".`
      : `¿Seguro que deseas eliminar la categoría "${catAEliminar}"?`;
    if (!window.confirm(mensaje)) return;

    try {
      await onEliminar(catAEliminar);
      if (categoriaSeleccionada === catAEliminar) setCategoriaSeleccionada(null);
      if (editando === catAEliminar) cancelarEdicion();
    } catch (error) {
      alert(error.message || 'No se pudo eliminar la categoría');
    }
  };

  // Filtrar productos que pertenecen a la categoría seleccionada
  const productosDeLaCategoria = productos.filter(
    p => p.categoria === categoriaSeleccionada
  );

  return (
    <div className="p-8 text-gray-100 max-w-7xl mx-auto">
      {/* Cabecera */}
      <div className="mb-8 border-b border-gray-800 pb-6">
        <h1 className="text-3xl font-bold text-white tracking-tight">Gestión de Categorías</h1>
        <p className="text-gray-400 mt-1">Organiza las clasificaciones de tus productos y consulta qué mercancía pertenece a cada una.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Izquierda: Crear y Listar Categorías (Ocupa 1 o 2 espacios) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Formulario para agregar */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">{editando !== null ? `Editar: "${editando}"` : 'Nueva Categoría'}</h2>
            <form onSubmit={guardarFormulario} className="space-y-4">
              <input
                type="text"
                placeholder="Ej. Limpieza, Ferretería..."
                value={nuevaCategoria}
                onChange={(e) => setNuevaCategoria(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm shadow-inner"
              />
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors shadow-lg cursor-pointer text-sm"
              >
                {editando !== null ? '💾 Guardar Cambios' : '➕ Agregar Categoría'}
              </button>
              {editando !== null && (
                <button
                  type="button"
                  onClick={cancelarEdicion}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-3 rounded-xl transition-colors cursor-pointer text-sm border border-gray-700"
                >
                  ✖️ Cancelar
                </button>
              )}
            </form>
          </div>

          {/* Lista de Categorías */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">Categorías Existentes</h2>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {categorias.length > 0 ? (
                categoriasOrdenadas.map((cat) => {
                  // Contar cuántos productos hay en esta categoría
                  const cantidadProductos = productos.filter(p => p.categoria === cat).length;
                  const esSeleccionada = categoriaSeleccionada === cat;

                  return (
                    <div
                      key={cat}
                      onClick={() => setCategoriaSeleccionada(cat)}
                      className={`p-3 rounded-xl border flex justify-between items-center cursor-pointer transition-all ${
                        esSeleccionada 
                          ? 'bg-blue-950/40 border-blue-500 text-white shadow-md' 
                          : 'bg-gray-800/50 border-gray-700/60 text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-sm">{cat}</div>
                        <span className="text-xs text-gray-400">{cantidadProductos} productos</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-gray-900 px-2.5 py-1 rounded-lg text-gray-300 border border-gray-700">
                          Ver 👁️
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Evitar que se seleccione al hacer clic
                            iniciarEdicion(cat);
                          }}
                          className="text-gray-500 hover:text-blue-400 p-1 text-sm"
                          title="Editar nombre"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Evitar que se seleccione al hacer clic en eliminar
                            eliminarCategoria(cat);
                          }}
                          className="text-gray-500 hover:text-red-400 p-1 text-sm"
                          title="Eliminar categoría"
                        >
                          ❌
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No hay categorías creadas.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Detalle de productos de la categoría seleccionada (Ocupa 2 espacios) */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl flex flex-col">
          <div className="border-b border-gray-800 pb-4 mb-6">
            <h2 className="text-xl font-bold text-white">
              {categoriaSeleccionada ? `Productos en: "${categoriaSeleccionada}"` : 'Detalle de Categoría'}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {categoriaSeleccionada 
                ? `Mostrando toda la mercancía asociada a esta clasificación.` 
                : 'Selecciona una categoría a la izquierda para ver qué productos contiene.'}
            </p>
          </div>

          <div className="flex-1">
            {categoriaSeleccionada ? (
              productosDeLaCategoria.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-800/60 text-gray-400 text-xs uppercase tracking-wider border-b border-gray-800">
                        <th className="py-3 px-4">Producto</th>
                        <th className="py-3 px-4 text-center">Stock Disponible</th>
                        <th className="py-3 px-4 text-right">Precio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 text-sm">
                      {productosDeLaCategoria.map((prod) => (
                        <tr key={prod.id} className="hover:bg-gray-800/40 transition-colors">
                          <td className="py-3 px-4 font-semibold text-white">{prod.nombre}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                              prod.stock <= 5 ? 'text-red-400 bg-red-950/50' : 'text-green-400 bg-green-950/50'
                            }`}>
                              {prod.stock} un.
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-white">${prod.precio.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-20 text-gray-500 text-base">
                  No hay productos registrados bajo esta categoría actualmente.
                </div>
              )
            ) : (
              <div className="text-center py-32 text-gray-500 text-base">
                👈 Haz clic en cualquier categoría de la lista izquierda para explorar sus productos.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}