"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/app/_lib/supabase/supabase";
import Swal from "sweetalert2";
import {
  X,
  Users,
  UploadCloud,
  Phone,
  Mail,
  Building2,
  Contact,
} from "lucide-react";

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-50 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CABECERA DEL MODAL */}
        <div className="flex justify-between items-center p-6 bg-white border-b border-slate-200 shrink-0">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <Users size={20} />
            </div>
            {clienteAEditar ? "Editar Cliente" : "Nuevo Cliente"}
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
          {/* SECCIÓN 1: DATOS FISCALES */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-4">
              <Building2 size={16} className="text-slate-400" /> Datos Fiscales
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
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
                  className="w-full bg-slate-50 border border-slate-300 p-3 rounded-lg outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 text-sm font-semibold text-slate-800 transition-all"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
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
                  className="w-full bg-slate-50 border border-slate-300 p-3 rounded-lg outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 text-sm font-mono font-bold uppercase text-slate-800 transition-all"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: CONTACTO */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-4">
              <Contact size={16} className="text-slate-400" /> Contacto
            </h3>

            <div className="grid grid-cols-1 gap-5">
              <div>
                <label className="flex items-center gap-1.5 block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  <Phone size={14} className="text-blue-600" /> Teléfonos
                  (Separados por coma)
                </label>
                <input
                  type="text"
                  value={formData.telefonos}
                  onChange={(e) =>
                    setFormData({ ...formData, telefonos: e.target.value })
                  }
                  placeholder="5512345678, 5587654321"
                  className="w-full bg-slate-50 border border-slate-300 p-3 rounded-lg outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 text-sm text-slate-800 transition-all"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  <Mail size={14} className="text-blue-600" /> Correos
                  Electrónicos (Separados por coma)
                </label>
                <input
                  type="text"
                  value={formData.correos}
                  onChange={(e) =>
                    setFormData({ ...formData, correos: e.target.value })
                  }
                  placeholder="contacto@empresa.com, pagos@empresa.com"
                  className="w-full bg-slate-50 border border-slate-300 p-3 rounded-lg outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 text-sm text-slate-800 transition-all"
                />
              </div>
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
            {isLoading ? "Guardando..." : "Guardar Cliente"}
          </button>
        </div>
      </div>
    </div>
  );
}
