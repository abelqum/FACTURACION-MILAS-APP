"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Eye,
  GripVertical,
  ListChecks,
  PlayCircle,
} from "lucide-react";
import TareaCard from "@/app/_components/TareaCard";

const ESTADOS = [
  {
    id: "pendiente",
    nombre: "Por hacer",
    icono: ListChecks,
  },
  {
    id: "en_progreso",
    nombre: "En progreso",
    icono: PlayCircle,
  },
  {
    id: "revision",
    nombre: "En revisión",
    icono: Eye,
  },
  {
    id: "completada",
    nombre: "Completadas",
    icono: CheckCircle2,
  },
];

const PRIORIDADES = [
  {
    id: "urgente_importante",
    nombre: "Urgente e importante",
    accion: "Hacer ahora",
    descripcion: "Tareas críticas que deben atenderse inmediatamente.",
    icono: AlertCircle,
    encabezado: "bg-red-50 text-red-700",
    celda: "bg-red-50/50",
    bordeActivo: "border-red-400 bg-red-100/70",
  },
  {
    id: "importante_no_urgente",
    nombre: "Importante no urgente",
    accion: "Programar",
    descripcion: "Tareas importantes que aportan valor a largo plazo.",
    icono: CalendarClock,
    encabezado: "bg-orange-50 text-orange-700",
    celda: "bg-orange-50/40",
    bordeActivo: "border-orange-400 bg-orange-100/70",
  },
  {
    id: "urgente_no_importante",
    nombre: "Urgente no importante",
    accion: "Delegar",
    descripcion: "Tareas urgentes que pueden ser delegadas.",
    icono: Clock3,
    encabezado: "bg-blue-50 text-blue-700",
    celda: "bg-blue-50/40",
    bordeActivo: "border-blue-400 bg-blue-100/70",
  },
  {
    id: "no_urgente_no_importante",
    nombre: "No urgente no importante",
    accion: "Eliminar o postergar",
    descripcion: "Tareas de bajo impacto que pueden posponerse.",
    icono: CheckCircle2,
    encabezado: "bg-green-50 text-green-700",
    celda: "bg-green-50/40",
    bordeActivo: "border-green-400 bg-green-100/70",
  },
];

const LIMITE_INICIAL = 3;
const INCREMENTO = 3;

