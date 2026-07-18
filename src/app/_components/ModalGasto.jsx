"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Save, Trash2, X } from "lucide-react";
import { supabase } from "@/app/_lib/supabase/supabase";

const FORM_INICIAL = {
  concepto: "",
  categoria: "Operación",
  monto: "",
  fecha: new Date().toISOString().slice(0, 10),
  descripcion: "",
};

const CATEGORIAS = [
  "Operación",
  "Servicios",
  "Renta",
  "Nómina",
  "Compras",
  "Mantenimiento",
  "Impuestos",
  "Publicidad",
  "Transporte",
  "Otros",
];

export default function ModalGasto({
  isOpen,
  onClose,
  gasto,
  fechaInicial,
  onGuardado,
}) {
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (gasto) {
      setForm({
        concepto: gasto.concepto ?? "",
        categoria: gasto.categoria ?? "Operación",
        monto: gasto.monto ?? "",
        fecha: gasto.fecha ?? new Date().toISOString().slice(0, 10),
        descripcion: gasto.descripcion ?? "",
      });

      return;
    }

    setForm({
      ...FORM_INICIAL,
      fecha: fechaInicial ?? new Date().toISOString().slice(0, 10),
    });
  }, [isOpen, gasto, fechaInicial]);

  if (!isOpen) return null;

  const actualizarCampo = (campo, valor) => {
    setForm((estadoAnterior) => ({
      ...estadoAnterior,
      [campo]: valor,
    }));
  };

  const guardarGasto = async (event) => {
    event.preventDefault();

    if (!form.concepto.trim() || !form.fecha || Number(form.monto) <= 0) {
      await Swal.fire({
        icon: "warning",
        title: "Datos incompletos",
        text: "Captura el concepto, la fecha y un monto mayor a cero.",
      });

      return;
    }

    setGuardando(true);

    try {
      const payload = {
        concepto: form.concepto.trim(),
        categoria: form.categoria,
        monto: Number(form.monto),
        fecha: form.fecha,
        descripcion: form.descripcion.trim() || null,
      };

      let consulta;

      if (gasto?.id) {
        consulta = supabase
          .from("gastos")
          .update(payload)
          .eq("id", gasto.id);
      } else {
        consulta = supabase.from("gastos").insert([payload]);
      }

      const { error } = await consulta;

      if (error) {
        throw error;
      }

      await Swal.fire({
        icon: "success",
        title: gasto ? "Gasto actualizado" : "Gasto agregado",
        timer: 1300,
        showConfirmButton: false,
      });

      await onGuardado?.();
      onClose();
    } catch (error) {
      console.error(error);

      await Swal.fire({
        icon: "error",
        title: "No se pudo guardar",
        text: error.message ?? "Ocurrió un error inesperado.",
      });
    } finally {
      setGuardando(false);
    }
  };

  const eliminarGasto = async () => {
    if (!gasto?.id) return;

    const confirmacion = await Swal.fire({
      icon: "warning",
      title: "¿Eliminar este gasto?",
      text: "Esta acción no se puede deshacer.",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmacion.isConfirmed) return;

    setGuardando(true);

    try {
      const { error } = await supabase
        .from("gastos")
        .delete()
        .eq("id", gasto.id);

      if (error) {
        throw error;
      }

      await Swal.fire({
        icon: "success",
        title: "Gasto eliminado",
        timer: 1200,
        showConfirmButton: false,
      });

      await onGuardado?.();
      onClose();
    } catch (error) {
      console.error(error);

      await Swal.fire({
        icon: "error",
        title: "No se pudo eliminar",
        text: error.message ?? "Ocurrió un error inesperado.",
      });
    } finally {
      setGuardando(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !guardando) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-black text-slate-800">
              {gasto ? "Editar gasto" : "Agregar gasto"}
            </h2>

            <p className="mt-1 text-xs font-semibold text-slate-500">
              {gasto
                ? "Consulta o modifica la información del gasto."
                : "Registra un egreso manual de la empresa."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar modal"
            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={guardarGasto} className="space-y-5 p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-black uppercase tracking-widest text-slate-700">
                Concepto
              </span>

              <input
                type="text"
                value={form.concepto}
                onChange={(event) =>
                  actualizarCampo("concepto", event.target.value)
                }
                placeholder="Ej. Pago de electricidad"
                disabled={guardando}
                className={inputClass}
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-slate-700">
                Categoría
              </span>

              <select
                value={form.categoria}
                onChange={(event) =>
                  actualizarCampo("categoria", event.target.value)
                }
                disabled={guardando}
                className={inputClass}
              >
                {CATEGORIAS.map((categoria) => (
                  <option
                    key={categoria}
                    value={categoria}
                    className="bg-white text-slate-800"
                  >
                    {categoria}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-slate-700">
                Fecha
              </span>

              <input
                type="date"
                value={form.fecha}
                onChange={(event) =>
                  actualizarCampo("fecha", event.target.value)
                }
                disabled={guardando}
                className={inputClass}
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-black uppercase tracking-widest text-slate-700">
                Monto
              </span>

              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-500">
                  $
                </span>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.monto}
                  onChange={(event) =>
                    actualizarCampo("monto", event.target.value)
                  }
                  placeholder="0.00"
                  disabled={guardando}
                  className={`${inputClass} pl-9`}
                />
              </div>
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-black uppercase tracking-widest text-slate-700">
                Descripción
              </span>

              <textarea
                rows={4}
                value={form.descripcion}
                onChange={(event) =>
                  actualizarCampo("descripcion", event.target.value)
                }
                placeholder="Detalles adicionales del gasto..."
                disabled={guardando}
                className={`${inputClass} resize-none`}
              />
            </label>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
            <div>
              {gasto && (
                <button
                  type="button"
                  onClick={eliminarGasto}
                  disabled={guardando}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-5 py-3 text-xs font-black uppercase tracking-widest text-red-700 transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  <Trash2 size={16} />

                  {guardando ? "Procesando..." : "Eliminar"}
                </button>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                disabled={guardando}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={guardando}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-md transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={16} />

                {guardando ? "Guardando..." : "Guardar gasto"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}