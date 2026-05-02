"use client";
import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import { supabase } from "@/app/_lib/supabase/supabase";
import {
  Star,
  StarOff,
  Trash2,
  PlusCircle,
  LayoutGrid,
  Database,
  DownloadCloud,
  ServerCog,
  KeyRound,
  ChevronDown,
  ChevronUp,
  User,
  Eye,
  EyeOff,
  Tag, // 🟢 Nuevo icono para marcas
} from "lucide-react";

export default function ConfiguracionPage() {
  // ESTADOS PARA CATEGORÍAS
  const [categorias, setCategorias] = useState([]);
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [isPopularNueva, setIsPopularNueva] = useState(false);
  const [loadingIds, setLoadingIds] = useState([]);
  const [showCategorias, setShowCategorias] = useState(false);

  // 🟢 ESTADOS PARA MARCAS
  const [marcas, setMarcas] = useState([]);
  const [nuevaMarca, setNuevaMarca] = useState("");
  const [showMarcas, setShowMarcas] = useState(false);

  const [isBackupLoading, setIsBackupLoading] = useState(false);

  // ESTADO PARA VISIBILIDAD DE PRECIOS
  const [mostrarPrecios, setMostrarPrecios] = useState(true);
  const [isToggleLoading, setIsToggleLoading] = useState(false);

  // ESTADOS PARA EL PERFIL (NOMBRE)
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentName, setCurrentName] = useState("");
  const [isNameLoading, setIsNameLoading] = useState(false);

  // ESTADOS PARA CONTRASEÑAS
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fetchConfiguracion = useCallback(async () => {
    const { data, error } = await supabase
      .from("configuracion_app")
      .select("mostrar_precios")
      .eq("id", 1)
      .single();

    if (data && !error) {
      setMostrarPrecios(data.mostrar_precios);
    }
  }, []);

  const fetchMiPerfil = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setCurrentUserId(user.id);
      const { data, error } = await supabase
        .from("perfiles")
        .select("nombre")
        .eq("id", user.id)
        .single();

      if (data && !error) {
        setCurrentName(data.nombre);
      }
    }
  }, []);

  const fetchCategorias = useCallback(async () => {
    const { data, error } = await supabase
      .from("categorias")
      .select("*")
      .order("nombre", { ascending: true });
    if (!error) setCategorias(data || []);
  }, []);

  // 🟢 NUEVO: Traer marcas
  const fetchMarcas = useCallback(async () => {
    const { data, error } = await supabase
      .from("marcas")
      .select("*")
      .order("nombre", { ascending: true });
    if (!error) setMarcas(data || []);
  }, []);

  useEffect(() => {
    fetchCategorias();
    fetchMarcas(); // 🟢 Cargamos marcas al iniciar
    fetchMiPerfil();
    fetchConfiguracion();
  }, [fetchCategorias, fetchMarcas, fetchMiPerfil, fetchConfiguracion]);

  // --- LÓGICA CATEGORÍAS ---
  const handleAgregarCategoria = async (e) => {
    e.preventDefault();
    const nombreLimpio = nuevaCategoria.trim();
    if (!nombreLimpio) return;

    try {
      const { data, error } = await supabase
        .from("categorias")
        .insert([{ nombre: nombreLimpio, popular: isPopularNueva }])
        .select();

      if (error) {
        if (error.code === "23505")
          throw new Error("Esta categoría ya existe.");
        throw error;
      }
      if (!data || data.length === 0)
        throw new Error("Bloqueado por Supabase RLS.");

      setNuevaCategoria("");
      setIsPopularNueva(false);
      await fetchCategorias();
      setShowCategorias(true);
    } catch (error) {
      Swal.fire({
        title: "Ups, algo salió mal",
        text: error.message,
        icon: "error",
        confirmButtonColor: "#d33",
      });
    }
  };

  const togglePopular = async (id, estadoActual) => {
    setLoadingIds((prev) => [...prev, id]);
    try {
      const { error } = await supabase
        .from("categorias")
        .update({ popular: !estadoActual })
        .eq("id", id);

      if (error) throw error;

      setCategorias((prev) =>
        prev.map((cat) =>
          cat.id === id ? { ...cat, popular: !estadoActual } : cat,
        ),
      );
    } catch (error) {
      Swal.fire({
        title: "Error al actualizar estado popular:",
        text: error.message,
        icon: "error",
        confirmButtonColor: "#d33",
      });
    } finally {
      setLoadingIds((prev) => prev.filter((loadingId) => loadingId !== id));
    }
  };

  const handleEliminarCategoria = async (id) => {
    if (
      !window.confirm(
        "¿Seguro que deseas eliminar esta categoría? Si hay productos usándola, podrían quedarse sin categoría visible.",
      )
    )
      return;
    try {
      const { error } = await supabase.from("categorias").delete().eq("id", id);
      if (error) throw error;
      await fetchCategorias();
    } catch (error) {
      Swal.fire({
        title: "Error al eliminar:",
        text: error.message,
        icon: "error",
        confirmButtonColor: "#d33",
      });
    }
  };

  // --- 🟢 LÓGICA MARCAS ---
  const handleAgregarMarca = async (e) => {
    e.preventDefault();
    const nombreLimpio = nuevaMarca.trim();
    if (!nombreLimpio) return;

    try {
      // 🟢 Asumimos que la tabla "marcas" solo requiere el campo "nombre"
      const { data, error } = await supabase
        .from("marcas")
        .insert([{ nombre: nombreLimpio }])
        .select();

      if (error) {
        if (error.code === "23505") throw new Error("Esta marca ya existe.");
        throw error;
      }
      if (!data || data.length === 0)
        throw new Error("Bloqueado por Supabase RLS.");

      setNuevaMarca("");
      await fetchMarcas();
      setShowMarcas(true);
    } catch (error) {
      Swal.fire({
        title: "Ups, algo salió mal",
        text: error.message,
        icon: "error",
        confirmButtonColor: "#d33",
      });
    }
  };

  const handleEliminarMarca = async (id) => {
    if (
      !window.confirm(
        "¿Seguro que deseas eliminar esta marca? Los productos asociados podrían dejar de mostrarla.",
      )
    )
      return;
    try {
      const { error } = await supabase.from("marcas").delete().eq("id", id);
      if (error) throw error;
      await fetchMarcas();
    } catch (error) {
      Swal.fire({
        title: "Error al eliminar:",
        text: error.message,
        icon: "error",
        confirmButtonColor: "#d33",
      });
    }
  };
  // --- FIN LÓGICA MARCAS ---

  const handleDescargarRespaldo = async () => {
    setIsBackupLoading(true);
    try {
      const response = await fetch("/api/backup?download=true");
      if (!response.ok) throw new Error("Fallo al generar el respaldo");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `woox_backup_${new Date().toISOString().split("T")[0]}.json`;
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

  const handleTogglePrecios = async () => {
    setIsToggleLoading(true);
    try {
      const { error } = await supabase
        .from("configuracion_app")
        .update({ mostrar_precios: !mostrarPrecios })
        .eq("id", 1);

      if (error) throw error;

      setMostrarPrecios(!mostrarPrecios);
      Swal.fire({
        icon: "success",
        title: !mostrarPrecios ? "Precios Activados" : "Precios Ocultos",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
    } catch (error) {
      Swal.fire({
        title: "Error al actualizar",
        text: error.message,
        icon: "error",
        confirmButtonColor: "#d33",
      });
    } finally {
      setIsToggleLoading(false);
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
        confirmButtonColor: "#131b2e",
      });
      return;
    }
    if (newPassword.length < 6) {
      Swal.fire({
        title: "Contraseña muy corta",
        text: "Por seguridad, la contraseña debe tener al menos 6 caracteres.",
        icon: "info",
        confirmButtonColor: "#131b2e",
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
        confirmButtonColor: "#004532",
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

  const popularesCount = categorias.filter((c) => c.popular).length;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* ======================================================= */}
      {/* ── BLOQUE DE CATEGORÍAS ── */}
      {/* ======================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl shadow-sm border border-[#bec9c2]/30 h-fit">
          <h2 className="text-xl font-black mb-5 text-[#131b2e] border-b border-[#bec9c2]/20 pb-3 flex items-center gap-2">
            <LayoutGrid size={24} className="text-[#004532]" />
            Nueva Categoría
          </h2>

          <form
            onSubmit={handleAgregarCategoria}
            className="flex flex-col gap-6 text-sm"
          >
            <div className="flex flex-col gap-2">
              <label
                htmlFor="cat_nombre"
                className="font-bold text-[#3f4944] text-[10px] uppercase tracking-widest"
              >
                Nombre de la categoría
              </label>
              <input
                id="cat_nombre"
                type="text"
                placeholder="Ej. Lubricantes, Medidores..."
                value={nuevaCategoria}
                onChange={(e) => setNuevaCategoria(e.target.value)}
                className="w-full bg-[#f2f3ff] border border-[#bec9c2]/30 p-3 rounded-lg focus:ring-2 focus:ring-[#004532] focus:outline-none transition-all"
                required
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer group bg-[#f8faf9] p-3 rounded-lg border border-[#bec9c2]/20">
              <input
                type="checkbox"
                checked={isPopularNueva}
                onChange={(e) => setIsPopularNueva(e.target.checked)}
                className="w-4 h-4 accent-[#004532] cursor-pointer"
              />
              <div>
                <span className="font-bold text-[#131b2e] text-sm block group-hover:text-[#004532] transition-colors">
                  Destacar en Inicio (Popular)
                </span>
                <span className="text-[10px] text-[#3f4944]">
                  Aparecerá en las tarjetas de la página principal.
                </span>
              </div>
            </label>

            <button
              type="submit"
              disabled={!nuevaCategoria.trim()}
              className="bg-[#004532] text-white font-bold py-3.5 rounded-lg hover:bg-[#065f46] transition-colors shadow-md flex items-center justify-center gap-2 uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusCircle size={16} />
              Agregar Categoría
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 bg-white p-6 rounded-2xl shadow-sm border border-[#bec9c2]/30 h-fit">
          <div className="flex justify-between items-end mb-4 border-b border-[#bec9c2]/20 pb-3">
            <h3 className="text-xl font-black text-[#131b2e]">
              Gestión de Categorías
            </h3>
            <span className="text-xs font-bold text-[#004532] bg-[#e6f4ed] px-3 py-1 rounded-full">
              {popularesCount} Populares
            </span>
          </div>

          <button
            onClick={() => setShowCategorias(!showCategorias)}
            className="w-full py-3 mb-2 bg-[#f8faf9] hover:bg-[#f2f3ff] border border-[#bec9c2]/30 text-[#131b2e] font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 rounded-lg transition-colors"
          >
            {showCategorias ? (
              <>
                <ChevronUp size={16} /> Ocultar Lista de Categorías
              </>
            ) : (
              <>
                <ChevronDown size={16} /> Ver Todas las Categorías (
                {categorias.length})
              </>
            )}
          </button>

          {showCategorias && (
            <div className="animate-in slide-in-from-top-2 fade-in duration-300 mt-4">
              <p className="text-xs text-[#3f4944] mb-4">
                Haz clic en la{" "}
                <Star
                  size={12}
                  className="inline text-yellow-500 fill-yellow-500 mx-1"
                />{" "}
                para mostrar u ocultar la categoría en la página de inicio.
              </p>

              <ul className="divide-y divide-[#bec9c2]/10 max-h-[400px] overflow-y-auto pr-2">
                {categorias.map((cat) => {
                  const isLoading = loadingIds.includes(cat.id);
                  return (
                    <li
                      key={cat.id}
                      className="py-4 flex justify-between items-center group"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => togglePopular(cat.id, cat.popular)}
                          disabled={isLoading}
                          title={
                            cat.popular
                              ? "Quitar de Inicio"
                              : "Destacar en Inicio"
                          }
                          className={`p-2 rounded-full transition-all ${
                            isLoading
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:bg-slate-100"
                          }`}
                        >
                          {cat.popular ? (
                            <Star
                              size={22}
                              className="text-yellow-500 fill-yellow-500 drop-shadow-sm"
                            />
                          ) : (
                            <StarOff
                              size={22}
                              className="text-slate-300 hover:text-yellow-400"
                            />
                          )}
                        </button>

                        <div>
                          <span className="font-bold text-[#131b2e] text-sm uppercase tracking-wider block">
                            {cat.nombre}
                          </span>
                          <span className="text-[10px] text-[#3f4944]">
                            {cat.popular
                              ? "Visible en Inicio"
                              : "Oculta en Inicio"}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleEliminarCategoria(cat.id)}
                        className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors"
                        title="Eliminar Categoría"
                      >
                        <Trash2 size={18} />
                      </button>
                    </li>
                  );
                })}
                {categorias.length === 0 && (
                  <div className="text-center py-10">
                    <LayoutGrid
                      size={48}
                      className="text-slate-200 mx-auto mb-3"
                    />
                    <p className="text-slate-500 font-bold">
                      No hay categorías registradas.
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Crea tu primera categoría a la izquierda.
                    </p>
                  </div>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================= */}
      {/* ── 🟢 BLOQUE DE MARCAS ── */}
      {/* ======================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ── FORMULARIO DE MARCAS ── */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl shadow-sm border border-[#bec9c2]/30 h-fit">
          <h2 className="text-xl font-black mb-5 text-[#131b2e] border-b border-[#bec9c2]/20 pb-3 flex items-center gap-2">
            <Tag size={24} className="text-[#004532]" />
            Nueva Marca
          </h2>

          <form
            onSubmit={handleAgregarMarca}
            className="flex flex-col gap-6 text-sm"
          >
            <div className="flex flex-col gap-2">
              <label
                htmlFor="marca_nombre"
                className="font-bold text-[#3f4944] text-[10px] uppercase tracking-widest"
              >
                Nombre de la marca
              </label>
              <input
                id="marca_nombre"
                type="text"
                placeholder="Ej. WOOX, Truper, Bosch..."
                value={nuevaMarca}
                onChange={(e) => setNuevaMarca(e.target.value)}
                className="w-full bg-[#f2f3ff] border border-[#bec9c2]/30 p-3 rounded-lg focus:ring-2 focus:ring-[#004532] focus:outline-none transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={!nuevaMarca.trim()}
              className="bg-[#131b2e] text-white font-bold py-3.5 rounded-lg hover:bg-[#004532] transition-colors shadow-md flex items-center justify-center gap-2 uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusCircle size={16} />
              Agregar Marca
            </button>
          </form>
        </div>

        {/* ── LISTADO DE MARCAS ── */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl shadow-sm border border-[#bec9c2]/30 h-fit">
          <div className="flex justify-between items-end mb-4 border-b border-[#bec9c2]/20 pb-3">
            <h3 className="text-xl font-black text-[#131b2e]">
              Gestión de Marcas
            </h3>
            <span className="text-xs font-bold text-[#004532] bg-[#e6f4ed] px-3 py-1 rounded-full">
              {marcas.length} Totales
            </span>
          </div>

          <button
            onClick={() => setShowMarcas(!showMarcas)}
            className="w-full py-3 mb-2 bg-[#f8faf9] hover:bg-[#f2f3ff] border border-[#bec9c2]/30 text-[#131b2e] font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 rounded-lg transition-colors"
          >
            {showMarcas ? (
              <>
                <ChevronUp size={16} /> Ocultar Lista de Marcas
              </>
            ) : (
              <>
                <ChevronDown size={16} /> Ver Todas las Marcas ({marcas.length})
              </>
            )}
          </button>

          {showMarcas && (
            <div className="animate-in slide-in-from-top-2 fade-in duration-300 mt-4">
              <ul className="divide-y divide-[#bec9c2]/10 max-h-[300px] overflow-y-auto pr-2">
                {marcas.map((marca) => (
                  <li
                    key={marca.id}
                    className="py-4 flex justify-between items-center group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-[#f2f3ff] p-2 rounded-full">
                        <Tag size={16} className="text-[#3f4944]" />
                      </div>
                      <span className="font-bold text-[#131b2e] text-sm uppercase tracking-wider block">
                        {marca.nombre}
                      </span>
                    </div>

                    <button
                      onClick={() => handleEliminarMarca(marca.id)}
                      className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Eliminar Marca"
                    >
                      <Trash2 size={18} />
                    </button>
                  </li>
                ))}
                {marcas.length === 0 && (
                  <div className="text-center py-8">
                    <Tag size={40} className="text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-500 font-bold">
                      No hay marcas registradas.
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Agrega tu primera marca a la izquierda.
                    </p>
                  </div>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================= */}
      {/* ── SECCIÓN DE VISIBILIDAD DE PRECIOS ── */}
      {/* ======================================================= */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#bec9c2]/30 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-full shrink-0 transition-colors ${
              mostrarPrecios
                ? "bg-emerald-100 text-[#004532]"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            {mostrarPrecios ? <Eye size={28} /> : <EyeOff size={28} />}
          </div>
          <div>
            <h3 className="text-lg font-black text-[#131b2e] flex items-center gap-2">
              Visibilidad de Precios en Tienda
            </h3>
            <p className="text-sm text-[#3f4944] mt-1 max-w-xl">
              Si ocultas los precios, los clientes podrán seguir agregando
              variantes al carrito para armar una cotización, pero no verán
              ningún costo hasta que los contactes.
            </p>
          </div>
        </div>

        <button
          onClick={handleTogglePrecios}
          disabled={isToggleLoading}
          className={`w-full md:w-auto font-bold py-3 px-6 rounded-lg transition-colors shadow-md flex items-center justify-center gap-2 uppercase tracking-widest text-xs disabled:opacity-50 shrink-0 ${
            mostrarPrecios
              ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
              : "bg-[#004532] text-white hover:bg-[#065f46]"
          }`}
        >
          {isToggleLoading
            ? "Actualizando..."
            : mostrarPrecios
              ? "Ocultar Precios"
              : "Mostrar Precios"}
        </button>
      </div>

      {/* ======================================================= */}
      {/* ── SECCIÓN DE CAMBIO DE NOMBRE ── */}
      {/* ======================================================= */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#bec9c2]/30">
        <h2 className="text-xl font-black mb-5 text-[#131b2e] border-b border-[#bec9c2]/20 pb-3 flex items-center gap-2">
          <User size={24} className="text-[#004532]" />
          Actualizar Mi Perfil
        </h2>

        <form
          onSubmit={handleChangeName}
          className="flex flex-col md:flex-row gap-4 items-end"
        >
          <div className="w-full">
            <label className="block text-[10px] font-bold text-[#3f4944] uppercase tracking-widest mb-1">
              Nombre de Usuario
            </label>
            <input
              type="text"
              placeholder="Ej. Juan Pérez"
              required
              value={currentName}
              onChange={(e) => setCurrentName(e.target.value)}
              className="w-full bg-[#f2f3ff] border border-[#bec9c2]/30 p-3 rounded-lg focus:ring-2 focus:ring-[#004532] focus:outline-none transition-all text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={isNameLoading || !currentName.trim()}
            className="w-full md:w-auto bg-[#131b2e] text-white font-bold py-3 px-8 rounded-lg hover:bg-[#1e293b] transition-colors shadow-md flex items-center justify-center gap-2 uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isNameLoading ? "Guardando..." : "Guardar Nombre"}
          </button>
        </form>
      </div>

      {/* ======================================================= */}
      {/* ── SECCIÓN DE CAMBIO DE CONTRASEÑA ── */}
      {/* ======================================================= */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#bec9c2]/30">
        <h2 className="text-xl font-black mb-5 text-[#131b2e] border-b border-[#bec9c2]/20 pb-3 flex items-center gap-2">
          <KeyRound size={24} className="text-[#004532]" />
          Cambiar Mi Contraseña
        </h2>

        <form
          onSubmit={handleChangePassword}
          className="flex flex-col md:flex-row gap-4 items-end"
        >
          <div className="w-full">
            <label className="block text-[10px] font-bold text-[#3f4944] uppercase tracking-widest mb-1">
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
                className="w-full bg-[#f2f3ff] border border-[#bec9c2]/30 p-3 pr-12 rounded-lg focus:ring-2 focus:ring-[#004532] focus:outline-none transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-4 text-slate-400 hover:text-[#004532] transition-colors z-10 flex items-center justify-center bg-transparent border-none outline-none"
                title={
                  showNewPassword ? "Ocultar contraseña" : "Ver contraseña"
                }
              >
                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="w-full">
            <label className="block text-[10px] font-bold text-[#3f4944] uppercase tracking-widest mb-1">
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
                className="w-full bg-[#f2f3ff] border border-[#bec9c2]/30 p-3 pr-12 rounded-lg focus:ring-2 focus:ring-[#004532] focus:outline-none transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 text-slate-400 hover:text-[#004532] transition-colors z-10 flex items-center justify-center bg-transparent border-none outline-none"
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
            className="w-full md:w-auto bg-[#004532] text-white font-bold py-3 px-8 rounded-lg hover:bg-[#065f46] transition-colors shadow-md flex items-center justify-center gap-2 uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isPasswordLoading ? "Actualizando..." : "Actualizar"}
          </button>
        </form>
      </div>

      {/* ======================================================= */}
      {/* ── SECCIÓN DE RESPALDOS ── */}
      {/* ======================================================= */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#bec9c2]/30 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="bg-[#e6f4ed] p-3 rounded-full shrink-0">
            <Database size={28} className="text-[#004532]" />
          </div>
          <div>
            <h3 className="text-lg font-black text-[#131b2e] flex items-center gap-2">
              Respaldo de Base de Datos
            </h3>
            <p className="text-sm text-[#3f4944] mt-1 max-w-xl">
              Descarga un archivo JSON con toda la información de tus productos,
              categorías y marcas.
            </p>
          </div>
        </div>

        <button
          onClick={handleDescargarRespaldo}
          disabled={isBackupLoading}
          className="w-full md:w-auto bg-[#131b2e] text-white font-bold py-3 px-6 rounded-lg hover:bg-[#1e293b] transition-colors shadow-md flex items-center justify-center gap-2 uppercase tracking-widest text-xs disabled:opacity-50 shrink-0"
        >
          {isBackupLoading ? (
            <ServerCog size={18} className="animate-spin" />
          ) : (
            <DownloadCloud size={18} />
          )}
          {isBackupLoading ? "Generando..." : "Descargar Respaldo"}
        </button>
      </div>
    </div>
  );
}
