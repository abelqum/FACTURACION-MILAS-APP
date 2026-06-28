"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/app/_lib/supabase/supabase";
import Swal from "sweetalert2";
import {
  X,
  FileText,
  Building2,
  Calculator,
  CalendarClock,
  UploadCloud,
} from "lucide-react";

export default function FacturaFormModal({
  isOpen,
  onClose,
  clientes = [],
  facturaAEditar,
  onSaveSuccess,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [clienteSeleccionadoInfo, setClienteSeleccionadoInfo] = useState(null);

  const [formData, setFormData] = useState({
    cliente_id: "",
    no_factura: "",
    fecha: new Date().toISOString().split("T")[0],
    total: "",
    subtotal: "",
    iva: "",
    estado_id: "1", // Pendiente
    forma_pago_id: "1", // Transferencia
    fecha_pago: "",
    comentarios: "",
  });

  // 🟢 1. Cargar Datos al Abrir el Modal
  useEffect(() => {
    const timer = setTimeout(() => {
      if (facturaAEditar) {
        setFormData({
          cliente_id: facturaAEditar.cliente_id?.toString() || "",
          no_factura: facturaAEditar.no_factura || "",
          fecha: facturaAEditar.fecha || "",
          total: facturaAEditar.total || "",
          subtotal: facturaAEditar.subtotal || "",
          iva: facturaAEditar.iva || "",
          estado_id: facturaAEditar.estado_id?.toString() || "1",
          forma_pago_id: facturaAEditar.forma_pago_id?.toString() || "1",
          fecha_pago: facturaAEditar.fecha_pago || "",
          comentarios: facturaAEditar.comentarios || "",
        });

        const clienteInfo = clientes.find(
          (c) => c.id.toString() === facturaAEditar.cliente_id?.toString(),
        );
        setClienteSeleccionadoInfo(clienteInfo || null);
      } else {
        setFormData({
          cliente_id: "",
          no_factura: "", // Vaciado para ingreso manual
          fecha: new Date().toISOString().split("T")[0],
          total: "",
          subtotal: "",
          iva: "",
          estado_id: "1",
          forma_pago_id: "1",
          fecha_pago: "",
          comentarios: "",
        });
        setClienteSeleccionadoInfo(null);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [facturaAEditar, isOpen, clientes]);

  // 🟢 2. Cálculos Financieros Automáticos (CORREGIDO PARA ACEPTAR 0 Y VACÍOS)
  const handleTotalChange = (e) => {
    const rawValue = e.target.value;

    if (rawValue === "") {
      setFormData({ ...formData, total: "", subtotal: "", iva: "" });
      return;
    }

    const numValue = parseFloat(rawValue);

    if (numValue === 0) {
      setFormData({ ...formData, total: rawValue, subtotal: "0.00", iva: "0.00" });
      return;
    }

    if (isNaN(numValue) || numValue < 0) return;

    const calculadoSubtotal = (numValue / 1.16).toFixed(2);
    const calculadoIva = (numValue - calculadoSubtotal).toFixed(2);

    setFormData({
      ...formData,
      total: rawValue,
      subtotal: calculadoSubtotal,
      iva: calculadoIva,
    });
  };

  // 🟢 3. Información Dinámica del Cliente
  const handleClienteChange = (e) => {
    const selectedId = e.target.value;
    setFormData({ ...formData, cliente_id: selectedId });
    const clienteInfo = clientes.find((c) => c.id.toString() === selectedId);
    setClienteSeleccionadoInfo(clienteInfo || null);
  };

  // 🟢 4. Guardar en Base de Datos
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.estado_id === "2" && !formData.fecha_pago) {
      Swal.fire({
        title: "Falta Fecha",
        text: "Para facturas PAGADAS, debes seleccionar la fecha de pago.",
        icon: "warning",
      });
      return;
    }

    setIsLoading(true);

    try {
      // 🟢 REGLA DE NEGOCIO: Si está cancelada, todo el dinero vale 0 forzosamente.
      const isCancelada = formData.estado_id === "3";

      const payload = {
        cliente_id: parseInt(formData.cliente_id),
        no_factura: parseInt(formData.no_factura),
        fecha: formData.fecha,
        subtotal: isCancelada ? 0 : (parseFloat(formData.subtotal) || 0),
        iva: isCancelada ? 0 : (parseFloat(formData.iva) || 0),
        total: isCancelada ? 0 : (parseFloat(formData.total) || 0),
        estado_id: parseInt(formData.estado_id),
        forma_pago_id: formData.forma_pago_id
          ? parseInt(formData.forma_pago_id)
          : null,
        fecha_pago: formData.fecha_pago || null,
        comentarios: formData.comentarios || null,
      };

      if (facturaAEditar) {
        const { error } = await supabase
          .from("facturas")
          .update(payload)
          .eq("id", facturaAEditar.id);
        if (error) throw error;
        Swal.fire({
          title: "Actualizada",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        const { error } = await supabase.from("facturas").insert([payload]);
        if (error) throw error;
        Swal.fire({
          title: "Registrada",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      }

      onSaveSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      if (error.code === "23505") {
        Swal.fire({
          title: "Folio Duplicado",
          text: "Este número de factura ya está registrado.",
          icon: "error",
        });
      } else {
        Swal.fire({ title: "Error", text: error.message, icon: "error" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-50 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CABECERA DEL MODAL */}
        <div className="flex justify-between items-center p-6 bg-white border-b border-slate-200 shrink-0">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <FileText size={20} />
            </div>
            {facturaAEditar ? "Editar Factura" : "Registrar Nueva Factura"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTENIDO DEL FORMULARIO */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          {/* SECCIÓN 1: CLIENTE Y FOLIO */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-4">
              <Building2 size={16} className="text-slate-400" /> Datos del
              Cliente
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Seleccionar Cliente *
                </label>
                <select
                  required
                  value={formData.cliente_id}
                  onChange={handleClienteChange}
                  className="w-full bg-slate-50 border border-slate-300 p-3 rounded-lg outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 text-sm font-semibold text-slate-800 transition-all cursor-pointer"
                >
                  <option value="">-- Elige un cliente de la lista --</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.razon_social}
                    </option>
                  ))}
                </select>
                {clienteSeleccionadoInfo && (
                  <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                    <span className="font-semibold">RFC:</span>{" "}
                    <span className="text-blue-700 font-mono font-bold tracking-wide">
                      {clienteSeleccionadoInfo.rfc || "No registrado"}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  No. Factura (Folio) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="Ej. 1250"
                  value={formData.no_factura}
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) =>
                    setFormData({ ...formData, no_factura: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-300 p-3 rounded-lg outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 text-sm font-bold text-slate-800 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: IMPORTES */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-4">
              <Calculator size={16} className="text-slate-400" /> Desglose de
              Importes
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl md:col-span-1">
                <label className="block text-[11px] font-bold text-blue-800 uppercase tracking-wider mb-1.5">
                  Total a Pagar ($) *
                </label>
                {/* 🟢 INPUT ACTUALIZADO (min="0") */}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required={formData.estado_id !== "3"}
                  value={formData.total}
                  onChange={handleTotalChange}
                  onWheel={(e) => e.target.blur()}
                  placeholder="0.00"
                  className="w-full bg-white border border-blue-300 p-3 rounded-lg focus:border-blue-700 focus:ring-1 focus:ring-blue-700 text-lg font-black text-slate-800 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <p className="text-[10px] text-blue-600 mt-2 font-medium">
                  Ingresa el total, el sistema calcula el resto.
                </p>
              </div>

              <div className="md:col-span-2 grid grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Subtotal Calculado
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={
                      formData.subtotal ? `$ ${formData.subtotal}` : "$ 0.00"
                    }
                    className="w-full bg-transparent border-none p-0 text-lg font-bold text-slate-600 outline-none cursor-not-allowed"
                  />
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    I.V.A. (16%)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={formData.iva ? `$ ${formData.iva}` : "$ 0.00"}
                    className="w-full bg-transparent border-none p-0 text-lg font-bold text-slate-600 outline-none cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: CONTROL, ESTADO Y COMENTARIOS */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-4">
              <CalendarClock size={16} className="text-slate-400" /> Control y
              Estatus
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Fecha Emisión *
                </label>
                <input
                  type="date"
                  required
                  value={formData.fecha}
                  onChange={(e) =>
                    setFormData({ ...formData, fecha: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-300 p-3 rounded-lg outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 text-sm font-semibold text-slate-800 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Estado de Factura *
                </label>
                <select
                  required
                  value={formData.estado_id}
                  onChange={(e) => {
                    const nuevoEstado = e.target.value;
                    // Si seleccionan cancelado y quieren vaciar el total, se puede hacer, pero ya forzamos a 0 en el submit
                    setFormData({ ...formData, estado_id: nuevoEstado });
                  }}
                  className={`w-full border p-3 rounded-lg outline-none focus:ring-2 text-sm font-bold transition-all  bg-slate-50 border border-slate-300 cursor-pointer ${
                    formData.estado_id === "2"
                      ? "bg-green-50 border-green-300 text-green-700 focus:border-green-600 focus:ring-green-600"
                      : formData.estado_id === "3"
                        ? "bg-red-50 border-red-300 text-red-700 focus:border-red-600 focus:ring-red-600"
                        : "bg-orange-50 border-orange-300 text-orange-700 focus:border-orange-600 focus:ring-orange-600"
                  }`}
                >
                  <option value="1">PENDIENTE</option>
                  <option value="2">PAGADO</option>
                  <option value="3">CANCELADO</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Fecha de Pago{" "}
                  {formData.estado_id === "2" && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <input
                  type="date"
                  required={formData.estado_id === "2"}
                  value={formData.fecha_pago}
                  onChange={(e) =>
                    setFormData({ ...formData, fecha_pago: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-300 p-3 rounded-lg outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 text-sm font-semibold text-slate-800 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Forma de Pago
                </label>
                <select
                  value={formData.forma_pago_id}
                  onChange={(e) =>
                    setFormData({ ...formData, forma_pago_id: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-300 p-3 rounded-lg outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 text-sm font-semibold text-slate-800 transition-all cursor-pointer"
                >
                  <option value="1">Transferencia</option>
                  <option value="2">Efectivo</option>
                  <option value="3">Cheque</option>
                  <option value="6">Por Definir</option>
                </select>
              </div>
            </div>

            <div className="mt-5">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Comentarios / Notas (Opcional)
              </label>
              <textarea
                rows={2}
                value={formData.comentarios}
                onChange={(e) =>
                  setFormData({ ...formData, comentarios: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-300 p-3 rounded-lg outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 text-sm text-slate-800 resize-none transition-all"
                placeholder="Ej. Pagos en múltiples transferencias, retenciones, etc."
              />
            </div>
          </div>
        </form>

        {/* FOOTER BOTONES */}
        <div className="flex justify-end items-center gap-4 p-6 bg-slate-50/80 border-t border-slate-200 shrink-0 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-all duration-200 text-sm tracking-wide"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-blue-700 hover:bg-blue-800 text-white px-8 py-3 rounded-xl font-bold text-sm tracking-wide shadow-lg shadow-blue-700/30 hover:shadow-blue-800/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            {isLoading && <UploadCloud size={18} className="animate-bounce" />}
            {isLoading ? "Procesando..." : "Guardar Factura"}
          </button>
        </div>
      </div>
    </div>
  );
}