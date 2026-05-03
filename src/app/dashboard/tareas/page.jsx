"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/app/_lib/supabase/supabase";
import Swal from "sweetalert2";
import {
  Plus,
  CheckCircle2,
  Circle,
  CalendarClock,
  User,
  Trash2,
  ListTodo,
  X,
  Clock,
  Users,
} from "lucide-react";

export default function GestionTareas() {
  const [tareas, setTareas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [miUsuario, setMiUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estado del formulario
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [asignados, setAsignados] = useState([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data: miPerfil } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      setMiUsuario(miPerfil);

      // 🟢 Traemos a todos los usuarios para poder pintar los nombres de los compañeros en tareas conjuntas
      const { data: perfiles } = await supabase
        .from("perfiles")
        .select("*")
        .order("nombre");
      setUsuarios(perfiles || []);

      // Traer tareas ordenadas por fecha de vencimiento
      let query = supabase
        .from("tareas")
        .select(`*, creador:perfiles!tareas_creado_por_fkey(nombre)`)
        .order("estado", { ascending: false })
        .order("fecha_limite", { ascending: true, nullsFirst: false });

      // Si es empleado, SOLO ve las tareas donde su ID esté incluido en el arreglo 'asignados_ids'
      if (miPerfil.rol === "empleado") {
        query = query.contains("asignados_ids", [miPerfil.id]);
      }

      const { data: tareasData, error: tareasError } = await query;
      if (tareasError) throw tareasError;

      setTareas(tareasData || []);
    } catch (error) {
      console.error("Error cargando tareas:", error);
    } finally {
      setCargando(false);
    }
  };

  const abrirModal = () => {
    setTitulo("");
    setDescripcion("");
    setFechaLimite("");
    // Por defecto, me asigno a mí mismo al abrir
    setAsignados(miUsuario ? [miUsuario.id] : []);
    setIsModalOpen(true);
  };

  const handleCheckboxAsignado = (idUsuario) => {
    if (asignados.includes(idUsuario)) {
      setAsignados(asignados.filter((id) => id !== idUsuario));
    } else {
      setAsignados([...asignados, idUsuario]);
    }
  };

  const handleCrearTarea = async (e) => {
    e.preventDefault();
    if (!titulo.trim() || asignados.length === 0) {
      Swal.fire(
        "Atención",
        "Debes escribir un título y asignar al menos a una persona.",
        "warning",
      );
      return;
    }
    setCargando(true);

    try {
      // 🟢 Creamos UNA SOLA TAREA con el arreglo de IDs de los involucrados
      const { error } = await supabase.from("tareas").insert([
        {
          titulo,
          descripcion,
          fecha_limite: fechaLimite
            ? new Date(fechaLimite).toISOString()
            : null,
          asignados_ids: asignados, // Guardamos todos los IDs aquí
          creado_por: miUsuario.id,
          estado: "pendiente",
        },
      ]);

      if (error) throw error;

      Swal.fire({
        title: "Tarea Asignada",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
      setIsModalOpen(false);
      cargarDatos();
    } catch (error) {
      Swal.fire("Error", error.message, "error");
    } finally {
      setCargando(false);
    }
  };

  const toggleEstado = async (id, estadoActual) => {
    const nuevoEstado =
      estadoActual === "pendiente" ? "completada" : "pendiente";
    try {
      const { error } = await supabase
        .from("tareas")
        .update({ estado: nuevoEstado })
        .eq("id", id);
      if (error) throw error;
      cargarDatos();
    } catch (error) {
      console.error(error);
    }
  };

  const eliminarTarea = async (id) => {
    if (!window.confirm("¿Eliminar esta tarea definitivamente?")) return;
    try {
      const { error } = await supabase.from("tareas").delete().eq("id", id);
      if (error) throw error;
      cargarDatos();
    } catch (error) {
      console.error(error);
    }
  };

  // Lógica de tiempo restante
  const obtenerEtiquetaTiempo = (fechaString) => {
    if (!fechaString) return null;

    const limite = new Date(fechaString);
    const ahora = new Date();

    const difMs = limite - ahora;
    const difDias = Math.floor(difMs / (1000 * 60 * 60 * 24));
    const difHoras = Math.floor(
      (difMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );

    const horaFormateada = limite.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (difMs < 0) {
      return {
        texto: `Vencida (Era a las ${horaFormateada})`,
        color: "bg-red-100 text-red-700 border-red-200",
      };
    }
    if (difDias === 0) {
      return {
        texto: `¡Vence HOY a las ${horaFormateada}! (en ${difHoras}h)`,
        color: "bg-orange-100 text-orange-700 border-orange-200",
      };
    }
    if (difDias === 1) {
      return {
        texto: `Vence mañana a las ${horaFormateada}`,
        color: "bg-amber-100 text-amber-700 border-amber-200",
      };
    }
    return {
      texto: `Vence en ${difDias} días a las ${horaFormateada}`,
      color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    };
  };

  // 🟢 Helper para obtener los nombres de los asignados
  const obtenerNombresAsignados = (ids) => {
    if (!ids || ids.length === 0) return "Nadie";
    // Extraemos solo el primer nombre para que no ocupe tanto espacio
    const nombres = ids.map((id) => {
      const usr = usuarios.find((u) => u.id === id);
      return usr ? usr.nombre.split(" ")[0] : "Alguien";
    });
    return nombres.join(", ");
  };

  const tareasPendientes = tareas.filter((t) => t.estado === "pendiente");
  const tareasCompletadas = tareas.filter((t) => t.estado === "completada");

  return (
    <div className="max-w-[90rem] mx-auto space-y-6">
      {/* HEADER AMPLIO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <ListTodo className="text-blue-700" /> Control de Tareas
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Visualiza y gestiona las actividades conjuntas del equipo.
          </p>
        </div>

        <button
          onClick={abrirModal}
          className="mt-4 sm:mt-0 bg-blue-700 text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-blue-800 transition-all shadow-md shadow-blue-700/20 active:scale-95"
        >
          <Plus size={16} /> Nueva Tarea
        </button>
      </div>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="space-y-8">
        {/* SECCIÓN: POR HACER */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
            Pendientes ({tareasPendientes.length})
          </h3>

          {cargando ? (
            <div className="flex justify-center p-8">
              <div className="w-8 h-8 border-4 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : tareasPendientes.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-12 text-center">
              <CheckCircle2
                size={40}
                className="mx-auto text-emerald-400 mb-3"
              />
              <p className="text-slate-500 font-bold text-lg">
                ¡Excelente trabajo!
              </p>
              <p className="text-slate-400 text-sm">
                No hay tareas pendientes por ahora.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {tareasPendientes.map((tarea) => {
                const etiquetaReloj = obtenerEtiquetaTiempo(tarea.fecha_limite);
                const nombresAsignados = obtenerNombresAsignados(
                  tarea.asignados_ids,
                );
                const esConjunta = tarea.asignados_ids?.length > 1;

                return (
                  <div
                    key={tarea.id}
                    className="bg-slate-50 p-5 rounded-xl border border-slate-200 flex flex-col hover:border-blue-300 hover:shadow-md transition-all group relative overflow-hidden"
                  >
                    {/* Indicador visual si es compartida */}
                    {esConjunta && (
                      <div className="absolute top-0 right-0 bg-blue-100 text-blue-700 text-[9px] font-black uppercase px-2 py-1 rounded-bl-lg flex items-center gap-1">
                        <Users size={10} /> Equipo
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleEstado(tarea.id, tarea.estado)}
                        className="text-slate-300 hover:text-emerald-500 mt-0.5 transition-colors shrink-0"
                      >
                        <Circle size={26} strokeWidth={2.5} />
                      </button>
                      <div className="flex-1 min-w-0 pr-6">
                        <h4
                          className="font-bold text-slate-800 text-lg truncate"
                          title={tarea.titulo}
                        >
                          {tarea.titulo}
                        </h4>
                        {tarea.descripcion && (
                          <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                            {tarea.descripcion}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => eliminarTarea(tarea.id)}
                        className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-200/60 flex flex-col gap-2">
                      {etiquetaReloj && (
                        <div
                          className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 w-fit border ${etiquetaReloj.color}`}
                        >
                          <Clock size={12} strokeWidth={3} />{" "}
                          {etiquetaReloj.texto}
                        </div>
                      )}
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mt-1">
                        <User
                          size={12}
                          className={
                            esConjunta ? "text-purple-600" : "text-blue-600"
                          }
                        />
                        Asignada a:{" "}
                        <span
                          className="text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md truncate max-w-[200px]"
                          title={nombresAsignados}
                        >
                          {nombresAsignados}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECCIÓN: COMPLETADAS */}
        {tareasCompletadas.length > 0 && (
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-slate-500 text-sm uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-200 pb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              Completadas ({tareasCompletadas.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 opacity-75">
              {tareasCompletadas.map((tarea) => (
                <div
                  key={tarea.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4 group"
                >
                  <button
                    onClick={() => toggleEstado(tarea.id, tarea.estado)}
                    className="text-emerald-500 hover:text-slate-400 transition-colors shrink-0"
                  >
                    <CheckCircle2 size={26} strokeWidth={2.5} />
                  </button>
                  <div className="flex-1 min-w-0 line-through text-slate-500">
                    <h4 className="font-bold truncate">{tarea.titulo}</h4>
                    <p className="text-[10px] font-bold uppercase mt-1 tracking-wider text-slate-400">
                      Hecho: {obtenerNombresAsignados(tarea.asignados_ids)}
                    </p>
                  </div>
                  <button
                    onClick={() => eliminarTarea(tarea.id)}
                    className="text-slate-300 hover:text-red-500 p-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL PARA CREAR TAREA */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* CABECERA MODAL */}
            <div className="flex justify-between items-center p-6 bg-slate-50 border-b border-slate-200 shrink-0">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <CalendarClock size={20} />
                </div>
                Agregar Nueva Tarea
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* FORMULARIO MODAL */}
            <form
              onSubmit={handleCrearTarea}
              className="p-6 space-y-5 overflow-y-auto max-h-[70vh]"
            >
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                  ¿Qué hay que hacer? *
                </label>
                <input
                  type="text"
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej. Realizar corte de caja..."
                  className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 font-semibold text-slate-800 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                  Detalles (Opcional)
                </label>
                <textarea
                  rows="2"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Instrucciones adicionales..."
                  className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 text-slate-800 resize-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                  Fecha y Hora Límite
                </label>
                <input
                  type="datetime-local"
                  value={fechaLimite}
                  onChange={(e) => setFechaLimite(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 font-bold text-blue-800 transition-all cursor-pointer"
                />
              </div>

              {/* SELECCIÓN MÚLTIPLE DE EMPLEADOS */}
              {(miUsuario?.rol === "admin" || miUsuario?.rol === "editor") && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-2">
                    Asignar a (Individual o Conjunta)
                  </label>
                  <div className="max-h-40 overflow-y-auto bg-slate-50 border border-slate-300 rounded-xl p-2 space-y-1">
                    {usuarios.map((u) => (
                      <label
                        key={u.id}
                        className="flex items-center gap-3 p-2 hover:bg-slate-200/50 rounded-lg cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={asignados.includes(u.id)}
                          onChange={() => handleCheckboxAsignado(u.id)}
                          className="w-4 h-4 accent-blue-700 cursor-pointer"
                        />
                        <span className="text-sm font-semibold text-slate-700">
                          {u.nombre}
                        </span>
                        <span className="text-[9px] uppercase font-bold text-slate-400 ml-auto tracking-widest">
                          {u.rol}
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="text-[10px] text-blue-600 font-bold mt-1.5">
                    Si seleccionas a varios, compartirán la misma tarea y
                    cualquiera podrá marcarla como completada.
                  </p>
                </div>
              )}
            </form>

            {/* FOOTER BOTONES */}
            <div className="flex justify-end gap-3 p-6 bg-slate-50 border-t border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 font-bold text-slate-500 hover:bg-slate-200/50 rounded-xl transition-all text-sm tracking-wide"
              >
                Cancelar
              </button>
              <button
                type="submit"
                onClick={handleCrearTarea}
                disabled={cargando}
                className="bg-blue-700 hover:bg-blue-800 text-white px-8 py-2.5 rounded-xl font-bold text-sm tracking-wide shadow-lg shadow-blue-700/30 transition-all disabled:opacity-50 flex items-center gap-2 active:scale-95"
              >
                {cargando ? "Guardando..." : "Asignar Tarea"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
