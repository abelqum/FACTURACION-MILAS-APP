"use client";
import { useState } from "react";
import { supabase } from "@/app/_lib/supabase/supabase";
import Swal from "sweetalert2";
import { X, PlusCircle, MinusCircle, QrCode, Download } from "lucide-react";

export default function ModalAjusteStock({
  isOpen,
  onClose,
  producto,
  onActualizado,
}) {
  const [cantidadInput, setCantidadInput] = useState(1);
  const [procesando, setProcesando] = useState(false);

  if (!isOpen || !producto) return null;

  const handleAjuste = async (tipo) => {
    if (cantidadInput <= 0)
      return Swal.fire("Error", "Ingresa una cantidad válida.", "error");

    let nuevaCantidad = Number(producto.cantidad);
    if (tipo === "agregar") {
      nuevaCantidad += Number(cantidadInput);
    } else {
      nuevaCantidad -= Number(cantidadInput);
      if (nuevaCantidad < 0)
        return Swal.fire(
          "Error",
          "No puedes sacar más piezas de las que hay.",
          "error",
        );
    }

    setProcesando(true);
    try {
      const { error } = await supabase
        .from("inventario")
        .update({ cantidad: nuevaCantidad })
        .eq("id", producto.id);
      if (error) throw error;

      Swal.fire({
        title: "Inventario Actualizado",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
      onActualizado();
      onClose();
      setCantidadInput(1);
    } catch (error) {
      Swal.fire("Error", "No se pudo actualizar el stock.", "error");
    } finally {
      setProcesando(false);
    }
  };

  // 🟢 FUNCIÓN PARA DESCARGAR EL QR
  const descargarQR = async () => {
    try {
      if (!producto.qr_url) return;
      const res = await fetch(producto.qr_url);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `QR_${producto.modelo || "MILAS"}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      Swal.fire("Error", "No se pudo descargar la imagen.", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
        >
          <X size={24} />
        </button>

        <div className="text-center mt-2 mb-6">
          {/* 🟢 MOSTRAMOS EL QR EN EL MODAL */}
          <div className="w-32 h-32 mx-auto mb-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center relative group overflow-hidden">
            {producto.qr_url ? (
              <>
                <img
                  src={producto.qr_url}
                  alt="QR"
                  className="w-full h-full object-contain p-2"
                />
                <button
                  onClick={descargarQR}
                  className="absolute inset-0 bg-blue-900/60 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                >
                  <Download size={24} className="mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">
                    Descargar
                  </span>
                </button>
              </>
            ) : (
              <QrCode className="text-slate-300" size={48} />
            )}
          </div>

          <h3 className="font-black text-slate-800 text-xl leading-tight">
            {producto.descripcion}
          </h3>
          <p className="text-slate-500 text-xs font-bold mt-1">
            Modelo: {producto.modelo || "N/A"}
          </p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100 mb-6">
          <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
            Stock Actual
          </span>
          <span className="text-4xl font-black text-blue-700">
            {producto.cantidad}
          </span>
        </div>

        <div className="mb-6">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 text-center">
            Piezas a mover
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={cantidadInput}
            onChange={(e) => setCantidadInput(e.target.value)}
            className="w-full text-center text-3xl font-black text-slate-800 bg-white border-2 border-slate-200 rounded-2xl p-3 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => handleAjuste("sacar")}
            disabled={procesando}
            className="flex-1 py-3.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-all text-sm shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <MinusCircle size={18} /> Sacar
          </button>
          <button
            onClick={() => handleAjuste("agregar")}
            disabled={procesando}
            className="flex-1 py-3.5 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-all text-sm shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <PlusCircle size={18} /> Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
