"use client";

import { useState } from "react";
import {
  AlignLeft,
  Calendar,
  CheckCircle2,
  Clock3,
  Edit3,
  Eye,
  MessageSquareWarning,
  Play,
  Save,
  Send,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import EvidenciasTarea from "@/app/_components/EvidenciasTarea";

const PRIORIDADES = [
  {
    value: "urgente_importante",
    label: "Urgente e importante",
  },
  {
    value: "importante_no_urgente",
    label: "Importante no urgente",
  },
  {
    value: "urgente_no_importante",
    label: "Urgente no importante",
  },
  {
    value: "no_urgente_no_importante",
    label: "No urgente no importante",
  },
];

const ESTADOS = {
  pendiente: {
    nombre: "Por hacer",
    clase: "bg-slate-100 text-slate-700",
    icono: Clock3,
  },
  en_progreso: {
    nombre: "En progreso",
    clase: "bg-blue-100 text-blue-700",
    icono: Play,
  },
  revision: {
    nombre: "En revisión",
    clase: "bg-purple-100 text-purple-700",
    icono: Eye,
  },
  completada: {
    nombre: "Completada",
    clase: "bg-emerald-100 text-emerald-700",
    icono: CheckCircle2,
  },
};

const convertirFechaParaInput = (fecha) => {
  if (!fecha) return "";

  const valor = new Date(fecha);
  const compensacion = valor.getTimezoneOffset() * 60000;

  return new Date(valor.getTime() - compensacion)
    .toISOString()
    .slice(0, 16);
};

const formatearFecha = (fecha) => {
  if (!fecha) return "Sin fecha límite";

  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(fecha));
};

const crearFormularioInicial = (tarea) => ({
  titulo: tarea?.titulo ?? "",
  descripcion: tarea?.descripcion ?? "",
  fecha_limite: convertirFechaParaInput(tarea?.fecha_limite),
  prioridad: tarea?.prioridad ?? "importante_no_urgente",
  asignados_ids: tarea?.asignados_ids ?? [],
});

