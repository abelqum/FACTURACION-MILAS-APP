import "@/app/globals.css"; // <-- Vital para que cargue Tailwind

export const metadata = {
  title: "WOOX | Panel de administración WOOX",
  description: "Panel de administración WOOX",
};

export default function PortalLayout({ children }) {
  return (
    <html lang="es">
      <body className="antialiased ">{children}</body>
    </html>
  );
}
