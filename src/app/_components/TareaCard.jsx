import {
  CheckCircle2,
  Circle,
  Calendar,
  User,
  Trash2,
  Users,
} from "lucide-react";

export default function TareaCard({
  tarea,
  nombresAsignados,
  esConjunta,
  onToggle,
  onDelete,
  onClick,
}) {
  const formatearFecha = (fechaString) => {
    if (!fechaString) return null;
    const fecha = new Date(fechaString);
    const opciones = {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    };
    return fecha.toLocaleDateString("es-MX", opciones);
  };

  const fechaFormateada = formatearFecha(tarea.fecha_limite);
  const estaCompletada = tarea.estado === "completada";

  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl flex flex-col transition-all duration-300 cursor-pointer group shadow-sm hover:shadow-xl overflow-hidden border ${
        estaCompletada
          ? "border-slate-200 opacity-80 bg-slate-50"
          : "border-blue-100 bg-white hover:-translate-y-1"
      }`}
    >
      {/* 🔵 CABECERA DE LA TARJETA (FONDO AZUL) */}
      <div
        className={`px-4 py-3.5 flex items-center justify-between gap-3 ${
          estaCompletada ? "bg-slate-400" : "bg-blue-700"
        }`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className={`transition-transform hover:scale-110 shrink-0 ${
              estaCompletada
                ? "text-white"
                : "text-blue-100 hover:text-emerald-300"
            }`}
          >
            {estaCompletada ? (
              <CheckCircle2 size={24} strokeWidth={2.5} />
            ) : (
              <Circle size={24} strokeWidth={2.5} />
            )}
          </button>

          <h4
            className={`font-black text-lg truncate ${estaCompletada ? "text-slate-100 line-through" : "text-white"}`}
            title={tarea.titulo}
          >
            {tarea.titulo}
          </h4>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {esConjunta && !estaCompletada && (
            <span className="bg-white/20 text-white text-[10px] font-black uppercase px-2 py-1 rounded-md flex items-center gap-1 backdrop-blur-sm border border-white/20">
              <Users size={12} /> Equipo
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${
              estaCompletada
                ? "hover:bg-red-500 hover:text-white text-slate-200"
                : "hover:bg-red-500 hover:text-white text-blue-200"
            }`}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* ⚪ CUERPO DE LA TARJETA (BLANCO) */}
      <div className="p-5 flex flex-col gap-4 flex-1">
        {tarea.descripcion ? (
          <p
            className={`text-sm leading-relaxed line-clamp-2 ${estaCompletada ? "text-slate-400" : "text-slate-600"}`}
          >
            {tarea.descripcion}
          </p>
        ) : (
          <p className="text-sm italic text-slate-300">
            Sin detalles adicionales.
          </p>
        )}

        {/* PIE DE LA TARJETA (FECHAS Y USUARIOS) */}
        <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col gap-3">
          {fechaFormateada && !estaCompletada && (
            <div className="text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 w-fit bg-blue-50 text-blue-700 border border-blue-100 capitalize">
              <Calendar size={14} strokeWidth={2.5} /> {fechaFormateada}
            </div>
          )}

          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <User
              size={14}
              className={
                estaCompletada
                  ? "text-slate-400"
                  : esConjunta
                    ? "text-purple-600"
                    : "text-blue-600"
              }
            />
            {estaCompletada ? "Hecho por:" : "Para:"}
            <span
              className={`px-2 py-1 rounded-md truncate max-w-[200px] ${estaCompletada ? "bg-slate-200 text-slate-500" : "text-slate-700 bg-slate-100"}`}
              title={nombresAsignados}
            >
              {nombresAsignados}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