export default function TareaDetalleModal({
  isOpen,
  onClose,
  tarea,
  usuarios,
  miUsuario,
  nombresAsignados,
  procesando = false,
  onActualizar,
  onCambiarEstado,
  onEliminar,
  onRetroalimentar,
}) {
  const [editando, setEditando] = useState(false);
  const [mostrarRetroalimentacion, setMostrarRetroalimentacion] =
    useState(false);
  const [retroalimentacion, setRetroalimentacion] = useState("");
  const [formulario, setFormulario] = useState(() =>
    crearFormularioInicial(tarea),
  );

  if (!isOpen || !tarea) return null;

  const esCreador = tarea.creado_por === miUsuario?.id;
  const esAdministrador = miUsuario?.rol === "admin";
  const estaAsignado = tarea.asignados_ids?.includes(miUsuario?.id);

  const puedeEditar = esCreador || esAdministrador;
  const puedeEliminar = esCreador || esAdministrador;

  const puedeSubirEvidencias =
    estaAsignado || esCreador || esAdministrador;

  const puedeIniciar =
    tarea.estado === "pendiente" &&
    (estaAsignado || esCreador || esAdministrador);

  const puedeEnviarRevision =
    tarea.estado === "en_progreso" &&
    (estaAsignado || esCreador || esAdministrador);

  const puedeResolverRevision =
    tarea.estado === "revision" &&
    (esCreador || esAdministrador);

  const estado = ESTADOS[tarea.estado] ?? ESTADOS.pendiente;
  const EstadoIcono = estado.icono;

  const cambiarAsignado = (usuarioId) => {
    setFormulario((actual) => ({
      ...actual,
      asignados_ids: actual.asignados_ids.includes(usuarioId)
        ? actual.asignados_ids.filter((id) => id !== usuarioId)
        : [...actual.asignados_ids, usuarioId],
    }));
  };

  const cancelarEdicion = () => {
    setFormulario(crearFormularioInicial(tarea));
    setEditando(false);
  };

  const guardarCambios = async () => {
    if (!formulario.titulo.trim()) {
      await Swal.fire(
        "Título requerido",
        "Escribe el título de la tarea.",
        "warning",
      );
      return;
    }

    if (formulario.asignados_ids.length === 0) {
      await Swal.fire(
        "Asignación requerida",
        "Selecciona al menos una persona.",
        "warning",
      );
      return;
    }

    await onActualizar({
      titulo: formulario.titulo.trim(),
      descripcion: formulario.descripcion.trim(),
      fecha_limite: formulario.fecha_limite
        ? new Date(formulario.fecha_limite).toISOString()
        : null,
      prioridad: formulario.prioridad,
      asignados_ids: formulario.asignados_ids,
    });

    setEditando(false);
  };

  const enviarRetroalimentacion = async () => {
    if (!retroalimentacion.trim()) {
      await Swal.fire(
        "Retroalimentación requerida",
        "Escribe qué debe corregirse o mejorarse.",
        "warning",
      );
      return;
    }

    await onRetroalimentar(retroalimentacion.trim());
    setMostrarRetroalimentacion(false);
    setRetroalimentacion("");
  };

  const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-100 disabled:text-slate-500";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !procesando) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <header className="shrink-0 border-b border-slate-200 bg-slate-50 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${estado.clase}`}
                >
                  <EstadoIcono size={13} />
                  {estado.nombre}
                </span>

                <span className="rounded-lg bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm">
                  {tarea.asignados_ids?.length > 1
                    ? "Tarea conjunta"
                    : "Tarea individual"}
                </span>
              </div>

              <h2 className="text-xl font-black text-slate-800 sm:text-2xl">
                {tarea.titulo}
              </h2>

              <p className="mt-1 text-xs font-semibold text-slate-500">
                Asignada por{" "}
                {tarea.creador?.nombre || "Administración MILAS"}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {puedeEditar && !editando && (
                <button
                  type="button"
                  onClick={() => {
                    setFormulario(crearFormularioInicial(tarea));
                    setEditando(true);
                  }}
                  className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:border-blue-300 hover:text-blue-700"
                  title="Editar tarea"
                >
                  <Edit3 size={18} />
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                disabled={procesando}
                className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {tarea.retroalimentacion &&
            tarea.estado !== "completada" && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-700">
                  <MessageSquareWarning size={17} />
                  Retroalimentación
                </h3>

                <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-amber-900">
                  {tarea.retroalimentacion}
                </p>
              </section>
            )}

          {editando ? (
            <section className="space-y-5">
              <label className="block space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-600">
                  Título
                </span>

                <input
                  type="text"
                  value={formulario.titulo}
                  onChange={(event) =>
                    setFormulario((actual) => ({
                      ...actual,
                      titulo: event.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-600">
                  Descripción
                </span>

                <textarea
                  rows={4}
                  value={formulario.descripcion}
                  onChange={(event) =>
                    setFormulario((actual) => ({
                      ...actual,
                      descripcion: event.target.value,
                    }))
                  }
                  className={`${inputClass} resize-none`}
                />
              </label>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-600">
                    Fecha límite
                  </span>

                  <input
                    type="datetime-local"
                    value={formulario.fecha_limite}
                    onChange={(event) =>
                      setFormulario((actual) => ({
                        ...actual,
                        fecha_limite: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-600">
                    Prioridad
                  </span>

                  <select
                    value={formulario.prioridad}
                    onChange={(event) =>
                      setFormulario((actual) => ({
                        ...actual,
                        prioridad: event.target.value,
                      }))
                    }
                    className={inputClass}
                  >
                    {PRIORIDADES.map((prioridad) => (
                      <option
                        key={prioridad.value}
                        value={prioridad.value}
                      >
                        {prioridad.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-600">
                  Personas asignadas
                </p>

                <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
                  {usuarios.map((usuario) => (
                    <label
                      key={usuario.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition hover:bg-slate-200/60"
                    >
                      <input
                        type="checkbox"
                        checked={formulario.asignados_ids.includes(
                          usuario.id,
                        )}
                        onChange={() => cambiarAsignado(usuario.id)}
                        className="h-4 w-4 accent-blue-700"
                      />

                      <span className="text-sm font-semibold text-slate-700">
                        {usuario.nombre}
                      </span>

                      <span className="ml-auto rounded bg-white px-2 py-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        {usuario.rol}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={cancelarEdicion}
                  disabled={procesando}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={guardarCambios}
                  disabled={procesando}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-blue-800 disabled:opacity-50"
                >
                  <Save size={16} />
                  Guardar cambios
                </button>
              </div>
            </section>
          ) : (
            <>
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-700">
                  <AlignLeft size={17} className="text-blue-700" />
                  Descripción
                </h3>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-600">
                    {tarea.descripcion ||
                      "No se agregaron instrucciones adicionales."}
                  </p>
                </div>
              </section>

              <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-orange-50 p-3 text-orange-600">
                      <Calendar size={21} />
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Fecha límite
                      </p>

                      <p className="mt-1 text-sm font-black capitalize text-slate-800">
                        {formatearFecha(tarea.fecha_limite)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                      {tarea.asignados_ids?.length > 1 ? (
                        <Users size={21} />
                      ) : (
                        <User size={21} />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Asignada a
                      </p>

                      <p className="mt-1 text-sm font-black text-slate-800">
                        {nombresAsignados}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          <EvidenciasTarea
            tarea={tarea}
            miUsuario={miUsuario}
            puedeSubir={
              puedeSubirEvidencias &&
              tarea.estado !== "completada"
            }
          />

          {mostrarRetroalimentacion && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <label className="block space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-amber-700">
                  ¿Qué debe corregirse?
                </span>

                <textarea
                  rows={4}
                  value={retroalimentacion}
                  onChange={(event) =>
                    setRetroalimentacion(event.target.value)
                  }
                  placeholder="Describe claramente qué debe mejorar la persona asignada..."
                  className="w-full resize-none rounded-xl border border-amber-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
              </label>

              <div className="mt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setMostrarRetroalimentacion(false);
                    setRetroalimentacion("");
                  }}
                  className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-amber-700"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={enviarRetroalimentacion}
                  disabled={procesando}
                  className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-amber-700 disabled:opacity-50"
                >
                  Enviar corrección
                </button>
              </div>
            </section>
          )}
        </div>

        <footer className="shrink-0 border-t border-slate-200 bg-white p-5">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {puedeEliminar && (
                <button
                  type="button"
                  onClick={onEliminar}
                  disabled={procesando}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-5 py-3 text-xs font-black uppercase tracking-widest text-red-700 transition hover:bg-red-600 hover:text-white disabled:opacity-50 sm:w-auto"
                >
                  <Trash2 size={16} />
                  Eliminar
                </button>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {puedeIniciar && (
                <button
                  type="button"
                  onClick={() => onCambiarEstado("en_progreso")}
                  disabled={procesando}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-blue-800 disabled:opacity-50"
                >
                  <Play size={16} />
                  Iniciar tarea
                </button>
              )}

              {puedeEnviarRevision && (
                <button
                  type="button"
                  onClick={() => onCambiarEstado("revision")}
                  disabled={procesando}
                  className="flex items-center justify-center gap-2 rounded-xl bg-purple-700 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-purple-800 disabled:opacity-50"
                >
                  <Send size={16} />
                  Enviar a revisión
                </button>
              )}

              {puedeResolverRevision && (
                <>
                  <button
                    type="button"
                    onClick={() => setMostrarRetroalimentacion(true)}
                    disabled={procesando}
                    className="flex items-center justify-center gap-2 rounded-xl bg-amber-100 px-5 py-3 text-xs font-black uppercase tracking-widest text-amber-800 transition hover:bg-amber-200 disabled:opacity-50"
                  >
                    <MessageSquareWarning size={16} />
                    Retroalimentar
                  </button>

                  <button
                    type="button"
                    onClick={() => onCambiarEstado("completada")}
                    disabled={procesando}
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} />
                    Completar
                  </button>
                </>
              )}

              {!puedeIniciar &&
                !puedeEnviarRevision &&
                !puedeResolverRevision && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl bg-slate-800 px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-slate-900"
                  >
                    Cerrar
                  </button>
                )}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}