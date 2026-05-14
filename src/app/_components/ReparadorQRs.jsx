"use client";
import { useState } from "react";
import { supabase } from "@/app/_lib/supabase/supabase";
import QRCode from "qrcode";
import Swal from "sweetalert2";
import { Wrench, CheckCircle, Loader2 } from "lucide-react";

export default function ReparadorQRs() {
  const [loading, setLoading] = useState(false);
  const [progreso, setProgreso] = useState("");
  const [completados, setCompletados] = useState(0);
  const [total, setTotal] = useState(0);

  const ejecutarReparacion = async () => {
    setLoading(true);
    setProgreso("Buscando productos sin código QR...");
    setCompletados(0);

    try {
      // 1. Buscar productos que NO tengan QR o lo tengan vacío
      const { data: productos, error } = await supabase
        .from("inventario")
        .select("id, descripcion, qr_url")
        .or("qr_url.is.null,qr_url.eq.");

      if (error) throw new Error("Error leyendo inventario: " + error.message);

      if (!productos || productos.length === 0) {
        Swal.fire(
          "Todo Excelente",
          "No hay productos que necesiten reparación de QR.",
          "success",
        );
        setProgreso("No hay QRs faltantes.");
        setLoading(false);
        return;
      }

      setTotal(productos.length);
      let exitosos = 0;

      // 2. Procesar uno por uno
      for (let i = 0; i < productos.length; i++) {
        const prod = productos[i];
        setProgreso(`Generando QR para: ${prod.descripcion}...`);

        // Generar QR en texto base64
        const qrDataUrl = await QRCode.toDataURL(String(prod.id), {
          width: 300,
        });

        // Convertir a archivo (Blob)
        const resBlob = await fetch(qrDataUrl);
        const blob = await resBlob.blob();

        const fileName = `qr_${prod.id}.png`;

        // 🟢 SUBIR AL BUCKET: Si falla, lanzamos error para detenernos y no mentir.
        const { error: upErr } = await supabase.storage
          .from("qr")
          .upload(fileName, blob, {
            contentType: "image/png",
            upsert: true,
          });

        if (upErr) {
          throw new Error(
            `Fallo subiendo imagen de ${prod.descripcion}. Detalles: ${upErr.message}`,
          );
        }

        // Obtener URL Pública
        const { data: urlData } = supabase.storage
          .from("qr")
          .getPublicUrl(fileName);

        // Actualizar la base de datos
        const { error: dbErr } = await supabase
          .from("inventario")
          .update({ qr_url: urlData.publicUrl })
          .eq("id", prod.id);

        if (dbErr) {
          throw new Error(
            `Fallo actualizando la base de datos para ${prod.descripcion}. Detalles: ${dbErr.message}`,
          );
        }

        exitosos++;
        setCompletados(exitosos);
      }

      Swal.fire(
        "¡Mantenimiento Completado!",
        `Se generaron y subieron ${exitosos} códigos QR correctamente. Ya puedes verlos en tu inventario.`,
        "success",
      );
      setProgreso("Todos los QRs han sido reparados.");
    } catch (err) {
      console.error(err);
      Swal.fire("Se detuvo el proceso", err.message, "error");
      setProgreso("Proceso detenido por error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-700 mt-6">
      <div className="flex items-start gap-4">
        <div className="bg-emerald-900/50 p-3 rounded-xl shrink-0">
          <Wrench size={24} className="text-emerald-400" />
        </div>
        <div>
          <h3 className="text-lg font-black text-white">
            Mantenimiento de Códigos QR
          </h3>
          <p className="text-xs text-slate-400 font-medium max-w-md mt-1">
            Si notas que algunos productos antiguos o creados recientemente no
            tienen su imagen de código QR, usa esta herramienta para generarlos
            automáticamente.
          </p>

          {loading && (
            <div className="mt-3 flex items-center gap-2 text-emerald-400 text-xs font-bold bg-emerald-900/30 w-fit px-3 py-1.5 rounded-lg border border-emerald-800">
              <Loader2 size={14} className="animate-spin" />
              <span>
                {progreso} ({completados}/{total})
              </span>
            </div>
          )}

          {!loading && progreso && (
            <div className="mt-3 flex items-center gap-2 text-blue-400 text-xs font-bold">
              <CheckCircle size={14} /> {progreso}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={ejecutarReparacion}
        disabled={loading}
        className="w-full md:w-auto bg-emerald-600 text-white font-black py-3 px-6 rounded-xl hover:bg-emerald-500 transition-all shadow-lg flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest disabled:opacity-50 active:scale-95 shrink-0"
      >
        {loading ? "Trabajando..." : "Ejecutar Reparación"}
      </button>
    </div>
  );
}
