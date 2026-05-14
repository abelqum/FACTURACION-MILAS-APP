"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/app/_lib/supabase/supabase";
import Swal from "sweetalert2";
import dynamic from "next/dynamic";
import {
  Send,
  Users,
  Paperclip,
  CheckSquare,
  Square,
  X,
  Mail,
  PenTool,
  Eye,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutTemplate,
} from "lucide-react";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
import "react-quill-new/dist/quill.snow.css";

export default function EnviarCorreoPage() {
  const [miUsuario, setMiUsuario] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [contactos, setContactos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  // 🟢 ESTADOS DEL CORREO
  const [asunto, setAsunto] = useState("");
  const [tituloCorreo, setTituloCorreo] = useState("");
  const [mensajeHtml, setMensajeHtml] = useState("");
  const [adjuntos, setAdjuntos] = useState([]);

  // 🟢 ESTADO PARA PLANTILLAS
  const [plantillaSeleccionada, setPlantillaSeleccionada] =
    useState("corporativa");

  // Estados de la lista de destinatarios
  const [mostrarContactos, setMostrarContactos] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [nuevoCorreoManual, setNuevoCorreoManual] = useState("");

  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 10; // Reducido para mejor visualización móvil

  const [mostrarFirmas, setMostrarFirmas] = useState(false);
  const [firmaSeleccionada, setFirmaSeleccionada] = useState("");
  const [isModalPreviewOpen, setIsModalPreviewOpen] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    cargarDatos();
  }, []);
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const { data: perfiles } = await supabase.from("perfiles").select("*");
      setUsuarios(perfiles || []);
      const yo = perfiles?.find((p) => p.id === session?.user?.id);
      setMiUsuario(yo);
      if (yo) setFirmaSeleccionada(yo.id);

      const { data: dataClientes } = await supabase
        .from("clientes")
        .select("razon_social, correos");
      const { data: dataProspectos } = await supabase
        .from("prospectos")
        .select("razon_social, correos");

      let listaContactos = [];

      dataClientes?.forEach((c) => {
        if (c.correos && c.correos.length > 0) {
          c.correos.forEach((correo) =>
            listaContactos.push({
              email: correo.trim(),
              empresa: c.razon_social,
              tipo: "Cliente",
              seleccionado: false,
            }),
          );
        }
      });

      dataProspectos?.forEach((p) => {
        if (p.correos) {
          p.correos.split(",").forEach((correo) =>
            listaContactos.push({
              email: correo.trim(),
              empresa: p.razon_social,
              tipo: "Prospecto",
              seleccionado: false,
            }),
          );
        }
      });

      const unicos = Array.from(
        new Set(listaContactos.map((a) => a.email)),
      ).map((email) => listaContactos.find((a) => a.email === email));
      setContactos(unicos);
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  const toggleSeleccion = (email) => {
    setContactos(
      contactos.map((c) =>
        c.email === email ? { ...c, seleccionado: !c.seleccionado } : c,
      ),
    );
  };
  const toggleTodos = (estado) => {
    setContactos(contactos.map((c) => ({ ...c, seleccionado: estado })));
  };

  const agregarCorreoManual = () => {
    if (!nuevoCorreoManual.includes("@") || !nuevoCorreoManual.includes("."))
      return Swal.fire(
        "Error",
        "Ingresa un correo electrónico válido.",
        "error",
      );
    if (contactos.some((c) => c.email === nuevoCorreoManual))
      return Swal.fire("Atención", "Este correo ya está en la lista.", "info");
    setContactos([
      {
        email: nuevoCorreoManual,
        empresa: "Agregado Manualmente",
        tipo: "Extra",
        seleccionado: true,
      },
      ...contactos,
    ]);
    setNuevoCorreoManual("");
  };

  const agregarFirma = () => {
    const usuarioFirma = usuarios.find((u) => u.id === firmaSeleccionada);
    if (!usuarioFirma) return;
    const firmaHtml =
      usuarioFirma.firma_html ||
      `<p><br></p><p><strong>${usuarioFirma.nombre}</strong><br>MILAS Equipos Industriales</p>`;
    setMensajeHtml((prev) => prev + "<br>" + firmaHtml);
    setMostrarFirmas(false);
  };

  const handleFileSelect = (e) => {
    setAdjuntos([...adjuntos, ...Array.from(e.target.files)]);
  };
  const removerAdjunto = (index) => {
    setAdjuntos(adjuntos.filter((_, i) => i !== index));
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () =>
        resolve({ filename: file.name, content: reader.result.split(",")[1] });
      reader.onerror = (error) => reject(error);
    });

  // 🟢 3 DISEÑOS DE PLANTILLAS HTML
  const generarHtmlFinal = () => {
    const logoUrl = "https://milas.com.mx/img/logo.webp";
    const anio = new Date().getFullYear();

    if (plantillaSeleccionada === "corporativa") {
      return `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-w: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <div style="background-color: #ffffff; padding: 30px 20px; text-align: center; border-top: 6px solid #1d4ed8; border-bottom: 1px solid #f1f5f9;">
            <img src="${logoUrl}" alt="MILAS" style="height: 60px; max-width: 100%; object-fit: contain; margin-bottom: ${tituloCorreo ? "15px" : "0"};" />
            ${tituloCorreo ? `<h1 style="margin: 0; color: #0f172a; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">${tituloCorreo}</h1>` : ""}
          </div>
          <div style="padding: 35px 30px; color: #334155; font-size: 16px; line-height: 1.6;">${mensajeHtml}</div>
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 12px; color: #475569; font-weight: bold;">MILAS Equipos Industriales y Accesorios</p>
            <p style="margin: 5px 0 0 0; font-size: 11px; color: #94a3b8;">© ${anio} Todos los derechos reservados.</p>
          </div>
        </div>`;
    }

    if (plantillaSeleccionada === "elegante") {
      return `
        <div style="font-family: 'Georgia', serif; max-w: 600px; margin: 0 auto; background-color: #faf9f6; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${logoUrl}" alt="MILAS" style="height: 50px; margin-bottom: 20px;" />
            ${tituloCorreo ? `<h1 style="margin: 0; color: #1e293b; font-size: 22px; font-weight: normal; border-bottom: 1px solid #cbd5e1; padding-bottom: 15px; display: inline-block;">${tituloCorreo}</h1>` : ""}
          </div>
          <div style="background-color: #ffffff; padding: 40px; border: 1px solid #e2e8f0; color: #334155; font-size: 15px; line-height: 1.8;">${mensajeHtml}</div>
          <div style="text-align: center; margin-top: 30px; color: #64748b; font-size: 11px; font-family: Arial, sans-serif;">
            <p>MILAS Equipos Industriales | © ${anio}</p>
          </div>
        </div>`;
    }

    if (plantillaSeleccionada === "minimalista") {
      return `
        <div style="font-family: Arial, sans-serif; max-w: 700px; margin: 0 auto; color: #111827; font-size: 15px; line-height: 1.5;">
          ${tituloCorreo ? `<h2 style="color: #111827; font-size: 20px; margin-bottom: 20px;">${tituloCorreo}</h2>` : ""}
          <div style="margin-bottom: 30px;">${mensajeHtml}</div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <div style="display: flex; align-items: center; gap: 15px;">
            <img src="${logoUrl}" alt="MILAS" style="height: 35px;" />
            <div style="font-size: 11px; color: #6b7280;">
              <strong>MILAS Equipos Industriales</strong><br/>
              Aviso automático. © ${anio}
            </div>
          </div>
        </div>`;
    }
  };

  const enviarCorreo = async () => {
    const destinatarios = contactos
      .filter((c) => c.seleccionado)
      .map((c) => c.email);
    if (destinatarios.length === 0)
      return Swal.fire("Atención", "Selecciona destinatarios.", "warning");
    if (!asunto.trim())
      return Swal.fire("Atención", "Escribe un asunto.", "warning");

    setEnviando(true);
    try {
      const adjuntosBase64 = await Promise.all(
        adjuntos.map((f) => fileToBase64(f)),
      );

      const res = await fetch("/api/enviar-correo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinatarios,
          asunto,
          mensajeHtml: generarHtmlFinal(),
          adjuntos: adjuntosBase64,
        }),
      });

      // 🟢 MANEJO MEJORADO DE RESPUESTA DE LA API
      const dataResponse = await res.json();

      if (!res.ok) {
        throw new Error(
          dataResponse.error || "Fallo en el servidor de correos",
        );
      }

      Swal.fire(
        "¡Enviado!",
        `Enviado con éxito a ${destinatarios.length} contactos.`,
        "success",
      );
      setAsunto("");
      setTituloCorreo("");
      setMensajeHtml("");
      setAdjuntos([]);
      setContactos(contactos.map((c) => ({ ...c, seleccionado: false })));
    } catch (error) {
      console.error("Error al enviar:", error);
      Swal.fire(
        "Aviso",
        "La petición se envió, pero el servidor devolvió un aviso. Revisa tu bandeja de salida si es posible. \n\nDetalle: " +
          error.message,
        "info",
      );
    } finally {
      setEnviando(false);
    }
  };

  const contactosFiltrados = contactos.filter(
    (c) =>
      c.email.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.empresa.toLowerCase().includes(busqueda.toLowerCase()),
  );
  const totalPaginas =
    Math.ceil(contactosFiltrados.length / itemsPorPagina) || 1;
  const contactosPaginados = contactosFiltrados.slice(
    (paginaActual - 1) * itemsPorPagina,
    paginaActual * itemsPorPagina,
  );
  const seleccionadosCount = contactos.filter((c) => c.seleccionado).length;

  return (
    <div className="max-w-[90rem] mx-auto space-y-6 flex flex-col min-h-[85vh]">
      {/* ── HEADER MEJORADO ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-slate-200 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Mail className="text-blue-700" /> Campañas y Correos
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Envía comunicados con diseño profesional.
          </p>
        </div>
      </div>

      {/* ── GRID PRINCIPAL (Controles a la Izq, Editor a la Der) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 h-full min-h-[600px]">
        {/* LADO IZQUIERDO: Controles (Contactos y Plantillas) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* TARJETA DE DESTINATARIOS */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden h-[450px]">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
              <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm">
                <Users size={16} className="text-blue-600" /> Destinatarios
              </h3>
              <span className="bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-widest">
                {seleccionadosCount} Listos
              </span>
            </div>

            <div className="p-3 shrink-0 space-y-3 border-b border-slate-100">
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Correo extra..."
                  value={nuevoCorreoManual}
                  onChange={(e) => setNuevoCorreoManual(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && agregarCorreoManual()}
                  className="w-full text-slate-800 bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs focus:border-blue-600 font-medium"
                />
                <button
                  onClick={agregarCorreoManual}
                  className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-900 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="relative">
                <Search
                  className="absolute left-3 top-2 text-slate-400"
                  size={14}
                />
                <input
                  type="text"
                  placeholder="Buscar empresa o correo..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-slate-800 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:border-blue-600 font-medium"
                />
              </div>
              <div className="flex justify-between items-center pt-1">
                <button
                  onClick={() => toggleTodos(true)}
                  className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-1 hover:underline"
                >
                  <CheckSquare size={12} /> Todos
                </button>
                <button
                  onClick={() => toggleTodos(false)}
                  className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1 hover:underline"
                >
                  <Square size={12} /> Limpiar
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-50/50">
              {cargando ? (
                <p className="text-xs text-center text-slate-400 p-4 animate-pulse">
                  Cargando libreta...
                </p>
              ) : (
                contactosPaginados.map((c, i) => (
                  <label
                    key={i}
                    className={`flex items-start gap-3 p-2.5 cursor-pointer rounded-xl transition-all ${c.seleccionado ? "bg-blue-50 border border-blue-200 shadow-sm" : "bg-white border border-slate-100 hover:border-slate-300"}`}
                  >
                    <input
                      type="checkbox"
                      checked={c.seleccionado}
                      onChange={() => toggleSeleccion(c.email)}
                      className="w-4 h-4 mt-0.5 accent-blue-700 shrink-0 cursor-pointer rounded"
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs truncate ${c.seleccionado ? "font-black text-blue-900" : "font-bold text-slate-700"}`}
                      >
                        {c.email}
                      </p>
                      <p className="text-[9px] text-slate-500 truncate font-black uppercase tracking-widest mt-0.5">
                        {c.empresa} • {c.tipo}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div className="p-2 border-t border-slate-200 bg-white shrink-0 flex justify-between items-center">
              <button
                onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                disabled={paginaActual === 1}
                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 border border-slate-200"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Pág {paginaActual} / {totalPaginas}
              </span>
              <button
                onClick={() =>
                  setPaginaActual((p) => Math.min(totalPaginas, p + 1))
                }
                disabled={paginaActual === totalPaginas}
                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 border border-slate-200"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* TARJETA DE PLANTILLAS */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden shrink-0">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm">
                <LayoutTemplate size={16} className="text-emerald-600" /> Diseño
                Visual
              </h3>
            </div>
            <div className="p-4 flex flex-col gap-2">
              <label
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${plantillaSeleccionada === "corporativa" ? "bg-emerald-50 border-emerald-300" : "bg-white border-slate-200 hover:bg-slate-50"}`}
              >
                <input
                  type="radio"
                  name="plantilla"
                  value="corporativa"
                  checked={plantillaSeleccionada === "corporativa"}
                  onChange={(e) => setPlantillaSeleccionada(e.target.value)}
                  className="accent-emerald-600 w-4 h-4"
                />
                <div>
                  <p
                    className={`text-xs font-black ${plantillaSeleccionada === "corporativa" ? "text-emerald-900" : "text-slate-700"}`}
                  >
                    Corporativa MILAS
                  </p>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">
                    Bordes azules y logo centrado
                  </p>
                </div>
              </label>
              <label
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${plantillaSeleccionada === "elegante" ? "bg-emerald-50 border-emerald-300" : "bg-white border-slate-200 hover:bg-slate-50"}`}
              >
                <input
                  type="radio"
                  name="plantilla"
                  value="elegante"
                  checked={plantillaSeleccionada === "elegante"}
                  onChange={(e) => setPlantillaSeleccionada(e.target.value)}
                  className="accent-emerald-600 w-4 h-4"
                />
                <div>
                  <p
                    className={`text-xs font-black ${plantillaSeleccionada === "elegante" ? "text-emerald-900" : "text-slate-700"}`}
                  >
                    Elegante
                  </p>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">
                    Fondo crema y tipografía serif
                  </p>
                </div>
              </label>
              <label
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${plantillaSeleccionada === "minimalista" ? "bg-emerald-50 border-emerald-300" : "bg-white border-slate-200 hover:bg-slate-50"}`}
              >
                <input
                  type="radio"
                  name="plantilla"
                  value="minimalista"
                  checked={plantillaSeleccionada === "minimalista"}
                  onChange={(e) => setPlantillaSeleccionada(e.target.value)}
                  className="accent-emerald-600 w-4 h-4"
                />
                <div>
                  <p
                    className={`text-xs font-black ${plantillaSeleccionada === "minimalista" ? "text-emerald-900" : "text-slate-700"}`}
                  >
                    Minimalista Texto
                  </p>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">
                    Limpio, logo pequeño al final
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* LADO DERECHO: Editor de Correo */}
        <div className="lg:col-span-8 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-[800px] lg:h-auto">
          {/* Inputs de Asunto */}
          <div className="p-4 md:p-6 border-b border-slate-100 bg-white shrink-0 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                  Asunto del Correo *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Promociones de Mayo"
                  value={asunto}
                  onChange={(e) => setAsunto(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                  Título Interno (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. ¡Descubre los nuevos equipos!"
                  value={tituloCorreo}
                  onChange={(e) => setTituloCorreo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
              <div className="relative">
                <button
                  onClick={() => setMostrarFirmas(!mostrarFirmas)}
                  className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center gap-2"
                >
                  <PenTool size={14} /> Insertar Firma
                </button>
                {mostrarFirmas && (
                  <div className="absolute top-full left-0 w-[260px] mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl p-4 z-50">
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-2">
                      Insertar Firma de:
                    </span>
                    <select
                      value={firmaSeleccionada}
                      onChange={(e) => setFirmaSeleccionada(e.target.value)}
                      className="w-full mb-3 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      {usuarios.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nombre}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={agregarFirma}
                      className="w-full bg-slate-800 text-white py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-900"
                    >
                      Añadir al editor
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsModalPreviewOpen(true)}
                className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors flex items-center gap-2"
              >
                <Eye size={14} /> Ver Diseño Final
              </button>
            </div>
          </div>

          {/* El Editor Quill */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            <ReactQuill
              theme="snow"
              value={mensajeHtml}
              onChange={setMensajeHtml}
              className="flex-1 flex flex-col border-none text-slate-800"
              placeholder="Escribe el cuerpo de tu correo aquí..."
              modules={{
                toolbar: [
                  [{ header: [1, 2, 3, false] }],
                  ["bold", "italic", "underline", "strike"],
                  [{ list: "ordered" }, { list: "bullet" }],
                  [{ color: [] }, { background: [] }],
                  ["link", "image"],
                  ["clean"],
                ],
              }}
            />
          </div>

          {/* Footer de Enviar y Adjuntos */}
          <div className="bg-slate-50 border-t border-slate-200 p-4 md:p-6 shrink-0 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex-1 w-full flex items-center gap-3 overflow-x-auto pb-2 sm:pb-0">
              <input
                type="file"
                multiple
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileSelect}
              />
              <button
                onClick={() => fileInputRef.current.click()}
                className="shrink-0 px-4 py-3 bg-white text-slate-600 border border-slate-300 hover:border-blue-500 hover:text-blue-700 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
              >
                <Paperclip size={18} />{" "}
                <span className="text-xs font-black uppercase tracking-widest">
                  Adjuntos
                </span>
              </button>
              {adjuntos.map((file, i) => (
                <div
                  key={i}
                  className="shrink-0 flex items-center gap-2 bg-blue-50 text-blue-800 px-3 py-2 rounded-lg border border-blue-200 text-xs font-bold max-w-[150px]"
                >
                  <span className="truncate">{file.name}</span>
                  <button
                    onClick={() => removerAdjunto(i)}
                    className="hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={enviarCorreo}
              disabled={enviando || seleccionadosCount === 0}
              className="w-full sm:w-auto bg-blue-700 text-white px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-800 transition-all shadow-lg shadow-blue-700/30 disabled:opacity-50 active:scale-95 shrink-0"
            >
              {enviando ? "Enviando..." : "Enviar Correo"} <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 🟢 MODAL DE PREVISUALIZACIÓN */}
      {isModalPreviewOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-sm"
          onClick={() => setIsModalPreviewOpen(false)}
        >
          <div
            className="bg-slate-100 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
              <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm">
                <Eye size={18} className="text-emerald-600" /> Vista Previa:{" "}
                {plantillaSeleccionada.toUpperCase()}
              </h3>
              <button
                onClick={() => setIsModalPreviewOpen(false)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-slate-200/50">
              <div
                dangerouslySetInnerHTML={{ __html: generarHtmlFinal() }}
                className="shadow-xl mx-auto rounded-xl bg-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Estilos para el editor */}
      <style jsx global>{`
        .quill {
          display: flex;
          flex-direction: column;
          height: 100%;
          border: none !important;
        }
        .ql-toolbar {
          border: none !important;
          border-bottom: 1px solid #e2e8f0 !important;
          background-color: #ffffff;
          padding: 12px 20px !important;
        }
        .ql-container {
          border: none !important;
          flex: 1;
          overflow-y: auto;
          font-size: 15px;
          font-family: inherit;
          color: #1e293b;
        }
        .ql-editor {
          min-height: 250px;
          padding: 2rem;
        }
      `}</style>
    </div>
  );
}
