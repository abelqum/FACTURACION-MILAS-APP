"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Filter,
  LayoutGrid,
  List,
  ListTodo,
  Plus,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import { supabase } from "@/app/_lib/supabase/supabase";
import TareaCard from "@/app/_components/TareaCard";
import TareaDetalleModal from "@/app/_components/TareaDetalleModal";
import MatrizTareas from "@/app/_components/MatrizTareas";

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

const ORDEN_ESTADOS = {
  pendiente: 1,
  en_progreso: 2,
  revision: 3,
  completada: 4,
};

const LIMITE_TAREAS_POR_FECHA = 6;
const INCREMENTO_TAREAS_POR_FECHA = 6;
const LIMITE_FECHAS_INICIAL = 4;
const INCREMENTO_FECHAS = 4;

const obtenerClaveFecha = (fechaString) => {
  if (!fechaString) return "sin_fecha";

  const fecha = new Date(fechaString);

  return `${fecha.getFullYear()}-${String(
    fecha.getMonth() + 1,
  ).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
};

const formatearEncabezadoFecha = (clave) => {
  if (clave === "sin_fecha") {
    return {
      titulo: "Sin fecha límite",
      subtitulo: "Actividades que todavía no tienen fecha definida",
    };
  }

  const [anio, mes, dia] = clave.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, dia);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);

  const fechaComparacion = new Date(fecha);
  fechaComparacion.setHours(0, 0, 0, 0);

  let tituloEspecial = "";

  if (fechaComparacion.getTime() === hoy.getTime()) {
    tituloEspecial = "Hoy";
  } else if (
    fechaComparacion.getTime() === manana.getTime()
  ) {
    tituloEspecial = "Mañana";
  }

  return {
    titulo:
      tituloEspecial ||
      new Intl.DateTimeFormat("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(fecha),
    subtitulo:
      tituloEspecial &&
      new Intl.DateTimeFormat("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(fecha),
  };
};

export default function GestionTareas() {
  const [tareas, setTareas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [miUsuario, setMiUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState(null);

  const [vista, setVista] = useState("lista");
  const [filtroUsuario, setFiltroUsuario] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  const [limiteFechas, setLimiteFechas] = useState(
    LIMITE_FECHAS_INICIAL,
  );

  const [limitesPorFecha, setLimitesPorFecha] = useState({});

  const [isModalCrearOpen, setIsModalCrearOpen] = useState(false);
  const [isModalDetalleOpen, setIsModalDetalleOpen] =
    useState(false);
  const [tareaSeleccionada, setTareaSeleccionada] =
    useState(null);

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [prioridad, setPrioridad] = useState(
    "importante_no_urgente",
  );
  const [asignados, setAsignados] = useState([]);

  const cargarDatos = useCallback(async () => {
    setCargando(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setCargando(false);
        return;
      }

      const [perfilResult, perfilesResult, tareasResult] =
        await Promise.all([
          supabase
            .from("perfiles")
            .select("*")
            .eq("id", session.user.id)
            .single(),

          supabase
            .from("perfiles")
            .select("*")
            .order("nombre"),

          supabase
            .from("tareas")
            .select(
              `
                *,
                creador:perfiles!tareas_creado_por_fkey(
                  id,
                  nombre,
                  rol
                )
              `,
            )
            .order("fecha_limite", {
              ascending: true,
              nullsFirst: false,
            }),
        ]);

      if (perfilResult.error) throw perfilResult.error;
      if (perfilesResult.error) throw perfilesResult.error;
      if (tareasResult.error) throw tareasResult.error;

      const perfilActual = perfilResult.data;

      setMiUsuario(perfilActual);
      setUsuarios(perfilesResult.data ?? []);

      const todasLasTareas = tareasResult.data ?? [];

      const tareasPermitidas =
        perfilActual?.rol === "empleado"
          ? todasLasTareas.filter(
              (tarea) =>
                tarea.asignados_ids?.includes(perfilActual.id) ||
                tarea.creado_por === perfilActual.id,
            )
          : todasLasTareas;

      setTareas(tareasPermitidas);
    } catch (error) {
      console.error("Error cargando tareas:", error);

      await Swal.fire({
        icon: "error",
        title: "No se pudieron cargar las tareas",
        text:
          error.message ??
          "Ocurrió un error al consultar las actividades.",
      });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarDatos();
  }, [cargarDatos]);

  const tareasFiltradas = useMemo(() => {
    return tareas
      .filter((tarea) => {
        if (filtroUsuario === "mis_tareas") {
          return tarea.asignados_ids?.includes(miUsuario?.id);
        }

        if (filtroUsuario === "asignadas_por_mi") {
          return tarea.creado_por === miUsuario?.id;
        }

        if (
          filtroUsuario !== "todos" &&
          filtroUsuario !== "mis_tareas" &&
          filtroUsuario !== "asignadas_por_mi"
        ) {
          return tarea.asignados_ids?.includes(filtroUsuario);
        }

        return true;
      })
      .filter((tarea) => {
        if (filtroEstado === "todos") return true;

        return tarea.estado === filtroEstado;
      })
      .sort((a, b) => {
        if (!a.fecha_limite && !b.fecha_limite) {
          return (
            (ORDEN_ESTADOS[a.estado] ?? 99) -
            (ORDEN_ESTADOS[b.estado] ?? 99)
          );
        }

        if (!a.fecha_limite) return 1;
        if (!b.fecha_limite) return -1;

        return (
          new Date(a.fecha_limite).getTime() -
          new Date(b.fecha_limite).getTime()
        );
      });
  }, [
    filtroEstado,
    filtroUsuario,
    miUsuario?.id,
    tareas,
  ]);

  const tareasAgrupadasPorFecha = useMemo(() => {
    const grupos = new Map();

    tareasFiltradas.forEach((tarea) => {
      const clave = obtenerClaveFecha(tarea.fecha_limite);

      if (!grupos.has(clave)) {
        grupos.set(clave, []);
      }

      grupos.get(clave).push(tarea);
    });

    return [...grupos.entries()].sort(([claveA], [claveB]) => {
      if (claveA === "sin_fecha") return 1;
      if (claveB === "sin_fecha") return -1;

      return claveA.localeCompare(claveB);
    });
  }, [tareasFiltradas]);

  const gruposVisibles = tareasAgrupadasPorFecha.slice(
    0,
    limiteFechas,
  );

  const fechasRestantes = Math.max(
    tareasAgrupadasPorFecha.length - limiteFechas,
    0,
  );

  const obtenerNombresAsignados = useCallback(
    (ids) => {
      if (!ids?.length) return "Nadie";

      return ids
        .map((id) => {
          const usuario = usuarios.find(
            (elemento) => elemento.id === id,
          );

          return usuario?.nombre ?? "Usuario";
        })
        .join(", ");
    },
    [usuarios],
  );

  const obtenerLimiteFecha = (claveFecha) =>
    limitesPorFecha[claveFecha] ?? LIMITE_TAREAS_POR_FECHA;

  const mostrarMasTareasFecha = (claveFecha) => {
    setLimitesPorFecha((actual) => ({
      ...actual,
      [claveFecha]:
        (actual[claveFecha] ?? LIMITE_TAREAS_POR_FECHA) +
        INCREMENTO_TAREAS_POR_FECHA,
    }));
  };

  const mostrarMenosTareasFecha = (claveFecha) => {
    setLimitesPorFecha((actual) => ({
      ...actual,
      [claveFecha]: LIMITE_TAREAS_POR_FECHA,
    }));
  };

  const abrirModalCrear = () => {
    setTitulo("");
    setDescripcion("");
    setFechaLimite("");
    setPrioridad("importante_no_urgente");
    setAsignados(miUsuario ? [miUsuario.id] : []);
    setIsModalCrearOpen(true);
  };

  const abrirDetalle = (tarea) => {
    setTareaSeleccionada(tarea);
    setIsModalDetalleOpen(true);
  };

  const cerrarDetalle = () => {
    setIsModalDetalleOpen(false);
    setTareaSeleccionada(null);
  };

  const cambiarAsignado = (usuarioId) => {
    setAsignados((actuales) =>
      actuales.includes(usuarioId)
        ? actuales.filter((id) => id !== usuarioId)
        : [...actuales, usuarioId],
    );
  };

  const crearTarea = async (event) => {
    event?.preventDefault();

    if (!titulo.trim()) {
      await Swal.fire(
        "Título requerido",
        "Escribe qué se debe realizar.",
        "warning",
      );
      return;
    }

    if (asignados.length === 0) {
      await Swal.fire(
        "Asignación requerida",
        "Selecciona por lo menos una persona.",
        "warning",
      );
      return;
    }

    setProcesandoId("creando");

    try {
      const { error } = await supabase.from("tareas").insert([
        {
          titulo: titulo.trim(),
          descripcion: descripcion.trim(),
          fecha_limite: fechaLimite
            ? new Date(fechaLimite).toISOString()
            : null,
          prioridad,
          asignados_ids: asignados,
          creado_por: miUsuario.id,
          estado: "pendiente",
          retroalimentacion: null,
          fecha_revision: null,
          fecha_completada: null,
        },
      ]);

      if (error) throw error;

      setIsModalCrearOpen(false);

      await Swal.fire({
        icon: "success",
        title: "Tarea asignada",
        timer: 1200,
        showConfirmButton: false,
      });

      await cargarDatos();
    } catch (error) {
      await Swal.fire(
        "No se pudo crear",
        error.message,
        "error",
      );
    } finally {
      setProcesandoId(null);
    }
  };

  const validarCambioEstado = async (tarea, nuevoEstado) => {
    const esCreador = tarea.creado_por === miUsuario?.id;
    const esAdministrador = miUsuario?.rol === "admin";
    const estaAsignado =
      tarea.asignados_ids?.includes(miUsuario?.id);

    if (
      nuevoEstado === "en_progreso" &&
      !estaAsignado &&
      !esCreador &&
      !esAdministrador
    ) {
      await Swal.fire(
        "Acción restringida",
        "Solamente una persona asignada puede iniciar esta tarea.",
        "warning",
      );

      return false;
    }

    if (
      nuevoEstado === "revision" &&
      !estaAsignado &&
      !esCreador &&
      !esAdministrador
    ) {
      await Swal.fire(
        "Acción restringida",
        "Solamente una persona asignada puede enviarla a revisión.",
        "warning",
      );

      return false;
    }

    if (
      nuevoEstado === "completada" &&
      !esCreador &&
      !esAdministrador
    ) {
      await Swal.fire(
        "Acción restringida",
        "Solamente quien generó la tarea puede marcarla como completada.",
        "warning",
      );

      return false;
    }

    return true;
  };

  const construirCambiosEstado = (nuevoEstado) => {
    const cambios = {
      estado: nuevoEstado,
    };

    if (nuevoEstado === "pendiente") {
      cambios.fecha_revision = null;
      cambios.fecha_completada = null;
    }

    if (nuevoEstado === "en_progreso") {
      cambios.retroalimentacion = null;
      cambios.fecha_revision = null;
      cambios.fecha_completada = null;
    }

    if (nuevoEstado === "revision") {
      cambios.fecha_revision = new Date().toISOString();
      cambios.fecha_completada = null;
    }

    if (nuevoEstado === "completada") {
      cambios.fecha_completada = new Date().toISOString();
      cambios.retroalimentacion = null;
    }

    return cambios;
  };

  const cambiarEstado = async (tarea, nuevoEstado) => {
    if (!tarea) return;

    const permitido = await validarCambioEstado(
      tarea,
      nuevoEstado,
    );

    if (!permitido) return;

    setProcesandoId(tarea.id);

    try {
      const cambios = construirCambiosEstado(nuevoEstado);

      const { error } = await supabase
        .from("tareas")
        .update(cambios)
        .eq("id", tarea.id);

      if (error) throw error;

      setTareas((actuales) =>
        actuales.map((elemento) =>
          elemento.id === tarea.id
            ? {
                ...elemento,
                ...cambios,
              }
            : elemento,
        ),
      );

      setTareaSeleccionada((actual) =>
        actual?.id === tarea.id
          ? {
              ...actual,
              ...cambios,
            }
          : actual,
      );

      if (nuevoEstado === "revision") {
        await Swal.fire({
          icon: "success",
          title: "Enviada a revisión",
          text: "La persona que creó la tarea podrá revisarla.",
          timer: 1500,
          showConfirmButton: false,
        });
      }

      if (nuevoEstado === "completada") {
        await Swal.fire({
          icon: "success",
          title: "Tarea completada",
          timer: 1200,
          showConfirmButton: false,
        });

        cerrarDetalle();
      }
    } catch (error) {
      await Swal.fire(
        "No se pudo actualizar",
        error.message,
        "error",
      );

      await cargarDatos();
    } finally {
      setProcesandoId(null);
    }
  };

  const moverTareaEnMatriz = async (
    tarea,
    { prioridad: nuevaPrioridad, estado: nuevoEstado },
  ) => {
    if (!tarea) return;

    const cambiaPrioridad =
      tarea.prioridad !== nuevaPrioridad;
    const cambiaEstado = tarea.estado !== nuevoEstado;

    if (!cambiaPrioridad && !cambiaEstado) return;

    const esCreador = tarea.creado_por === miUsuario?.id;
    const esAdministrador = miUsuario?.rol === "admin";

    if (
      cambiaPrioridad &&
      !esCreador &&
      !esAdministrador
    ) {
      await Swal.fire({
        icon: "warning",
        title: "No puedes cambiar la prioridad",
        text: "Solamente quien creó la tarea o un administrador puede cambiar su prioridad.",
      });

      return;
    }

    if (cambiaEstado) {
      const permitido = await validarCambioEstado(
        tarea,
        nuevoEstado,
      );

      if (!permitido) return;
    }

    const resultado = await Swal.fire({
      icon: "question",
      title: "¿Mover esta tarea?",
      html: `
        <div style="text-align:left; font-size:14px;">
          ${
            cambiaPrioridad
              ? `<p><b>Nueva prioridad:</b> ${
                  PRIORIDADES.find(
                    (item) => item.value === nuevaPrioridad,
                  )?.label ?? nuevaPrioridad
                }</p>`
              : ""
          }

          ${
            cambiaEstado
              ? `<p style="margin-top:6px;"><b>Nuevo estado:</b> ${
                  {
                    pendiente: "Por hacer",
                    en_progreso: "En progreso",
                    revision: "En revisión",
                    completada: "Completada",
                  }[nuevoEstado]
                }</p>`
              : ""
          }
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Sí, mover",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#1d4ed8",
    });

    if (!resultado.isConfirmed) return;

    setProcesandoId(tarea.id);

    const cambios = {};

    if (cambiaPrioridad) {
      cambios.prioridad = nuevaPrioridad;
    }

    if (cambiaEstado) {
      Object.assign(
        cambios,
        construirCambiosEstado(nuevoEstado),
      );
    }

    setTareas((actuales) =>
      actuales.map((elemento) =>
        elemento.id === tarea.id
          ? {
              ...elemento,
              ...cambios,
            }
          : elemento,
      ),
    );

    try {
      const { error } = await supabase
        .from("tareas")
        .update(cambios)
        .eq("id", tarea.id);

      if (error) throw error;

      setTareaSeleccionada((actual) =>
        actual?.id === tarea.id
          ? {
              ...actual,
              ...cambios,
            }
          : actual,
      );

      await Swal.fire({
        icon: "success",
        title: "Tarea movida",
        timer: 900,
        showConfirmButton: false,
      });
    } catch (error) {
      await Swal.fire(
        "No se pudo mover",
        error.message,
        "error",
      );

      await cargarDatos();
    } finally {
      setProcesandoId(null);
    }
  };

  const actualizarTarea = async (cambios) => {
    if (!tareaSeleccionada) return;

    setProcesandoId(tareaSeleccionada.id);

    try {
      const { error } = await supabase
        .from("tareas")
        .update(cambios)
        .eq("id", tareaSeleccionada.id);

      if (error) throw error;

      setTareas((actuales) =>
        actuales.map((tarea) =>
          tarea.id === tareaSeleccionada.id
            ? {
                ...tarea,
                ...cambios,
              }
            : tarea,
        ),
      );

      setTareaSeleccionada((actual) => ({
        ...actual,
        ...cambios,
      }));

      await Swal.fire({
        icon: "success",
        title: "Tarea actualizada",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      await Swal.fire(
        "No se pudo actualizar",
        error.message,
        "error",
      );
    } finally {
      setProcesandoId(null);
    }
  };

  const retroalimentarTarea = async (comentario) => {
    if (!tareaSeleccionada) return;

    const puedeRetroalimentar =
      tareaSeleccionada.creado_por === miUsuario?.id ||
      miUsuario?.rol === "admin";

    if (!puedeRetroalimentar) return;

    setProcesandoId(tareaSeleccionada.id);

    try {
      const cambios = {
        estado: "pendiente",
        retroalimentacion: comentario,
        fecha_revision: null,
        fecha_completada: null,
      };

      const { error } = await supabase
        .from("tareas")
        .update(cambios)
        .eq("id", tareaSeleccionada.id);

      if (error) throw error;

      setTareas((actuales) =>
        actuales.map((tarea) =>
          tarea.id === tareaSeleccionada.id
            ? {
                ...tarea,
                ...cambios,
              }
            : tarea,
        ),
      );

      await Swal.fire({
        icon: "success",
        title: "Retroalimentación enviada",
        text: "La tarea regresó a Por hacer.",
        timer: 1500,
        showConfirmButton: false,
      });

      cerrarDetalle();
    } catch (error) {
      await Swal.fire(
        "No se pudo enviar",
        error.message,
        "error",
      );
    } finally {
      setProcesandoId(null);
    }
  };

  const eliminarTarea = async () => {
    if (!tareaSeleccionada) return;

    const confirmacion = await Swal.fire({
      icon: "warning",
      title: "¿Eliminar esta tarea?",
      text: "La acción no se puede deshacer.",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmacion.isConfirmed) return;

    setProcesandoId(tareaSeleccionada.id);

    try {
      const { error } = await supabase
        .from("tareas")
        .delete()
        .eq("id", tareaSeleccionada.id);

      if (error) throw error;

      setTareas((actuales) =>
        actuales.filter(
          (tarea) => tarea.id !== tareaSeleccionada.id,
        ),
      );

      cerrarDetalle();

      await Swal.fire({
        icon: "success",
        title: "Tarea eliminada",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      await Swal.fire(
        "No se pudo eliminar",
        error.message,
        "error",
      );
    } finally {
      setProcesandoId(null);
    }
  };

  const selectClass =
    "rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20";

  const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20";

  return (
    <div className="mx-auto max-w-[90rem] space-y-6 pb-12">
      <header className="space-y-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-800">
            <ListTodo className="text-blue-700" />

            Control de Tareas
          </h1>

          <p className="mt-1 text-sm font-medium text-slate-500">
            Gestiona actividades por fecha, prioridad y estado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-auto">
            <Filter
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <select
              value={filtroUsuario}
              onChange={(event) => {
                setFiltroUsuario(event.target.value);
                setLimiteFechas(LIMITE_FECHAS_INICIAL);
              }}
              className={`${selectClass} w-full pl-9 sm:w-64`}
            >
              <option value="todos">
                {miUsuario?.rol === "empleado"
                  ? "Todas mis actividades"
                  : "Todas las tareas"}
              </option>

              <option value="mis_tareas">
                Lo que me toca hacer
              </option>

              <option value="asignadas_por_mi">
                Lo que delegué
              </option>

              {(miUsuario?.rol === "admin" ||
                miUsuario?.rol === "editor") && (
                <optgroup label="Equipo">
                  {usuarios
                    .filter(
                      (usuario) =>
                        usuario.id !== miUsuario?.id,
                    )
                    .map((usuario) => (
                      <option
                        key={usuario.id}
                        value={usuario.id}
                      >
                        Tareas de {usuario.nombre}
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
          </div>

          <select
            value={filtroEstado}
            onChange={(event) => {
              setFiltroEstado(event.target.value);
              setLimiteFechas(LIMITE_FECHAS_INICIAL);
            }}
            className={`${selectClass} w-full sm:w-auto`}
          >
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Por hacer</option>
            <option value="en_progreso">En progreso</option>
            <option value="revision">En revisión</option>
            <option value="completada">Completadas</option>
          </select>

          <div className="flex w-full rounded-xl border border-slate-300 bg-white p-1 sm:w-auto">
            <button
              type="button"
              onClick={() => setVista("lista")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-black uppercase tracking-widest transition sm:flex-none ${
                vista === "lista"
                  ? "bg-blue-700 text-white"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              <List size={15} />

              Fechas
            </button>

            <button
              type="button"
              onClick={() => setVista("matriz")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-black uppercase tracking-widest transition sm:flex-none ${
                vista === "matriz"
                  ? "bg-blue-700 text-white"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              <LayoutGrid size={15} />

              Matriz
            </button>
          </div>

          <button
            type="button"
            onClick={abrirModalCrear}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-md transition hover:bg-blue-800 active:scale-95 sm:ml-auto sm:w-auto"
          >
            <Plus size={16} />

            Nueva tarea
          </button>
        </div>
      </header>

      {cargando ? (
        <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-700 border-t-transparent" />
        </div>
      ) : tareasFiltradas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
          <CheckCircle2
            size={44}
            className="mx-auto mb-3 text-emerald-400"
          />

          <p className="text-lg font-black text-slate-700">
            No hay tareas para mostrar
          </p>

          <p className="mt-1 text-sm font-medium text-slate-400">
            Cambia los filtros o registra una actividad.
          </p>
        </div>
      ) : vista === "matriz" ? (
        <MatrizTareas
          tareas={tareasFiltradas}
          miUsuario={miUsuario}
          obtenerNombresAsignados={
            obtenerNombresAsignados
          }
          onAbrirDetalle={abrirDetalle}
          onCambiarEstado={cambiarEstado}
          onMoverTarea={moverTareaEnMatriz}
          procesandoId={procesandoId}
        />
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
            <p className="text-sm font-bold text-blue-800">
              Se muestran inicialmente{" "}
              {LIMITE_FECHAS_INICIAL} fechas y hasta{" "}
              {LIMITE_TAREAS_POR_FECHA} tareas por fecha.
            </p>
          </div>

          {gruposVisibles.map(
            ([claveFecha, tareasFecha]) => {
              const encabezado =
                formatearEncabezadoFecha(claveFecha);

              const limiteFecha =
                obtenerLimiteFecha(claveFecha);

              const tareasVisibles = tareasFecha.slice(
                0,
                limiteFecha,
              );

              const tareasRestantes = Math.max(
                tareasFecha.length - limiteFecha,
                0,
              );

              const estaExpandida =
                limiteFecha > LIMITE_TAREAS_POR_FECHA;

              return (
                <section
                  key={claveFecha}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
                    <div className="rounded-xl bg-blue-100 p-2.5 text-blue-700">
                      <CalendarClock size={20} />
                    </div>

                    <div>
                      <h2 className="text-lg font-black capitalize text-slate-800">
                        {encabezado.titulo}
                      </h2>

                      {encabezado.subtitulo && (
                        <p className="mt-0.5 text-xs font-semibold capitalize text-slate-400">
                          {encabezado.subtitulo}
                        </p>
                      )}
                    </div>

                    <span className="ml-auto rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-600">
                      {tareasFecha.length} tareas
                    </span>
                  </div>

                  <div className="p-5">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                      {tareasVisibles.map((tarea) => (
                        <TareaCard
                          key={tarea.id}
                          tarea={tarea}
                          miUsuario={miUsuario}
                          nombresAsignados={obtenerNombresAsignados(
                            tarea.asignados_ids,
                          )}
                          procesando={
                            String(procesandoId) ===
                            String(tarea.id)
                          }
                          onClick={() => abrirDetalle(tarea)}
                          onCambiarEstado={(nuevoEstado) =>
                            cambiarEstado(
                              tarea,
                              nuevoEstado,
                            )
                          }
                        />
                      ))}
                    </div>

                    {(tareasRestantes > 0 ||
                      estaExpandida) && (
                      <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-center">
                        {tareasRestantes > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              mostrarMasTareasFecha(
                                claveFecha,
                              )
                            }
                            className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-blue-700 transition hover:bg-blue-100"
                          >
                            <ChevronDown size={16} />

                            Ver hasta 6 más

                            <span className="rounded-full bg-blue-200 px-2 py-0.5 text-[10px]">
                              {tareasRestantes}
                            </span>
                          </button>
                        )}

                        {estaExpandida && (
                          <button
                            type="button"
                            onClick={() =>
                              mostrarMenosTareasFecha(
                                claveFecha,
                              )
                            }
                            className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-slate-600 transition hover:bg-slate-100"
                          >
                            <ChevronUp size={16} />

                            Mostrar solo 6
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              );
            },
          )}

          {(fechasRestantes > 0 ||
            limiteFechas > LIMITE_FECHAS_INICIAL) && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {fechasRestantes > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setLimiteFechas(
                      (actual) =>
                        actual + INCREMENTO_FECHAS,
                    )
                  }
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-blue-800"
                >
                  <ChevronDown size={17} />

                  Ver más fechas

                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px]">
                    {fechasRestantes}
                  </span>
                </button>
              )}

              {limiteFechas > LIMITE_FECHAS_INICIAL && (
                <button
                  type="button"
                  onClick={() =>
                    setLimiteFechas(
                      LIMITE_FECHAS_INICIAL,
                    )
                  }
                  className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 transition hover:text-slate-800"
                >
                  <ChevronUp size={16} />

                  Mostrar menos fechas
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <TareaDetalleModal
        key={tareaSeleccionada?.id ?? "sin-tarea"}
        isOpen={isModalDetalleOpen}
        onClose={cerrarDetalle}
        tarea={tareaSeleccionada}
        usuarios={usuarios}
        miUsuario={miUsuario}
        nombresAsignados={
          tareaSeleccionada
            ? obtenerNombresAsignados(
                tareaSeleccionada.asignados_ids,
              )
            : ""
        }
        procesando={
          String(procesandoId) ===
          String(tareaSeleccionada?.id)
        }
        onActualizar={actualizarTarea}
        onCambiarEstado={(nuevoEstado) =>
          cambiarEstado(
            tareaSeleccionada,
            nuevoEstado,
          )
        }
        onEliminar={eliminarTarea}
        onRetroalimentar={retroalimentarTarea}
      />

      {isModalCrearOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsModalCrearOpen(false);
            }
          }}
        >
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-100 p-2.5 text-blue-700">
                  <CalendarClock size={20} />
                </div>

                <div>
                  <h2 className="text-lg font-black text-slate-800">
                    Nueva tarea
                  </h2>

                  <p className="mt-0.5 text-xs font-semibold text-slate-500">
                    Asigna una actividad y define su prioridad.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsModalCrearOpen(false)
                }
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </header>

            <form
              id="form-nueva-tarea"
              onSubmit={crearTarea}
              className="flex-1 space-y-5 overflow-y-auto p-6"
            >
              <label className="block space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-600">
                  ¿Qué hay que hacer?
                </span>

                <input
                  type="text"
                  value={titulo}
                  onChange={(event) =>
                    setTitulo(event.target.value)
                  }
                  placeholder="Ej. Actualizar catálogo de productos"
                  className={inputClass}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-600">
                  Descripción
                </span>

                <textarea
                  rows={3}
                  value={descripcion}
                  onChange={(event) =>
                    setDescripcion(event.target.value)
                  }
                  placeholder="Instrucciones y detalles adicionales..."
                  className={`${inputClass} resize-none`}
                />
              </label>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-600">
                    Fecha y hora límite
                  </span>

                  <input
                    type="datetime-local"
                    value={fechaLimite}
                    onChange={(event) =>
                      setFechaLimite(event.target.value)
                    }
                    className={inputClass}
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-600">
                    Prioridad
                  </span>

                  <select
                    value={prioridad}
                    onChange={(event) =>
                      setPrioridad(event.target.value)
                    }
                    className={inputClass}
                  >
                    {PRIORIDADES.map((elemento) => (
                      <option
                        key={elemento.value}
                        value={elemento.value}
                      >
                        {elemento.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-600">
                  Asignar a
                </p>

                <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
                  {usuarios.map((usuario) => (
                    <label
                      key={usuario.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg p-2.5 transition hover:bg-slate-200/60"
                    >
                      <input
                        type="checkbox"
                        checked={asignados.includes(
                          usuario.id,
                        )}
                        onChange={() =>
                          cambiarAsignado(usuario.id)
                        }
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
            </form>

            <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setIsModalCrearOpen(false)
                }
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-600 transition hover:bg-slate-100"
              >
                Cancelar
              </button>

              <button
                type="submit"
                form="form-nueva-tarea"
                disabled={procesandoId === "creando"}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-7 py-3 text-xs font-black uppercase tracking-widest text-white shadow-md transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={16} />

                {procesandoId === "creando"
                  ? "Guardando..."
                  : "Asignar tarea"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}