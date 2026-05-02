"use client";

export default function DashboardHome() {
  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col items-center justify-center text-center">
      <h2 className="text-3xl font-bold text-slate-800 mb-4">
        Bienvenido al Panel de Control
      </h2>
      <p className="text-slate-500 max-w-lg">
        Selecciona una opción en el menú lateral para gestionar tu catálogo de
        productos, revisar usuarios o ajustar la configuración de la plataforma.
      </p>
    </div>
  );
}
