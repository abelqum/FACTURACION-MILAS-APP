"use client";

export default function FilterButton({
  title,
  filterConfig,
  activeFilters,
  setFilter,
}) {
  // ==========================================
  // LÓGICA DE COLORES: ¿Debería estar azul?
  // ==========================================
  let isActive = false;

  if (title === "Todos" || filterConfig.tipo === "all") {
    // 1. "Todos" SOLO se pinta de azul si TODOS los filtros están vacíos.
    // Si haces clic en cualquier marca/tipo, esto se vuelve falso y se despinta solo.
    isActive =
      activeFilters.brand === null &&
      activeFilters.cat === null &&
      activeFilters.tipo === null;
  } else if (filterConfig.brand) {
    // 2. Marcas: Solo me pinto de azul si la marca global activa es IGUAL a mi marca.
    // Si tocan otra marca, el papá cambia, y yo me despinto automáticamente.
    isActive = activeFilters.brand === filterConfig.brand;
  } else if (filterConfig.cat) {
    // 3. Categorías: Solo 1 activa, pero coexiste con marcas y tipos.
    isActive = activeFilters.cat === filterConfig.cat;
  } else if (filterConfig.tipo) {
    // 4. Tipos: Solo 1 activo, pero coexiste con marcas y categorías.
    isActive = activeFilters.tipo === filterConfig.tipo;
  }

  // ==========================================
  // LÓGICA DE CLICS: ¿Qué le digo al Papá?
  // ==========================================
  const handleClick = () => {
    if (title === "Todos" || filterConfig.tipo === "all") {
      // Si soy el botón "Todos", mando a borrar absolutamente todo.
      setFilter({ brand: null, cat: null, tipo: null });
      return;
    }

    setFilter((prev) => {
      // Copiamos cómo estaban los filtros antes del clic (para que coexistan)
      const newState = { ...prev };

      // Si soy un botón de marca:
      if (filterConfig.brand) {
        // REEMPLAZO la marca anterior con la mía (garantiza que solo haya 1).
        // PERO si ya era la mía, la pongo en null (para apagarla).
        newState.brand =
          prev.brand === filterConfig.brand ? null : filterConfig.brand;
      }

      // Si soy de categoría:
      if (filterConfig.cat) {
        newState.cat = prev.cat === filterConfig.cat ? null : filterConfig.cat;
      }

      // Si soy de tipo:
      if (filterConfig.tipo) {
        newState.tipo =
          prev.tipo === filterConfig.tipo ? null : filterConfig.tipo;
      }

      return newState; // Le pasamos el nuevo estado combinado al papá
    });
  };

  return (
    <button
      className={
        isActive
          ? "btn-filtro bg-slate-800 text-white px-6 py-2 rounded-full font-medium transition-all shadow-md hover:shadow-lg text-sm md:text-base"
          : "btn-filtro bg-white text-slate-600 border border-slate-200 px-6 py-2 rounded-full font-medium hover:border-yellow-500 hover:text-yellow-600 transition-all text-sm md:text-base"
      }
      onClick={handleClick}
    >
      {title}
    </button>
  );
}
