"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/app/_lib/supabase/supabase";
import Swal from "sweetalert2";
import QRCode from "qrcode";
import { X, Save, Edit3 } from "lucide-react";

export default function ModalFormProducto({
  isOpen,
  onClose,
  productoEdicion,
  catalogos,
  onGuardado,
}) {
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState({
    modelo: "",
    descripcion: "",
    medida: "",
    id_udm: "",
    id_marca: "",
    id_almacen: "",
    fila: "",
    id_condicion: "",
    stock_minimo: 1,
    cantidad: 0,
    precio_unitario: 0,
  });

  useEffect(() => {
    if (productoEdicion) {
      setForm({
        modelo: productoEdicion.modelo || "",
        descripcion: productoEdicion.descripcion || "",
        medida: productoEdicion.medida || "",
        id_udm: productoEdicion.id_udm || "",
        id_marca: productoEdicion.id_marca || "",
        id_almacen: productoEdicion.id_almacen || "",
        fila: productoEdicion.fila || "",
        id_condicion: productoEdicion.id_condicion || "",
        stock_minimo: productoEdicion.stock_minimo || 1,
        cantidad: productoEdicion.cantidad || 0,
        precio_unitario: productoEdicion.precio_unitario || 0,
      });
    } else {
      setForm({
        modelo: "",
        descripcion: "",
        medida: "",
        id_udm: "",
        id_marca: "",
        id_almacen: "",
        fila: "",
        id_condicion: "",
        stock_minimo: 1,
        cantidad: 0,
        precio_unitario: 0,
      });
    }
  }, [productoEdicion, isOpen]);

  if (!isOpen) return null;

  const dataURLtoBlob = (dataurl) => {
    let arr = dataurl.split(","),
      mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]),
      n = bstr.length,
      u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      if (productoEdicion) {
        // ACTUALIZAR
        const { error } = await supabase
          .from("inventario")
          .update(form)
          .eq("id", productoEdicion.id);
        if (error) throw error;
        Swal.fire(
          "Actualizado",
          "Producto modificado correctamente.",
          "success",
        );
      } else {
        // CREAR NUEVO
        const { data: nuevoProducto, error } = await supabase
          .from("inventario")
          .insert([form])
          .select()
          .single();
        if (error) throw error;

        // Generar QR
        const qrDataUrl = await QRCode.toDataURL(nuevoProducto.id, {
          width: 300,
        });
        const blob = dataURLtoBlob(qrDataUrl);
        const fileName = `qr_${nuevoProducto.id}.png`;
        const { error: uploadError } = await supabase.storage
          .from("qr")
          .upload(fileName, blob);

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from("qr")
            .getPublicUrl(fileName);
          await supabase
            .from("inventario")
            .update({ qr_url: publicUrlData.publicUrl })
            .eq("id", nuevoProducto.id);
        }
        Swal.fire("Éxito", "Producto registrado con su código QR.", "success");
      }
      onGuardado();
      onClose();
    } catch (error) {
      Swal.fire("Error", error.message, "error");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
          <h3 className="font-black text-slate-800 flex items-center gap-2 text-lg">
            {productoEdicion ? (
              <>
                <Edit3 className="text-blue-600" /> Editar Producto
              </>
            ) : (
              <>
                <Save className="text-emerald-600" /> Nuevo Producto
              </>
            )}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Descripción *
              </label>
              <input
                required
                type="text"
                value={form.descripcion}
                onChange={(e) =>
                  setForm({ ...form, descripcion: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Modelo
              </label>
              <input
                type="text"
                value={form.modelo}
                onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Medida
              </label>
              <input
                type="text"
                value={form.medida}
                onChange={(e) => setForm({ ...form, medida: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Unidad de Medida *
              </label>
              <select
                required
                value={form.id_udm}
                onChange={(e) => setForm({ ...form, id_udm: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-600"
              >
                <option value="">Selecciona...</option>
                {catalogos.udms.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Marca *
              </label>
              <select
                required
                value={form.id_marca}
                onChange={(e) => setForm({ ...form, id_marca: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-600"
              >
                <option value="">Selecciona...</option>
                {catalogos.marcas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Almacén *
              </label>
              <select
                required
                value={form.id_almacen}
                onChange={(e) =>
                  setForm({ ...form, id_almacen: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-600"
              >
                <option value="">Selecciona...</option>
                {catalogos.almacenes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Condición *
              </label>
              <select
                required
                value={form.id_condicion}
                onChange={(e) =>
                  setForm({ ...form, id_condicion: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-600"
              >
                <option value="">Selecciona...</option>
                {catalogos.condiciones.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Fila / Ubicación exacta
              </label>
              <input
                type="text"
                value={form.fila}
                onChange={(e) => setForm({ ...form, fila: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-emerald-600 uppercase tracking-widest mb-1.5">
                Precio Compra Unitario *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 font-bold text-slate-400">
                  $
                </span>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={form.precio_unitario}
                  onChange={(e) =>
                    setForm({ ...form, precio_unitario: e.target.value })
                  }
                  className="w-full pl-8 pr-4 bg-emerald-50/50 border border-emerald-200 p-3 rounded-xl text-sm font-black text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-black text-blue-600 uppercase tracking-widest mb-1.5">
                Stock Actual (Cantidad) *
              </label>
              <input
                required
                type="number"
                step="0.01"
                value={form.cantidad}
                onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                className="w-full bg-blue-50/50 border border-blue-200 p-3 rounded-xl text-sm font-black text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-red-500 uppercase tracking-widest mb-1.5">
                Alerta Stock Mínimo *
              </label>
              <input
                required
                type="number"
                step="0.01"
                value={form.stock_minimo}
                onChange={(e) =>
                  setForm({ ...form, stock_minimo: e.target.value })
                }
                className="w-full bg-red-50 border border-red-200 p-3 rounded-xl text-sm font-black text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3 mt-4 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="px-8 py-3 bg-slate-800 text-white font-black rounded-xl text-xs uppercase tracking-widest hover:bg-slate-900 transition-colors shadow-lg disabled:opacity-50 flex items-center gap-2"
            >
              {cargando
                ? "Guardando..."
                : productoEdicion
                  ? "Guardar Cambios"
                  : "Crear y Generar QR"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
