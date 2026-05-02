"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/app/_lib/supabase/supabase";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import "@/app/globals.css";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);

  // ESTADO DEL MENÚ LATERAL
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 1. Efecto exclusivo para la Autenticación
  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: { session },
          error, // 🟢 Capturamos el error
        } = await supabase.auth.getSession();

        // 🟢 Si hay un error de token inválido, o no hay sesión, cerramos todo y lo mandamos al login
        if (error || !session) {
          if (error) await supabase.auth.signOut();
          router.push("/portal");
        } else {
          setUser(session.user);
        }
      } catch (err) {
        await supabase.auth.signOut();
        router.push("/portal");
      }
    };
    checkUser();
  }, [router]);

  // 2. Efecto exclusivo para el Menú Responsivo (Adiós al error)
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    // Usamos un pequeño delay (10ms) para dejar que React termine de renderizar primero
    const timer = setTimeout(() => {
      if (window.innerWidth >= 768) setIsSidebarOpen(true);
    }, 10);

    // Escuchamos si el usuario cambia el tamaño de su ventana en tiempo real
    window.addEventListener("resize", checkScreenSize);

    // Limpiamos los eventos al desmontar
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", checkScreenSize);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/portal");
  };

  const navLinks = [
    { name: "Inicio", href: "/dashboard", icon: "🏠" },
    { name: "Productos", href: "/dashboard/productos", icon: "🛍️" },
    { name: "Usuarios", href: "/dashboard/usuarios", icon: "👥" },
    { name: "Configuración", href: "/dashboard/configuracion", icon: "⚙️" },
  ];

  return (
    <html lang="es">
      <body className="bg-slate-50 flex min-h-screen">
        {!user ? (
          <div className="w-full flex-1 flex items-center justify-center bg-slate-50 text-emerald-900 font-bold text-xl">
            Cargando interfaz...
          </div>
        ) : (
          <>
            {/* 🟢 OVERLAY OSCURO PARA MÓVILES (Se cierra al hacer clic afuera) */}
            {isSidebarOpen && (
              <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
                onClick={() => setIsSidebarOpen(false)}
              />
            )}

            {/* 🟢 SIDEBAR RESPONSIVO Y OCULTABLE */}
            <aside
              className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-emerald-900 text-white flex flex-col shadow-2xl transition-all duration-300 ease-in-out ${
                isSidebarOpen
                  ? "translate-x-0 md:ml-0"
                  : "-translate-x-full md:-ml-72"
              }`}
            >
              <div className="flex h-16 items-center justify-between px-6 border-b border-emerald-800 bg-emerald-950">
                <h2 className="text-2xl font-black tracking-widest text-white">
                  WOOX
                </h2>
                {/* Botón de cerrar ("X") solo visible en celulares */}
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="md:hidden text-emerald-300 hover:text-white bg-emerald-800/50 hover:bg-emerald-700 p-2 rounded-lg transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <nav className="flex-1 py-6 px-4 flex flex-col gap-2 overflow-y-auto scrollbar-none">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      // En celulares, cerramos el menú automáticamente al tocar una opción
                      onClick={() =>
                        window.innerWidth < 768 && setIsSidebarOpen(false)
                      }
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
                        isActive
                          ? "bg-emerald-700 text-white shadow-md border border-emerald-600/50"
                          : "text-emerald-100 hover:bg-emerald-800 hover:text-white"
                      }`}
                    >
                      <span className="text-xl">{link.icon}</span>
                      <span>{link.name}</span>
                    </Link>
                  );
                })}

                <Link
                  href="/"
                  target="_blank"
                  className="mt-auto flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-emerald-200 hover:bg-emerald-800 transition-all border border-emerald-700/50"
                >
                  <span>🌐</span> Ver Sitio Público
                </Link>
              </nav>
            </aside>

            {/* CONTENEDOR PRINCIPAL */}
            <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
              {/* HEADER */}
              <header className="h-16 bg-white border-b flex items-center justify-between px-4 md:px-8 shadow-sm z-10 flex-shrink-0">
                <div className="flex items-center gap-4">
                  {/* 🟢 BOTÓN HAMBURGUESA PARA ABRIR/CERRAR MENÚ */}
                  <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 p-2 rounded-lg transition-colors focus:outline-none"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    </svg>
                  </button>
                  <h1 className="text-base md:text-lg font-bold text-emerald-900 truncate">
                    {navLinks.find((l) => l.href === pathname)?.name || "Panel"}
                  </h1>
                </div>

                <div className="flex items-center gap-4">
                  <span className="hidden md:inline text-sm font-medium text-slate-600">
                    {user?.nombre || user?.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-xs md:text-sm font-bold text-red-600 hover:text-red-800 transition-colors bg-red-50 px-4 py-2 rounded-lg"
                  >
                    Salir
                  </button>
                </div>
              </header>

              {/* ÁREA DE CONTENIDO DINÁMICO */}
              <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-100/50">
                {children}
              </main>
            </div>
          </>
        )}
      </body>
    </html>
  );
}
