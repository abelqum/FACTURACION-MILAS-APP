"use client";

import { BarChart3, FileText, PieChart, X } from "lucide-react";

const OPCIONES = [
  {
    id: "resumen",
    nombre: "Resumen financiero",
    descripcion: "Ingresos, gastos, utilidad y margen del periodo.",
    icono: FileText,
  },
  {
    id: "historica",
    nombre: "Evolución histórica anual",
    descripcion: "Comparación de todos los años registrados.",
    icono: BarChart3,
  },
  {
    id: "mensual",
    nombre: "Evolución mensual",
    descripcion: "Comparación de los doce meses del año seleccionado.",
    icono: BarChart3,
  },
  {
    id: "distribucion",
    nombre: "Distribución del periodo",
    descripcion: "Gráfica de ingresos, gastos y utilidad.",
    icono: PieChart,
  },
  {
    id: "categorias",
    nombre: "Categorías de gastos",
    descripcion: "Distribución de egresos por categoría.",
    icono: BarChart3,
  },
];

export default function ModalReporteDashboard({
  isOpen,
  onClose,
  opciones,
  setOpciones,
  generando,
  onGenerar,
}) {
  if (!isOpen) return null;

  const cambiarOpcion = (id) => {
    setOpciones((actual) => ({
      ...actual,
      [id]: !actual[id],
    }));
  };

  const ningunaSeleccionada = !Object.values(opciones).some(Boolean);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !generando) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-200 bg-slate-50 px-6 py-5">
          <div>
            <h2 className="text-xl font-black text-slate-800">
              Generar reporte del dashboard
            </h2>

            <p className="mt-1 text-xs font-semibold text-slate-500">
              Selecciona la información y las gráficas que aparecerán en el PDF.
            </p>
          </div>

          <button
            type="button"
            disabled={generando}
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={19} />
          </button>
        </header>

        <div className="space-y-3 p-6">
          {OPCIONES.map((opcion) => {
            const Icono = opcion.icono;
            const activa = opciones[opcion.id];

            return (
              <button
                key={opcion.id}
                type="button"
                disabled={generando}
                onClick={() => cambiarOpcion(opcion.id)}
                className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${
                  activa
                    ? "border-blue-300 bg-blue-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div
                  className={`rounded-xl p-3 ${
                    activa
                      ? "bg-blue-700 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Icono size={20} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-800">
                    {opcion.nombre}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {opcion.descripcion}
                  </p>
                </div>

                <div
                  className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                    activa ? "bg-blue-700" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                      activa ? "left-6" : "left-1"
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 p-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={generando}
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={generando || ningunaSeleccionada}
            onClick={onGenerar}
            className="rounded-xl bg-blue-700 px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generando ? "Generando PDF..." : "Generar reporte"}
          </button>
        </footer>
      </div>
    </div>
  );
}