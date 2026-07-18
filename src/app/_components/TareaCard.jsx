"use client";

import {
  Calendar,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Eye,
  MessageSquareWarning,
  Play,
  Send,
  User,
  Users,
} from "lucide-react";

const CONFIGURACION_ESTADOS = {
  pendiente: {
    nombre: "Por hacer",
    icono: Circle,
    clase: "bg-slate-100 text-slate-700",
  },
  en_progreso: {
    nombre: "En progreso",
    icono: Clock3,
    clase: "bg-blue-100 text-blue-700",
  },
  revision: {
    nombre: "En revisión",
    icono: Eye,
    clase: "bg-purple-100 text-purple-700",
  },
  completada: {
    nombre: "Completada",
    icono: CheckCircle2,
    clase: "bg-emerald-100 text-emerald-700",
  },
};

const CONFIGURACION_PRIORIDADES = {
  urgente_importante: {
    nombre: "Urgente e importante",
    punto: "bg-red-500",
    etiqueta: "bg-red-50 text-red-700 border-red-200",
  },
  importante_no_urgente: {
    nombre: "Importante no urgente",
    punto: "bg-orange-400",
    etiqueta: "bg-orange-50 text-orange-700 border-orange-200",
  },
  urgente_no_importante: {
    nombre: "Urgente no importante",
    punto: "bg-blue-400",
    etiqueta: "bg-blue-50 text-blue-700 border-blue-200",
  },
  no_urgente_no_importante: {
    nombre: "No urgente no importante",
    punto: "bg-green-500",
    etiqueta: "bg-green-50 text-green-700 border-green-200",
  },
};

const formatearFecha = (fechaString) => {
  if (!fechaString) return "Sin fecha";

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(fechaString));
};

export default function TareaCard({
  tarea,
  nombresAsignados,
  miUsuario,
  variante = "normal",
  procesando = false,
  onClick,
  onCambiarEstado,
}) {
  const estado =
    CONFIGURACION_ESTADOS[tarea.estado] ??
    CONFIGURACION_ESTADOS.pendiente;

  const prioridad =
    CONFIGURACION_PRIORIDADES[tarea.prioridad] ??
    CONFIGURACION_PRIORIDADES.importante_no_urgente;

  const EstadoIcono = estado.icono;

  const esCreador = tarea.creado_por === miUsuario?.id;
  const estaAsignado = tarea.asignados_ids?.includes(miUsuario?.id);
  const esAdministrador = miUsuario?.rol === "admin";

  const puedeIniciar =
    tarea.estado === "pendiente" &&
    (estaAsignado || esCreador || esAdministrador);

  const puedeEnviarRevision =
    tarea.estado === "en_progreso" &&
    (estaAsignado || esCreador || esAdministrador);

  const puedeRevisar =
    tarea.estado === "revision" && (esCreador || esAdministrador);

  const ejecutarAccion = (event, nuevoEstado) => {
    event.stopPropagation();
    onCambiarEstado?.(nuevoEstado);
  };

  const esMatriz = variante === "matriz";

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          onClick?.();
        }
      }}
      className={`group cursor-pointer rounded-xl border border-slate-200 bg-white transition-all hover:border-blue-300 hover:shadow-md ${
        esMatriz ? "p-3" : "p-5"
      } ${
        tarea.estado === "completada"
          ? "opacity-80"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <span
              className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${prioridad.punto}`}
            />

            <h3
              className={`font-black leading-snug text-slate-800 ${
                esMatriz ? "text-xs" : "text-base"
              } ${
                tarea.estado === "completada"
                  ? "line-through text-slate-500"
                  : ""
              }`}
            >
              {tarea.titulo}
            </h3>
          </div>

          {!esMatriz && tarea.descripcion && (
            <p className="mt-3 line-clamp-2 text-sm font-medium leading-relaxed text-slate-500">
              {tarea.descripcion}
            </p>
          )}
        </div>

        {!esMatriz && (
          <span
            className={`flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black ${estado.clase}`}
          >
            <EstadoIcono size={12} />

            {estado.nombre}
          </span>
        )}
      </div>

      {tarea.retroalimentacion &&
        tarea.estado !== "completada" && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
            <MessageSquareWarning
              size={14}
              className="mt-0.5 shrink-0 text-amber-600"
            />

            <p className="line-clamp-2 text-[11px] font-semibold leading-relaxed text-amber-800">
              {tarea.retroalimentacion}
            </p>
          </div>
        )}

      <div
        className={`mt-3 space-y-2 ${
          !esMatriz ? "border-t border-slate-100 pt-3" : ""
        }`}
      >
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
          <Calendar size={13} className="shrink-0" />

          <span className="truncate">
            {formatearFecha(tarea.fecha_limite)}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
          {tarea.asignados_ids?.length > 1 ? (
            <Users size={13} className="shrink-0" />
          ) : (
            <User size={13} className="shrink-0" />
          )}

          <span className="truncate">{nombresAsignados}</span>
        </div>

        {!esMatriz && (
          <span
            className={`inline-flex rounded-lg border px-2 py-1 text-[9px] font-black uppercase tracking-wide ${prioridad.etiqueta}`}
          >
            {prioridad.nombre}
          </span>
        )}
      </div>

      {(puedeIniciar ||
        puedeEnviarRevision ||
        puedeRevisar) && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          {puedeIniciar && (
            <button
              type="button"
              disabled={procesando}
              onClick={(event) =>
                ejecutarAccion(event, "en_progreso")
              }
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play size={13} />

              {procesando ? "Procesando..." : "Iniciar"}
            </button>
          )}

          {puedeEnviarRevision && (
            <button
              type="button"
              disabled={procesando}
              onClick={(event) =>
                ejecutarAccion(event, "revision")
              }
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-700 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={13} />

              {procesando
                ? "Procesando..."
                : "Enviar a revisión"}
            </button>
          )}

          {puedeRevisar && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onClick?.();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-emerald-700"
            >
              <Check size={13} />

              Revisar tarea
            </button>
          )}
        </div>
      )}
    </article>
  );
}