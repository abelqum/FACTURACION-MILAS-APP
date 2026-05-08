"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/app/_lib/supabase/supabase";
import Swal from "sweetalert2";
import {
  Plus,
  CheckCircle2,
  CalendarClock,
  ListTodo,
  X,
  Filter,
} from "lucide-react";

// 🟢 Importamos los componentes externos
import TareaCard from "@/app/_components/TareaCard";
import TareaDetalleModal from "@/app/_components/TareaDetalleModal";

export default function GestionTareas() {
  const [tareas, setTareas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [miUsuario, setMiUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Estados para modales
  const [isModalCrearOpen, setIsModalCrearOpen] = useState(false);
  const [tareaSeleccionada, setTareaSeleccionada] = useState(null);
  const [isModalDetalleOpen, setIsModalDetalleOpen] = useState(false);

  // Estado del formulario de creación
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [asignados, setAsignados] = useState([]);

  // 🟢 ESTADO DEL FILTRO
  const [filtroUsuario, setFiltroUsuario] = useState("todos");

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

      const { data: perfiles } = await supabase
        .from("perfiles")
        .select("*")
        .order("nombre");
      setUsuarios(perfiles || []);

      const { data: tareasData, error: tareasError } = await supabase
        .from("tareas")
        .select(`*, creador:perfiles!tareas_creado_por_fkey(nombre)`)
        .order("estado", { ascending: false })
        .order("fecha_limite", { ascending: true, nullsFirst: false });

      if (tareasError) throw tareasError;
      setTareas(tareasData || []);
    } catch (error) {
      console.error("Error cargando tareas:", error);
    } finally {
      setCargando(false);
    }
  };

  const abrirModalCrear = () => {
    setTitulo("");
    setDescripcion("");
    setFechaLimite("");
    setAsignados(miUsuario ? [miUsuario.id] : []);
    setIsModalCrearOpen(true);
  };

  const abrirDetalle = (tarea) => {
    setTareaSeleccionada(tarea);
    setIsModalDetalleOpen(true);
  };

  const handleCheckboxAsignado = (idUsuario) => {
    if (asignados.includes(idUsuario))
      setAsignados(asignados.filter((id) => id !== idUsuario));
    else setAsignados([...asignados, idUsuario]);
  };

  const handleCrearTarea = async (e) => {
    e.preventDefault();
    if (!titulo.trim() || asignados.length === 0)
      return Swal.fire(
        "Atención",
        "Escribe un título y asigna a alguien.",
        "warning",
      );
    setCargando(true);

    try {
      const { error } = await supabase.from("tareas").insert([
        {
          titulo,
          descripcion,
          fecha_limite: fechaLimite
            ? new Date(fechaLimite).toISOString()
            : null,
          asignados_ids: asignados,
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
      setIsModalCrearOpen(false);
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
      await supabase
        .from("tareas")
        .update({ estado: nuevoEstado })
        .eq("id", id);
      cargarDatos();
    } catch (error) {
      console.error(error);
    }
  };

  const eliminarTarea = async (id) => {
    if (!window.confirm("¿Eliminar esta tarea definitivamente?")) return;
    try {
      await supabase.from("tareas").delete().eq("id", id);
      cargarDatos();
      if (tareaSeleccionada?.id === id) setIsModalDetalleOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  const obtenerNombresAsignados = (ids) => {
    if (!ids || ids.length === 0) return "Nadie";
    const nombres = ids.map((id) => {
      const usr = usuarios.find((u) => u.id === id);
      return usr ? usr.nombre.split(" ")[0] : "Alguien";
    });
    return nombres.join(", ");
  };

  // 🟢 LÓGICA DE FILTRADO
  // 🟢 LÓGICA DE FILTRADO
  const tareasFiltradas = tareas.filter((t) => {
    // 1. Filtros exclusivos para Empleados
    if (miUsuario?.rol === "empleado") {
      if (filtroUsuario === "mis_tareas")
        return t.asignados_ids?.includes(miUsuario?.id);
      if (filtroUsuario === "asignadas_por_mi")
        return t.creado_por === miUsuario?.id;
      // "todos" para empleado significa: las que me tocan + las que yo asigne
      return (
        t.asignados_ids?.includes(miUsuario?.id) ||
        t.creado_por === miUsuario?.id
      );
    }

    // 2. Filtros para Administradores / Editores
    if (filtroUsuario === "todos") return true; // El admin sí ve literalmente TODO el sistema
    if (filtroUsuario === "mis_tareas")
      return t.asignados_ids?.includes(miUsuario?.id);
    if (filtroUsuario === "asignadas_por_mi")
      return t.creado_por === miUsuario?.id;

    // Si seleccionó el nombre de alguien en específico
    return t.asignados_ids?.includes(filtroUsuario);
  });
  const tareasPendientes = tareasFiltradas.filter(
    (t) => t.estado === "pendiente",
  );
  const tareasCompletadas = tareasFiltradas.filter(
    (t) => t.estado === "completada",
  );

  return (
    <div className="max-w-[90rem] mx-auto space-y-6">
      {/* 🟢 HEADER CORREGIDO: Todo a la izquierda, sin desbordamientos */}
      <div className="border-b border-slate-200 pb-6 space-y-4">
        {/* Títulos */}
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <ListTodo className="text-blue-700" /> Control de Tareas
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Visualiza y gestiona las actividades del equipo.
          </p>
        </div>

        {/* Controles alineados a la izquierda y con flex-wrap para que bajen solos si no caben */}
        <div className="flex flex-wrap items-center gap-3">
          {(miUsuario?.rol === "admin" || miUsuario?.rol === "empleado") && (
            <div className="relative w-full sm:w-auto flex items-center justify-start">
              <select
                value={filtroUsuario}
                onChange={(e) => setFiltroUsuario(e.target.value)}
                className="w-full sm:w-64 pl-4 p-3 pr-8 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent shadow-sm cursor-pointer appearance-none truncate"
              >
                <option value="todos">
                  {miUsuario?.rol === "admin"
                    ? "Mostrar todas las tareas"
                    : "Todas mis actividades"}
                </option>
                <option value="mis_tareas">Lo que me toca hacer</option>
                <option value="asignadas_por_mi">Lo que delegué a otros</option>

                {/* Solo los administradores pueden filtrar por nombres del resto del equipo */}
                {(miUsuario?.rol === "admin" ||
                  miUsuario?.rol === "editor") && (
                  <optgroup label="Equipo de Trabajo">
                    {usuarios
                      .filter((u) => u.id !== miUsuario?.id)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          Tareas de {u.nombre}
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
            </div>
          )}

          <button
            onClick={abrirModalCrear}
            className="bg-blue-700 p-5 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-800 transition-all shadow-md shadow-blue-700/20 active:scale-95 shrink-0"
          >
            <Plus size={16} /> Nueva Tarea
          </button>
        </div>
      </div>

      {/* ÁREA DE TARJETAS */}
      <div className="space-y-8">
        {/* PENDIENTES */}
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
                ¡No hay tareas pendientes aquí!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {tareasPendientes.map((tarea) => (
                <TareaCard
                  key={tarea.id}
                  tarea={tarea}
                  nombresAsignados={obtenerNombresAsignados(
                    tarea.asignados_ids,
                  )}
                  esConjunta={tarea.asignados_ids?.length > 1}
                  onToggle={() => toggleEstado(tarea.id, tarea.estado)}
                  onDelete={() => eliminarTarea(tarea.id)}
                  onClick={() => abrirDetalle(tarea)}
                />
              ))}
            </div>
          )}
        </div>

        {/* COMPLETADAS */}
        {tareasCompletadas.length > 0 && (
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-slate-500 text-sm uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-200 pb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              Completadas ({tareasCompletadas.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {tareasCompletadas.map((tarea) => (
                <TareaCard
                  key={tarea.id}
                  tarea={tarea}
                  nombresAsignados={obtenerNombresAsignados(
                    tarea.asignados_ids,
                  )}
                  esConjunta={tarea.asignados_ids?.length > 1}
                  onToggle={() => toggleEstado(tarea.id, tarea.estado)}
                  onDelete={() => eliminarTarea(tarea.id)}
                  onClick={() => abrirDetalle(tarea)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE DETALLES */}
      <TareaDetalleModal
        isOpen={isModalDetalleOpen}
        onClose={() => setIsModalDetalleOpen(false)}
        tarea={tareaSeleccionada}
        nombresAsignados={
          tareaSeleccionada
            ? obtenerNombresAsignados(tareaSeleccionada.asignados_ids)
            : ""
        }
      />

      {/* MODAL PARA CREAR TAREA */}
      {isModalCrearOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsModalCrearOpen(false)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 bg-slate-50 border-b border-slate-200 shrink-0">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <CalendarClock size={20} />
                </div>
                Agregar Nueva Tarea
              </h2>
              <button
                onClick={() => setIsModalCrearOpen(false)}
                className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

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
                  placeholder="Ej. Realizar mantenimiento a..."
                  className="w-full bg-white border border-slate-300 p-3 rounded-xl focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 font-semibold text-slate-800 shadow-sm"
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
                  className="w-full bg-white border border-slate-300 p-3 rounded-xl focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 text-slate-800 resize-none shadow-sm"
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
                  className="w-full bg-white border border-slate-300 p-3 rounded-xl focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 font-bold text-blue-800 cursor-pointer shadow-sm"
                />
              </div>
              {(miUsuario?.rol === "admin" ||
                miUsuario?.rol === "empleado") && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-2">
                    Asignar a (Individual o Conjunta)
                  </label>
                  <div className="max-h-40 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-1 shadow-inner">
                    {usuarios.map((u) => (
                      <label
                        key={u.id}
                        className="flex items-center gap-3 p-2 hover:bg-slate-200/60 rounded-lg cursor-pointer transition-colors"
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
                        <span className="text-[9px] uppercase font-bold text-slate-400 ml-auto tracking-widest bg-white px-2 py-0.5 rounded shadow-sm">
                          {u.rol}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </form>

            <div className="flex justify-end gap-3 p-6 bg-slate-50 border-t border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalCrearOpen(false)}
                className="px-6 py-2.5 font-bold text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 rounded-xl transition-all text-sm tracking-wide"
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
