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
  const [userRole, setUserRole] = useState(null); // 🟢 ESTADO PARA EL ROL

  // ESTADO DEL MENÚ LATERAL
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 1. Efecto exclusivo para la Autenticación
  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session) {
          if (error) await supabase.auth.signOut();
          router.push("/");
        } else {
          // 🟢 BUSCAMOS EL ROL DEL USUARIO EN LA TABLA PERFILES
          const { data: perfil } = await supabase
            .from("perfiles")
            .select("rol, nombre")
            .eq("id", session.user.id)
            .single();

          setUser({ ...session.user, nombre: perfil?.nombre });
          setUserRole(perfil?.rol || "empleado"); // Por defecto si no tiene, es empleado
        }
      } catch (err) {
        await supabase.auth.signOut();
        router.push("/");
      }
    };
    checkUser();
  }, [router]);

  // 2. Efecto exclusivo para el Menú Responsivo
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    const timer = setTimeout(() => {
      if (window.innerWidth >= 768) setIsSidebarOpen(true);
    }, 10);

    window.addEventListener("resize", checkScreenSize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", checkScreenSize);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // 🟢 RUTAS ACTUALIZADAS CON PROTECCIÓN
  const allLinks = [
    {
      name: "Inicio",
      href: "/dashboard",
      icon: "🏠",
      roles: ["admin", "editor", "empleado"],
    },
    {
      name: "Tareas",
      href: "/dashboard/tareas",
      icon: "✅",
      roles: ["admin", "editor", "empleado"],
    }, // 🟢 Nueva ruta
    {
      name: "Inventario",
      href: "/dashboard/inventario",
      icon: "📦",
      roles: ["admin", "empleado"],
    },
    {
      name: "Movimientos",
      href: "/dashboard/movimientos",
      icon: "📅",
      roles: ["admin", "empleado"],
    },
    {
      name: "Facturas",
      href: "/dashboard/facturas",
      icon: "📄",
      roles: ["admin", "editor"],
    },
     {
      name: "Viajes",
      href: "/dashboard/viajes",
      icon: "🚗",
      roles: ["admin", "empleado"],
    },
    {
      name: "Directorio de Clientes",
      href: "/dashboard/clientes",
      icon: "📇",
      roles: ["admin", "editor"],
    },

    {
      name: "Correo",
      href: "/dashboard/correo",
      icon: "✉️",
      roles: ["admin"],
    },
    {
      name: "Usuarios",
      href: "/dashboard/usuarios",
      icon: "👥",
      roles: ["admin"],
    },
    {
      name: "Configuración",
      href: "/dashboard/configuracion",
      icon: "⚙️",
      roles: ["admin", "empleado"],
    },
  ];

  // 🟢 Filtramos el menú para que solo se muestre lo que su rol permite
  const navLinks = allLinks.filter(
    (link) => userRole && link.roles.includes(userRole),
  );

  return (
    /* 🟢 CORRECCIÓN: Usamos un div contenedor en lugar de html/body para no romper Next.js */
    <div className="bg-slate-50 flex min-h-screen w-full">
      {!user ? (
        <div className="w-full flex-1 flex items-center justify-center bg-slate-50 text-blue-950 font-bold text-xl">
          Cargando interfaz...
        </div>
      ) : (
        <>
          {/* OVERLAY OSCURO PARA MÓVILES */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* SIDEBAR RESPONSIVO Y OCULTABLE */}
          <aside
            className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-blue-950
               text-white flex flex-col shadow-2xl  transition-all duration-300 ease-in-out ${
                 isSidebarOpen
                   ? "translate-x-0 md:ml-0"
                   : "-translate-x-full md:-ml-72"
               }`}
          >
            <div className="flex h-16 items-center justify-between px-6 border-b border-blue-800 bg-blue-950 shrink-0">
              <h2 className="text-2xl  text-center font-black tracking-widest text-white">
                MILAS
              </h2>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="md:hidden text-blue-300 hover:text-white bg-blue-800/50 hover:bg-blue-700 p-2 rounded-lg transition-colors"
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
                    onClick={() =>
                      window.innerWidth < 768 && setIsSidebarOpen(false)
                    }
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-blue-700 text-white shadow-md border border-blue-600/50"
                        : "text-blue-100 hover:bg-blue-800 hover:text-white"
                    }`}
                  >
                    <span className="text-xl">{link.icon}</span>
                    <span>{link.name}</span>
                  </Link>
                );
              })}

              <Link
                href="https://www.milas.com.mx"
                target="_blank"
                className="mt-auto flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-blue-200 hover:bg-blue-800 transition-all border border-blue-700/50"
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
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="text-slate-500 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-colors focus:outline-none"
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
                <h1 className="text-base md:text-lg font-bold text-blue-950 truncate">
                  {navLinks.find((l) => l.href === pathname)?.name || "Panel"}
                </h1>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="hidden md:inline text-sm font-medium text-slate-600">
                    {user?.nombre || user?.email}
                  </span>
                  {/* 🟢 Mostramos el rol debajo del nombre de usuario */}
                  <span className="hidden md:inline text-[10px] font-bold text-blue-700 uppercase tracking-widest">
                    {userRole}
                  </span>
                </div>
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
    </div>
  );
}
