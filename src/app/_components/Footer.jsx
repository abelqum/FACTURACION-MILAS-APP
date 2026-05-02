import Link from "next/link";
// 🟢 Agregamos el ícono de Phone de Lucide
import { Mail, MapPin, Phone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#131b2e] text-white pt-16 pb-8 px-6 border-t border-white/10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
        <div>
          <h2 className="text-2xl font-black tracking-widest mb-4">WOOX</h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            Especialistas en tecnología y electrónica. Encuentra accesorios
            móviles, cables, cargadores y equipo de audio de la más alta calidad
            para tu día a día.
          </p>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#8bd6b6] mb-4">
            Enlaces Rápidos
          </h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>
              <Link href="/" className="hover:text-white transition-colors">
                Inicio
              </Link>
            </li>
            <li>
              <Link
                href="/catalogo"
                className="hover:text-white transition-colors"
              >
                Catálogo Completo
              </Link>
            </li>
            <li>
              <Link
                href="/contacto"
                className="hover:text-white transition-colors"
              >
                Contacto
              </Link>
            </li>
            {/* 🟢 NUEVO ENLACE A GARANTÍA */}
            <li>
              <Link
                href="/garantia"
                className="hover:text-white transition-colors flex items-center gap-2"
              >
                Política de Garantía
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#8bd6b6] mb-4">
            Contacto
          </h3>
          <ul className="space-y-3 text-sm text-slate-300">
            <li>
              <a
                href="tel:+525554946246"
                className="flex items-center gap-3 hover:text-white transition-colors"
              >
                <Phone size={16} className="text-[#8bd6b6]" />
                +52 55 5494 6246
              </a>
            </li>
            <li>
              <a
                href="mailto:wooxmexico@gmail.com"
                className="flex items-center gap-3 hover:text-white transition-colors"
              >
                <Mail size={16} className="text-[#8bd6b6]" />
                wooxmexico@gmail.com
              </a>
            </li>
            <li>
              <a
                href="https://maps.app.goo.gl/5WSxmwEPAuHJWCDx6"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 hover:text-white transition-colors group"
              >
                <MapPin size={16} className="text-[#8bd6b6] shrink-0 mt-1" />
                <span className="leading-relaxed">
                  Eje Central Lázaro Cárdenas Puente Peredo s/n - Local C,
                  Colonia Centro, Centro, Cuauhtémoc 06000 Ciudad de México,
                  CDMX
                </span>
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto text-center border-t border-white/10 pt-8 text-xs text-slate-500 uppercase tracking-widest">
        © {new Date().getFullYear()} WOOX. Todos los derechos reservados.
      </div>
    </footer>
  );
}