export default function MatrizTareas({
  tareas,
  miUsuario,
  obtenerNombresAsignados,
  onAbrirDetalle,
  onCambiarEstado,
  onMoverTarea,
  procesandoId,
}) {
  const [limitesPorCelda, setLimitesPorCelda] = useState({});
  const [tareaArrastrada, setTareaArrastrada] = useState(null);
  const [celdaActiva, setCeldaActiva] = useState(null);

  const tareasPorCelda = useMemo(() => {
    const mapa = {};

    PRIORIDADES.forEach((prioridad) => {
      ESTADOS.forEach((estado) => {
        const clave = `${prioridad.id}-${estado.id}`;

        mapa[clave] = tareas.filter(
          (tarea) =>
            tarea.prioridad === prioridad.id &&
            tarea.estado === estado.id,
        );
      });
    });

    return mapa;
  }, [tareas]);

  const contarPorEstado = (estadoId) =>
    tareas.filter((tarea) => tarea.estado === estadoId).length;

  const obtenerClaveCelda = (prioridadId, estadoId) =>
    `${prioridadId}-${estadoId}`;

  const obtenerLimiteCelda = (prioridadId, estadoId) => {
    const clave = obtenerClaveCelda(prioridadId, estadoId);

    return limitesPorCelda[clave] ?? LIMITE_INICIAL;
  };

  const mostrarMas = (prioridadId, estadoId) => {
    const clave = obtenerClaveCelda(prioridadId, estadoId);

    setLimitesPorCelda((actual) => ({
      ...actual,
      [clave]: (actual[clave] ?? LIMITE_INICIAL) + INCREMENTO,
    }));
  };

  const mostrarMenos = (prioridadId, estadoId) => {
    const clave = obtenerClaveCelda(prioridadId, estadoId);

    setLimitesPorCelda((actual) => ({
      ...actual,
      [clave]: LIMITE_INICIAL,
    }));
  };

  const iniciarArrastre = (event, tarea) => {
    setTareaArrastrada(tarea);

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(tarea.id));
  };

  const terminarArrastre = () => {
    setTareaArrastrada(null);
    setCeldaActiva(null);
  };

  const permitirSoltar = (event, prioridadId, estadoId) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    const clave = obtenerClaveCelda(prioridadId, estadoId);

    if (celdaActiva !== clave) {
      setCeldaActiva(clave);
    }
  };

  const soltarTarea = async (
    event,
    nuevaPrioridad,
    nuevoEstado,
  ) => {
    event.preventDefault();

    const tarea = tareaArrastrada;

    setCeldaActiva(null);
    setTareaArrastrada(null);

    if (!tarea) return;

    const noCambio =
      tarea.prioridad === nuevaPrioridad &&
      tarea.estado === nuevoEstado;

    if (noCambio) return;

    await onMoverTarea?.(tarea, {
      prioridad: nuevaPrioridad,
      estado: nuevoEstado,
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-blue-50 px-5 py-3">
        <p className="flex items-center gap-2 text-sm font-bold text-blue-800">
          <GripVertical size={18} />

          Arrastra una tarea hacia otra fila o columna para cambiar su
          prioridad o estado.
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1450px]">
          <div className="grid grid-cols-[260px_repeat(4,minmax(285px,1fr))] border-b border-slate-200 bg-slate-50">
            <div className="border-r border-slate-200 p-5">
              <p className="text-sm font-black uppercase tracking-widest text-slate-500">
                Prioridad
              </p>
            </div>

            {ESTADOS.map((estado) => {
              const Icono = estado.icono;

              return (
                <div
                  key={estado.id}
                  className="flex items-center justify-center gap-2 border-r border-slate-200 p-5 last:border-r-0"
                >
                  <Icono size={20} className="text-slate-500" />

                  <h3 className="text-base font-black text-slate-800">
                    {estado.nombre}
                  </h3>

                  <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-black text-slate-600">
                    {contarPorEstado(estado.id)}
                  </span>
                </div>
              );
            })}
          </div>

          {PRIORIDADES.map((prioridad) => {
            const Icono = prioridad.icono;

            return (
              <div
                key={prioridad.id}
                className="grid grid-cols-[260px_repeat(4,minmax(285px,1fr))] border-b border-slate-200 last:border-b-0"
              >
                <div
                  className={`border-r border-slate-200 p-6 ${prioridad.encabezado}`}
                >
                  <div className="flex gap-3">
                    <Icono
                      size={34}
                      strokeWidth={2.2}
                      className="shrink-0"
                    />

                    <div>
                      <h3 className="text-base font-black leading-tight">
                        {prioridad.nombre}
                      </h3>

                      <p className="mt-2 text-sm font-black text-slate-700">
                        {prioridad.accion}
                      </p>

                      <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">
                        {prioridad.descripcion}
                      </p>
                    </div>
                  </div>
                </div>

                {ESTADOS.map((estado) => {
                  const clave = obtenerClaveCelda(
                    prioridad.id,
                    estado.id,
                  );

                  const tareasCelda = tareasPorCelda[clave] ?? [];

                  const limiteVisible = obtenerLimiteCelda(
                    prioridad.id,
                    estado.id,
                  );

                  const tareasVisibles = tareasCelda.slice(
                    0,
                    limiteVisible,
                  );

                  const cantidadRestante = Math.max(
                    tareasCelda.length - limiteVisible,
                    0,
                  );

                  const tieneMas = cantidadRestante > 0;
                  const estaExpandida =
                    limiteVisible > LIMITE_INICIAL;
                  const estaActiva = celdaActiva === clave;

                  return (
                    <div
                      key={clave}
                      onDragOver={(event) =>
                        permitirSoltar(
                          event,
                          prioridad.id,
                          estado.id,
                        )
                      }
                      onDragEnter={(event) => {
                        event.preventDefault();
                        setCeldaActiva(clave);
                      }}
                      onDragLeave={(event) => {
                        if (
                          !event.currentTarget.contains(
                            event.relatedTarget,
                          )
                        ) {
                          setCeldaActiva(null);
                        }
                      }}
                      onDrop={(event) =>
                        soltarTarea(
                          event,
                          prioridad.id,
                          estado.id,
                        )
                      }
                      className={`min-h-[270px] space-y-3 border-r border-slate-200 p-4 transition last:border-r-0 ${
                        prioridad.celda
                      } ${
                        estaActiva
                          ? `border-2 border-dashed ${prioridad.bordeActivo}`
                          : ""
                      }`}
                    >
                      {tareasVisibles.map((tarea) => (
                        <div
                          key={tarea.id}
                          draggable={
                            String(procesandoId) !== String(tarea.id)
                          }
                          onDragStart={(event) =>
                            iniciarArrastre(event, tarea)
                          }
                          onDragEnd={terminarArrastre}
                          className={`relative ${
                            String(tareaArrastrada?.id) ===
                            String(tarea.id)
                              ? "opacity-40"
                              : ""
                          }`}
                        >
                          <div className="absolute right-2 top-2 z-10 cursor-grab rounded-md bg-slate-100 p-1 text-slate-400 opacity-0 transition hover:text-slate-700 group-hover:opacity-100">
                            <GripVertical size={15} />
                          </div>

                          <TareaCard
                            tarea={tarea}
                            variante="matriz"
                            miUsuario={miUsuario}
                            nombresAsignados={obtenerNombresAsignados(
                              tarea.asignados_ids,
                            )}
                            procesando={
                              String(procesandoId) ===
                              String(tarea.id)
                            }
                            onClick={() => onAbrirDetalle(tarea)}
                            onCambiarEstado={(nuevoEstado) =>
                              onCambiarEstado(tarea, nuevoEstado)
                            }
                          />
                        </div>
                      ))}

                      {tareasCelda.length === 0 && (
                        <div
                          className={`flex min-h-48 items-center justify-center rounded-xl border border-dashed p-4 text-center transition ${
                            estaActiva
                              ? "border-blue-400 bg-white/80"
                              : "border-slate-200 bg-white/40"
                          }`}
                        >
                          <div>
                            <GripVertical
                              size={24}
                              className="mx-auto mb-2 text-slate-300"
                            />

                            <p className="text-xs font-bold uppercase tracking-widest text-slate-300">
                              Suelta una tarea aquí
                            </p>
                          </div>
                        </div>
                      )}

                      {tareasCelda.length > 0 && (
                        <div className="flex flex-col gap-2 pt-1">
                          {tieneMas && (
                            <button
                              type="button"
                              onClick={() =>
                                mostrarMas(
                                  prioridad.id,
                                  estado.id,
                                )
                              }
                              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-widest text-blue-700 transition hover:border-blue-300 hover:bg-blue-50"
                            >
                              <ChevronDown size={16} />

                              Ver hasta 3 más

                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700">
                                {cantidadRestante}
                              </span>
                            </button>
                          )}

                          {estaExpandida && (
                            <button
                              type="button"
                              onClick={() =>
                                mostrarMenos(
                                  prioridad.id,
                                  estado.id,
                                )
                              }
                              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-widest text-slate-600 transition hover:bg-slate-100"
                            >
                              <ChevronUp size={16} />

                              Mostrar solo 3
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-slate-200 bg-slate-50 p-5 md:grid-cols-5">
        <div className="rounded-xl bg-white p-4 text-center shadow-sm md:text-left">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Total
          </p>

          <p className="mt-1 text-xl font-black text-slate-800">
            {tareas.length}
          </p>
        </div>

        {PRIORIDADES.map((prioridad) => (
          <div
            key={prioridad.id}
            className="rounded-xl bg-white p-4 text-center shadow-sm md:text-left"
          >
            <p className="line-clamp-1 text-xs font-black uppercase tracking-widest text-slate-400">
              {prioridad.nombre}
            </p>

            <p className="mt-1 text-xl font-black text-slate-800">
              {
                tareas.filter(
                  (tarea) =>
                    tarea.prioridad === prioridad.id,
                ).length
              }
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}