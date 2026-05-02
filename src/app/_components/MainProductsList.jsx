// BORRAMOS la importación de data.js
import ProductCard from "./ProductCard";
import { forwardRef } from "react";

// 1. Recibimos 'productos' como prop
const MainProductsList = forwardRef(({ productos }, ref) => {
  return (
    <div
      ref={ref}
      id="Principales"
      className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-8 scroll-smooth scrollbar-none relative"
    >
      {/* 2. Mapeamos directamente (ya vienen filtrados desde Supabase) */}
      {productos?.map((el) => (
        <ProductCard key={el.id} producto={el} />
      ))}
    </div>
  );
});

MainProductsList.displayName = "MainProductsList";

export default MainProductsList;
