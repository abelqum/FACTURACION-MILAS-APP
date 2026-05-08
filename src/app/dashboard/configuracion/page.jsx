"use client";
import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { supabase } from "@/app/_lib/supabase/supabase";
import {
  Database,
  DownloadCloud,
  ServerCog,
  KeyRound,
  User,
  Eye,
  EyeOff,
  PenTool,
  Settings,
  Plus,
  Edit2,
  Trash2,
  Save,
  ChevronDown,
  ChevronUp,
  MapPin,
  Link as LinkIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
import "react-quill-new/dist/quill.snow.css";

// 🟢 DEFINICIÓN DE LOS CATÁLOGOS
const CATALOGOS = [
  { id: "inventario_categorias", titulo: "Categorías", icono: "📦" },
  {
    id: "inventario_proveedores",
    titulo: "Proveedores",
    icono: "🤝",
    extraField: "enlace",
  },
  { id: "inventario_marcas", titulo: "Marcas", icono: "🏷️" },
  { id: "inventario_udm", titulo: "Unidades de Medida", icono: "📏" },
  { id: "inventario_almacenes", titulo: "Almacenes / Estantes", icono: "🏢" },
  { id: "inventario_condiciones", titulo: "Condiciones", icono: "✨" },
];

export default function ConfiguracionPage() {
  const [isBackupLoading, setIsBackupLoading] = useState(false);

  // ESTADOS PARA EL PERFIL
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentName, setCurrentName] = useState("");
  const [userRole, setUserRole] = useState(null);
  const [isNameLoading, setIsNameLoading] = useState(false);

  // ESTADOS PARA CONTRASEÑAS
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [firma, setFirma] = useState("");
  const [isFirmaLoading, setIsFirmaLoading] = useState(false);

  // 🟢 ESTADOS PARA CATÁLOGOS
  const [catalogoActivo, setCatalogoActivo] = useState(CATALOGOS[0]);
  const [itemsCatalogo, setItemsCatalogo] = useState([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(false);
  const [listaAbierta, setListaAbierta] = useState(true);
  const [formCatalogo, setFormCatalogo] = useState({ nombre: "", enlace: "" });
  const [editandoCatId, setEditandoCatId] = useState(null);

  // 1. CARGA INICIAL DEL PERFIL
  useEffect(() => {
    let isMounted = true;

    const fetchMiPerfil = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && isMounted) {
        setCurrentUserId(user.id);

        const { data, error } = await supabase
          .from("perfiles")
          .select("nombre, rol,firma_html")
          .eq("id", user.id)
          .single();

        if (data && !error && isMounted) {
          setCurrentName(data.nombre);
          setUserRole(data.rol);
          setFirma(data.firma_html || "");
        }
      }
    };

    fetchMiPerfil();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. CARGA DE CATÁLOGOS CADA QUE CAMBIAMOS DE PESTAÑA
  useEffect(() => {
    cargarItemsCatalogo();
  }, [catalogoActivo]);

  const cargarItemsCatalogo = async () => {
    setCargandoCatalogos(true);
    const { data, error } = await supabase
      .from(catalogoActivo.id)
      .select("*")
      .order("nombre");
    if (!error) setItemsCatalogo(data || []);
    setCargandoCatalogos(false);
  };

  // 🟢 FUNCIONES DE CATÁLOGOS
  const guardarCatalogo = async (e) => {
    e.preventDefault();
    if (!formCatalogo.nombre.trim()) return;

    try {
      const payload = catalogoActivo.extraField
        ? { nombre: formCatalogo.nombre, enlace: formCatalogo.enlace }
        : { nombre: formCatalogo.nombre };

      if (editandoCatId) {
        const { error } = await supabase
          .from(catalogoActivo.id)
          .update(payload)
          .eq("id", editandoCatId);
        if (error) throw error;
        Swal.fire({
          icon: "success",
          title: "Actualizado",
          toast: true,
          position: "top-end",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        const { error } = await supabase
          .from(catalogoActivo.id)
          .insert([payload]);
        if (error) throw error;
        Swal.fire({
          icon: "success",
          title: "Guardado",
          toast: true,
          position: "top-end",
          timer: 2000,
          showConfirmButton: false,
        });
      }

      setFormCatalogo({ nombre: "", enlace: "" });
      setEditandoCatId(null);
      cargarItemsCatalogo();
    } catch (error) {
      Swal.fire("Error", "No se pudo guardar el registro.", "error");
    }
  };

  const iniciarEdicionCatalogo = (item) => {
    setFormCatalogo({ nombre: item.nombre, enlace: item.enlace || "" });
    setEditandoCatId(item.id);
    setListaAbierta(false); // Cerramos lista para enfocarnos en el form
  };

  const eliminarCatalogo = async (id) => {
    const confirm = await Swal.fire({
      title: "¿Estás seguro?",
      text: "Si este item ya está en uso en el inventario, no podrás borrarlo.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Sí, borrar",
    });

    if (confirm.isConfirmed) {
      const { error } = await supabase
        .from(catalogoActivo.id)
        .delete()
        .eq("id", id);
      if (error) {
        Swal.fire(
          "No se puede borrar",
          "Este item ya está siendo usado en tu inventario.",
          "error",
        );
      } else {
        cargarItemsCatalogo();
        Swal.fire({
          icon: "success",
          title: "Borrado",
          toast: true,
          position: "top-end",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    }
  };

  // FUNCIONES DE PERFIL Y SEGURIDAD
  const handleGuardarFirma = async () => {
    setIsFirmaLoading(true);
    try {
      await supabase
        .from("perfiles")
        .update({ firma_html: firma })
        .eq("id", currentUserId);
      Swal.fire({
        icon: "success",
        title: "Firma guardada",
        toast: true,
        position: "top-end",
        timer: 3000,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire("Error", "No se pudo guardar la firma.", "error");
    } finally {
      setIsFirmaLoading(false);
    }
  };

  const handleDescargarRespaldo = async () => {
    setIsBackupLoading(true);
    try {
      const response = await fetch("/api/backup?download=true");
      if (!response.ok) throw new Error("Fallo al generar el respaldo");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `milas_backup_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      Swal.fire({
        title: "Error al descargar el respaldo:",
        text: error.message,
        icon: "error",
        confirmButtonColor: "#d33",
      });
    } finally {
      setIsBackupLoading(false);
    }
  };

  const handleChangeName = async (e) => {
    e.preventDefault();
    if (!currentName.trim() || !currentUserId) return;

    setIsNameLoading(true);
    try {
      const { error } = await supabase
        .from("perfiles")
        .update({ nombre: currentName.trim() })
        .eq("id", currentUserId);
      if (error) throw error;
      Swal.fire({
        icon: "success",
        title: "Nombre actualizado",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
    } catch (error) {
      Swal.fire({
        title: "Error al actualizar el nombre: ",
        text: error.message,
        icon: "error",
        confirmButtonColor: "#d33",
      });
    } finally {
      setIsNameLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      return Swal.fire({
        title: "Validación de contraseña",
        text: "Las contraseñas no coinciden.",
        icon: "warning",
        confirmButtonColor: "#1d4ed8",
      });
    }
    if (newPassword.length < 6) {
      return Swal.fire({
        title: "Contraseña muy corta",
        text: "Debe tener al menos 6 caracteres.",
        icon: "info",
        confirmButtonColor: "#1d4ed8",
      });
    }

    setIsPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      Swal.fire({
        title: "¡Seguridad Actualizada!",
        text: "Tu contraseña ha sido cambiada con éxito.",
        icon: "success",
        confirmButtonColor: "#1d4ed8",
      });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      Swal.fire({
        title: "Error al actualizar la contraseña:",
        text: error.message,
        icon: "error",
        confirmButtonColor: "#d33",
      });
    } finally {
      setIsPasswordLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* HEADER */}
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          Ajustes y Configuración
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Gestiona tu perfil, catálogos del sistema y seguridad.
        </p>
      </div>

      {/* ======================================================= */}
      {/* ── SECCIÓN DE CATÁLOGOS (VISIBLE PARA TODOS) ── */}
      {/* ======================================================= */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        <h2 className="text-xl font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Settings size={24} className="text-blue-700" /> Administrador de
          Catálogos
        </h2>

        {/* Pestañas */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CATALOGOS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setCatalogoActivo(cat);
                setFormCatalogo({ nombre: "", enlace: "" });
                setEditandoCatId(null);
                setListaAbierta(true);
              }}
              className={`px-4 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                catalogoActivo.id === cat.id
                  ? "bg-slate-800 text-white shadow-md"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {cat.icono} {cat.titulo}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LADO IZQUIERDO: Formulario */}
          <div className="lg:col-span-1 bg-slate-50 border border-slate-200 rounded-2xl p-5 h-fit">
            <h3 className="font-black text-slate-700 mb-4">
              {editandoCatId
                ? "Editar Registro"
                : `Nuevo en ${catalogoActivo.titulo}`}
            </h3>

            <form onSubmit={guardarCatalogo} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Nombre *
                </label>
                <input
                  required
                  type="text"
                  value={formCatalogo.nombre}
                  onChange={(e) =>
                    setFormCatalogo({ ...formCatalogo, nombre: e.target.value })
                  }
                  className="w-full bg-white border border-slate-300 p-3 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-600 transition-all"
                />
              </div>

              {catalogoActivo.extraField === "enlace" && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Enlace (Maps/MercadoLibre)
                  </label>
                  <div className="relative">
                    <LinkIcon
                      className="absolute left-3 top-3.5 text-slate-400"
                      size={16}
                    />
                    <input
                      type="url"
                      value={formCatalogo.enlace}
                      onChange={(e) =>
                        setFormCatalogo({
                          ...formCatalogo,
                          enlace: e.target.value,
                        })
                      }
                      className="w-full pl-9 pr-3 py-3 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-600 transition-all"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {editandoCatId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditandoCatId(null);
                      setFormCatalogo({ nombre: "", enlace: "" });
                    }}
                    className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase hover:bg-slate-300 transition-colors"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-700 text-white rounded-xl font-bold text-xs uppercase shadow-md shadow-blue-700/20 hover:bg-blue-800 transition-colors flex items-center justify-center gap-2"
                >
                  {editandoCatId ? (
                    <>
                      <Save size={16} /> Guardar
                    </>
                  ) : (
                    <>
                      <Plus size={16} /> Añadir
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* LADO DERECHO: Lista Desplegable (Corregida) */}
          <div className="lg:col-span-2 h-fit">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setListaAbierta(!listaAbierta)}
                className={`w-full p-4 bg-slate-50 flex justify-between items-center transition-colors hover:bg-slate-100 ${listaAbierta ? "border-b border-slate-200" : ""}`}
              >
                <span className="font-black text-slate-700">
                  Ver lista de {catalogoActivo.titulo} ({itemsCatalogo.length})
                </span>
                {listaAbierta ? (
                  <ChevronUp size={20} className="text-slate-500" />
                ) : (
                  <ChevronDown size={20} className="text-slate-500" />
                )}
              </button>

              {listaAbierta && (
                <div className="p-4 overflow-y-auto max-h-[400px]">
                  {cargandoCatalogos ? (
                    <p className="text-center text-sm font-bold text-slate-400 py-8 animate-pulse">
                      Cargando datos...
                    </p>
                  ) : itemsCatalogo.length === 0 ? (
                    <p className="text-center text-sm font-bold text-slate-400 py-8">
                      No hay registros aún.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {itemsCatalogo.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all group"
                        >
                          <div>
                            <p className="font-bold text-sm text-slate-800">
                              {item.nombre}
                            </p>
                            {item.enlace && (
                              <a
                                href={item.enlace}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 mt-0.5"
                              >
                                <MapPin size={10} /> Ver enlace
                              </a>
                            )}
                          </div>
                          <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => iniciarEdicionCatalogo(item)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => eliminarCatalogo(item.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================= */}
      {/* ── SECCIÓN DE CAMBIO DE NOMBRE ── */}
      {/* ======================================================= */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-black mb-5 text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
          <User size={24} className="text-blue-700" />
          Actualizar Mi Perfil
        </h2>

        <form
          onSubmit={handleChangeName}
          className="flex flex-col md:flex-row gap-4 items-end"
        >
          <div className="w-full">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Nombre de Usuario
            </label>
            <input
              type="text"
              placeholder="Ej. Juan Pérez"
              required
              value={currentName}
              onChange={(e) => setCurrentName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl focus:ring-1 focus:ring-blue-700 focus:border-blue-700 focus:outline-none transition-all font-semibold text-slate-800"
            />
          </div>
          <button
            type="submit"
            disabled={isNameLoading || !currentName.trim()}
            className="w-full md:w-auto bg-blue-700 text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-800 transition-all shadow-md shadow-blue-700/20 flex items-center justify-center gap-2 uppercase tracking-widest text-xs disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed shrink-0 active:scale-95"
          >
            {isNameLoading ? "Guardando..." : "Guardar Nombre"}
          </button>
        </form>
      </div>

      {/* ======================================================= */}
      {/* ── SECCIÓN DE CAMBIO DE CONTRASEÑA ── */}
      {/* ======================================================= */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-black mb-5 text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
          <KeyRound size={24} className="text-blue-700" />
          Cambiar Mi Contraseña
        </h2>

        <form
          onSubmit={handleChangePassword}
          className="flex flex-col md:flex-row gap-4 items-end"
        >
          <div className="w-full">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Nueva Contraseña
            </label>
            <div className="relative flex items-center">
              <input
                type={showNewPassword ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 p-3 pr-12 rounded-xl focus:ring-1 focus:ring-blue-700 focus:border-blue-700 focus:outline-none transition-all font-semibold text-slate-800 tracking-widest"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-4 text-slate-400 hover:text-blue-700 transition-colors z-10 flex items-center justify-center bg-transparent border-none outline-none"
              >
                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="w-full">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Confirmar Contraseña
            </label>
            <div className="relative flex items-center">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Repite la contraseña"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 p-3 pr-12 rounded-xl focus:ring-1 focus:ring-blue-700 focus:border-blue-700 focus:outline-none transition-all font-semibold text-slate-800 tracking-widest"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 text-slate-400 hover:text-blue-700 transition-colors z-10 flex items-center justify-center bg-transparent border-none outline-none"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPasswordLoading || !newPassword || !confirmPassword}
            className="w-full md:w-auto bg-blue-700 text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-800 transition-all shadow-md shadow-blue-700/20 flex items-center justify-center gap-2 uppercase tracking-widest text-xs disabled:opacity-50 shrink-0 active:scale-95"
          >
            {isPasswordLoading ? "Actualizando..." : "Actualizar"}
          </button>
        </form>
      </div>

      {/* ======================================================= */}
      {/* ── SECCIONES RESTRINGIDAS (SOLO VISIBLES PARA ADMIN) ── */}
      {/* ======================================================= */}
      {userRole === "admin" && (
        <>
          {/* SECCIÓN DE FIRMA DE CORREO */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-black mb-5 text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <PenTool size={24} className="text-blue-700" /> Mi Firma de Correo
              (Admin)
            </h2>
            <div className="space-y-4">
              <ReactQuill
                theme="snow"
                value={firma}
                onChange={setFirma}
                className="bg-white rounded-xl text-slate-800"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleGuardarFirma}
                  disabled={isFirmaLoading}
                  className="bg-blue-700 text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-800 transition-all text-xs uppercase tracking-widest disabled:opacity-50"
                >
                  {isFirmaLoading ? "Guardando..." : "Guardar Firma"}
                </button>
              </div>
            </div>
          </div>

          {/* SECCIÓN DE RESPALDOS */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="bg-blue-50 p-3 rounded-xl shrink-0">
                <Database size={28} className="text-blue-700" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  Respaldo de Base de Datos
                </h3>
                <p className="text-sm text-slate-500 mt-1 max-w-xl font-medium">
                  Descarga un archivo JSON con toda la información de tus
                  clientes y facturas.
                </p>
              </div>
            </div>

            <button
              onClick={handleDescargarRespaldo}
              disabled={isBackupLoading}
              className="w-full md:w-auto bg-slate-800 text-white font-bold py-3 px-6 rounded-xl hover:bg-slate-900 transition-all shadow-md flex items-center justify-center gap-2 uppercase tracking-widest text-xs disabled:opacity-50 shrink-0 active:scale-95"
            >
              {isBackupLoading ? (
                <ServerCog size={18} className="animate-spin" />
              ) : (
                <DownloadCloud size={18} />
              )}
              {isBackupLoading ? "Generando..." : "Descargar Respaldo"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
