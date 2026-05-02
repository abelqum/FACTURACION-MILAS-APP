import "@/app/globals.css"; // <-- Vital para que cargue Tailwind

export const metadata = {
  title:
    "MILAS Equipos Industriales y Accesorios | Panel de administración MILAS",
  description: "Panel de administración MILAS",
};

export default function PortalLayout({ children }) {
  return (
    <html lang="es">
      <body className="antialiased ">{children}</body>
    </html>
  );
}
