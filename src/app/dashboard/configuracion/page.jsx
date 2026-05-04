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
} from "lucide-react";

export default function ConfiguracionPage() {
  const [isBackupLoading, setIsBackupLoading] = useState(false);

  // ESTADOS PARA EL PERFIL (NOMBRE Y ROL)
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentName, setCurrentName] = useState("");
  const [userRole, setUserRole] = useState(null); // 🟢 ESTADO PARA EL ROL
  const [isNameLoading, setIsNameLoading] = useState(false);

  // ESTADOS PARA CONTRASEÑAS
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    let isMounted = true; // Control para evitar memory leaks

    const fetchMiPerfil = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && isMounted) {
        setCurrentUserId(user.id);

        // 🟢 AHORA TAMBIÉN PEDIMOS EL ROL
        const { data, error } = await supabase
          .from("perfiles")
          .select("nombre, rol")
          .eq("id", user.id)
          .single();

        if (data && !error && isMounted) {
          setCurrentName(data.nombre);
          setUserRole(data.rol);
        }
      }
    };

    fetchMiPerfil();

    // Limpieza al desmontar el componente
    return () => {
      isMounted = false;
    };
  }, []);

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
      Swal.fire({
        title: "Validación de contraseña",
        text: "Las contraseñas no coinciden. Por favor, verifícalas e intenta de nuevo.",
        icon: "warning",
        confirmButtonColor: "#1d4ed8",
      });
      return;
    }
    if (newPassword.length < 6) {
      Swal.fire({
        title: "Contraseña muy corta",
        text: "Por seguridad, la contraseña debe tener al menos 6 caracteres.",
        icon: "info",
        confirmButtonColor: "#1d4ed8",
      });
      return;
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
        confirmButtonColor: "#1d4ed8", // Azul corporativo
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
    <div className="max-w-5xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="mb-6 border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          Ajustes y Seguridad
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Gestiona tu perfil, contraseña y crea copias de seguridad de MILAS.
        </p>
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
                title={
                  showNewPassword ? "Ocultar contraseña" : "Ver contraseña"
                }
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
                title={
                  showConfirmPassword ? "Ocultar contraseña" : "Ver contraseña"
                }
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPasswordLoading || !newPassword || !confirmPassword}
            className="w-full md:w-auto bg-blue-700 text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-800 transition-all shadow-md shadow-blue-700/20 flex items-center justify-center gap-2 uppercase tracking-widest text-xs disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed shrink-0 active:scale-95"
          >
            {isPasswordLoading ? "Actualizando..." : "Actualizar"}
          </button>
        </form>
      </div>

      {/* ======================================================= */}
      {/* ── SECCIÓN DE RESPALDOS (SOLO VISIBLE PARA ADMIN) ── */}
      {/* ======================================================= */}
      {userRole === "admin" && (
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
                Descarga un archivo JSON con toda la información de tus clientes
                y facturas para tenerlo seguro en tu equipo.
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
      )}
    </div>
  );
}
