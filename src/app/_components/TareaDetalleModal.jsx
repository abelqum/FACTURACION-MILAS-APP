import {
  X,
  Calendar,
  User,
  AlignLeft,
  Info,
  CheckCircle2,
  Clock,
  Users,
} from "lucide-react";

export default function TareaDetalleModal({
  isOpen,
  onClose,
  tarea,
  nombresAsignados,
}) {
  if (!isOpen || !tarea) return null;

  const formatearFecha = (fechaString) => {
    if (!fechaString) return "Sin fecha límite asignada";
    const fecha = new Date(fechaString);
    const opciones = {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    };
    return fecha.toLocaleDateString("es-MX", opciones);
  };

  const estaCompletada = tarea.estado === "completada";
  const esConjunta = tarea.asignados_ids?.length > 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 🔵 HEADER DEL MODAL (FONDO AZUL PREMIUM) */}
        <div
          className={`p-6 sm:p-8 shrink-0 relative overflow-hidden ${estaCompletada ? "bg-slate-700" : "bg-blue-700"}`}
        >
          {/* Ícono gigante de fondo */}
          <div className="absolute right-[-20px] top-[-20px] opacity-10">
            {estaCompletada ? <CheckCircle2 size={150} /> : null}
          </div>

          <div className="relative z-10 flex justify-between items-start">
            <div className="pr-6">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span
                  className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md shadow-sm ${estaCompletada ? "bg-emerald-400 text-slate-900" : "bg-blue-300 text-blue-900"}`}
                >
                  {estaCompletada ? "Tarea Completada" : "Tarea Pendiente"}
                </span>
                {esConjunta && (
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-white/20 text-white backdrop-blur-sm border border-white/20">
                    Asignación Conjunta
                  </span>
                )}
              </div>
              <h2
                className={`text-2xl font-black leading-tight ${estaCompletada ? "text-slate-300 line-through" : "text-white"}`}
              >
                {tarea.titulo}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white hover:bg-white/20 p-2 rounded-xl transition-colors shrink-0 backdrop-blur-sm"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* ⚪ CUERPO DEL MODAL */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh] bg-slate-50">
          {/* SECCIÓN: DESCRIPCIÓN */}
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                <AlignLeft size={16} />
              </div>{" "}
              Detalles Adicionales
            </h3>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 text-sm text-slate-600 whitespace-pre-wrap font-medium shadow-sm leading-relaxed">
              {tarea.descripcion ? (
                tarea.descripcion
              ) : (
                <span className="italic text-slate-400">
                  No se agregaron instrucciones adicionales a esta tarea.
                </span>
              )}
            </div>
          </div>

          {/* SECCIÓN: GRID DE INFORMACIÓN (CAJAS) */}
          <div className="grid grid-cols-1 gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            {/* FECHA */}
            <div className="flex items-center gap-4">
              <div
                className={`p-3 rounded-xl shrink-0 ${estaCompletada ? "bg-slate-100 text-slate-400" : "bg-orange-50 text-orange-600"}`}
              >
                <Clock size={24} strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                  Fecha de Entrega
                </h3>
                <p
                  className={`text-sm font-black capitalize ${estaCompletada ? "text-slate-400 line-through" : "text-slate-800"}`}
                >
                  {formatearFecha(tarea.fecha_limite)}
                </p>
              </div>
            </div>

            <div className="h-px bg-slate-100 w-full"></div>

            {/* ASIGNADOS */}
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                {esConjunta ? (
                  <Users size={24} strokeWidth={2} />
                ) : (
                  <User size={24} strokeWidth={2} />
                )}
              </div>
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                  Personal Involucrado
                </h3>
                <p className="text-sm font-black text-slate-800">
                  {nombresAsignados}
                </p>
              </div>
            </div>

            <div className="h-px bg-slate-100 w-full"></div>

            {/* CREADOR */}
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl shrink-0">
                <Info size={24} strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                  Asignada por
                </h3>
                <p className="text-sm font-black text-slate-800">
                  {tarea.creador?.nombre || "Administración MILAS"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ⚪ FOOTER DEL MODAL */}
        <div className="p-5 bg-white border-t border-slate-200 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-sm tracking-wide shadow-lg shadow-slate-200 transition-all active:scale-95"
          >
            Cerrar Detalles
          </button>
        </div>
      </div>
    </div>
  );
}
