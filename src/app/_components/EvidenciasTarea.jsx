"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  ExternalLink,
  FileImage,
  Images,
  LoaderCircle,
  Trash2,
  Upload,
} from "lucide-react";
import Swal from "sweetalert2";
import { supabase } from "@/app/_lib/supabase/supabase";

const BUCKET = "evidencias_tareas";
const MAXIMO_PIXELES = 1600;
const CALIDAD_WEBP = 0.72;

const sanitizarNombre = (nombre) =>
  nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .toLowerCase();

const generarIdentificador = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

const comprimirImagen = (archivo) =>
  new Promise((resolve, reject) => {
    if (!archivo.type.startsWith("image/")) {
      reject(new Error("El archivo seleccionado no es una imagen."));
      return;
    }

    const imagen = new Image();
    const urlTemporal = URL.createObjectURL(archivo);

    imagen.onload = () => {
      let ancho = imagen.naturalWidth;
      let alto = imagen.naturalHeight;

      if (ancho > alto && ancho > MAXIMO_PIXELES) {
        alto = Math.round((alto * MAXIMO_PIXELES) / ancho);
        ancho = MAXIMO_PIXELES;
      } else if (alto > MAXIMO_PIXELES) {
        ancho = Math.round((ancho * MAXIMO_PIXELES) / alto);
        alto = MAXIMO_PIXELES;
      }

      const canvas = document.createElement("canvas");
      canvas.width = ancho;
      canvas.height = alto;

      const contexto = canvas.getContext("2d");

      if (!contexto) {
        URL.revokeObjectURL(urlTemporal);
        reject(new Error("No se pudo preparar la imagen."));
        return;
      }

      contexto.imageSmoothingEnabled = true;
      contexto.imageSmoothingQuality = "high";
      contexto.drawImage(imagen, 0, 0, ancho, alto);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(urlTemporal);

          if (!blob) {
            reject(new Error("No se pudo comprimir la imagen."));
            return;
          }

          const nombreBase =
            sanitizarNombre(archivo.name.replace(/\.[^.]+$/, "")) ||
            "evidencia";

          resolve(
            new File(
              [blob],
              `${nombreBase}_${generarIdentificador()}.webp`,
              {
                type: "image/webp",
                lastModified: Date.now(),
              },
            ),
          );
        },
        "image/webp",
        CALIDAD_WEBP,
      );
    };

    imagen.onerror = () => {
      URL.revokeObjectURL(urlTemporal);
      reject(new Error(`No se pudo leer ${archivo.name}.`));
    };

    imagen.src = urlTemporal;
  });

const formatearTamano = (bytes) => {
  const cantidad = Number(bytes || 0);

  if (cantidad < 1024) return `${cantidad} B`;
  if (cantidad < 1024 * 1024) return `${(cantidad / 1024).toFixed(1)} KB`;

  return `${(cantidad / (1024 * 1024)).toFixed(1)} MB`;
};

const formatearFecha = (fecha) =>
  new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(fecha));

