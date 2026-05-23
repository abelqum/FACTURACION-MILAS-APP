"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/app/_lib/supabase/supabase";
import Swal from "sweetalert2";
import QRCode from "qrcode";
import { X, Save, Image as ImageIcon, UploadCloud, Camera } from "lucide-react";

export default function ModalFormProducto({
  isOpen,
  onClose,
  productoEdicion,
  catalogos,
  onGuardado,
}) {
  const [cargando, setCargando] = useState(false);
  const [aplicaMedida, setAplicaMedida] = useState(false);

  // 🟢 ESTADOS PARA LA FOTO
  const [fotoArchivo, setFotoArchivo] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);

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
    foto_url: "",
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
        foto_url: productoEdicion.foto_url || "",
      });
      setFotoPreview(productoEdicion.foto_url || null);
      setFotoArchivo(null);
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
        foto_url: "",
      });
      setFotoPreview(null);
      setFotoArchivo(null);
    }
  }, [productoEdicion, isOpen]);

  if (!isOpen) return null;

  // 🟢 MANEJADOR DE LA SELECCIÓN DE IMAGEN / CÁMARA
  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFotoArchivo(file);
      setFotoPreview(URL.createObjectURL(file)); // Crea una vista previa temporal
    }
  };

  // 🟢 MOTOR DE OPTIMIZACIÓN DE IMÁGENES (ESTA ERA LA FUNCIÓN QUE FALTABA)
  const optimizarImagen = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800; // Resolución ideal
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          // Cálculo para mantener la proporción de la imagen
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          // Convierte a WebP con calidad del 80%
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const optimizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), {
                  type: "image/webp",
                });
                resolve(optimizedFile);
              } else {
                reject(new Error("Error al procesar la imagen."));
              }
            },
            "image/webp",
            0.8
          );
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      let finalFotoUrl = form.foto_url;

      // 🟢 1. LÓGICA DE ACTUALIZACIÓN: SI HAY FOTO NUEVA, BORRAR LA VIEJA Y SUBIR LA NUEVA
      if (fotoArchivo) {
        Swal.fire({ title: "Optimizando y subiendo imagen...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        
        // Si ya existía una foto previa, la eliminamos del bucket para no dejar basura
        if (form.foto_url) {
          try {
            const urlParts = form.foto_url.split('/');
            const oldFileName = urlParts[urlParts.length - 1];
            await supabase.storage.from("fotos_productos").remove([oldFileName]);
          } catch (err) {
            console.error("No se pudo eliminar la imagen vieja, pero continuamos:", err);
          }
        }
        
        // Ahora optimizamos y subimos la nueva
        const optimizedFile = await optimizarImagen(fotoArchivo);
        const fileName = `prod_${Date.now()}.webp`;

        const { error: upErr } = await supabase.storage
          .from("fotos_productos")
          .upload(fileName, optimizedFile, { 
            contentType: "image/webp",
            upsert: true 
          });

        if (upErr) throw new Error(`Error subiendo foto: ${upErr.message}`);

        const { data: urlData } = supabase.storage
          .from("fotos_productos")
          .getPublicUrl(fileName);

        finalFotoUrl = urlData.publicUrl;
        Swal.close(); // Cerramos el modal de carga de imagen
      }

      // 2. PREPARAR EL PAYLOAD
      const payloadLimpio = {};
      for (const key in form) {
        if (form[key] === "") {
          payloadLimpio[key] = null;
        } else {
          payloadLimpio[key] = form[key];
        }
      }

      if (!aplicaMedida) payloadLimpio.id_medida = null;
      payloadLimpio.foto_url = finalFotoUrl;

      // 3. GUARDAR EN BASE DE DATOS
      if (productoEdicion) {
        // ACTUALIZAR
        const { error } = await supabase
          .from("inventario")
          .update(payloadLimpio)
          .eq("id", productoEdicion.id);
        if (error) throw error;
        Swal.fire({ icon: "success", title: "Actualizado", toast: true, position: "top-end", timer: 2000, showConfirmButton: false });
      } else {
        // CREAR NUEVO
        const { data: nuevo, error } = await supabase
          .from("inventario")
          .insert([payloadLimpio])
          .select()
          .single();

        if (error) throw error;

        // GENERACIÓN DE QR
        try {
          const qrDataUrl = await QRCode.toDataURL(String(nuevo.id), { width: 300 });
          const resBlob = await fetch(qrDataUrl);
          const blob = await resBlob.blob();
          const fileName = `qr_${nuevo.id}.png`;

          const { error: qrErr } = await supabase.storage
            .from("qr")
            .upload(fileName, blob, { contentType: "image/png", upsert: true });

          if (qrErr) throw new Error(qrErr.message);

          const { data: urlData } = supabase.storage.from("qr").getPublicUrl(fileName);
          await supabase.from("inventario").update({ qr_url: urlData.publicUrl }).eq("id", nuevo.id);
        } catch (qrError) {
          Swal.fire("Advertencia", `Producto creado pero falló QR: ${qrError.message}`, "warning");
        }

        Swal.fire("Éxito", "Producto registrado correctamente.", "success");
      }
      onGuardado();
      onClose();
    } catch (error) {
      Swal.close(); // Cerramos si hubo error durante la carga de SweetAlert
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
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
          
          {/* 🟢 SECCIÓN DE LA FOTO DEL PRODUCTO */}
          <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-50 border border-slate-200 p-5 rounded-2xl">
            <div className="w-32 h-32 shrink-0 bg-white border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center shadow-sm">
              {fotoPreview ? (
                <img src={fotoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="text-slate-300" size={40} />
              )}
            </div>
            <div className="flex-1 w-full text-center sm:text-left">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1">Fotografía del Producto</h4>
              <p className="text-xs text-slate-500 mb-3">Sube una imagen o toma una foto clara para identificarlo visualmente en almacén.</p>
              
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 font-bold text-xs uppercase tracking-widest rounded-xl border border-blue-200 hover:bg-blue-600 hover:text-white transition-all cursor-pointer">
                  <UploadCloud size={16} /> {fotoPreview ? "Cambiar Archivo" : "Subir Archivo"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
                </label>

                <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 font-bold text-xs uppercase tracking-widest rounded-xl border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer">
                  <Camera size={16} /> Tomar Foto
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFotoChange} />
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-black text-slate-800 uppercase tracking-widest mb-1.5">
                Descripción *
              </label>
              <input
                required
                type="text"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                className="w-full text-slate-800 bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-600 transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-800 uppercase tracking-widest mb-1.5">
                Modelo
              </label>
              <input
                type="text"
                value={form.modelo}
                onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                className="w-full text-slate-800 bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-600 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-800 uppercase tracking-widest mb-1.5">
                Categoría *
              </label>
              <select
                required
                value={form.id_categoria}
                onChange={(e) => setForm({ ...form, id_categoria: e.target.value })}
                className="w-full text-slate-800 bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-600 transition-all"
              >
                <option value="">Selecciona...</option>
                {catalogos.categorias?.map((c) => (
                  <option key={c.id} value={c.id} className="text-slate-800">
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-800 uppercase tracking-widest mb-1.5">
                Marca *
              </label>
              <select
                required
                value={form.id_marca}
                onChange={(e) => setForm({ ...form, id_marca: e.target.value })}
                className="w-full text-slate-800 bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-600 transition-all"
              >
                <option value="">Selecciona...</option>
                {catalogos.marcas?.map((m) => (
                  <option key={m.id} value={m.id} className="text-slate-800">
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-800 uppercase tracking-widest mb-1.5">
                Unidad de Medida *
              </label>
              <select
                required
                value={form.id_udm}
                onChange={(e) => setForm({ ...form, id_udm: e.target.value })}
                className="w-full text-slate-800 bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-600 transition-all"
              >
                <option value="">Selecciona...</option>
                {catalogos.udms?.map((u) => (
                  <option key={u.id} value={u.id} className="text-slate-800">
                    {u.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-[11px] font-black text-slate-800 uppercase tracking-widest mb-1.5">
                Proveedor *
              </label>
              <select
                required
                value={form.id_proveedor}
                onChange={(e) => setForm({ ...form, id_proveedor: e.target.value })}
                className="w-full bg-slate-50 border text-slate-800 border-slate-200 p-3 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-600 transition-all"
              >
                <option value="">Selecciona el Proveedor...</option>
                {catalogos.proveedores?.map((p) => (
                  <option key={p.id} value={p.id} className="text-slate-800">
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3 bg-blue-50/50 p-3 border border-blue-100 rounded-xl flex flex-col items-center justify-center gap-4 transition-all">
              <label className="flex items-center gap-2 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={aplicaMedida}
                  onChange={(e) => {
                    setAplicaMedida(e.target.checked);
                    if (!e.target.checked) setForm({ ...form, id_medida: "" });
                  }}
                  className="w-4 h-4 text-slate-800 accent-blue-600 rounded cursor-pointer"
                />
                <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest">
                  Lleva Medida
                </span>
              </label>
              <select
                required={aplicaMedida}
                disabled={!aplicaMedida}
                value={form.id_medida}
                onChange={(e) => setForm({ ...form, id_medida: e.target.value })}
                className={`flex-1 text-slate-800 bg-white border border-blue-200 p-2 rounded-lg text-sm font-bold shadow-sm transition-all
                  ${!aplicaMedida ? "opacity-30 bg-slate-100 border-slate-200 cursor-not-allowed" : "opacity-100 focus:outline-none focus:border-blue-600"}`}
              >
                <option value="">Seleccionar Pulgadas...</option>
                {catalogos.medidas?.map((m) => (
                  <option key={m.id} value={m.id} className="text-slate-800">
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-800 uppercase tracking-widest mb-1.5">
                Almacén *
              </label>
              <select
                required
                value={form.id_almacen}
                onChange={(e) => setForm({ ...form, id_almacen: e.target.value })}
                className="w-full bg-slate-50 border text-slate-800 border-slate-200 p-3 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-600 transition-all"
              >
                <option value="">Selecciona...</option>
                {catalogos.almacenes?.map((a) => (
                  <option key={a.id} value={a.id} className="text-slate-800">
                    {a.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-800 uppercase tracking-widest mb-1.5">
                Fila / Ubicación
              </label>
              <input
                type="text"
                value={form.fila}
                onChange={(e) => setForm({ ...form, fila: e.target.value })}
                className="w-full bg-slate-50 border text-slate-800 border-slate-200 p-3 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-600 transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-800 uppercase tracking-widest mb-1.5">
                Condición *
              </label>
              <select
                required
                value={form.id_condicion}
                onChange={(e) => setForm({ ...form, id_condicion: e.target.value })}
                className="w-full text-slate-800 bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-600 transition-all"
              >
                <option value="">Selecciona...</option>
                {catalogos.condiciones?.map((cond) => (
                  <option key={cond.id} value={cond.id} className="text-slate-800">
                    {cond.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black text-emerald-800 uppercase tracking-widest mb-1.5">
                Costo Unitario *
              </label>
              <input
                required
                type="number"
                step="0.01"
                value={form.precio_unitario}
                onChange={(e) => setForm({ ...form, precio_unitario: e.target.value })}
                className="w-full bg-emerald-50/50 border text-slate-800 border-emerald-200 p-3 rounded-xl text-sm font-black focus:outline-none focus:border-emerald-600 transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-blue-600 uppercase tracking-widest mb-1.5">
                Stock Actual *
              </label>
              <input
                required
                type="number"
                step="1"
                value={form.cantidad}
                onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                className="w-full bg-blue-50/50 border text-slate-800 border-blue-200 p-3 rounded-xl text-sm font-black focus:outline-none focus:border-blue-600 transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-red-500 uppercase tracking-widest mb-1.5">
                Mínimo Alerta *
              </label>
              <input
                required
                type="number"
                step="1"
                value={form.stock_minimo}
                onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })}
                className="w-full text-slate-800 bg-red-50 border border-red-200 p-3 rounded-xl text-sm font-black focus:outline-none focus:border-red-600 transition-all"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-slate-100 text-slate-800 font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="px-8 py-3 bg-slate-800 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-lg active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {cargando ? "Guardando..." : "Guardar Producto"} <Save size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}