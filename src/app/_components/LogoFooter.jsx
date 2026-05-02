import Image from "next/image";
import Link from "next/link";
export default function LogoFooter() {
  return (
    <div className="flex items-center">
      <Link href="/">
        <Image
          src="/img/logo.webp"
          alt="MILAS Equipos Industriales"
          width={64}
          height={64}
          className="w-12 md:w-16 h-auto mb-4 object-contain brightness-0 invert opacity-50 hover:opacity-100 transition-opacity duration-300"
        />
      </Link>

      <p className="ml-4">© 2026 MILAS Equipos Industriales y Accesorios.</p>
    </div>
  );
}
