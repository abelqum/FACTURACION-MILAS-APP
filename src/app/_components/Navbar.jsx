"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_LINKS = [
  { link: "Inicio", url: "/" },
  { link: "Catálogo", url: "/catalogo" },
  { link: "Nosotros", url: "/nosotros" },
  { link: "Contacto", url: "/contacto" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-[#bec9c2]/10 h-16 flex items-center">
      <div className="w-full max-w-7xl mx-auto px-8 flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tighter text-[#131b2e]"
          >
            Woox
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex gap-6 text-sm tracking-tight">
            {NAV_LINKS.map((el) => {
              const isActive =
                el.url === "/"
                  ? pathname === "/"
                  : pathname.startsWith(el.url);
              return (
                <Link
                  key={el.url}
                  href={el.url}
                  className={
                    isActive
                      ? "text-[#004532] font-bold border-b-2 border-[#004532] transition-colors duration-200"
                      : "text-[#3f4944] hover:text-[#004532] transition-colors duration-200"
                  }
                >
                  {el.link}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Search bar - desktop */}
          <div className="hidden lg:flex items-center bg-[#f2f3ff] rounded-full px-4 py-1.5 gap-2 border border-[#bec9c2]/20">
            <span className="material-symbols-outlined text-sm text-[#3f4944]" style={{ fontSize: "18px" }}>
              search
            </span>
            <input
              className="bg-transparent border-none focus:ring-0 text-xs w-48 outline-none"
              placeholder="Buscar productos..."
              type="text"
            />
          </div>

          {/* WhatsApp button */}
          <button className="p-2 text-[#3f4944] hover:bg-[#f2f3ff] rounded-full transition-all">
            <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
              chat
            </span>
          </button>

          {/* Admin Login */}
          <Link
            href="/portal"
            className="hidden md:block text-xs font-bold uppercase tracking-widest text-[#004532] hover:underline"
          >
            Admin
          </Link>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-[#3f4944] hover:bg-[#f2f3ff] rounded-full transition-all"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
              {menuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="absolute top-16 left-0 w-full bg-white border-b border-[#bec9c2]/20 shadow-lg md:hidden">
          <div className="flex flex-col px-8 py-4 gap-4">
            {NAV_LINKS.map((el) => {
              const isActive =
                el.url === "/"
                  ? pathname === "/"
                  : pathname.startsWith(el.url);
              return (
                <Link
                  key={el.url}
                  href={el.url}
                  onClick={() => setMenuOpen(false)}
                  className={
                    isActive
                      ? "text-[#004532] font-bold text-sm"
                      : "text-[#3f4944] text-sm hover:text-[#004532]"
                  }
                >
                  {el.link}
                </Link>
              );
            })}
            <Link
              href="/portal"
              onClick={() => setMenuOpen(false)}
              className="text-xs font-bold uppercase tracking-widest text-[#004532] hover:underline"
            >
              Admin Login
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
