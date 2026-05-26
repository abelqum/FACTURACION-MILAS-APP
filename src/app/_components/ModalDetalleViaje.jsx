"use client";
import { useState } from "react";
import { supabase } from "@/app/_lib/supabase/supabase";
import Swal from "sweetalert2";
import { X, Camera, UploadCloud, Plus, Save, Trash2, CheckCircle, AlertCircle, Clock, ExternalLink, Flag, Image as ImageIcon } from "lucide-react";

export default function ModalDetalleViaje({ isOpen, onClose, viaje, onActualizado, rolUsuario }) {
  const [cargando, setCargando] = useState(false);
  
  const [nuevosGastos, setNuevosGastos] = useState([{
    categoria: "", descripcion: "", monto: "", fotoArchivo: null, fotoPreview: null
  }]);

  if (!isOpen || !viaje) return null;

  // 🟢 Mapeo de Categorías con estilos Tailwind explícitos
  const categoriasPresupuesto = [
    { id: 'Comidas/Alimentos', key: 'presupuesto_alimentos', styles: { border: 'border-emerald-200', title: 'text-emerald-600', bar: 'bg-emerald-500', bg: 'bg-white' } },
    { id: 'Gasolina', key: 'presupuesto_gasolina', styles: { border: 'border-orange-200', title: 'text-orange-600', bar: 'bg-orange-500', bg: 'bg-white' } },
    { id: 'Casetas', key: 'presupuesto_casetas', styles: { border: 'border-amber-200', title: 'text-amber-600', bar: 'bg-amber-500', bg: 'bg-white' } },
    { id: 'Hospedaje', key: 'presupuesto_hospedaje', styles: { border: 'border-indigo-200', title: 'text-indigo-600', bar: 'bg-indigo-500', bg: 'bg-white' } },
    { id: 'Material', key: 'presupuesto_material', styles: { border: 'border-purple-200', title: 'text-purple-600', bar: 'bg-purple-500', bg: 'bg-white' } },
    { id: 'Otros', key: 'presupuesto_otros', styles: { border: 'border-slate-300', title: 'text-slate-600', bar: 'bg-slate-500', bg: 'bg-white' } }
  ];

  const agregarGastoFila = () => setNuevosGastos([...nuevosGastos, { categoria: "", descripcion: "", monto: "", fotoArchivo: null, fotoPreview: null }]);
  const quitarGastoFila = (idx) => setNuevosGastos(nuevosGastos.filter((_, i) => i !== idx));
  const actualizarGasto = (idx, campo, valor) => {
    const nuevos = [...nuevosGastos];
    nuevos[idx][campo] = valor;
    setNuevosGastos(nuevos);
  };
  const handleFotoChange = (idx, e) => {
    const file = e.target.files[0];
    if (file) {
      const nuevos = [...nuevosGastos];
      nuevos[idx].fotoArchivo = file;
      nuevos[idx].fotoPreview = URL.createObjectURL(file);
      setNuevosGastos(nuevos);
    }
  };

  const optimizarImagen = (file) => {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let { width, height } = img;
          if (width > height && width > 1000) { height *= 1000 / width; width = 1000; } 
          else if (height > 1000) { width *= 1000 / height; height = 1000; }
          canvas.width = width; canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          
          // Generamos un nombre único y seguro
          const uniqueId = Math.random().toString(36).substring(2, 10);
          canvas.toBlob((blob) => resolve(new File([blob], `ticket_${Date.now()}_${uniqueId}.webp`, { type: "image/webp" })), "image/webp", 0.7);
        };
        img.onerror = () => reject(new Error("Error procesando imagen"));
      };
      reader.onerror = () => reject(new Error("Error leyendo archivo"));
    });
  };

  const handleGuardarTickets = async () => {
    const validos = nuevosGastos.filter(g => g.categoria && g.descripcion && g.monto);
    if (validos.length === 0) return Swal.fire("Atención", "Llena Categoría, Descripción y Monto de al menos un ticket.", "warning");

    setCargando(true);
    Swal.fire({ title: "Procesando registros...", text: "Subiendo comprobantes, por favor espera.", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Procesar y subir TODAS las fotos en paralelo (Es rapidísimo)
      const promesasGastos = validos.map(async (gasto) => {
        let publicUrl = null;
        
        if (gasto.fotoArchivo) {
          const optimizedFile = await optimizarImagen(gasto.fotoArchivo);
          const fileName = `viaje_${viaje.id}/${optimizedFile.name}`;
          
          const { error: upErr } = await supabase.storage.from("tickets_gastos").upload(fileName, optimizedFile, { contentType: "image/webp", upsert: true });
          if (upErr) throw upErr;
          
          const { data: urlData } = supabase.storage.from("tickets_gastos").getPublicUrl(fileName);
          publicUrl = urlData.publicUrl;
        }

        // Devolvemos el objeto formateado listo para la base de datos
        return {
          id_viaje: viaje.id,
          id_usuario: user.id,
          categoria: gasto.categoria,
          descripcion: gasto.descripcion,
          monto: Number(gasto.monto),
          foto_ticket_url: publicUrl,
          estatus: "pendiente"
        };
      });

      // Esperamos a que todos terminen de subir sus fotos
      const payloadGastos = await Promise.all(promesasGastos);

      // 2. Insertamos TODOS los registros de un solo golpe (Bulk Insert)
      const { error: insertError } = await supabase.from("viaje_gastos").insert(payloadGastos);
      if (insertError) throw insertError;
      
      Swal.fire("Éxito", "Todos los gastos fueron enviados a revisión.", "success");
      setNuevosGastos([{ categoria: "", descripcion: "", monto: "", fotoArchivo: null, fotoPreview: null }]);
      onActualizado();
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Fallo al subir los gastos. Intenta de nuevo.", "error");
    } finally {
      setCargando(false);
    }
  };

  const eliminarTicket = async (gasto) => {
    const confirm = await Swal.fire({ title: "¿Borrar Comprobante?", text: "Esta acción no se puede deshacer.", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Sí, borrar" });
    if (confirm.isConfirmed) {
      setCargando(true);
      try {
        if (gasto.foto_ticket_url) {
          const urlParts = gasto.foto_ticket_url.split('/');
          const folderAndFile = `${urlParts[urlParts.length - 2]}/${urlParts[urlParts.length - 1]}`;
          await supabase.storage.from("tickets_gastos").remove([folderAndFile]);
        }
        await supabase.from("viaje_gastos").delete().eq("id", gasto.id);
        onActualizado();
      } catch (err) { Swal.fire("Error", "No se pudo borrar el comprobante.", "error"); } 
      finally { setCargando(false); }
    }
  };

  const cambiarEstatusGasto = async (gastoId, nuevoEstatus) => {
    let motivo = null;
    if (nuevoEstatus === 'rechazado') {
      const { value: razon } = await Swal.fire({ title: 'Rechazar Gasto', text: 'Motivo del rechazo:', input: 'textarea', showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Rechazar" });
      if (!razon) return;
      motivo = razon;
    }
    setCargando(true);
    await supabase.from("viaje_gastos").update({ estatus: nuevoEstatus, motivo_rechazo: motivo }).eq("id", gastoId);
    setCargando(false);
    onActualizado();
  };

  const finalizarViaje = async () => {
    const pendientes = viaje.viaje_gastos?.filter(g => g.estatus === 'pendiente').length || 0;
    if (pendientes > 0) return Swal.fire("Atención", "Aún tienes tickets pendientes de revisar.", "warning");

    const confirm = await Swal.fire({ title: "¿Finalizar Viaje y Cerrar Cuentas?", icon: "warning", showCancelButton: true, confirmButtonColor: "#10b981", confirmButtonText: "Sí, finalizar" });
    if (confirm.isConfirmed) {
      setCargando(true);
      try {
        await supabase.from("viajes").update({ estatus: 'finalizado' }).eq("id", viaje.id);
        Swal.fire({ icon: "success", title: "Viaje Finalizado", toast: true, position: "top-end", timer: 2000, showConfirmButton: false });
        onActualizado();
      } catch (err) { Swal.fire("Error", "No se pudo finalizar.", "error"); } 
      finally { setCargando(false); }
    }
  };

  const formatearDinero = (num) => `$${Number(num).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-slate-50 w-full max-w-6xl rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        
        <div className="p-6 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-black text-slate-800 text-xl flex items-center gap-2">
              Comprobación: {viaje.nombre}
              {viaje.estatus === 'finalizado' && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] uppercase tracking-widest font-black flex items-center gap-1"><CheckCircle size={12}/> Cerrado</span>}
            </h3>
            <p className="text-xs text-slate-500 font-bold mt-1">Sube tus tickets y controla tu presupuesto asignado.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 bg-slate-100 rounded-xl transition-all"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* 🟢 REJILLA A 3 COLUMNAS Y COLORES CORRECTOS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {categoriasPresupuesto.map(cat => {
              const pres = Number(viaje[cat.key] || 0);
              const gastado = viaje.viaje_gastos?.filter(g => g.categoria === cat.id && g.estatus === 'aprobado').reduce((a, g) => a + Number(g.monto), 0) || 0;
              const disp = pres - gastado;
              const porcentaje = pres > 0 ? Math.min((gastado / pres) * 100, 100) : 0;
              
              // Lógica de colores fijos
              const isNeg = disp < 0;
              const currentStyles = isNeg 
                ? { border: 'border-red-200', title: 'text-red-600', bar: 'bg-red-500', bg: 'bg-red-50' } 
                : cat.styles;

              return (
                <div key={cat.id} className={`${currentStyles.bg} border ${currentStyles.border} rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-colors`}>
                  <h4 className={`text-[10px] font-black ${currentStyles.title} uppercase tracking-widest mb-3 line-clamp-1`}>
                    {cat.id}
                  </h4>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className={`text-2xl font-black ${isNeg ? 'text-red-700' : 'text-slate-800'}`}>
                        {formatearDinero(disp)}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Disponible</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-600">{formatearDinero(gastado)} gastado</p>
                      <p className="text-xs text-slate-400 font-semibold">de {formatearDinero(pres)}</p>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200/50 h-2 mt-3 rounded-full overflow-hidden">
                    <div className={`h-full ${currentStyles.bar}`} style={{ width: `${porcentaje}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>

          {viaje.estatus !== 'finalizado' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h4 className="font-black text-slate-700 text-sm uppercase tracking-widest">Subir Nuevos Tickets</h4>
                <button onClick={agregarGastoFila} className="px-3 py-1.5 bg-slate-100 text-slate-700 font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1">
                  <Plus size={14} /> Fila
                </button>
              </div>

              {nuevosGastos.map((gasto, idx) => (
                <div key={idx} className="flex flex-col md:flex-row gap-3 items-start md:items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="w-12 h-12 shrink-0 bg-white border border-slate-200 rounded-xl overflow-hidden relative flex items-center justify-center group">
                    {gasto.fotoPreview ? (
                      <img src={gasto.fotoPreview} className="w-full h-full object-cover" />
                    ) : <Camera size={16} className="text-slate-300" />}
                    <label className="absolute inset-0 bg-blue-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                      <UploadCloud size={14} className="text-white" />
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFotoChange(idx, e)} />
                    </label>
                  </div>

                  <div className="w-full md:w-36 shrink-0">
                    <select required value={gasto.categoria} onChange={(e) => actualizarGasto(idx, "categoria", e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-600 outline-none">
                      <option value="">Categoría...</option>
                      {categoriasPresupuesto.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
                    </select>
                  </div>

                  <div className="w-full flex-1">
                    <input required type="text" placeholder="(Descripción del pago)" value={gasto.descripcion} onChange={(e) => actualizarGasto(idx, "descripcion", e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-600 outline-none" />
                  </div>

                  <div className="w-full md:w-32 shrink-0 relative">
                    <span className="absolute left-2 top-2 text-slate-400 text-xs font-bold">$</span>
                    <input required type="number" min="0.01" step="0.01" placeholder="Monto" value={gasto.monto} onChange={(e) => actualizarGasto(idx, "monto", e.target.value)} className="w-full p-2 pl-6 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:border-blue-600 outline-none text-right" />
                  </div>

                  <button type="button" onClick={() => quitarGastoFila(idx)} disabled={nuevosGastos.length === 1} className="p-2 shrink-0 text-slate-300 hover:text-red-500 bg-white border border-slate-200 rounded-lg disabled:opacity-30">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <div className="flex justify-end pt-2">
                <button onClick={handleGuardarTickets} disabled={cargando} className="px-6 py-2 bg-slate-800 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-md hover:bg-slate-900 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2">
                  {cargando ? "Enviando..." : "Enviar a Revisión"} <Save size={14} />
                </button>
              </div>
            </div>
          )}

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h4 className="font-black text-slate-700 text-sm uppercase tracking-widest border-b border-slate-100 pb-3">Historial de Comprobantes</h4>
            {viaje.viaje_gastos?.length === 0 ? (
              <p className="text-center text-xs text-slate-400 font-bold py-6">No hay tickets registrados aún.</p>
            ) : (
              viaje.viaje_gastos?.map(g => (
                <div key={g.id} className={`flex flex-col md:flex-row justify-between md:items-center p-4 rounded-xl border gap-4 transition-colors ${g.estatus === 'rechazado' ? 'bg-red-50/50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex gap-4 items-center w-full md:w-auto">
                    {g.foto_ticket_url ? (
                      <a href={g.foto_ticket_url} target="_blank" className="w-12 h-12 rounded-xl bg-white border border-slate-200 overflow-hidden relative group block shrink-0 shadow-sm">
                        <img src={g.foto_ticket_url} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-blue-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><ExternalLink size={16} className="text-white"/></div>
                      </a>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center shrink-0">
                        <ImageIcon size={18} className="text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-800 leading-tight">{g.descripcion}</p>
                      <div className="flex flex-wrap gap-2 items-center mt-1">
                        <span className="text-[9px] font-black text-slate-600 bg-slate-200 px-2 py-0.5 rounded uppercase tracking-widest">{g.categoria}</span>
                        <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1"><Clock size={10}/> {new Date(g.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end w-full md:w-auto gap-2">
                    <div className="flex items-center gap-4">
                      <p className={`text-xl font-black ${g.estatus === 'rechazado' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                        {formatearDinero(g.monto)}
                      </p>
                      {g.estatus === 'pendiente' && (
                        rolUsuario === 'admin' ? (
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => cambiarEstatusGasto(g.id, 'aprobado')} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"><CheckCircle size={14} /></button>
                            <button onClick={() => cambiarEstatusGasto(g.id, 'rechazado')} className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-600 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"><X size={14} /></button>
                          </div>
                        ) : <span className="text-[10px] font-black px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg uppercase tracking-widest flex items-center gap-1 shrink-0"><Clock size={14}/> En Revisión</span>
                      )}
                      {g.estatus === 'aprobado' && <span className="text-[10px] font-black px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg uppercase tracking-widest flex items-center gap-1 shrink-0"><CheckCircle size={14}/> Aprobado</span>}
                      {(rolUsuario === 'admin' || g.estatus !== 'aprobado') && viaje.estatus !== 'finalizado' && (
                        <button onClick={() => eliminarTicket(g)} className="p-2 text-slate-400 hover:text-red-500 bg-white border border-slate-200 rounded-lg shrink-0 transition-colors" title="Borrar Ticket"><Trash2 size={16} /></button>
                      )}
                    </div>
                    {g.estatus === 'rechazado' && (
                      <div className="bg-white border border-red-200 p-2 rounded-lg text-right w-full md:max-w-xs mt-1">
                        <span className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center justify-end gap-1 mb-0.5"><AlertCircle size={12}/> Rechazado</span>
                        <p className="text-[10px] text-slate-600 font-semibold leading-tight">Motivo: {g.motivo_rechazo || "No especificado."}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {rolUsuario === "admin" && viaje.estatus === "activo" && (
          <div className="p-6 bg-slate-50 border-t border-slate-200 shrink-0 flex justify-end">
            <button onClick={finalizarViaje} disabled={cargando} className="px-8 py-3 bg-emerald-600 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-emerald-600/30 hover:shadow-emerald-700/40 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2">
              <Flag size={16} /> Finalizar Viaje y Cerrar Cuentas
            </button>
          </div>
        )}
      </div>
    </div>
  );
}