"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/app/_lib/supabase/supabase";
import Swal from "sweetalert2";
import { X, Save, Users, MapPin, Calendar, DollarSign, CarFront, Trash2 } from "lucide-react";

export default function ModalNuevoViaje({ isOpen, onClose, onGuardado, viajeEdicion }) {
  const [cargando, setCargando] = useState(false);
  const [empleadosDisponibles, setEmpleadosDisponibles] = useState([]);
  
  const [form, setForm] = useState({
    nombre: "",
    destino: "",
    fecha_inicio: new Date().toISOString().split("T")[0],
    fecha_fin: new Date().toISOString().split("T")[0],
    presupuesto_gasolina: 0,
    presupuesto_casetas: 0,
    presupuesto_alimentos: 0,
    presupuesto_hospedaje: 0,
    presupuesto_material: 0,
    presupuesto_otros: 0,
  });

  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState([]);

  const calcularDias = () => {
    const inicio = new Date(form.fecha_inicio);
    const fin = new Date(form.fecha_fin);
    const diferenciaMs = fin - inicio;
    const dias = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24)) + 1;
    return dias > 0 ? dias : 1;
  };

  const diasTotales = calcularDias();
  
  // 🟢 SUMA TOTAL DE LOS 6 RUBROS
  const presupuestoTotal = 
    Number(form.presupuesto_gasolina) + 
    Number(form.presupuesto_casetas) + 
    Number(form.presupuesto_alimentos) + 
    Number(form.presupuesto_hospedaje) + 
    Number(form.presupuesto_material) + 
    Number(form.presupuesto_otros);

  useEffect(() => {
    if (isOpen) {
      cargarEmpleados();
      if (viajeEdicion) {
        setForm({
          nombre: viajeEdicion.nombre,
          destino: viajeEdicion.destino,
          fecha_inicio: viajeEdicion.fecha_inicio,
          fecha_fin: viajeEdicion.fecha_fin,
          presupuesto_gasolina: viajeEdicion.presupuesto_gasolina || 0,
          presupuesto_casetas: viajeEdicion.presupuesto_casetas || 0,
          presupuesto_alimentos: viajeEdicion.presupuesto_alimentos || 0,
          presupuesto_hospedaje: viajeEdicion.presupuesto_hospedaje || 0,
          presupuesto_material: viajeEdicion.presupuesto_material || 0,
          presupuesto_otros: viajeEdicion.presupuesto_otros || 0,
        });
        setEmpleadosSeleccionados(viajeEdicion.viaje_usuarios?.map(u => u.id_usuario) || []);
      } else {
        setForm({
          nombre: "", destino: "",
          fecha_inicio: new Date().toISOString().split("T")[0],
          fecha_fin: new Date().toISOString().split("T")[0],
          presupuesto_gasolina: 0, presupuesto_casetas: 0, presupuesto_alimentos: 0,
          presupuesto_hospedaje: 0, presupuesto_material: 0, presupuesto_otros: 0,
        });
        setEmpleadosSeleccionados([]);
      }
    }
  }, [isOpen, viajeEdicion]);

  const cargarEmpleados = async () => {
    const { data, error } = await supabase.from("perfiles").select("id, nombre, rol").order("nombre");
    if (!error && data) setEmpleadosDisponibles(data);
  };

  const toggleEmpleado = (id) => {
    setEmpleadosSeleccionados(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (empleadosSeleccionados.length === 0) return Swal.fire("Atención", "Asigna al menos a una persona al viaje.", "warning");

    setCargando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let idViaje = null;

      const datosViaje = {
        nombre: form.nombre, destino: form.destino,
        fecha_inicio: form.fecha_inicio, fecha_fin: form.fecha_fin, dias: diasTotales,
        presupuesto_gasolina: form.presupuesto_gasolina, presupuesto_casetas: form.presupuesto_casetas,
        presupuesto_alimentos: form.presupuesto_alimentos, presupuesto_hospedaje: form.presupuesto_hospedaje,
        presupuesto_material: form.presupuesto_material, presupuesto_otros: form.presupuesto_otros,
      };

      if (viajeEdicion) {
        const { error: viajeError } = await supabase.from("viajes").update(datosViaje).eq("id", viajeEdicion.id);
        if (viajeError) throw viajeError;
        idViaje = viajeEdicion.id;
        await supabase.from("viaje_usuarios").delete().eq("id_viaje", idViaje);
      } else {
        datosViaje.creado_por = user.id;
        const { data: nuevoViaje, error: viajeError } = await supabase.from("viajes").insert([datosViaje]).select().single();
        if (viajeError) throw viajeError;
        idViaje = nuevoViaje.id;
      }

      const relaciones = empleadosSeleccionados.map(id_emp => ({ id_viaje: idViaje, id_usuario: id_emp }));
      const { error: relError } = await supabase.from("viaje_usuarios").insert(relaciones);
      if (relError) throw relError;

      Swal.fire({ icon: "success", title: "Viaje Guardado", toast: true, position: "top-end", timer: 2000, showConfirmButton: false });
      onGuardado();
      onClose();
    } catch (error) {
      Swal.fire("Error", "No se pudo guardar el viaje.", "error");
    } finally {
      setCargando(false);
    }
  };

  // 🟢 BORRAR SOLO IMÁGENES
  const eliminarSoloImagenes = async () => {
    const confirm = await Swal.fire({
      title: "¿Borrar todas las imágenes?",
      text: "Se eliminarán las fotos de todos los tickets de este viaje. Los registros de gastos se mantendrán. ¿Continuar?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#f59e0b",
      confirmButtonText: "Sí, borrar fotos",
    });

    if (confirm.isConfirmed) {
      setCargando(true);
      try {
        const { data: gastos } = await supabase.from("viaje_gastos").select("id, foto_ticket_url").eq("id_viaje", viajeEdicion.id);
        const filesToRemove = [];
        const idsToUpdate = [];

        for (const gasto of gastos || []) {
          if (gasto.foto_ticket_url) {
            const urlParts = gasto.foto_ticket_url.split('/');
            filesToRemove.push(`${urlParts[urlParts.length - 2]}/${urlParts[urlParts.length - 1]}`);
            idsToUpdate.push(gasto.id);
          }
        }

        if (filesToRemove.length > 0) {
          await supabase.storage.from("tickets_gastos").remove(filesToRemove);
          await supabase.from("viaje_gastos").update({ foto_ticket_url: null }).in("id", idsToUpdate);
        }

        Swal.fire("¡Listo!", "Todas las imágenes fueron eliminadas del servidor.", "success");
        onGuardado();
        onClose();
      } catch (error) {
        Swal.fire("Error", "No se pudieron borrar las imágenes.", "error");
      } finally {
        setCargando(false);
      }
    }
  };

  // 🟢 BORRAR VIAJE COMPLETO
  const eliminarViaje = async () => {
    const confirm = await Swal.fire({
      title: "¿Eliminar Viaje Completo?",
      text: "Se borrará todo: gastos, registros y archivos.",
      icon: "error",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Sí, borrar todo",
    });

    if (confirm.isConfirmed) {
      setCargando(true);
      try {
        const { data: gastos } = await supabase.from("viaje_gastos").select("foto_ticket_url").eq("id_viaje", viajeEdicion.id);
        const filesToRemove = gastos.filter(g => g.foto_ticket_url).map(g => {
             const parts = g.foto_ticket_url.split('/');
             return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
        });

        if (filesToRemove.length > 0) await supabase.storage.from("tickets_gastos").remove(filesToRemove);
        await supabase.from("viajes").delete().eq("id", viajeEdicion.id);

        Swal.fire({ icon: "success", title: "Viaje Eliminado", toast: true, position: "top-end", timer: 2000, showConfirmButton: false });
        onGuardado();
        onClose();
      } catch (error) {
        Swal.fire("Error", "No se pudo borrar el viaje.", "error");
      } finally {
        setCargando(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-slate-50 w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        
        <div className="p-6 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-black text-slate-800 text-xl flex items-center gap-2">
              <CarFront className="text-blue-700" /> {viajeEdicion ? "Editar Viaje" : "Nuevo Viaje Corporativo"}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">Asigna presupuestos detallados por categoría.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 bg-slate-100 hover:bg-red-50 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* COLUMNA IZQ: DATOS Y EQUIPO */}
            <div className="space-y-4">
              <h4 className="font-black text-slate-700 text-sm uppercase tracking-widest flex items-center gap-2 border-b border-slate-200 pb-2">
                <MapPin size={16} /> Detalles del Destino
              </h4>
              
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Nombre de la Operación *</label>
                <input required type="text" value={form.nombre} onChange={(e) => setForm({...form, nombre: e.target.value})} className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-600 outline-none" />
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Ubicación / Destino *</label>
                <input required type="text" value={form.destino} onChange={(e) => setForm({...form, destino: e.target.value})} className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-600 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Fecha Salida *</label>
                  <input required type="date" value={form.fecha_inicio} onChange={(e) => setForm({...form, fecha_inicio: e.target.value})} className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-600 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Fecha Retorno *</label>
                  <input required type="date" min={form.fecha_inicio} value={form.fecha_fin} onChange={(e) => setForm({...form, fecha_fin: e.target.value})} className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-600 outline-none" />
                </div>
              </div>

              <h4 className="font-black text-slate-700 text-sm uppercase tracking-widest flex items-center gap-2 border-b border-slate-200 pb-2 pt-2">
                <Users size={16} /> Equipo Asignado
              </h4>
              
              <div className="bg-white border border-slate-300 rounded-xl p-3 max-h-40 overflow-y-auto custom-scrollbar space-y-1">
                {empleadosDisponibles.map(emp => (
                  <label key={emp.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${empleadosSeleccionados.includes(emp.id) ? 'bg-blue-50 border border-blue-100' : 'hover:bg-slate-50 border border-transparent'}`}>
                    <input type="checkbox" checked={empleadosSeleccionados.includes(emp.id)} onChange={() => toggleEmpleado(emp.id)} className="w-4 h-4 accent-blue-600" />
                    <div>
                      <p className="text-sm font-bold text-slate-800">{emp.nombre}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{emp.rol}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* COLUMNA DER: 6 CATEGORÍAS */}
            <div className="space-y-4">
              <h4 className="font-black text-slate-700 text-sm uppercase tracking-widest flex items-center gap-2 border-b border-slate-200 pb-2">
                <DollarSign size={16} /> Presupuesto por Categoría
              </h4>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'presupuesto_alimentos', label: 'Comidas / Alim.' },
                  { id: 'presupuesto_gasolina', label: 'Gasolina' },
                  { id: 'presupuesto_casetas', label: 'Casetas' },
                  { id: 'presupuesto_hospedaje', label: 'Hospedaje' },
                  { id: 'presupuesto_material', label: 'Material' },
                  { id: 'presupuesto_otros', label: 'Otros' },
                ].map(cat => (
                  <div key={cat.id}>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{cat.label}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-slate-400 font-black">$</span>
                      <input 
                        type="number" min="0" step="0.01" required
                        value={form[cat.id]} 
                        onChange={(e) => setForm({...form, [cat.id]: e.target.value})} 
                        className="w-full p-3 pl-7 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-600 outline-none" 
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 mt-2">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Bolsa Total Autorizada</p>
                <p className="text-3xl font-black text-emerald-900 mt-1">${presupuestoTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

          </div>
        </form>

        <div className="p-6 bg-slate-50 border-t border-slate-200 shrink-0 flex justify-between items-center gap-3">
          {viajeEdicion ? (
            <div className="flex gap-2">
              <button type="button" onClick={eliminarViaje} disabled={cargando} className="px-4 py-3 bg-red-50 text-red-600 border border-red-200 font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center gap-2">
                <Trash2 size={16} /> Borrar Viaje
              </button>
              <button type="button" onClick={eliminarSoloImagenes} disabled={cargando} className="px-4 py-3 bg-amber-50 text-amber-700 border border-amber-200 font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all flex items-center gap-2">
                <Trash2 size={16} /> Borrar Imágenes
              </button>
            </div>
          ) : <div></div>}
          
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-6 py-3 bg-white border border-slate-300 text-slate-600 font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-slate-100 transition-all">
              Cancelar
            </button>
            <button type="button" onClick={handleSubmit} disabled={cargando} className="px-8 py-3 bg-blue-700 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-blue-700/30 hover:shadow-blue-800/40 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2">
              {cargando ? "Guardando..." : "Guardar Viaje"} <Save size={16} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}