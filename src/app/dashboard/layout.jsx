"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  Boxes,
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Globe2,
  Home,
  LogOut,
  Mail,
  Menu,
  ReceiptText,
  Settings,
  Truck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/app/_lib/supabase/supabase";
import "@/app/globals.css";

const LINKS = [
  {
    name: "Inicio",
    href: "/dashboard",
    icon: Home,
    roles: ["admin", "editor", "empleado"],
  },
  {
    name: "Tareas",
    href: "/dashboard/tareas",
    icon: CheckSquare,
    roles: ["admin", "editor", "empleado"],
  },
  {
    name: "Inventario",
    href: "/dashboard/inventario",
    icon: Boxes,
    roles: ["admin", "empleado"],
  },
  {
    name: "Movimientos",
    href: "/dashboard/movimientos",
    icon: CalendarDays,
    roles: ["admin", "empleado"],
  },
  {
    name: "Facturas",
    href: "/dashboard/facturas",
    icon: FileText,
    roles: ["admin", "editor"],
  },
  {
    name: "Gastos",
    href: "/dashboard/gastos",
    icon: CircleDollarSign,
    roles: ["admin", "editor"],
  },
  {
    name: "Viajes",
    href: "/dashboard/viajes",
    icon: Truck,
    roles: ["admin", "empleado"],
  },
  {
    name: "Directorio de Clientes",
    href: "/dashboard/clientes",
    icon: UserRound,
    roles: ["admin", "editor"],
  },
  {
    name: "Correo",
    href: "/dashboard/correo",
    icon: Mail,
    roles: ["admin"],
  },
  {
    name: "Usuarios",
    href: "/dashboard/usuarios",
    icon: Users,
    roles: ["admin"],
  },
  {
    name: "Configuración",
    href: "/dashboard/configuracion",
    icon: Settings,
    roles: ["admin", "empleado"],
  },
];

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const [usuario, setUsuario] = useState(null);
  const [rol, setRol] = useState(null);
  const [cargando, setCargando] = useState(true);

  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const [sidebarContraido, setSidebarContraido] = useState(false);

  useEffect(() => {
    let componenteActivo = true;

    const verificarSesion = async () => {
      try {
        const {
          data: { session },
          error: errorSesion,
        } = await supabase.auth.getSession();

        if (errorSesion || !session) {
          await supabase.auth.signOut();

          if (componenteActivo) {
            router.replace("/");
          }

          return;
        }

        const { data: perfil, error: errorPerfil } = await supabase
          .from("perfiles")
          .select("id, nombre, rol")
          .eq("id", session.user.id)
          .single();

        if (errorPerfil) {
          throw errorPerfil;
        }

        if (componenteActivo) {
          setUsuario({
            id: session.user.id,
            email: session.user.email,
            nombre: perfil?.nombre ?? session.user.email,
          });

          setRol(perfil?.rol ?? "empleado");
        }
      } catch (error) {
        console.error("Error verificando la sesión:", error);

        await supabase.auth.signOut();

        if (componenteActivo) {
          router.replace("/");
        }
      } finally {
        if (componenteActivo) {
          setCargando(false);
        }
      }
    };

    void verificarSesion();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((evento, session) => {
      if (evento === "SIGNED_OUT" || !session) {
        router.replace("/");
      }
    });

    return () => {
      componenteActivo = false;
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    setMenuMovilAbierto(false);
  }, [pathname]);

  const linksPermitidos = useMemo(
    () =>
      LINKS.filter(
        (link) => rol && link.roles.includes(rol),
      ),
    [rol],
  );

  const tituloActual = useMemo(() => {
    const coincidenciaExacta = linksPermitidos.find(
      (link) => link.href === pathname,
    );

    if (coincidenciaExacta) {
      return coincidenciaExacta.name;
    }

    const coincidenciaParcial = linksPermitidos.find(
      (link) =>
        link.href !== "/dashboard" &&
        pathname.startsWith(link.href),
    );

    return coincidenciaParcial?.name ?? "Panel";
  }, [linksPermitidos, pathname]);

  const cerrarSesion = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      router.replace("/");
    }
  };

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-blue-700 border-t-transparent" />

          <p className="mt-4 text-sm font-black uppercase tracking-widest text-blue-950">
            Cargando interfaz
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-slate-100">
      {menuMovilAbierto && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMenuMovilAbierto(false)}
          className="fixed inset-0 z-40 bg-slate-950/65 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-blue-950 text-white shadow-2xl transition-all duration-300 lg:sticky lg:top-0 lg:h-screen ${
          menuMovilAbierto
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        } ${
          sidebarContraido
            ? "w-72 lg:w-24"
            : "w-72"
        }`}
      >
        <div
          className={`flex h-18 shrink-0 items-center border-b border-blue-800 px-5 ${
            sidebarContraido
              ? "justify-between lg:justify-center"
              : "justify-between"
          }`}
        >
          <div
            className={`min-w-0 ${
              sidebarContraido ? "lg:hidden" : ""
            }`}
          >
            <h2 className="text-2xl font-black tracking-[0.25em] text-white">
              MILAS
            </h2>

            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-blue-300">
              Panel administrativo
            </p>
          </div>

          {sidebarContraido && (
            <div className="hidden h-11 w-11 items-center justify-center rounded-xl bg-blue-700 text-xl font-black lg:flex">
              M
            </div>
          )}

          <button
            type="button"
            onClick={() => setMenuMovilAbierto(false)}
            className="rounded-xl bg-blue-900 p-2 text-blue-200 transition hover:bg-blue-800 hover:text-white lg:hidden"
          >
            <X size={21} />
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-5">
          {linksPermitidos.map((link) => {
            const Icono = link.icon;

            const activo =
              pathname === link.href ||
              (link.href !== "/dashboard" &&
                pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                title={
                  sidebarContraido
                    ? link.name
                    : undefined
                }
                className={`group flex items-center rounded-xl py-3 transition-all ${
                  sidebarContraido
                    ? "justify-center px-3"
                    : "gap-3 px-4"
                } ${
                  activo
                    ? "bg-blue-700 text-white shadow-lg shadow-blue-950/30"
                    : "text-blue-100 hover:bg-blue-900 hover:text-white"
                }`}
              >
                <Icono
                  size={20}
                  className="shrink-0"
                />

                <span
                  className={`truncate text-sm font-bold ${
                    sidebarContraido
                      ? "lg:hidden"
                      : ""
                  }`}
                >
                  {link.name}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 space-y-2 border-t border-blue-800 p-3">
          <Link
            href="https://www.milas.com.mx"
            target="_blank"
            rel="noreferrer"
            title={
              sidebarContraido
                ? "Ver sitio público"
                : undefined
            }
            className={`flex items-center rounded-xl py-3 text-blue-200 transition hover:bg-blue-900 hover:text-white ${
              sidebarContraido
                ? "justify-center px-3"
                : "gap-3 px-4"
            }`}
          >
            <Globe2 size={20} />

            <span
              className={`text-sm font-bold ${
                sidebarContraido
                  ? "lg:hidden"
                  : ""
              }`}
            >
              Ver sitio público
            </span>
          </Link>

          <button
            type="button"
            onClick={cerrarSesion}
            title={
              sidebarContraido
                ? "Cerrar sesión"
                : undefined
            }
            className={`flex w-full items-center rounded-xl py-3 text-red-200 transition hover:bg-red-500/20 hover:text-white ${
              sidebarContraido
                ? "justify-center px-3"
                : "gap-3 px-4"
            }`}
          >
            <LogOut size={20} />

            <span
              className={`text-sm font-bold ${
                sidebarContraido
                  ? "lg:hidden"
                  : ""
              }`}
            >
              Cerrar sesión
            </span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-18 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur md:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setMenuMovilAbierto(true)
              }
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 lg:hidden"
            >
              <Menu size={21} />
            </button>

            <button
              type="button"
              onClick={() =>
                setSidebarContraido(
                  (actual) => !actual,
                )
              }
              className="hidden rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 lg:block"
              title={
                sidebarContraido
                  ? "Expandir menú"
                  : "Contraer menú"
              }
            >
              {sidebarContraido ? (
                <ChevronRight size={20} />
              ) : (
                <ChevronLeft size={20} />
              )}
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-base font-black text-blue-950 md:text-lg">
                {tituloActual}
              </h1>

              <p className="hidden text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:block">
                MILAS Equipos Industriales
              </p>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="max-w-52 truncate text-sm font-bold text-slate-700">
                {usuario?.nombre ??
                  usuario?.email}
              </p>

              <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">
                {rol}
              </p>
            </div>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-black text-blue-700">
              {(usuario?.nombre ??
                usuario?.email ??
                "U")
                .charAt(0)
                .toUpperCase()}
            </div>

            <button
              type="button"
              onClick={cerrarSesion}
              className="hidden items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-red-700 transition hover:bg-red-100 md:flex"
            >
              <LogOut size={15} />
              Salir
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden bg-slate-100/80 p-4 md:p-7 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}