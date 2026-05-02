"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/app/_lib/supabase/supabase";
import {
  crearUsuarioDesdeAdmin,
  eliminarUsuarioDesdeAdmin,
} from "@/app/_actions/usuarios";
import { Trash2 } from "lucide-react";
import Swal from "sweetalert2";
export default function UsuariosCRUD() {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [miRol, setMiRol] = useState(null);
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: "",
    email: "",
    password: "",
    rol: "admin",
  });

  // 1️⃣ PRIMERO DECLARAMOS LAS FUNCIONES

  // 🟢 AVERIGUAR MI PROPIO ROL
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

  // 🟢 TRAER LA LISTA DE USUARIOS
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

  // 2️⃣ DESPUÉS LAS USAMOS EN EL USEEFFECT
  useEffect(() => {
    async function loadData() {
      await fetchMiRol(); // Primero vemos qué permisos tengo
      await fetchUsuarios();
    }
    loadData();
  }, []);

  // 3️⃣ EL RESTO DE LAS FUNCIONES QUE DEPENDEN DE LO ANTERIOR
  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    setCargando(true);

    try {
      const res = await crearUsuarioDesdeAdmin(nuevoUsuario);

      if (res.error) {
        Swal.fire({
          title: "Error al crear usuario: ",
          text: error.message,
          icon: "error",
          confirmButtonColor: "#d33",
        });
      } else {
        Swal.fire({
          title: "¡Usuario Registrado!",
          text: "La cuenta se ha creado correctamente.",
          icon: "success",
          confirmButtonColor: "#059669", // Verde esmeralda (emerald-600)
          timer: 2500,
          showConfirmButton: false,
        });
        setNuevoUsuario({
          nombre: "",
          email: "",
          password: "",
          rol: "admin",
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
          title: "Error al eliminar: ",
          text: error.message,
          icon: "error",
          confirmButtonColor: "#d33",
        });
      } else {
        Swal.fire({
          title: "Usuario Eliminado",
          text: "La cuenta y el perfil han sido eliminados correctamente.",
          icon: "success",
          confirmButtonColor: "#131b2e",
        });
        await fetchUsuarios(); // Refrescamos la tabla
      }
    } catch (error) {
      console.error("Error al eliminar:", error);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      {/* FORMULARIO */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
        <h2 className="text-xl font-bold mb-6 text-emerald-900 border-b border-emerald-100 pb-3">
          👤 Registrar Nuevo Usuario
        </h2>

        <form
          onSubmit={handleCrearUsuario}
          className="flex flex-col gap-4 text-sm"
        >
          <div className="flex flex-col gap-1">
            <label className="font-bold text-slate-600 text-xs uppercase tracking-wider">
              Nombre Completo
            </label>
            <input
              type="text"
              placeholder="Ej. Juan Pérez"
              value={nuevoUsuario.nombre}
              onChange={(e) =>
                setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })
              }
              className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none transition-all"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-slate-600 text-xs uppercase tracking-wider">
              Correo Electrónico
            </label>
            <input
              type="email"
              placeholder="usuario@woox.com"
              value={nuevoUsuario.email}
              onChange={(e) =>
                setNuevoUsuario({ ...nuevoUsuario, email: e.target.value })
              }
              className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none transition-all"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-slate-600 text-xs uppercase tracking-wider">
              Contraseña Temporal
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={nuevoUsuario.password}
              onChange={(e) =>
                setNuevoUsuario({ ...nuevoUsuario, password: e.target.value })
              }
              className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none transition-all"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-slate-600 text-xs uppercase tracking-wider">
              Nivel de Acceso (Rol)
            </label>
            <select
              value={nuevoUsuario.rol}
              onChange={(e) =>
                setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value })
              }
              className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none transition-all bg-white"
            >
              <option value="admin">Administrador (Control Total)</option>
              <option value="editor">Editor (Solo lectura/edición)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={cargando || miRol !== "admin"}
            className="mt-2 bg-emerald-700 text-white font-bold py-3 rounded-lg hover:bg-emerald-800 transition-colors shadow-md shadow-emerald-700/20 disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            {cargando ? "Registrando..." : "Crear Usuario"}
          </button>
        </form>
      </div>

      {/* TABLA RESPONSIVA */}
      <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[400px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-bold text-slate-500 text-xs uppercase tracking-wider">
                  Nombre del Usuario
                </th>
                <th className="p-4 font-bold text-slate-500 text-xs uppercase tracking-wider text-center">
                  Rol Asignado
                </th>
                {miRol === "admin" && (
                  <th className="p-4 font-bold text-slate-500 text-xs uppercase tracking-wider text-center">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {usuarios.map((u) => (
                <tr
                  key={u.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="p-4 font-medium text-slate-800 text-sm">
                    {u.nombre}
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`px-4 py-1.5 rounded-md text-xs font-bold tracking-wide ${
                        u.rol === "admin"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {u.rol.toUpperCase()}
                    </span>
                  </td>

                  {miRol === "admin" && (
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleEliminar(u.id, u.nombre)}
                        className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
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
                    colSpan={miRol === "admin" ? "3" : "2"}
                    className="p-8 text-center text-slate-400 font-medium"
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
  );
}