export default function EvidenciasTarea({
  tarea,
  miUsuario,
  puedeSubir = false,
}) {
  const inputCamaraRef = useRef(null);
  const inputGaleriaRef = useRef(null);

  const [evidencias, setEvidencias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [eliminandoId, setEliminandoId] = useState(null);

  const cargarEvidencias = useCallback(async () => {
    if (!tarea?.id) return;

    setCargando(true);

    try {
      const { data, error } = await supabase
        .from("tarea_evidencias")
        .select(`
          *,
          autor:perfiles!tarea_evidencias_subido_por_fkey(
            id,
            nombre,
            rol
          )
        `)
        .eq("tarea_id", tarea.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setEvidencias(data ?? []);
    } catch (error) {
      console.error("Error cargando evidencias:", error);

      await Swal.fire({
        icon: "error",
        title: "No se cargaron las evidencias",
        text: error.message ?? "Ocurrió un error inesperado.",
      });
    } finally {
      setCargando(false);
    }
  }, [tarea?.id]);

  useEffect(() => {
    void cargarEvidencias();
  }, [cargarEvidencias]);

  const subirArchivos = async (listaArchivos) => {
    const archivos = Array.from(listaArchivos ?? []);

    if (!archivos.length || !tarea?.id || !miUsuario?.id) return;

    setSubiendo(true);

    try {
      for (const archivoOriginal of archivos) {
        const archivoOptimizado = await comprimirImagen(archivoOriginal);

        const ruta = `${tarea.id}/${miUsuario.id}/${Date.now()}_${archivoOptimizado.name}`;

        const { error: errorStorage } = await supabase.storage
          .from(BUCKET)
          .upload(ruta, archivoOptimizado, {
            contentType: "image/webp",
            cacheControl: "3600",
            upsert: false,
          });

        if (errorStorage) throw errorStorage;

        const {
          data: { publicUrl },
        } = supabase.storage.from(BUCKET).getPublicUrl(ruta);

        const { error: errorRegistro } = await supabase
          .from("tarea_evidencias")
          .insert({
            tarea_id: tarea.id,
            subido_por: miUsuario.id,
            url: publicUrl,
            storage_path: ruta,
            nombre_original: archivoOriginal.name,
            mime_type: archivoOptimizado.type,
            tamano_bytes: archivoOptimizado.size,
          });

        if (errorRegistro) {
          await supabase.storage.from(BUCKET).remove([ruta]);
          throw errorRegistro;
        }
      }

      await cargarEvidencias();

      await Swal.fire({
        icon: "success",
        title:
          archivos.length === 1
            ? "Evidencia guardada"
            : "Evidencias guardadas",
        text: `${archivos.length} imagen(es) procesadas y subidas.`,
        timer: 1600,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error subiendo evidencias:", error);

      await Swal.fire({
        icon: "error",
        title: "No se pudo subir la evidencia",
        text: error.message ?? "Ocurrió un error inesperado.",
      });
    } finally {
      setSubiendo(false);

      if (inputCamaraRef.current) inputCamaraRef.current.value = "";
      if (inputGaleriaRef.current) inputGaleriaRef.current.value = "";
    }
  };

  const eliminarEvidencia = async (evidencia) => {
    const esPropietario = evidencia.subido_por === miUsuario?.id;
    const esCreador = tarea.creado_por === miUsuario?.id;
    const esAdmin = miUsuario?.rol === "admin";

    if (!esPropietario && !esCreador && !esAdmin) return;

    const confirmacion = await Swal.fire({
      icon: "warning",
      title: "¿Eliminar evidencia?",
      text: "La imagen dejará de estar disponible.",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmacion.isConfirmed) return;

    setEliminandoId(evidencia.id);

    try {
      const { error: errorRegistro } = await supabase
        .from("tarea_evidencias")
        .delete()
        .eq("id", evidencia.id);

      if (errorRegistro) throw errorRegistro;

      const { error: errorStorage } = await supabase.storage
        .from(BUCKET)
        .remove([evidencia.storage_path]);

      if (errorStorage) {
        console.warn("No se eliminó el archivo físico:", errorStorage);
      }

      setEvidencias((actuales) =>
        actuales.filter((elemento) => elemento.id !== evidencia.id),
      );

      await Swal.fire({
        icon: "success",
        title: "Evidencia eliminada",
        timer: 1100,
        showConfirmButton: false,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "No se pudo eliminar",
        text: error.message ?? "Ocurrió un error inesperado.",
      });
    } finally {
      setEliminandoId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-700">
            <FileImage size={18} className="text-blue-700" />
            Evidencias de la tarea
          </h3>

          <p className="mt-1 text-xs font-semibold text-slate-500">
            Fotografías comprimidas y convertidas automáticamente a WebP.
          </p>
        </div>

        {puedeSubir && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              ref={inputCamaraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => subirArchivos(event.target.files)}
            />

            <input
              ref={inputGaleriaRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => subirArchivos(event.target.files)}
            />

            <button
              type="button"
              disabled={subiendo}
              onClick={() => inputCamaraRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
            >
              <Camera size={16} />
              Cámara
            </button>

            <button
              type="button"
              disabled={subiendo}
              onClick={() => inputGaleriaRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-blue-800 disabled:opacity-50"
            >
              {subiendo ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Upload size={16} />
              )}

              {subiendo ? "Subiendo..." : "Subir fotos"}
            </button>
          </div>
        )}
      </div>

      {cargando ? (
        <div className="flex min-h-32 items-center justify-center">
          <LoaderCircle className="animate-spin text-blue-700" />
        </div>
      ) : evidencias.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center">
          <Images size={34} className="mx-auto mb-3 text-slate-300" />

          <p className="text-sm font-black text-slate-500">
            No hay evidencias registradas
          </p>

          {puedeSubir && (
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Utiliza la cámara o selecciona fotografías del dispositivo.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {evidencias.map((evidencia) => {
            const puedeEliminar =
              evidencia.subido_por === miUsuario?.id ||
              tarea.creado_por === miUsuario?.id ||
              miUsuario?.rol === "admin";

            return (
              <article
                key={evidencia.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
              >
                <a
                  href={evidencia.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block aspect-video overflow-hidden bg-slate-200"
                >
                  <img
                    src={evidencia.url}
                    alt={evidencia.nombre_original || "Evidencia de tarea"}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />

                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/0 transition group-hover:bg-slate-950/45">
                    <ExternalLink
                      size={24}
                      className="scale-75 text-white opacity-0 transition group-hover:scale-100 group-hover:opacity-100"
                    />
                  </div>
                </a>

                <div className="space-y-3 p-4">
                  <div>
                    <p className="truncate text-xs font-black text-slate-800">
                      {evidencia.nombre_original || "Evidencia"}
                    </p>

                    <p className="mt-1 text-[10px] font-semibold text-slate-500">
                      {formatearTamano(evidencia.tamano_bytes)} ·{" "}
                      {formatearFecha(evidencia.created_at)}
                    </p>

                    <p className="mt-1 truncate text-[10px] font-bold text-blue-700">
                      Subida por {evidencia.autor?.nombre ?? "Usuario"}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={evidencia.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-slate-900"
                    >
                      <ExternalLink size={13} />
                      Abrir
                    </a>

                    {puedeEliminar && (
                      <button
                        type="button"
                        disabled={eliminandoId === evidencia.id}
                        onClick={() => eliminarEvidencia(evidencia)}
                        className="rounded-lg bg-red-50 p-2.5 text-red-700 transition hover:bg-red-600 hover:text-white disabled:opacity-50"
                        title="Eliminar evidencia"
                      >
                        {eliminandoId === evidencia.id ? (
                          <LoaderCircle size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}