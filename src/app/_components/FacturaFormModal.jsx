"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/app/_lib/supabase/supabase";
import Swal from "sweetalert2";
import {
  X,
  FileText,
  UploadCloud,
  Building2,
  Calculator,
  CheckCircle2,
} from "lucide-react";

export default function FacturaFormModal({
  isOpen,
  onClose,
  clientes = [],
  facturaAEditar,
  onSaveSuccess,
}) {
  const [isLoading, setIsLoading] = useState(false);

  const getInitialState = () => ({
    cliente_id: "",
    no_factura: "",
    fecha: new Date().toISOString().split("T")[0],
    total: "",
    subtotal: "",
    iva: "",
    estado_id: "1",
    forma_pago_id: "1",
    fecha_pago: "",
    comentarios: "",
  });

  const [formData, setFormData] = useState(getInitialState());
  const [clienteSeleccionadoInfo, setClienteSeleccionadoInfo] = useState(null);

  // ✅ EFECTO SIN WARNING
  useEffect(() => {
    let mounted = true;

    Promise.resolve().then(() => {
      if (!mounted) return;

      if (facturaAEditar) {
        const data = {
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
        };

        setFormData(data);

        const clienteInfo = clientes.find(
          (c) => c.id.toString() === facturaAEditar.cliente_id?.toString(),
        );

        setClienteSeleccionadoInfo(clienteInfo || null);
      } else {
        setFormData(getInitialState());
        setClienteSeleccionadoInfo(null);
      }
    });

    return () => {
      mounted = false;
    };
  }, [facturaAEditar, isOpen, clientes]);

  const handleTotalChange = (e) => {
    const rawValue = e.target.value;
    const numValue = parseFloat(rawValue);

    if (isNaN(numValue) || numValue <= 0) {
      setFormData({
        ...formData,
        total: rawValue,
        subtotal: "",
        iva: "",
      });
      return;
    }

    const calculadoSubtotal = (numValue / 1.16).toFixed(2);
    const calculadoIva = (numValue - calculadoSubtotal).toFixed(2);

    setFormData({
      ...formData,
      total: rawValue,
      subtotal: calculadoSubtotal,
      iva: calculadoIva,
    });
  };

  const handleClienteChange = (e) => {
    const selectedId = e.target.value;

    setFormData({ ...formData, cliente_id: selectedId });

    const clienteInfo = clientes.find((c) => c.id.toString() === selectedId);

    setClienteSeleccionadoInfo(clienteInfo || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.estado_id === "2" && !formData.fecha_pago) {
      Swal.fire({
        title: "Atención",
        text: "Si el estado es PAGADO, debes ingresar la Fecha de Pago.",
        icon: "warning",
      });
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        cliente_id: parseInt(formData.cliente_id),
        no_factura: formData.no_factura,
        fecha: formData.fecha,
        subtotal: parseFloat(formData.subtotal),
        iva: parseFloat(formData.iva),
        total: parseFloat(formData.total),
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
      if (error.code === "23505") {
        Swal.fire({
          title: "Folio duplicado",
          text: "Ya existe esa factura.",
          icon: "error",
        });
      } else {
        Swal.fire("Error", error.message, "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-4xl rounded-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between mb-4">
          <h2 className="font-bold flex gap-2 items-center">
            <FileText />
            {facturaAEditar ? "Editar Factura" : "Nueva Factura"}
          </h2>
          <button onClick={onClose}>
            <X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <select
            value={formData.cliente_id}
            onChange={handleClienteChange}
            required
            className="w-full border p-2"
          >
            <option value="">Cliente</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.razon_social}
              </option>
            ))}
          </select>

          <input
            value={formData.no_factura}
            onChange={(e) =>
              setFormData({
                ...formData,
                no_factura: e.target.value,
              })
            }
            placeholder="Folio"
            required
            className="w-full border p-2"
          />

          <input
            type="number"
            value={formData.total}
            onChange={handleTotalChange}
            placeholder="Total"
            required
            className="w-full border p-2"
          />

          <input
            type="date"
            value={formData.fecha}
            onChange={(e) =>
              setFormData({
                ...formData,
                fecha: e.target.value,
              })
            }
            className="w-full border p-2"
          />

          <button
            disabled={isLoading}
            className="bg-black text-white px-4 py-2"
          >
            {isLoading ? "Guardando..." : "Guardar"}
          </button>
        </form>
      </div>
    </div>
  );
}
