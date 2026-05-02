"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useRef, useState } from "react";
import { Search, X, Filter, ChevronDown, Loader2 } from "lucide-react";

export default function CatalogoLayout({
  categorias,
  marcas,
  subcategorias = [],
  children,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isPending, startTransition] = useTransition();
  const debounceTimer = useRef(null);

  const categoria = searchParams.get("categoria") || "Todos";
  const subcategoria = searchParams.get("subcategoria") || "";
  const marca = searchParams.get("marca") || "Todas";
  const query = searchParams.get("q") || "";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCablesMenu, setShowCablesMenu] = useState(true);

  const actualizarFiltros = (key, value) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value && value !== "Todos" && value !== "Todas") {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    if (key === "categoria") params.delete("subcategoria");
    params.delete("pagina");

    startTransition(() => {
      router.replace(`/catalogo?${params.toString()}`, {
        scroll: false,
      });
    });
  };

  const handleBusquedaLocal = (e) => {
    const val = e.target.value;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());

        if (val) {
          params.set("q", val);
        } else {
          params.delete("q");
        }

        params.delete("pagina");

        router.replace(`/catalogo?${params.toString()}`, {
          scroll: false,
        });
      });
    }, 600);
  };

  return (
    <div className="pt-16 flex min-h-screen bg-[#faf8ff] text-[#131b2e] w-full">
      <aside
        className={`fixed lg:sticky top-16 z-40 lg:z-auto w-72 h-[calc(100vh-4rem)] bg-[#f2f3ff] border-r border-[#bec9c2]/10 p-6 overflow-y-auto transition-transform duration-300 ${
          sidebarOpen
            ? "translate-x-0 shadow-2xl"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <button
          className="lg:hidden absolute top-4 right-4 text-[#131b2e] bg-white p-1.5 rounded-full shadow-sm"
          onClick={() => setSidebarOpen(false)}
        >
          <X size={20} />
        </button>

        {/* CATEGORÍAS */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase mb-4 text-[#3f4944] tracking-widest border-b border-[#bec9c2]/20 pb-2">
            Categorías
          </h3>

          <div className="space-y-1">
            <button
              onClick={() => {
                actualizarFiltros("categoria", "Todos");
                setSidebarOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                categoria === "Todos"
                  ? "bg-[#004532] text-white font-bold shadow-md"
                  : "text-[#3f4944] hover:bg-[#e2e7ff] hover:text-[#131b2e] font-medium"
              }`}
            >
              Todos
            </button>

            {categorias.map((cat) => {
              const isCables = cat.nombre.includes("Cables");

              return (
                <div key={cat.nombre} className="flex flex-col">
                  <button
                    onClick={() => {
                      if (isCables) {
                        setShowCablesMenu(!showCablesMenu);
                        if (categoria !== cat.nombre) {
                          actualizarFiltros("categoria", cat.nombre);
                        }
                      } else {
                        actualizarFiltros("categoria", cat.nombre);
                        setSidebarOpen(false);
                      }
                    }}
                    className={`flex items-center justify-between w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      categoria === cat.nombre && !subcategoria
                        ? "bg-[#004532] text-white font-bold shadow-md"
                        : "text-[#3f4944] hover:bg-[#e2e7ff] hover:text-[#131b2e] font-medium"
                    }`}
                  >
                    {cat.nombre}

                    {isCables && subcategorias.length > 0 && (
                      <ChevronDown
                        size={16}
                        className={`transition-transform duration-200 ${
                          showCablesMenu ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </button>

                  {isCables && showCablesMenu && subcategorias.length > 0 && (
                    <div className="ml-4 mt-1 mb-2 flex flex-col border-l-2 border-[#bec9c2]/30 pl-2 space-y-1">
                      {subcategorias.map((sub) => (
                        <button
                          key={sub}
                          onClick={() => {
                            const params = new URLSearchParams(
                              searchParams.toString(),
                            );

                            params.set("categoria", cat.nombre);
                            params.set("subcategoria", sub);
                            params.delete("pagina");

                            startTransition(() => {
                              router.replace(`/catalogo?${params.toString()}`, {
                                scroll: false,
                              });
                            });

                            setSidebarOpen(false);
                          }}
                          className={`text-left text-xs py-1.5 px-2 rounded transition-colors ${
                            subcategoria === sub
                              ? "text-[#004532] font-black bg-[#e6f4ed]"
                              : "text-[#3f4944] hover:text-[#131b2e] hover:bg-[#e2e7ff] font-medium"
                          }`}
                        >
                          • {sub}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* MARCAS */}
        <div>
          <h3 className="text-xs font-bold uppercase mb-4 text-[#3f4944] tracking-widest border-b border-[#bec9c2]/20 pb-2">
            Marcas
          </h3>

          <div className="flex flex-col gap-3">
            <label className="cursor-pointer flex items-center gap-3 text-sm font-medium">
              <input
                type="radio"
                checked={marca === "Todas"}
                onChange={() => actualizarFiltros("marca", "Todas")}
                className="w-4 h-4 accent-[#004532]"
              />
              Todas
            </label>

            {marcas.map((m) => (
              <label
                key={m.nombre}
                className="cursor-pointer flex items-center gap-3 text-sm font-medium"
              >
                <input
                  type="radio"
                  checked={marca === m.nombre}
                  onChange={() => actualizarFiltros("marca", m.nombre)}
                  className="w-4 h-4 accent-[#004532]"
                />
                {m.nombre}
              </label>
            ))}
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-[#131b2e]/60 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 p-6 md:p-10 w-full overflow-hidden">
        <div className="flex justify-between items-start mb-8">
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter flex flex-col">
            {categoria}
            {subcategoria && (
              <span className="text-lg text-[#004532] mt-1 tracking-widest">
                / {subcategoria}
              </span>
            )}
          </h1>

          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden flex items-center gap-2 border-2 border-[#131b2e] px-4 py-2 text-sm font-bold rounded-lg hover:bg-[#131b2e] hover:text-white mt-1 shrink-0"
          >
            <Filter size={16} /> Filtros
          </button>
        </div>

        {/* 🔍 BUSCADOR SIN useEffect */}
        <div className="relative mb-8 max-w-md">
          {isPending ? (
            <Loader2
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#004532] animate-spin"
              size={20}
            />
          ) : (
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
          )}

          <input
            key={query} // 🔥 reinicia cuando cambia la URL
            type="text"
            placeholder="Buscar en catálogo..."
            defaultValue={query}
            onChange={handleBusquedaLocal}
            className={`border-2 border-[#bec9c2]/30 p-3 pl-10 w-full rounded-lg focus:outline-none transition-colors ${
              isPending
                ? "bg-slate-50 focus:border-[#bec9c2]/50"
                : "focus:border-[#004532]"
            }`}
          />
        </div>

        <div
          className={`transition-opacity duration-300 ${
            isPending ? "opacity-50 pointer-events-none" : "opacity-100"
          }`}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
