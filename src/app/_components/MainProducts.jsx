"use client";
import Link from "next/link";
import MainProductsList from "./MainProductsList";
import { useRef } from "react";
import { ArrowRight, ArrowLeft } from "lucide-react";
// 🟢 Importamos ScrollReveal (al estar en la misma carpeta, usamos ./)
import ScrollReveal from "./ScrollReveal";

export default function MainProducts({ productosDestacados }) {
  const scrollRef = useRef(null);

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      // Ajustamos la cantidad de scroll para que avance una tarjeta a la vez aproximadamente
      const scrollAmount = direction === "right" ? 380 : -380;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <section className="px-8 py-24 bg-[#f8faf9] border-y border-[#bec9c2]/20 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* 🟢 CABECERA ARQUITECTÓNICA (Aparece hacia arriba) */}
        <ScrollReveal direction="up">
          <div className="text-center mb-10">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-[#131b2e] uppercase mb-4">
              Productos Destacados
            </h2>
            <div className="w-24 h-1 bg-[#004532] mx-auto mb-6"></div>
            <p className="text-[#3f4944] max-w-2xl mx-auto text-lg leading-relaxed">
              Lo más relevante de nuestro catálogo, seleccionado por calidad,
              rendimiento y preferencia de nuestros clientes.
            </p>
          </div>
        </ScrollReveal>

        {/* 🟢 CONTROLES DEL CARRUSEL (Aparecen desde la derecha con leve retraso) */}
        <ScrollReveal direction="left" delay={0.1}>
          <div className="flex justify-end gap-3 mb-6">
            <button
              onClick={() => handleScroll("left")}
              className="p-3 bg-white border border-[#bec9c2]/30 text-[#131b2e] hover:bg-[#131b2e] hover:text-white rounded-full transition-all duration-300 shadow-sm hover:shadow-md"
              aria-label="Deslizar a la izquierda"
            >
              <ArrowLeft size={20} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => handleScroll("right")}
              className="p-3 bg-white border border-[#bec9c2]/30 text-[#131b2e] hover:bg-[#131b2e] hover:text-white rounded-full transition-all duration-300 shadow-sm hover:shadow-md"
              aria-label="Deslizar a la derecha"
            >
              <ArrowRight size={20} strokeWidth={2.5} />
            </button>
          </div>
        </ScrollReveal>

        {/* 🟢 CONTENEDOR DEL SLIDER (Aparece hacia arriba después de los controles) */}
        <ScrollReveal direction="up" delay={0.2}>
          <div className="relative">
            <MainProductsList ref={scrollRef} productos={productosDestacados} />
          </div>
        </ScrollReveal>

        {/* 🟢 BOTÓN INFERIOR (Es lo último en aparecer) */}
        <ScrollReveal direction="up" delay={0.3}>
          <div className="text-center mt-12">
            <Link
              href="/catalogo"
              className="inline-flex items-center gap-2 border-2 border-[#004532] text-[#004532] px-10 py-4 font-bold text-xs tracking-widest uppercase hover:bg-[#004532] hover:text-white transition-all rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 bg-white"
            >
              Ver Catálogo Completo
              <ArrowRight size={16} />
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
