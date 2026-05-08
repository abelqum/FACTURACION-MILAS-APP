"use client";
import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { supabase } from "@/app/_lib/supabase/supabase";
import QRCode from "qrcode";
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
  MinusCircle,
  Wrench,
} from "lucide-react";
import dynamic from "next/dynamic";
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
import "react-quill-new/dist/quill.snow.css";

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
  { id: "kits", titulo: "Kits / Ensambles", icono: "🛠️", isCustom: true },
];

export default function ConfiguracionPage() {
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentName, setCurrentName] = useState("");
  const [userRole, setUserRole] = useState(null);
  const [isNameLoading, setIsNameLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [firma, setFirma] = useState("");
  const [isFirmaLoading, setIsFirmaLoading] = useState(false);

  const [catalogoActivo, setCatalogoActivo] = useState(CATALOGOS[0]);
  const [itemsCatalogo, setItemsCatalogo] = useState([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(false);
  const [listaAbierta, setListaAbierta] = useState(true);
  const [formCatalogo, setFormCatalogo] = useState({ nombre: "", enlace: "" });
  const [editandoCatId, setEditandoCatId] = useState(null);

  const [productosParaKits, setProductosParaKits] = useState([]);
  const [kitsList, setKitsList] = useState([]);
  const [formKit, setFormKit] = useState({
    descripcion: "",
    componentes: [{ id_producto: "", cantidad_necesaria: 1 }],
  });

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

  useEffect(() => {
    if (catalogoActivo.isCustom) cargarDatosKits();
    else cargarItemsCatalogo();
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

  const guardarCatalogo = async (e) => {
    e.preventDefault();
    if (!formCatalogo.nombre.trim()) return;
    try {
      const payload = catalogoActivo.extraField
        ? { nombre: formCatalogo.nombre, enlace: formCatalogo.enlace }
        : { nombre: formCatalogo.nombre };
      if (editandoCatId) {
        await supabase
          .from(catalogoActivo.id)
          .update(payload)
          .eq("id", editandoCatId);
      } else {
        await supabase.from(catalogoActivo.id).insert([payload]);
      }
      setFormCatalogo({ nombre: "", enlace: "" });
      setEditandoCatId(null);
      cargarItemsCatalogo();
      Swal.fire({
        icon: "success",
        title: "Guardado",
        toast: true,
        position: "top-end",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire("Error", "No se pudo guardar.", "error");
    }
  };

  const iniciarEdicionCatalogo = (item) => {
    setFormCatalogo({ nombre: item.nombre, enlace: item.enlace || "" });
    setEditandoCatId(item.id);
    setListaAbierta(false);
  };

  const eliminarCatalogo = async (id) => {
    const confirm = await Swal.fire({
      title: "¿Estás seguro?",
      text: "Si este item ya está en uso, no podrás borrarlo.",
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
      if (error) Swal.fire("Error", "Este item ya está siendo usado.", "error");
      else {
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

  // 🟢 CARGA DE KITS CORREGIDA (Emparejamiento en JS)
  const cargarDatosKits = async () => {
    setCargandoCatalogos(true);

    // 1. Cargamos catálogo de piezas normales
    const { data: prods } = await supabase
      .from("inventario")
      .select("id, descripcion, modelo")
      .eq("es_kit", false)
      .order("descripcion");
    setProductosParaKits(prods || []);

    // 2. Cargamos los kits (encabezados)
    const { data: kits } = await supabase
      .from("inventario")
      .select("id, descripcion, cantidad, qr_url")
      .eq("es_kit", true)
      .order("descripcion");

    // 3. Cargamos las recetas
    const { data: recetas } = await supabase
      .from("kit_componentes")
      .select("*");

    // 4. Emparejamos a mano para que Supabase no se queje
    const kitsArmados = (kits || []).map((kit) => {
      const misComponentes = (recetas || [])
        .filter((r) => r.id_kit === kit.id)
        .map((r) => {
          const prodMatch = (prods || []).find((p) => p.id === r.id_producto);
          return {
            id_producto: r.id_producto,
            cantidad_necesaria: r.cantidad_necesaria,
            inventario: prodMatch || {
              descripcion: "Desconocido",
              modelo: "N/A",
            },
          };
        });
      return { ...kit, kit_componentes: misComponentes };
    });

    setKitsList(kitsArmados);
    setCargandoCatalogos(false);
  };

  const handleAddComponente = () =>
    setFormKit({
      ...formKit,
      componentes: [
        ...formKit.componentes,
        { id_producto: "", cantidad_necesaria: 1 },
      ],
    });
  const handleRemoveComponente = (index) => {
    const nuevos = [...formKit.componentes];
    nuevos.splice(index, 1);
    setFormKit({ ...formKit, componentes: nuevos });
  };
  const handleComponenteChange = (index, field, value) => {
    const nuevos = [...formKit.componentes];
    nuevos[index][field] = value;
    setFormKit({ ...formKit, componentes: nuevos });
  };

  const iniciarEdicionKit = (kit) => {
    setFormKit({
      descripcion: kit.descripcion,
      componentes: kit.kit_componentes.map((c) => ({
        id_producto: c.id_producto,
        cantidad_necesaria: c.cantidad_necesaria,
      })),
    });
    setEditandoCatId(kit.id);
    setListaAbierta(false);
  };

  const guardarKit = async (e) => {
    e.preventDefault();
    if (!formKit.descripcion.trim()) return;
    const componentesValidos = formKit.componentes.filter(
      (c) => c.id_producto !== "" && Number(c.cantidad_necesaria) > 0,
    );
    if (componentesValidos.length === 0)
      return Swal.fire(
        "Atención",
        "El kit debe tener al menos un producto.",
        "warning",
      );

    setCargandoCatalogos(true);
    try {
      if (editandoCatId) {
        await supabase
          .from("inventario")
          .update({ descripcion: formKit.descripcion })
          .eq("id", editandoCatId);
        await supabase
          .from("kit_componentes")
          .delete()
          .eq("id_kit", editandoCatId);
        const insertData = componentesValidos.map((c) => ({
          id_kit: editandoCatId,
          id_producto: c.id_producto,
          cantidad_necesaria: c.cantidad_necesaria,
        }));
        await supabase.from("kit_componentes").insert(insertData);
        Swal.fire({
          icon: "success",
          title: "Actualizado",
          toast: true,
          position: "top-end",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        const payloadKit = {
          descripcion: formKit.descripcion,
          es_kit: true,
          cantidad: 0,
          stock_minimo: 0,
          precio_unitario: 0,
        };
        const { data: nuevoKit } = await supabase
          .from("inventario")
          .insert([payloadKit])
          .select()
          .single();
        const qrDataUrl = await QRCode.toDataURL(nuevoKit.id, { width: 300 });
        let arr = qrDataUrl.split(","),
          bstr = atob(arr[1]),
          n = bstr.length,
          u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const fileName = `qr_${nuevoKit.id}.png`;
        const { error: uploadError } = await supabase.storage
          .from("qr")
          .upload(fileName, new Blob([u8arr], { type: "image/png" }));
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from("qr")
            .getPublicUrl(fileName);
          await supabase
            .from("inventario")
            .update({ qr_url: publicUrlData.publicUrl })
            .eq("id", nuevoKit.id);
        }
        const insertData = componentesValidos.map((c) => ({
          id_kit: nuevoKit.id,
          id_producto: c.id_producto,
          cantidad_necesaria: c.cantidad_necesaria,
        }));
        await supabase.from("kit_componentes").insert(insertData);
        Swal.fire({
          icon: "success",
          title: "Kit Creado",
          toast: true,
          position: "top-end",
          timer: 2500,
          showConfirmButton: false,
        });
      }
      setFormKit({
        descripcion: "",
        componentes: [{ id_producto: "", cantidad_necesaria: 1 }],
      });
      setEditandoCatId(null);
      cargarDatosKits();
    } catch (error) {
      Swal.fire("Error", "Fallo al guardar el Kit.", "error");
    } finally {
      setCargandoCatalogos(false);
    }
  };

  const eliminarKit = async (kit) => {
    const confirm = await Swal.fire({
      title: "¿Borrar este Kit?",
      text:
        kit.cantidad > 0
          ? `Este kit tiene ${kit.cantidad} armados. Si lo borras, sus piezas se devolverán al inventario.`
          : "Se borrará la receta de este kit.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Sí, desarmar y borrar",
    });
    if (confirm.isConfirmed) {
      setCargandoCatalogos(true);
      try {
        if (Number(kit.cantidad) > 0) {
          for (let comp of kit.kit_componentes) {
            const { data: prodData } = await supabase
              .from("inventario")
              .select("cantidad")
              .eq("id", comp.id_producto)
              .single();
            const piezasADevolver =
              Number(comp.cantidad_necesaria) * Number(kit.cantidad);
            await supabase
              .from("inventario")
              .update({ cantidad: Number(prodData.cantidad) + piezasADevolver })
              .eq("id", comp.id_producto);
          }
        }
        await supabase.from("inventario").delete().eq("id", kit.id);
        cargarDatosKits();
        Swal.fire({
          icon: "success",
          title: "Kit Eliminado",
          toast: true,
          position: "top-end",
          timer: 2500,
          showConfirmButton: false,
        });
      } catch (error) {
        Swal.fire("Error", "Hubo un problema al borrar.", "error");
      } finally {
        setCargandoCatalogos(false);
      }
    }
  };

  const handleGuardarFirma = async () => {
    /* ... (Omitido por espacio visual pero tú ya lo tienes) ... */
  };
  const handleDescargarRespaldo = async () => {
    /* ... */
  };
  const handleChangeName = async (e) => {
    /* ... */
  };
  const handleChangePassword = async (e) => {
    /* ... */
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          Ajustes y Configuración
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Gestiona tu perfil, catálogos del sistema y seguridad.
        </p>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        <h2 className="text-xl font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Settings size={24} className="text-blue-700" /> Administrador de
          Sistema
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CATALOGOS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setCatalogoActivo(cat);
                setFormCatalogo({ nombre: "", enlace: "" });
                setFormKit({
                  descripcion: "",
                  componentes: [{ id_producto: "", cantidad_necesaria: 1 }],
                });
                setEditandoCatId(null);
                setListaAbierta(true);
              }}
              className={`px-4 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${catalogoActivo.id === cat.id ? "bg-slate-800 text-white shadow-md" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              {cat.icono} {cat.titulo}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-slate-50 border border-slate-200 rounded-2xl p-5 h-fit">
            <h3 className="font-black text-slate-700 mb-4 flex items-center gap-2">
              {editandoCatId ? (
                <Edit2 size={16} className="text-blue-600" />
              ) : (
                <Plus size={16} className="text-emerald-600" />
              )}
              {editandoCatId
                ? "Editar Registro"
                : `Nuevo en ${catalogoActivo.titulo}`}
            </h3>
            {catalogoActivo.isCustom ? (
              <form onSubmit={guardarKit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Nombre del Kit *
                  </label>
                  <input
                    required
                    type="text"
                    value={formKit.descripcion}
                    onChange={(e) =>
                      setFormKit({ ...formKit, descripcion: e.target.value })
                    }
                    placeholder="Ej. Kit Mantenimiento"
                    className="w-full bg-white border border-slate-300 p-3 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div className="border-t border-slate-200 pt-4 space-y-3">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex justify-between items-center">
                    <span>Receta del Kit</span>
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {formKit.componentes.length} Ítems
                    </span>
                  </label>
                  {formKit.componentes.map((comp, index) => (
                    <div
                      key={index}
                      className="flex gap-2 items-start bg-white p-2 rounded-xl border border-slate-200 shadow-sm"
                    >
                      <div className="flex-1 space-y-2">
                        <select
                          required
                          value={comp.id_producto}
                          onChange={(e) =>
                            handleComponenteChange(
                              index,
                              "id_producto",
                              e.target.value,
                            )
                          }
                          className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-bold focus:outline-none focus:border-blue-600"
                        >
                          <option value="">Elegir producto...</option>
                          {productosParaKits.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.descripcion} (Mod: {p.modelo || "N/A"})
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400">
                            CANTIDAD:
                          </span>
                          <input
                            required
                            type="number"
                            min="1"
                            step="0.01"
                            value={comp.cantidad_necesaria}
                            onChange={(e) =>
                              handleComponenteChange(
                                index,
                                "cantidad_necesaria",
                                e.target.value,
                              )
                            }
                            className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-lg text-xs font-bold text-center focus:outline-none focus:border-blue-600"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveComponente(index)}
                        disabled={formKit.componentes.length === 1}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                      >
                        <MinusCircle size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddComponente}
                    className="w-full py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase hover:bg-slate-200 border border-dashed border-slate-300 flex items-center justify-center gap-1"
                  >
                    <Plus size={14} /> Agregar producto
                  </button>
                </div>
                <div className="flex gap-2 pt-4">
                  {editandoCatId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditandoCatId(null);
                        setFormKit({
                          descripcion: "",
                          componentes: [
                            { id_producto: "", cantidad_necesaria: 1 },
                          ],
                        });
                      }}
                      className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase hover:bg-slate-300"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={cargandoCatalogos}
                    className="flex-1 py-3 bg-blue-700 text-white rounded-xl font-bold text-xs uppercase hover:bg-blue-800 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Save size={16} /> {editandoCatId ? "Guardar" : "Crear Kit"}
                  </button>
                </div>
              </form>
            ) : (
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
                      setFormCatalogo({
                        ...formCatalogo,
                        nombre: e.target.value,
                      })
                    }
                    className="w-full bg-white border border-slate-300 p-3 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-600"
                  />
                </div>
                {catalogoActivo.extraField === "enlace" && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                      Enlace
                    </label>
                    <input
                      type="url"
                      value={formCatalogo.enlace}
                      onChange={(e) =>
                        setFormCatalogo({
                          ...formCatalogo,
                          enlace: e.target.value,
                        })
                      }
                      className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-600"
                    />
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
                      className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase hover:bg-slate-300"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={cargandoCatalogos}
                    className="flex-1 py-3 bg-blue-700 text-white rounded-xl font-bold text-xs uppercase hover:bg-blue-800 flex items-center justify-center gap-2"
                  >
                    <Save size={16} /> Guardar
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="lg:col-span-2 h-fit">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setListaAbierta(!listaAbierta)}
                className={`w-full p-4 bg-slate-50 flex justify-between items-center hover:bg-slate-100 ${listaAbierta ? "border-b border-slate-200" : ""}`}
              >
                <span className="font-black text-slate-700">
                  Ver lista de {catalogoActivo.titulo} (
                  {catalogoActivo.isCustom
                    ? kitsList.length
                    : itemsCatalogo.length}
                  )
                </span>
                {listaAbierta ? (
                  <ChevronUp size={20} className="text-slate-500" />
                ) : (
                  <ChevronDown size={20} className="text-slate-500" />
                )}
              </button>
              {listaAbierta && (
                <div className="p-4 overflow-y-auto max-h-[500px]">
                  {cargandoCatalogos ? (
                    <p className="text-center text-sm font-bold text-slate-400 py-8 animate-pulse">
                      Cargando...
                    </p>
                  ) : catalogoActivo.isCustom ? (
                    kitsList.length === 0 ? (
                      <p className="text-center text-sm font-bold text-slate-400 py-8">
                        No hay Kits armados aún.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {kitsList.map((kit) => (
                          <div
                            key={kit.id}
                            className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-3">
                                {kit.qr_url ? (
                                  <img
                                    src={kit.qr_url}
                                    alt="QR"
                                    className="w-10 h-10 border border-slate-200 rounded-lg shadow-sm"
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                                    <Wrench
                                      className="text-slate-300"
                                      size={16}
                                    />
                                  </div>
                                )}
                                <div>
                                  <p className="font-black text-slate-800 text-sm">
                                    {kit.descripcion}
                                  </p>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 inline-block px-2 py-0.5 rounded mt-1">
                                    Armados en Stock:{" "}
                                    <span className="text-blue-700">
                                      {kit.cantidad}
                                    </span>
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => iniciarEdicionKit(kit)}
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => eliminarKit(kit)}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-200 pb-1">
                                Receta del Kit:
                              </p>
                              <ul className="space-y-1">
                                {kit.kit_componentes?.map((comp, idx) => (
                                  <li
                                    key={idx}
                                    className="text-xs text-slate-600 flex justify-between font-medium"
                                  >
                                    <span>
                                      • {comp.inventario?.descripcion} (Mod:{" "}
                                      {comp.inventario?.modelo || "N/A"})
                                    </span>
                                    <span className="font-black text-slate-800">
                                      x{comp.cantidad_necesaria}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : itemsCatalogo.length === 0 ? (
                    <p className="text-center text-sm font-bold text-slate-400 py-8">
                      No hay registros aún.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {itemsCatalogo.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-300 hover:shadow-sm group"
                        >
                          <div>
                            <p className="font-bold text-sm text-slate-800">
                              {item.nombre}
                            </p>
                          </div>
                          <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => iniciarEdicionCatalogo(item)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => eliminarCatalogo(item.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
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
    </div>
  );
}
