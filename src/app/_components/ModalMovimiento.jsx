"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/app/_lib/supabase/supabase";
import Swal from "sweetalert2";
import { X, Save, FileSpreadsheet, Globe, Edit3 } from "lucide-react";

export default function ModalMovimiento({
  isOpen,
  onClose,
  onGuardado,
  inventario,
  movimientoEdicion, // 🟢 NUEVA PROPIEDAD PARA EDITAR
}) {
  const [cargando, setCargando] = useState(false);

  const [form, setForm] = useState({
    id_producto: "",
    tipo: "entrada",
    cantidad: 1,
    total_ingresado: 0,
    fecha: new Date().toISOString().split("T")[0],
    es_importacion: false,
    numero_pedimento: "",
  });

  const total = Number(form.total_ingresado) || 0;
  const subtotal = total / 1.16;
  const iva = total - subtotal;
  const costo_unitario =
    Number(form.cantidad) > 0 ? subtotal / Number(form.cantidad) : 0;

  // 🟢 LÓGICA PARA CARGAR DATOS SI ESTAMOS EDITANDO
  useEffect(() => {
    if (isOpen && movimientoEdicion) {
      setForm({
        id_producto: movimientoEdicion.id_producto || "",
        tipo: movimientoEdicion.tipo || "entrada",
        cantidad: movimientoEdicion.cantidad || 1,
        total_ingresado: movimientoEdicion.total || 0, // Cargamos el total que ya existía
        fecha:
          movimientoEdicion.fecha || new Date().toISOString().split("T")[0],
        es_importacion: movimientoEdicion.es_importacion || false,
        numero_pedimento: movimientoEdicion.numero_pedimento || "",
      });
    } else if (!isOpen || !movimientoEdicion) {
      // Limpiamos el formulario si se cierra o si es uno nuevo
      setForm({
        id_producto: "",
        tipo: "entrada",
        cantidad: 1,
        total_ingresado: 0,
        fecha: new Date().toISOString().split("T")[0],
        es_importacion: false,
        numero_pedimento: "",
      });
    }
  }, [isOpen, movimientoEdicion]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const payload = {
        id_producto: form.id_producto,
        tipo: form.tipo,
        cantidad: form.cantidad,
        costo_unitario: costo_unitario,
        subtotal,
        iva,
        total,
        fecha: form.fecha,
        es_importacion: form.es_importacion,
        numero_pedimento: form.es_importacion ? form.numero_pedimento : null,
        creado_por: user?.id,
      };

      // 🟢 DECIDIMOS SI ACTUALIZAR O INSERTAR
      if (movimientoEdicion) {
        const { error: errorMov } = await supabase
          .from("movimientos_inventario")
          .update(payload)
          .eq("id", movimientoEdicion.id);
        if (errorMov) throw errorMov;
        Swal.fire({
          icon: "success",
          title: "Actualizado",
          text: "Registro modificado correctamente.",
          toast: true,
          position: "top-end",
          timer: 2500,
          showConfirmButton: false,
        });
      } else {
        const { error: errorMov } = await supabase
          .from("movimientos_inventario")
          .insert([payload]);
        if (errorMov) throw errorMov;
        Swal.fire({
          icon: "success",
          title: "Registro Exitoso",
          text: "Guardado en el historial.",
          toast: true,
          position: "top-end",
          timer: 2500,
          showConfirmButton: false,
        });
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
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
          <h3 className="font-black text-slate-800 flex items-center gap-2 text-lg">
            {movimientoEdicion ? (
              <>
                <Edit3 className="text-blue-600" /> Editar Movimiento
              </>
            ) : (
              <>
                <FileSpreadsheet className="text-blue-600" /> Registrar
                Movimiento
              </>
            )}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-red-500 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-6 max-h-[75vh] overflow-y-auto"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Producto *
              </label>
              <select
                required
                value={form.id_producto}
                onChange={(e) =>
                  setForm({ ...form, id_producto: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-600"
              >
                <option value="">Selecciona el producto...</option>
                {inventario.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.descripcion} (Mod: {p.modelo || "N/A"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Tipo de Movimiento *
              </label>
              <select
                required
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-600"
              >
                <option value="entrada">Entrada (Compra / Ingreso)</option>
                <option value="salida">Salida (Venta / Merma)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Fecha Contable *
              </label>
              <input
                required
                type="date"
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-600 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Cantidad *
              </label>
              <input
                required
                type="number"
                min="1"
                step="0.01"
                value={form.cantidad}
                onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xl font-black text-blue-700 focus:border-blue-600 text-center"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-emerald-600 uppercase tracking-widest mb-1.5">
                Total de Factura / Ticket (Con IVA) *
              </label>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-emerald-600 text-xl">
                  $
                </span>

                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.total_ingresado}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      total_ingresado: e.target.value,
                    })
                  }
                  className="w-full pl-10 pr-4 bg-emerald-50/50 border border-emerald-200 p-3 rounded-xl text-xl font-black text-emerald-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="md:col-span-2 flex gap-4 p-4 bg-slate-800 rounded-xl text-white">
              <div className="flex-1 text-center border-r border-slate-600">
                <span className="block text-[10px] uppercase tracking-widest text-slate-400">
                  Subtotal
                </span>
                <span className="font-bold">
                  $
                  {subtotal.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex-1 text-center border-r border-slate-600">
                <span className="block text-[10px] uppercase tracking-widest text-slate-400">
                  IVA (16%)
                </span>
                <span className="font-bold text-red-400">
                  + ${iva.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex-1 text-center">
                <span className="block text-[10px] uppercase tracking-widest text-blue-400 font-black">
                  Costo Unitario
                </span>
                <span className="font-black text-xl text-blue-400">
                  $
                  {costo_unitario.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            <div className="md:col-span-2 bg-indigo-50/50 p-4 border border-indigo-100 rounded-xl">
              <label className="flex items-center gap-3 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={form.es_importacion}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      es_importacion: e.target.checked,
                      numero_pedimento: "",
                    })
                  }
                  className="w-5 h-5 accent-indigo-600 rounded"
                />
                <Globe className="text-indigo-600" size={18} />
                <span className="text-xs font-black text-indigo-900 uppercase tracking-widest">
                  Es producto de Importación
                </span>
              </label>

              {form.es_importacion && (
                <div className="mt-3 pl-8">
                  <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1.5">
                    Número de Pedimento Aduanal *
                  </label>
                  <input
                    maxLength={15}
                    required={form.es_importacion}
                    type="text"
                    value={form.numero_pedimento}
                    onChange={(e) =>
                      setForm({ ...form, numero_pedimento: e.target.value })
                    }
                    placeholder="Ej. 21 47 3807 1234567"
                    className="w-full bg-white border border-indigo-200 p-3 rounded-lg text-sm font-bold text-slate-800 focus:border-indigo-600 shadow-sm"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-4">
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
              className="px-8 py-3 bg-blue-700 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-blue-700/30 hover:bg-blue-800 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {cargando
                ? "Guardando..."
                : movimientoEdicion
                  ? "Guardar Cambios"
                  : "Confirmar Movimiento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
