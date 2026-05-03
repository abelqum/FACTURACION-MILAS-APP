"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/app/_lib/supabase/supabase";
import {
  crearUsuarioDesdeAdmin,
  eliminarUsuarioDesdeAdmin,
} from "@/app/_actions/usuarios";
import { Trash2, UserPlus, Users, ShieldAlert } from "lucide-react";
import Swal from "sweetalert2";

export default function UsuariosCRUD() {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [miRol, setMiRol] = useState(null);
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: "",
    email: "",
    password: "",
    rol: "empleado", // 🟢 Por defecto ahora es empleado
  });

  async function fetchMiRol() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("perfiles")
        .select("rol")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setMiRol(data.rol);
      }
    } catch (err) {
      console.error("Error al obtener mi rol:", err);
    }
  }

  async function fetchUsuarios() {
    try {
      const { data, error } = await supabase
        .from("perfiles")
        .select("*")
        .order("nombre");

      if (error) {
        console.error("Error al traer usuarios:", error);
        return;
      }
      setUsuarios(data || []);
    } catch (err) {
      console.error("Error inesperado:", err);
    }
  }

  useEffect(() => {
    async function loadData() {
      await fetchMiRol();
      await fetchUsuarios();
    }
    loadData();
  }, []);

  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    setCargando(true);

    try {
      const res = await crearUsuarioDesdeAdmin(nuevoUsuario);

      if (res.error) {
        Swal.fire({
          title: "Error al crear",
          text: res.error,
          icon: "error",
          confirmButtonColor: "#d33",
        });
      } else {
        Swal.fire({
          title: "¡Usuario Registrado!",
          text: "La cuenta se ha creado correctamente.",
          icon: "success",
          confirmButtonColor: "#1d4ed8", // blue-700
          timer: 2500,
          showConfirmButton: false,
        });
        setNuevoUsuario({
          nombre: "",
          email: "",
          password: "",
          rol: "empleado",
        });
        await fetchUsuarios();
      }
    } catch (error) {
      console.error("Error creando usuario:", error);
    }
    setCargando(false);
  };

  const handleEliminar = async (id, nombre) => {
    if (
      !window.confirm(
        `¿Estás seguro de que deseas eliminar permanentemente a ${nombre}?`,
      )
    )
      return;

    try {
      const res = await eliminarUsuarioDesdeAdmin(id);
      if (res.error) {
        Swal.fire({
          title: "Error",
          text: res.error,
          icon: "error",
        });
      } else {
        Swal.fire({
          title: "Eliminado",
          text: "El usuario ha sido borrado del sistema.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
        await fetchUsuarios();
      }
    } catch (error) {
      console.error("Error al eliminar:", error);
    }
  };

  return (
    <div className="max-w-[90rem] mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Users className="text-blue-700" /> Gestión de Usuarios
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Administra los accesos y roles del equipo de trabajo.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* FORMULARIO */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit sticky top-4">
          <h2 className="text-sm font-bold mb-6 text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <UserPlus size={18} className="text-blue-700" /> Registrar Nuevo
            Usuario
          </h2>

          <form
            onSubmit={handleCrearUsuario}
            className="flex flex-col gap-5 text-sm"
          >
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Nombre Completo
              </label>
              <input
                type="text"
                placeholder="Ej. Juan Pérez"
                value={nuevoUsuario.nombre}
                onChange={(e) =>
                  setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl focus:ring-1 focus:ring-blue-700 focus:border-blue-700 focus:outline-none transition-all font-semibold text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Correo Electrónico
              </label>
              <input
                type="email"
                placeholder="usuario@milas.com.mx"
                value={nuevoUsuario.email}
                onChange={(e) =>
                  setNuevoUsuario({ ...nuevoUsuario, email: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl focus:ring-1 focus:ring-blue-700 focus:border-blue-700 focus:outline-none transition-all font-semibold text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Contraseña Temporal
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={nuevoUsuario.password}
                onChange={(e) =>
                  setNuevoUsuario({ ...nuevoUsuario, password: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl focus:ring-1 focus:ring-blue-700 focus:border-blue-700 focus:outline-none transition-all font-semibold text-slate-800 tracking-widest"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Nivel de Acceso (Rol)
              </label>
              {/* 🟢 AQUÍ ESTÁ EL CAMBIO A EMPLEADO */}
              <select
                value={nuevoUsuario.rol}
                onChange={(e) =>
                  setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl focus:ring-1 focus:ring-blue-700 focus:border-blue-700 focus:outline-none transition-all font-semibold text-slate-800 cursor-pointer"
              >
                <option value="empleado">
                  Empleado (Tareas y vistas limitadas)
                </option>
                <option value="admin">Administrador (Control Total)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={cargando || miRol !== "admin"}
              className="mt-2 bg-blue-700 text-white font-bold text-sm tracking-wide py-3.5 rounded-xl hover:bg-blue-800 transition-all shadow-lg shadow-blue-700/30 active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none disabled:text-slate-500 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {cargando ? "Registrando..." : "Crear Usuario"}
            </button>

            {miRol !== "admin" && (
              <p className="text-[10px] text-orange-600 font-bold flex items-center gap-1 mt-2">
                <ShieldAlert size={12} /> Solo un Administrador puede crear
                usuarios.
              </p>
            )}
          </form>
        </div>

        {/* TABLA RESPONSIVA */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-fit">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[400px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest w-10">
                    #
                  </th>
                  <th className="p-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest">
                    Nombre del Usuario
                  </th>
                  <th className="p-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest text-center">
                    Rol Asignado
                  </th>
                  {miRol === "admin" && (
                    <th className="p-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest text-center">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {usuarios.map((u, index) => (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="p-4 text-xs font-bold text-slate-400">
                      {index + 1}
                    </td>
                    <td className="p-4 font-bold text-slate-800 text-sm">
                      {u.nombre}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm ${
                          u.rol === "admin"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {u.rol}
                      </span>
                    </td>

                    {miRol === "admin" && (
                      <td className="p-4 flex justify-center">
                        <button
                          onClick={() => handleEliminar(u.id, u.nombre)}
                          className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Eliminar usuario"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}

                {usuarios.length === 0 && (
                  <tr>
                    <td
                      colSpan={miRol === "admin" ? "4" : "3"}
                      className="p-8 text-center text-slate-400 font-medium text-sm"
                    >
                      No hay usuarios o no tienes permiso para verlos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
