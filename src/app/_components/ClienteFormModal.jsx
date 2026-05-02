"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/app/_lib/supabase/supabase";
import Swal from "sweetalert2";
import { X, Users, UploadCloud, Phone, Mail, Building2 } from "lucide-react";

export default function ClienteFormModal({
  isOpen,
  onClose,
  clienteAEditar,
  onSaveSuccess,
}) {
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    razon_social: "",
    rfc: "",
    telefonos: "", // String temporal para el input
    correos: "", // String temporal para el input
  });

  // 🟢 CORRECCIÓN: Envolvemos el setFormData en un setTimeout para evitar el setState síncrono
  // que causa el renderizado en cascada (Warning de React).
  useEffect(() => {
    const timer = setTimeout(() => {
      if (clienteAEditar) {
        setFormData({
          razon_social: clienteAEditar.razon_social || "",
          rfc: clienteAEditar.rfc || "",
          // Convertimos el arreglo de Postgres a string separado por comas para editar fácil en el input
          telefonos: clienteAEditar.telefonos
            ? clienteAEditar.telefonos.join(", ")
            : "",
          correos: clienteAEditar.correos
            ? clienteAEditar.correos.join(", ")
            : "",
        });
      } else {
        setFormData({
          razon_social: "",
          rfc: "",
          telefonos: "",
          correos: "",
        });
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [clienteAEditar, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Convertimos el texto separado por comas de vuelta a un Arreglo limpio para Supabase
      const arrayTelefonos = formData.telefonos
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t !== "");

      const arrayCorreos = formData.correos
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c !== "");

      const payload = {
        razon_social: formData.razon_social,
        rfc: formData.rfc.toUpperCase(), // Aseguramos que el RFC siempre se guarde en mayúsculas
        telefonos: arrayTelefonos,
        correos: arrayCorreos,
      };

      if (clienteAEditar) {
        // MODO EDICIÓN
        const { error } = await supabase
          .from("clientes")
          .update(payload)
          .eq("id", clienteAEditar.id);
        if (error) throw error;

        Swal.fire({
          title: "Actualizado",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        // MODO CREACIÓN
        const { error } = await supabase.from("clientes").insert([payload]);
        if (error) throw error;

        Swal.fire({
          title: "Creado",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      }

      onSaveSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      // Validamos si el error es porque el RFC ya existe (Constraint UNIQUE)
      if (error.code === "23505") {
        Swal.fire({
          title: "RFC Duplicado",
          text: "Este RFC ya pertenece a otro cliente registrado.",
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#131b2e]/60 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-[#bec9c2]/30 bg-[#f8faf9] rounded-t-2xl shrink-0">
          <h2 className="text-xl font-black text-[#131b2e] flex items-center gap-2">
            <Users className="text-[#004532]" size={24} />
            {clienteAEditar ? "Editar Cliente" : "Nuevo Cliente"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-red-500 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          <div className="space-y-4">
            <h3 className="font-bold text-[#004532] text-xs uppercase tracking-widest flex items-center gap-2 border-b border-[#bec9c2]/20 pb-2">
              <Building2 size={16} /> Datos Fiscales
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#3f4944] uppercase tracking-wider mb-1">
                  Razón Social *
                </label>
                <input
                  type="text"
                  required
                  value={formData.razon_social}
                  onChange={(e) =>
                    setFormData({ ...formData, razon_social: e.target.value })
                  }
                  placeholder="Ej. Comercializadora MILAS SA de CV"
                  className="w-full bg-[#f2f3ff] border border-[#bec9c2]/30 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-[#004532] text-sm font-semibold"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#3f4944] uppercase tracking-wider mb-1">
                  R.F.C. *
                </label>
                <input
                  type="text"
                  required
                  value={formData.rfc}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rfc: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="Ej. CMI010101XX1"
                  className="w-full bg-[#f2f3ff] border border-[#bec9c2]/30 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-[#004532] text-sm font-mono font-bold uppercase"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-[#004532] text-xs uppercase tracking-widest flex items-center gap-2 border-b border-[#bec9c2]/20 pb-2">
              Contacto
            </h3>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#3f4944] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Phone size={12} /> Teléfonos (Separados por coma)
                </label>
                <input
                  type="text"
                  value={formData.telefonos}
                  onChange={(e) =>
                    setFormData({ ...formData, telefonos: e.target.value })
                  }
                  placeholder="5512345678, 5587654321"
                  className="w-full bg-[#f2f3ff] border border-[#bec9c2]/30 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-[#004532] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3f4944] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Mail size={12} /> Correos Electrónicos (Separados por coma)
                </label>
                <input
                  type="text"
                  value={formData.correos}
                  onChange={(e) =>
                    setFormData({ ...formData, correos: e.target.value })
                  }
                  placeholder="contacto@empresa.com, pagos@empresa.com"
                  className="w-full bg-[#f2f3ff] border border-[#bec9c2]/30 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-[#004532] text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#bec9c2]/30 sticky bottom-0 bg-white pb-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors text-xs uppercase tracking-widest"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-[#131b2e] hover:bg-[#004532] text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && (
                <UploadCloud size={16} className="animate-bounce" />
              )}
              {isLoading ? "Guardando..." : "Guardar Cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
