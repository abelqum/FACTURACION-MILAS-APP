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
} from "lucide-react";

// Importamos el editor moderno para React 19
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

  // Estados de la lista de destinatarios
  const [mostrarContactos, setMostrarContactos] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [nuevoCorreoManual, setNuevoCorreoManual] = useState("");

  // PAGINACIÓN
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 15;

  // Estados de UI
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
          p.correos
            .split(",")
            .forEach((correo) =>
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
    setTodosSeleccionados(estado);
    setContactos(contactos.map((c) => ({ ...c, seleccionado: estado })));
  };

  const agregarCorreoManual = () => {
    if (!nuevoCorreoManual.includes("@") || !nuevoCorreoManual.includes(".")) {
      return Swal.fire(
        "Error",
        "Ingresa un correo electrónico válido.",
        "error",
      );
    }
    if (contactos.some((c) => c.email === nuevoCorreoManual)) {
      return Swal.fire("Atención", "Este correo ya está en la lista.", "info");
    }
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
    const files = Array.from(e.target.files);
    setAdjuntos([...adjuntos, ...files]);
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
          mensajeHtml: plantillaHtml,
          adjuntos: adjuntosBase64,
        }),
      });

      if (!res.ok) throw new Error("Error en la API");

      Swal.fire(
        "¡Enviado!",
        `Enviado a ${destinatarios.length} contactos.`,
        "success",
      );
      setAsunto("");
      setTituloCorreo("");
      setMensajeHtml("");
      setAdjuntos([]);
      setContactos(contactos.map((c) => ({ ...c, seleccionado: false })));
      setTodosSeleccionados(false);
    } catch (error) {
      Swal.fire("Error", "No se pudo enviar el correo.", "error");
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

  // 🟢 PLANTILLA DE CORREO
  const plantillaHtml = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-w: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
      <div style="background-color: #ffffff; padding: 30px 20px; text-align: center; border-top: 6px solid #1d4ed8; border-bottom: 1px solid #f1f5f9;">
        <img src="https://milas.com.mx/img/logo.webp" alt="MILAS Logo" style="height: 60px; max-width: 100%; object-fit: contain; margin-bottom: ${tituloCorreo ? "15px" : "0"};" />
        ${
          tituloCorreo
            ? `
          <h1 style="margin: 0; color: #0f172a; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
            ${tituloCorreo}
          </h1>
        `
            : ""
        }
      </div>
      <div style="padding: 35px 30px; color: #334155; font-size: 16px; line-height: 1.6;">
        ${mensajeHtml}
      </div>
      <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 12px; color: #475569; font-weight: bold;">
          MILAS Equipos Industriales y Accesorios
        </p>
        <p style="margin: 5px 0 0 0; font-size: 11px; color: #94a3b8;">
          © ${new Date().getFullYear()} Todos los derechos reservados.<br/>Este es un correo automático, por favor no responda directamente.
        </p>
      </div>
    </div>
  `;

  return (
    <div className="max-w-[90rem] mx-auto space-y-6 flex flex-col h-[85vh]">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-2 gap-4 z-20 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Mail className="text-blue-700" /> Campañas y Correos
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Envía comunicados con diseño profesional.
          </p>
        </div>

        {/* SELECTOR DE DESTINATARIOS */}
        <div className="relative w-full md:w-auto md:min-w-[280px] shrink-0">
          <button
            onClick={() => {
              setMostrarContactos(!mostrarContactos);
              setMostrarFirmas(false);
            }}
            className={`w-full p-2.5 rounded-lg flex items-center justify-between gap-4 text-sm font-bold border transition-colors shadow-sm ${mostrarContactos ? "bg-blue-50 border-blue-200 text-blue-800" : "bg-white border-slate-300 text-slate-800 hover:bg-slate-50"}`}
          >
            <span className="flex items-center gap-2 truncate">
              <Users size={16} className="shrink-0" /> Destinatarios (
              {seleccionadosCount})
            </span>
            {mostrarContactos ? (
              <X size={16} className="shrink-0" />
            ) : (
              <ChevronDown size={16} className="shrink-0" />
            )}
          </button>

          {mostrarContactos && (
            <div className="absolute top-full right-0 w-full sm:w-[400px] mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl p-4 z-50 flex flex-col">
              <div className="flex gap-2 mb-3">
                <input
                  type="email"
                  placeholder="Añadir correo manual..."
                  value={nuevoCorreoManual}
                  onChange={(e) => setNuevoCorreoManual(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && agregarCorreoManual()}
                  className="w-full bg-slate-50 border border-slate-300 p-2 rounded-lg text-sm focus:outline-none focus:border-blue-700 font-bold text-slate-800"
                />
                <button
                  onClick={agregarCorreoManual}
                  className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-900 transition-colors shrink-0"
                >
                  <Plus size={18} />
                </button>
              </div>

              <div className="relative mb-3">
                <Search
                  className="absolute left-3 top-2 text-slate-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Buscar en libreta..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-700 font-bold text-slate-800"
                />
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-2">
                <button
                  onClick={() => toggleTodos(true)}
                  className="text-[11px] font-black text-blue-600 uppercase flex items-center gap-1 hover:underline"
                >
                  <CheckSquare size={14} /> Seleccionar Todos
                </button>
                <button
                  onClick={() => toggleTodos(false)}
                  className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-1 hover:underline"
                >
                  <Square size={14} /> Desmarcar
                </button>
              </div>

              <div className="overflow-y-auto h-[250px] space-y-1 pr-1">
                {cargando ? (
                  <p className="text-xs text-center text-slate-400 p-4 animate-pulse">
                    Cargando libreta...
                  </p>
                ) : (
                  contactosPaginados.map((c, i) => (
                    <label
                      key={i}
                      className={`flex items-start gap-3 p-2 cursor-pointer rounded-lg transition-colors ${c.seleccionado ? "bg-blue-50 border border-blue-100" : "hover:bg-slate-50 border border-transparent"}`}
                    >
                      <input
                        type="checkbox"
                        checked={c.seleccionado}
                        onChange={() => toggleSeleccion(c.email)}
                        className="w-4 h-4 mt-0.5 accent-blue-700 shrink-0 cursor-pointer"
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm truncate ${c.seleccionado ? "font-black text-blue-900" : "font-semibold text-slate-800"}`}
                        >
                          {c.email}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate font-medium">
                          {c.empresa} • {c.tipo}
                        </p>
                      </div>
                    </label>
                  ))
                )}
                {contactosPaginados.length === 0 && (
                  <p className="text-xs text-center text-slate-400 p-4">
                    No se encontraron contactos.
                  </p>
                )}
              </div>

              <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                  disabled={paginaActual === 1}
                  className="p-1 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30 border border-slate-200 bg-white"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Página {paginaActual} de {totalPaginas}
                </span>
                <button
                  onClick={() =>
                    setPaginaActual((p) => Math.min(totalPaginas, p + 1))
                  }
                  disabled={paginaActual === totalPaginas}
                  className="p-1 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30 border border-slate-200 bg-white"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🟢 ZONA DEL EDITOR DE CORREO */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col z-10 overflow-hidden min-h-[60vh]">
        {/* BARRA SUPERIOR DEL EDITOR (ASUNTOS Y BOTONES) */}
        <div className="p-4 border-b border-slate-200 flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-slate-50 shrink-0">
          <div className="flex-1 w-full flex flex-col md:flex-row gap-3 min-w-0">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Asunto (Para la bandeja de entrada)"
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
                className="w-full bg-white border border-slate-300 p-2.5 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 shadow-sm"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Título Principal (Visible en el diseño)"
                value={tituloCorreo}
                onChange={(e) => setTituloCorreo(e.target.value)}
                className="w-full bg-white border border-slate-300 p-2.5 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 shadow-sm"
              />
            </div>
          </div>

          <div className="relative shrink-0 flex gap-2">
            <button
              onClick={() => setIsModalPreviewOpen(true)}
              className="w-auto bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <Eye size={16} /> Previsualizar
            </button>

            <div className="relative">
              <button
                onClick={() => {
                  setMostrarFirmas(!mostrarFirmas);
                  setMostrarContactos(false);
                }}
                className="w-auto bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 hover:bg-slate-900 transition-colors shadow-sm"
              >
                <PenTool size={16} /> Firmas
              </button>

              {mostrarFirmas && (
                <div className="absolute top-full right-0 w-[260px] mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl p-4 z-50">
                  <span className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 border-b border-slate-100 pb-2">
                    Insertar Firma de:
                  </span>
                  <select
                    value={firmaSeleccionada}
                    onChange={(e) => setFirmaSeleccionada(e.target.value)}
                    className="w-full mb-3 p-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:outline-none"
                  >
                    {usuarios.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombre}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={agregarFirma}
                    className="w-full bg-blue-700 text-white py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-blue-800"
                  >
                    Añadir al final
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* EDITOR RICH TEXT */}
        <div className="flex-1 flex flex-col">
          <ReactQuill
            theme="snow"
            value={mensajeHtml}
            onChange={setMensajeHtml}
            className="flex-1 flex flex-col border-none text-slate-800"
            placeholder="Escribe el contenido de tu correo aquí..."
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

        {/* FOOTER DEL EDITOR: ADJUNTOS Y BOTÓN DE ENVIAR */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 shrink-0 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex-1 w-full flex items-center gap-3 overflow-x-auto">
            <input
              type="file"
              multiple
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileSelect}
            />
            <button
              onClick={() => fileInputRef.current.click()}
              className="shrink-0 px-4 py-2 bg-white text-slate-700 border border-slate-300 hover:border-blue-500 hover:text-blue-700 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
            >
              <Paperclip size={16} />{" "}
              <span className="text-sm font-bold">Adjuntar Archivo</span>
            </button>
            {adjuntos.map((file, i) => (
              <div
                key={i}
                className="shrink-0 flex items-center gap-2 bg-blue-50 text-blue-800 px-3 py-1.5 rounded-md border border-blue-200 text-xs font-bold max-w-[150px]"
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
            className="w-auto bg-blue-700 text-white px-6 py-2.5 rounded-lg font-black text-sm uppercase tracking-wide flex items-center gap-2 hover:bg-blue-800 transition-all shadow-md disabled:opacity-50 active:scale-95 shrink-0"
          >
            {enviando ? "Enviando..." : "Enviar Ahora"} <Send size={16} />
          </button>
        </div>
      </div>

      {/* 🟢 MODAL DE PREVISUALIZACIÓN */}
      {isModalPreviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-sm"
          onClick={() => setIsModalPreviewOpen(false)}
        >
          <div
            className="bg-slate-100 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Eye size={18} className="text-emerald-600" /> Así lo verá el
                cliente en su bandeja
              </h3>
              <button
                onClick={() => setIsModalPreviewOpen(false)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-slate-200/50">
              <div
                dangerouslySetInnerHTML={{ __html: plantillaHtml }}
                className="shadow-2xl mx-auto rounded-xl"
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
          border-bottom: 1px solid #cbd5e1 !important;
          background-color: #f8fafc;
          padding: 10px 16px !important;
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
          min-height: 200px;
          padding: 1.5rem;
        }
      `}</style>
    </div>
  );
}
