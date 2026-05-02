"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/_lib/supabase/supabase";
import ProductDetailModal from "./ProductDetailModal";
import { useCart } from "@/app/_context/CartContext";
// 🟢 Importamos los íconos de Lucide
import { Search, SearchX, ShoppingCart, Menu, X, Loader2 } from "lucide-react";

export default function Header() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  const { totalItems, setIsCartOpen } = useCart();

  const [sugerencias, setSugerencias] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const abortControllerRef = useRef(null);

  useEffect(() => {
    const term = searchTerm.trim();
    if (term.length === 0) {
      setSugerencias([]);
      setShowDropdown(false);
      setIsSearching(false);
      if (abortControllerRef.current) abortControllerRef.current.abort();
      return;
    }

    setIsSearching(true);
    setShowDropdown(true);

    const fetchData = async () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      try {
        const { data, error } = await supabase
          .from("productos")
          .select(
            "id, nombre, precio, imagen_url, categoria, descripcion, stock, marca",
          )
          .ilike("nombre", `%${term}%`)
          .limit(5)
          .abortSignal(abortControllerRef.current.signal);

        if (!error) setSugerencias(data || []);
      } catch (error) {
        if (error.name !== "AbortError")
          console.error("Error en la búsqueda:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(fetchData, 150);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/catalogo?q=${encodeURIComponent(searchTerm.trim())}`);
      setShowDropdown(false);
      setIsMobileMenuOpen(false);
    }
  };

  const abrirModalProducto = (producto) => {
    setShowDropdown(false);
    setProductoSeleccionado(producto);
    setIsModalOpen(true);
  };

  const NAV_LINKS = [
    { name: "Inicio", path: "/" },
    { name: "Catálogo", path: "/catalogo" },
    { name: "Contacto", path: "/contacto" },
  ];

  return (
    <>
      <header className="fixed top-0 w-full bg-white border-b border-[#bec9c2]/30 z-40 h-16 flex items-center shadow-sm">
        <div className="max-w-7xl mx-auto w-full px-6 flex justify-between items-center gap-4">
          {/* 🟢 LOGO MÁS GRANDE */}
          <Link
            href="/"
            className="flex items-center z-50 transition-transform hover:opacity-90 py-1"
            aria-label="Ir a Inicio"
          >
            <Image
              src="/img/logo-woox.webp"
              alt="WOOX Logo"
              width={180}
              height={60}
              className="h-10 sm:h-14 w-auto object-contain"
              priority
            />
          </Link>

          <div className="hidden md:flex items-center gap-8 flex-1 justify-end">
            <nav className="flex items-center gap-6 text-sm font-bold text-[#3f4944] uppercase tracking-wider">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.name}
                  href={link.path}
                  className="hover:text-[#004532] transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            <div className="relative w-full max-w-xs">
              <form onSubmit={handleSearchSubmit}>
                {/* 🟢 Ícono de Lupa (PC) */}
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bec9c2]"
                />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => {
                    if (searchTerm.trim().length >= 1) setShowDropdown(true);
                  }}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  className="w-full pl-10 pr-4 py-2 bg-[#f2f3ff] rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#004532] transition-all"
                />
              </form>

              {showDropdown && (
                <div className="absolute top-full mt-2 w-full bg-white border border-[#bec9c2]/30 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  {isSearching ? (
                    <div className="p-4 text-center flex flex-col items-center justify-center gap-2">
                      {/* 🟢 Loader de Lucide */}
                      <Loader2
                        size={20}
                        className="text-[#004532] animate-spin"
                      />
                      <span className="text-xs text-[#3f4944] font-bold uppercase tracking-widest">
                        Buscando...
                      </span>
                    </div>
                  ) : sugerencias.length > 0 ? (
                    <ul>
                      {sugerencias.map((prod) => (
                        <li key={prod.id}>
                          <button
                            onClick={() => abrirModalProducto(prod)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-[#e2e7ff] transition-colors text-left border-b border-[#bec9c2]/10 last:border-0 cursor-pointer group"
                          >
                            <img
                              src={
                                prod.imagen_url ||
                                "https://via.placeholder.com/50"
                              }
                              alt={prod.nombre}
                              className="w-10 h-10 rounded-md object-cover bg-slate-100 group-hover:scale-105 transition-transform"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-[#131b2e] truncate group-hover:text-[#004532] transition-colors">
                                {prod.nombre}
                              </p>
                              <p className="text-xs text-[#004532] font-black">
                                ${Number(prod.precio).toLocaleString()}
                              </p>
                            </div>
                          </button>
                        </li>
                      ))}
                      <li>
                        <button
                          onClick={handleSearchSubmit}
                          className="w-full p-3 text-xs font-bold text-center text-[#3f4944] hover:text-[#004532] hover:bg-[#e2e7ff] uppercase tracking-widest transition-colors cursor-pointer"
                        >
                          Ver todos los resultados →
                        </button>
                      </li>
                    </ul>
                  ) : (
                    <div className="p-6 text-center flex flex-col items-center">
                      {/* 🟢 Ícono de Sin Resultados */}
                      <SearchX size={32} className="text-[#bec9c2] mb-2" />
                      <p className="text-sm text-[#131b2e] font-bold">
                        No hay coincidencias
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 🟢 Ícono del Carrito (PC) */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-[#131b2e] hover:bg-[#f2f3ff] rounded-full transition-colors cursor-pointer"
            >
              <ShoppingCart size={24} />
              {totalItems > 0 && (
                <span className="absolute top-0 right-0 bg-[#004532] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                  {totalItems}
                </span>
              )}
            </button>
          </div>

          <div className="md:hidden flex items-center gap-1">
            {/* 🟢 Ícono del Carrito (Móvil) */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-[#131b2e] cursor-pointer z-50"
            >
              <ShoppingCart size={24} />
              {totalItems > 0 && (
                <span className="absolute top-0 right-0 bg-[#004532] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                  {totalItems}
                </span>
              )}
            </button>
            {/* 🟢 Ícono del Menú/Cerrar (Móvil) */}
            <button
              className="z-50 text-[#131b2e] p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>

        <div
          className={`fixed inset-0 bg-white z-30 pt-20 px-6 flex flex-col gap-6 md:hidden transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"}`}
        >
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            {/* 🟢 Ícono de Lupa (Buscador Móvil) */}
            <Search
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#bec9c2]"
            />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-[#f2f3ff] rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#004532] transition-all"
            />
          </form>
          <nav className="flex flex-col gap-4 mt-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.name}
                href={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-2xl font-black uppercase tracking-tight text-[#131b2e] border-b border-[#bec9c2]/20 pb-4"
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <ProductDetailModal
        producto={productoSeleccionado}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
