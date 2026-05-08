"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/app/_lib/supabase/supabase";
import Swal from "sweetalert2";
import QRCode from "qrcode";
import { X, Save, Edit3, Link as LinkIcon } from "lucide-react";

export default function ModalFormProducto({
  isOpen,
  onClose,
  productoEdicion,
  catalogos,
  onGuardado,
}) {
  const [cargando, setCargando] = useState(false);
  const [aplicaMedida, setAplicaMedida] = useState(false);

  const [form, setForm] = useState({
    modelo: "",
    descripcion: "",
    id_udm: "",
    id_marca: "",
    id_almacen: "",
    fila: "",
    id_condicion: "",
    stock_minimo: 1,
    cantidad: 0,
    precio_unitario: 0,
    id_categoria: "",
    id_proveedor: "",
    id_medida: "",
    enlace: "", // 🟢 Campo para el link de Maps o Mercado Libre
  });

  useEffect(() => {
    if (productoEdicion) {
      setAplicaMedida(!!productoEdicion.id_medida);
      setForm({
        modelo: productoEdicion.modelo || "",
        descripcion: productoEdicion.descripcion || "",
        id_udm: productoEdicion.id_udm || "",
        id_marca: productoEdicion.id_marca || "",
        id_almacen: productoEdicion.id_almacen || "",
        fila: productoEdicion.fila || "",
        id_condicion: productoEdicion.id_condicion || "",
        stock_minimo: productoEdicion.stock_minimo || 1,
        cantidad: productoEdicion.cantidad || 0,
        precio_unitario: productoEdicion.precio_unitario || 0,
        id_categoria: productoEdicion.id_categoria || "",
        id_proveedor: productoEdicion.id_proveedor || "",
        id_medida: productoEdicion.id_medida || "",
        enlace: productoEdicion.enlace || "",
      });
    } else {
      setAplicaMedida(false);
      setForm({
        modelo: "",
        descripcion: "",
        id_udm: "",
        id_marca: "",
        id_almacen: "",
        fila: "",
        id_condicion: "",
        stock_minimo: 1,
        cantidad: 0,
        precio_unitario: 0,
        id_categoria: "",
        id_proveedor: "",
        id_medida: "",
        enlace: "",
      });
    }
  }, [productoEdicion, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      const payload = {
        ...form,
        id_medida: aplicaMedida ? form.id_medida : null,
      };

      if (productoEdicion) {
        const { error } = await supabase
          .from("inventario")
          .update(payload)
          .eq("id", productoEdicion.id);
        if (error) throw error;
        Swal.fire({
          icon: "success",
          title: "Actualizado",
          toast: true,
          position: "top-end",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        const { data: nuevo, error } = await supabase
          .from("inventario")
          .insert([payload])
          .select()
          .single();
        if (error) throw error;

        const qrDataUrl = await QRCode.toDataURL(nuevo.id, { width: 300 });
        let arr = qrDataUrl.split(","),
          bstr = atob(arr[1]),
          n = bstr.length,
          u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const fileName = `qr_${nuevo.id}.png`;
        const { error: upErr } = await supabase.storage
          .from("qr")
          .upload(fileName, new Blob([u8arr], { type: "image/png" }));
        if (!upErr) {
          const { data: url } = supabase.storage
            .from("qr")
            .getPublicUrl(fileName);
          await supabase
            .from("inventario")
            .update({ qr_url: url.publicUrl })
            .eq("id", nuevo.id);
        }
        Swal.fire("Éxito", "Producto registrado correctamente.", "success");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
          <h3 className="font-black text-slate-800 text-lg">
            {productoEdicion ? "Editar Producto" : "Nuevo Producto"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-red-500 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold"
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
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Categoría *
              </label>
              <select
                required
                value={form.id_categoria}
                onChange={(e) =>
                  setForm({ ...form, id_categoria: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold"
              >
                <option value="">Selecciona...</option>
                {catalogos.categorias?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
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
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold"
              >
                <option value="">Selecciona...</option>
                {catalogos.marcas?.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Unidad de Medida *
              </label>
              <select
                required
                value={form.id_udm}
                onChange={(e) => setForm({ ...form, id_udm: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold"
              >
                <option value="">Selecciona...</option>
                {catalogos.udms?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* 🟢 PROVEEDOR OBLIGATORIO Y ENLACE */}
            <div className="md:col-span-1">
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Proveedor *
              </label>
              <select
                required
                value={form.id_proveedor}
                onChange={(e) =>
                  setForm({ ...form, id_proveedor: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold"
              >
                <option value="">Selecciona el Proveedor...</option>
                {catalogos.proveedores?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Enlace (Maps / Mercado Libre)
              </label>
              <div className="relative">
                <LinkIcon
                  className="absolute left-3 top-3.5 text-slate-400"
                  size={16}
                />
                <input
                  type="url"
                  value={form.enlace}
                  onChange={(e) => setForm({ ...form, enlace: e.target.value })}
                  className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Medida Opcional */}
            <div className="bg-blue-50/50 p-3 border border-blue-100 rounded-xl flex flex-col justify-center">
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={aplicaMedida}
                  onChange={(e) => {
                    setAplicaMedida(e.target.checked);
                    if (!e.target.checked) setForm({ ...form, id_medida: "" });
                  }}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest">
                  Lleva Medida
                </span>
              </label>
              {aplicaMedida && (
                <select
                  required
                  value={form.id_medida}
                  onChange={(e) =>
                    setForm({ ...form, id_medida: e.target.value })
                  }
                  className="w-full bg-white border border-blue-200 p-2 rounded-lg text-sm font-bold shadow-sm"
                >
                  <option value="">Pulgadas...</option>
                  {catalogos.medidas?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              )}
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
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold"
              >
                <option value="">Selecciona...</option>
                {catalogos.almacenes?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Fila / Ubicación
              </label>
              <input
                type="text"
                value={form.fila}
                onChange={(e) => setForm({ ...form, fila: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-emerald-600 uppercase tracking-widest mb-1.5">
                Costo Unitario *
              </label>
              <input
                required
                type="number"
                step="0.01"
                value={form.precio_unitario}
                onChange={(e) =>
                  setForm({ ...form, precio_unitario: e.target.value })
                }
                className="w-full bg-emerald-50/50 border border-emerald-200 p-3 rounded-xl text-sm font-black"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-blue-600 uppercase tracking-widest mb-1.5">
                Stock Actual *
              </label>
              <input
                required
                type="number"
                value={form.cantidad}
                onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                className="w-full bg-blue-50/50 border border-blue-200 p-3 rounded-xl text-sm font-black"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-red-500 uppercase tracking-widest mb-1.5">
                Mínimo Alerta *
              </label>
              <input
                required
                type="number"
                value={form.stock_minimo}
                onChange={(e) =>
                  setForm({ ...form, stock_minimo: e.target.value })
                }
                className="w-full bg-red-50 border border-red-200 p-3 rounded-xl text-sm font-black"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs uppercase tracking-widest"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="px-8 py-3 bg-slate-800 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-lg disabled:opacity-50"
            >
              {cargando ? "Guardando..." : "Guardar Producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
