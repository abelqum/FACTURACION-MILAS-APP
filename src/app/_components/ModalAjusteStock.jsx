"use client";
import { useState } from "react";
import { supabase } from "@/app/_lib/supabase/supabase";
import Swal from "sweetalert2";
import { X, PlusCircle, MinusCircle, QrCode, Download, Image as ImageIcon } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm">
      {/* 🟢 CONTENEDOR PRINCIPAL CON SCROLL Y LÍMITES PARA MÓVIL */}
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl relative flex flex-col md:flex-row max-h-[92vh] overflow-y-auto custom-scrollbar">
        
        {/* 🟢 BOTÓN DE CERRAR FIJO (Para que no se pierda al hacer scroll) */}
        <button
          onClick={onClose}
          className="sticky top-4 right-4 self-end md:absolute md:top-4 md:right-4 text-slate-400 hover:text-red-500 transition-colors z-20 bg-white/80 backdrop-blur-md rounded-full p-2 shadow-sm border border-slate-100 md:border-none md:shadow-none md:bg-transparent -mb-10 mr-4 md:m-0"
        >
          <X size={20} className="md:w-6 md:h-6" />
        </button>

        {/* 🟢 COLUMNA IZQUIERDA: VISUAL (FOTO Y QR) */}
        <div className="md:w-5/12 bg-slate-50 p-6 md:p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-200 mt-6 md:mt-0">
          
          {/* FOTO PRINCIPAL (Reducida en móvil para no colapsar la pantalla) */}
          <div className="w-40 h-40 md:w-full md:h-auto md:aspect-square bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center overflow-hidden mb-4 relative group shrink-0">
            {producto.foto_url ? (
              <img src={producto.foto_url} alt="Producto" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-300">
                <ImageIcon size={40} strokeWidth={1.5} className="md:w-12 md:h-12" />
                <span className="text-[9px] font-black uppercase tracking-widest">Sin Foto</span>
              </div>
            )}
          </div>

          {/* QR SECUNDARIO */}
          <div className="w-20 h-20 md:w-24 md:h-24 bg-white border border-slate-200 rounded-xl flex items-center justify-center relative group overflow-hidden shadow-sm shrink-0">
            {producto.qr_url ? (
              <>
                <img src={producto.qr_url} alt="QR" className="w-full h-full object-contain p-1.5" />
                <button
                  onClick={descargarQR}
                  className="absolute inset-0 bg-blue-900/80 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                  title="Descargar QR"
                >
                  <Download size={18} className="mb-1" />
                  <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest">Descargar</span>
                </button>
              </>
            ) : (
              <QrCode className="text-slate-200" size={28} />
            )}
          </div>
          <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2 text-center">Código de Barras</p>

        </div>

        {/* 🟢 COLUMNA DERECHA: CONTROLES Y DATOS */}
        <div className="md:w-7/12 p-5 md:p-8 flex flex-col justify-between">
          
          <div className="text-center md:text-left mb-5 md:mb-6">
            <h3 className="font-black text-slate-800 text-xl md:text-2xl leading-tight">
              {producto.descripcion}
            </h3>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2">
              <span className="text-slate-500 text-[11px] md:text-xs font-bold">Mod: {producto.modelo || "N/A"}</span>
              <span className="text-slate-300 hidden md:inline">•</span>
              <span className="text-[9px] md:text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-black uppercase tracking-widest">
                ID: {producto.id}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 md:p-5 text-center border border-slate-200 mb-5 md:mb-6 shadow-inner">
            <span className="block text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
              Stock Actual en Sistema
            </span>
            <span className="text-4xl md:text-5xl font-black text-blue-700">
              {producto.cantidad}
            </span>
          </div>

          <div className="mb-5 md:mb-6">
            <label className="block text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 text-center">
              Piezas a mover físicamente
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={cantidadInput}
              onChange={(e) => setCantidadInput(e.target.value)}
              className="w-full text-center text-3xl md:text-4xl font-black text-slate-800 bg-white border-2 border-slate-200 rounded-2xl p-3 md:p-4 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all shadow-sm"
            />
          </div>

          <div className="flex gap-2 md:gap-3">
            <button
              onClick={() => handleAjuste("sacar")}
              disabled={procesando}
              className="flex-1 py-3.5 md:py-4 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-all text-xs md:text-sm shadow-lg shadow-red-500/30 flex items-center justify-center gap-1.5 md:gap-2 active:scale-95 disabled:opacity-50"
            >
              <MinusCircle size={18} className="md:w-5 md:h-5" /> Sacar
            </button>
            <button
              onClick={() => handleAjuste("agregar")}
              disabled={procesando}
              className="flex-1 py-3.5 md:py-4 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-all text-xs md:text-sm shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-1.5 md:gap-2 active:scale-95 disabled:opacity-50"
            >
              <PlusCircle size={18} className="md:w-5 md:h-5" /> Agregar
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}