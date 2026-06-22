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
  Camera,
  UploadCloud,
  Image as ImageIcon,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import dynamic from "next/dynamic";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
import "react-quill-new/dist/quill.snow.css";
import ReparadorQRs from "@/app/_components/ReparadorQRs";

const CATALOGOS = [
  { id: "inventario_categorias", titulo: "Categorías", icono: "📦" },
  { id: "inventario_proveedores", titulo: "Proveedores", icono: "🤝", extraField: "enlace" },
  { id: "inventario_marcas", titulo: "Marcas", icono: "🏷️" },
  { id: "inventario_udm", titulo: "Unidades de Medida", icono: "📏" },
  { id: "inventario_almacenes", titulo: "Almacenes / Estantes", icono: "🏢" },
  { id: "inventario_condiciones", titulo: "Condiciones", icono: "✨", extraField: "bool" },
  { id: "inventario_medidas", titulo: "Medidas (Pulgadas)", icono: "📐" },
  { id: "kits", titulo: "Kits / Ensambles", icono: "🛠️", isCustom: true },
];

export default function ConfiguracionPage() {
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [isNameLoading, setIsNameLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [isFirmaLoading, setIsFirmaLoading] = useState(false);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(false); // 🟢 ESTA ES LA VARIABLE CORRECTA

  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentName, setCurrentName] = useState("");
  const [userRole, setUserRole] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [firma, setFirma] = useState("");

  const [catalogoActivo, setCatalogoActivo] = useState(CATALOGOS[0]);
  const [itemsCatalogo, setItemsCatalogo] = useState([]);
  const [listaAbierta, setListaAbierta] = useState(true);
  const [formCatalogo, setFormCatalogo] = useState({ nombre: "", enlace: "" });
  const [editandoCatId, setEditandoCatId] = useState(null);

  // --- ESTADOS PARA KITS ---
  const [productosParaKits, setProductosParaKits] = useState([]);
  const [kitsList, setKitsList] = useState([]);
  const [listaCategorias, setListaCategorias] = useState([]);
  const [listaAlmacenes, setListaAlmacenes] = useState([]); 
  
  const [fotoArchivo, setFotoArchivo] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);

  const [formKit, setFormKit] = useState({
    descripcion: "",
    foto_url: "",
    id_categoria: "",
    id_almacen: "",
    fila: "",
    precio_unitario: 0,
    cantidad: 0,
    componentes: [{ id_producto: "", cantidad_necesaria: 1, stock_actual: 0, searchTerm: "", showDropdown: false }],
  });

  const getSuperLinea = (p) => {
    if (!p) return "Producto no identificado";
    const partes = [];
    if (p.descripcion) partes.push(p.descripcion);
    if (p.modelo) partes.push(`Mod: ${p.modelo}`);
    if (p.condicion?.nombre) partes.push(`Cond: ${p.condicion.nombre}`);
    if (p.medida_cat?.nombre) partes.push(p.medida_cat.nombre);
    if (p.marca?.nombre) partes.push(`Marca: ${p.marca.nombre}`);
    if (p.proveedor?.nombre) partes.push(`Prov: ${p.proveedor.nombre}`);
    return partes.join(" | ");
  };

  useEffect(() => {
    let isMounted = true;
    const fetchMiPerfil = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && isMounted) {
        setCurrentUserId(user.id);
        const { data, error } = await supabase.from("perfiles").select("nombre, rol, firma_html").eq("id", user.id).single();
        if (data && !error && isMounted) {
          setCurrentName(data.nombre);
          setUserRole(data.rol);
          setFirma(data.firma_html || "");
        }
      }
    };
    fetchMiPerfil();

    const cargarFiltrosBasicos = async () => {
      const [{ data: catData }, { data: almData }] = await Promise.all([
        supabase.from("inventario_categorias").select("id, nombre").order("nombre"),
        supabase.from("inventario_almacenes").select("id, nombre").order("nombre")
      ]);
      setListaCategorias(catData || []);
      setListaAlmacenes(almData || []);
    };
    cargarFiltrosBasicos();

    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (catalogoActivo.isCustom) cargarDatosKits();
    else cargarItemsCatalogo();
  }, [catalogoActivo]);

  const cargarItemsCatalogo = async () => {
    setCargandoCatalogos(true);
    const { data, error } = await supabase.from(catalogoActivo.id).select("*").order("nombre");
    if (!error) setItemsCatalogo(data || []);
    setCargandoCatalogos(false);
  };

  const guardarCatalogo = async (e) => {
    e.preventDefault();
    if (!formCatalogo.nombre.trim()) return;
    try {
      let payload = { nombre: formCatalogo.nombre };
      if (catalogoActivo.extraField === "enlace") payload.enlace = formCatalogo.enlace;
      if (catalogoActivo.extraField === "bool") payload.permite_actualizar_precio = formCatalogo.permite_actualizar_precio || false;

      if (editandoCatId) {
        await supabase.from(catalogoActivo.id).update(payload).eq("id", editandoCatId);
      } else {
        await supabase.from(catalogoActivo.id).insert([payload]);
      }
      setFormCatalogo({ nombre: "", enlace: "", permite_actualizar_precio: false });
      setEditandoCatId(null);
      cargarItemsCatalogo();
      Swal.fire({ icon: "success", title: "Registro guardado", toast: true, position: "top-end", timer: 2000, showConfirmButton: false });
    } catch (error) {
      Swal.fire("Error", "No se pudo procesar la solicitud.", "error");
    }
  };

  const eliminarCatalogo = async (id) => {
    const confirm = await Swal.fire({ title: "¿Borrar ítem?", text: "Si está en uso no podrá eliminarse.", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Eliminar" });
    if (confirm.isConfirmed) {
      const { error } = await supabase.from(catalogoActivo.id).delete().eq("id", id);
      if (error) Swal.fire("Error", "Este ítem está vinculado a productos existentes.", "error");
      else {
        cargarItemsCatalogo();
        Swal.fire({ icon: "success", title: "Eliminado", toast: true, position: "top-end", timer: 2000, showConfirmButton: false });
      }
    }
  };

  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFotoArchivo(file);
      setFotoPreview(URL.createObjectURL(file));
    }
  };

  const optimizarImagen = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX = 800;
          let w = img.width, h = img.height;
          if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } } 
          else { if (h > MAX) { w *= MAX / h; h = MAX; } }
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          canvas.toBlob((blob) => {
            if (blob) resolve(new File([blob], `kit_${Date.now()}.webp`, { type: "image/webp" }));
            else reject(new Error("Error al procesar la imagen."));
          }, "image/webp", 0.8);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const cargarDatosKits = async () => {
    setCargandoCatalogos(true);
    const { data: prods } = await supabase.from("inventario").select(`id, descripcion, modelo, cantidad, medida_cat:inventario_medidas(nombre), marca:inventario_marcas(nombre), proveedor:inventario_proveedores(nombre), condicion:inventario_condiciones(nombre)`).eq("es_kit", false).order("descripcion");
    setProductosParaKits(prods || []);
    
    const { data: kits } = await supabase.from("inventario").select("id, descripcion, cantidad, qr_url, foto_url, id_categoria, id_almacen, fila, precio_unitario").eq("es_kit", true).order("descripcion");
    const { data: recetas } = await supabase.from("kit_componentes").select("*");

    const kitsArmados = (kits || []).map((kit) => {
      const misComponentes = (recetas || []).filter((r) => r.id_kit === kit.id).map((r) => {
        const prodMatch = (prods || []).find((p) => p.id === r.id_producto);
        return {
          id_producto: r.id_producto,
          cantidad_necesaria: r.cantidad_necesaria,
          stock_actual: prodMatch?.cantidad || 0,
          inventario: prodMatch || { descripcion: "Desconocido", modelo: "N/A" },
        };
      });
      return { ...kit, kit_componentes: misComponentes };
    });
    setKitsList(kitsArmados);
    setCargandoCatalogos(false);
  };

  const actualizarComponenteKit = (idx, campo, valor) => {
    const nuevos = [...formKit.componentes];
    nuevos[idx][campo] = valor;
    setFormKit({ ...formKit, componentes: nuevos });
  };

  const guardarKit = async (e) => {
    e.preventDefault();
    const componentesValidos = formKit.componentes.filter((c) => c.id_producto !== "" && Number(c.cantidad_necesaria) > 0);
    if (componentesValidos.length === 0) return Swal.fire("Atención", "Define al menos un componente válido.", "warning");

    setCargandoCatalogos(true);
    try {
      let finalFotoUrl = formKit.foto_url;

      if (fotoArchivo) {
        Swal.fire({ title: "Subiendo imagen...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        if (formKit.foto_url) {
          try { await supabase.storage.from("fotos_productos").remove([formKit.foto_url.split('/').pop()]); } catch (err) {}
        }
        const optimizedFile = await optimizarImagen(fotoArchivo);
        const fileName = `kit_${Date.now()}.webp`;
        const { error: upErr } = await supabase.storage.from("fotos_productos").upload(fileName, optimizedFile, { contentType: "image/webp", upsert: true });
        if (upErr) throw new Error(`Error subiendo foto: ${upErr.message}`);
        finalFotoUrl = supabase.storage.from("fotos_productos").getPublicUrl(fileName).data.publicUrl;
      }

      const payloadKit = {
        descripcion: formKit.descripcion,
        foto_url: finalFotoUrl,
        es_kit: true,
        id_categoria: formKit.id_categoria || null,
        id_almacen: formKit.id_almacen || null,
        fila: formKit.fila || null,
        precio_unitario: formKit.precio_unitario || 0,
        cantidad: formKit.cantidad || 0,
      };

      if (editandoCatId) {
        await supabase.from("inventario").update(payloadKit).eq("id", editandoCatId);
        await supabase.from("kit_componentes").delete().eq("id_kit", editandoCatId);
        const insertData = componentesValidos.map((c) => ({ id_kit: editandoCatId, id_producto: c.id_producto, cantidad_necesaria: c.cantidad_necesaria }));
        await supabase.from("kit_componentes").insert(insertData);
      } else {
        payloadKit.stock_minimo = 0;
        const { data: nuevoKit } = await supabase.from("inventario").insert([payloadKit]).select().single();

        const qrDataUrl = await QRCode.toDataURL(nuevoKit.id, { width: 300 });
        const resBlob = await fetch(qrDataUrl);
        const fileName = `qr_${nuevoKit.id}.png`;
        await supabase.storage.from("qr").upload(fileName, await resBlob.blob(), { contentType: "image/png" });
        const { data: publicUrlData } = supabase.storage.from("qr").getPublicUrl(fileName);
        await supabase.from("inventario").update({ qr_url: publicUrlData.publicUrl }).eq("id", nuevoKit.id);

        const insertData = componentesValidos.map((c) => ({ id_kit: nuevoKit.id, id_producto: c.id_producto, cantidad_necesaria: c.cantidad_necesaria }));
        await supabase.from("kit_componentes").insert(insertData);
      }

      setFormKit({ descripcion: "", foto_url: "", id_categoria: "", id_almacen: "", fila: "", precio_unitario: 0, cantidad: 0, componentes: [{ id_producto: "", cantidad_necesaria: 1, stock_actual: 0, searchTerm: "", showDropdown: false }] });
      setFotoPreview(null);
      setFotoArchivo(null);
      setEditandoCatId(null);
      cargarDatosKits();
      Swal.fire({ icon: "success", title: "Kit guardado", toast: true, position: "top-end", timer: 2500, showConfirmButton: false });
    } catch (error) {
      Swal.fire("Error", "Fallo al procesar el kit.", "error");
    } finally {
      setCargandoCatalogos(false);
    }
  };

  const eliminarKit = async (kit) => {
    const confirm = await Swal.fire({
      title: "¿Borrar Kit?",
      text: kit.cantidad > 0 ? "El stock se devolverá a las piezas originales." : "Se borrará la receta y su foto.",
      icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Desarmar y Borrar",
    });
    if (confirm.isConfirmed) {
      setCargandoCatalogos(true);
      try {
        if (Number(kit.cantidad) > 0) {
          for (let comp of kit.kit_componentes) {
            const { data: prodData } = await supabase.from("inventario").select("cantidad").eq("id", comp.id_producto).single();
            await supabase.from("inventario").update({ cantidad: Number(prodData.cantidad) + Number(comp.cantidad_necesaria) * Number(kit.cantidad) }).eq("id", comp.id_producto);
          }
        }
        if (kit.foto_url) {
          await supabase.storage.from("fotos_productos").remove([kit.foto_url.split('/').pop()]);
        }
        await supabase.storage.from("qr").remove([`qr_${kit.id}.png`]);
        await supabase.from("inventario").delete().eq("id", kit.id);
        cargarDatosKits();
        Swal.fire({ icon: "success", title: "Kit borrado con éxito" });
      } catch (error) {
        Swal.fire("Error", "No se pudo borrar.", "error");
      } finally {
        setCargandoCatalogos(false);
      }
    }
  };

  const handleChangeName = async (e) => {
    e.preventDefault();
    if (!currentName.trim()) return;
    setIsNameLoading(true);
    const { error } = await supabase.from("perfiles").update({ nombre: currentName.trim() }).eq("id", currentUserId);
    if (!error) Swal.fire({ icon: "success", title: "Nombre actualizado", toast: true, position: "top-end", timer: 3000, showConfirmButton: false });
    setIsNameLoading(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return Swal.fire("Error", "Las contraseñas no coinciden", "error");
    setIsPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) {
      Swal.fire("Éxito", "Contraseña cambiada", "success");
      setNewPassword(""); setConfirmPassword("");
    } else {
      Swal.fire("Error", error.message, "error");
    }
    setIsPasswordLoading(false);
  };

  const handleGuardarFirma = async () => {
    setIsFirmaLoading(true);
    const { error } = await supabase.from("perfiles").update({ firma_html: firma }).eq("id", currentUserId);
    if (!error) Swal.fire({ icon: "success", title: "Firma guardada", toast: true, position: "top-end", timer: 3000, showConfirmButton: false });
    setIsFirmaLoading(false);
  };

  const handleDescargarRespaldo = async () => {
    setIsBackupLoading(true);
    try {
      const response = await fetch("/api/backup?download=true");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `respaldo_milas_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
    } catch (e) {
      Swal.fire("Error", "Fallo al generar respaldo", "error");
    }
    setIsBackupLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-black text-slate-800">Configuración MILAS</h1>
        <p className="text-sm text-slate-500 font-medium">Gestión de sistema, perfiles y seguridad.</p>
      </div>

      {/* SECCIÓN CATÁLOGOS Y KITS */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        <h2 className="text-xl font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Settings size={22} className="text-blue-700" /> Administrador de Catálogos
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CATALOGOS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setCatalogoActivo(cat);
                setEditandoCatId(null);
                setListaAbierta(true);
              }}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${catalogoActivo.id === cat.id ? "bg-slate-800 text-white shadow-md" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              {cat.icono} {cat.titulo}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-slate-50 border border-slate-200 rounded-2xl p-5 h-fit">
            <h3 className="font-black text-slate-700 mb-4 text-sm uppercase tracking-widest">
              {editandoCatId ? "Editar" : "Nuevo Registro"}
            </h3>
            {catalogoActivo.isCustom ? (
              <form onSubmit={guardarKit} className="space-y-4">
                
                <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center gap-2 shadow-sm text-center">
                  <div className="w-24 h-24 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center bg-slate-50">
                    {fotoPreview ? <img src={fotoPreview} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-300" size={32} />}
                  </div>
                  <div className="flex gap-2">
                    <label className="p-2 bg-blue-50 text-blue-700 rounded-lg cursor-pointer hover:bg-blue-600 hover:text-white transition-colors" title="Subir Archivo">
                      <UploadCloud size={16} />
                      <input type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
                    </label>
                    <label className="p-2 bg-emerald-50 text-emerald-700 rounded-lg cursor-pointer hover:bg-emerald-600 hover:text-white transition-colors" title="Tomar Foto">
                      <Camera size={16} />
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFotoChange} />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Nombre del Kit *</label>
                  <input required type="text" value={formKit.descripcion} onChange={(e) => setFormKit({ ...formKit, descripcion: e.target.value })} placeholder="Ej. Kit Base Neumática..." className="w-full bg-white border border-slate-800 p-2.5 rounded-xl text-sm font-bold focus:border-blue-600 text-slate-800 outline-none" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Categoría</label>
                    <select value={formKit.id_categoria} onChange={(e) => setFormKit({ ...formKit, id_categoria: e.target.value })} className="w-full bg-white border border-slate-300 p-2.5 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-blue-600">
                      <option value="">Selecciona...</option>
                      {listaCategorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Almacén</label>
                    <select value={formKit.id_almacen} onChange={(e) => setFormKit({ ...formKit, id_almacen: e.target.value })} className="w-full bg-white border border-slate-300 p-2.5 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-blue-600">
                      <option value="">Selecciona...</option>
                      {listaAlmacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Ubicación / Fila</label>
                    <input type="text" value={formKit.fila} onChange={(e) => setFormKit({ ...formKit, fila: e.target.value })} placeholder="Ej. Estante A..." className="w-full bg-white border border-slate-300 p-2.5 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-blue-600" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1.5">Precio Unit. *</label>
                    <div className="relative">
                      <span className="absolute left-2 top-2.5 text-slate-400 font-bold text-xs">$</span>
                      <input required type="number" min="0" step="0.01" value={formKit.precio_unitario} onChange={(e) => setFormKit({ ...formKit, precio_unitario: e.target.value })} className="w-full pl-6 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-emerald-600" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-blue-700 uppercase tracking-widest mb-1.5">Stock Físico *</label>
                    <input required type="number" min="0" step="1" value={formKit.cantidad} onChange={(e) => setFormKit({ ...formKit, cantidad: e.target.value })} className="w-full p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-sm font-bold text-center text-slate-800 outline-none focus:border-blue-600" />
                  </div>
                </div>
                
                <div className="pt-4 space-y-3 border-t border-slate-200">
                  <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1"><Wrench size={14}/> Componentes del Kit:</p>
                  
                  {formKit.componentes.map((comp, i) => {
                    const faltan = Number(comp.cantidad_necesaria) - Number(comp.stock_actual);
                    const alcanza = faltan <= 0;

                    return (
                      <div key={i} className="flex flex-col gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        
                        <div className="relative w-full">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Buscar Material</label>
                          <input
                            type="text"
                            placeholder="Escribe modelo o descripción..."
                            value={comp.searchTerm || ""}
                            onChange={(e) => {
                              actualizarComponenteKit(i, "searchTerm", e.target.value);
                              actualizarComponenteKit(i, "showDropdown", true);
                              if (comp.id_producto) actualizarComponenteKit(i, "id_producto", "");
                            }}
                            onFocus={() => actualizarComponenteKit(i, "showDropdown", true)}
                            onBlur={() => setTimeout(() => actualizarComponenteKit(i, "showDropdown", false), 200)}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-600 outline-none"
                          />
                          
                          {comp.showDropdown && (
                            <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-2xl max-h-60 overflow-y-auto top-[60px] left-0">
                              {productosParaKits.filter(p => getSuperLinea(p).toLowerCase().includes((comp.searchTerm || "").toLowerCase())).slice(0, 20).map(p => (
                                <li
                                  key={p.id}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    actualizarComponenteKit(i, "id_producto", p.id);
                                    actualizarComponenteKit(i, "searchTerm", getSuperLinea(p));
                                    actualizarComponenteKit(i, "stock_actual", p.cantidad || 0);
                                    actualizarComponenteKit(i, "showDropdown", false);
                                  }}
                                  className="p-2.5 text-[11px] font-bold text-slate-700 border-b border-slate-100 hover:bg-blue-50 cursor-pointer flex justify-between items-center"
                                >
                                  <span>{getSuperLinea(p)}</span>
                                  <span className="text-blue-700 bg-blue-100 px-2 py-0.5 rounded ml-2 shrink-0 font-black">Disp: {p.cantidad}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">Cant. Req:</label>
                          <input
                            required type="number" min="0.01" step="0.01"
                            value={comp.cantidad_necesaria}
                            onChange={(e) => actualizarComponenteKit(i, "cantidad_necesaria", e.target.value)}
                            className="w-20 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-slate-800 text-xs font-black focus:outline-none text-center"
                          />
                          <button
                            type="button"
                            onClick={() => { const n = [...formKit.componentes]; n.splice(i, 1); setFormKit({ ...formKit, componentes: n }); }}
                            className="text-slate-300 hover:text-red-500 p-1.5 bg-slate-50 rounded-lg border border-slate-200 ml-auto"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {comp.id_producto && (
                          <div className="bg-slate-50 p-1.5 rounded text-[10px] mt-1 border border-slate-100 text-center">
                            {alcanza ? (
                              <span className="font-bold text-emerald-600 flex items-center justify-center gap-1"><CheckCircle size={10}/> Stock OK (Tienes {comp.stock_actual})</span>
                            ) : (
                              <span className="font-bold text-red-600 flex items-center justify-center gap-1"><AlertTriangle size={10}/> Faltan {faltan} pz</span>
                            )}
                          </div>
                        )}

                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setFormKit({ ...formKit, componentes: [...formKit.componentes, { id_producto: "", cantidad_necesaria: 1, stock_actual: 0, searchTerm: "", showDropdown: false }] })}
                    className="w-full py-2 bg-white text-blue-600 rounded-xl font-bold text-[10px] uppercase border border-dashed border-blue-200 mt-2 hover:bg-blue-50"
                  >
                    + Agregar Componente
                  </button>
                </div>
                <button type="submit" disabled={cargandoCatalogos} className="w-full py-3 bg-blue-700 text-white rounded-xl font-black text-xs uppercase hover:bg-blue-800 shadow-lg shadow-blue-700/20 mt-4 active:scale-95 transition-all">
                  {cargandoCatalogos ? "Guardando..." : editandoCatId ? "Actualizar Kit" : "Crear Kit"}
                </button>
              </form>
            ) : (
              <form onSubmit={guardarCatalogo} className="space-y-4">
                <input required type="text" value={formCatalogo.nombre} onChange={(e) => setFormCatalogo({ ...formCatalogo, nombre: e.target.value })} placeholder="Nombre..." className="w-full bg-white border border-slate-300 p-3 rounded-xl text-sm font-bold text-slate-800" />
                {catalogoActivo.extraField === "enlace" && (
                  <input type="url" value={formCatalogo.enlace} onChange={(e) => setFormCatalogo({ ...formCatalogo, enlace: e.target.value })} placeholder="Enlace Maps/Tienda..." className="w-full bg-white border border-slate-300 p-3 rounded-xl text-sm text-slate-800" />
                )}
                {catalogoActivo.extraField === "bool" && (
                  <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={formCatalogo.permite_actualizar_precio || false} onChange={(e) => setFormCatalogo({ ...formCatalogo, permite_actualizar_precio: e.target.checked })} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Permitir actualizar precio</span>
                  </div>
                )}
                <button type="submit" className="w-full py-3 bg-slate-800 text-white rounded-xl font-black text-xs uppercase hover:bg-slate-900 shadow-md">
                  Guardar Registro
                </button>
              </form>
            )}
          </div>

          <div className="lg:col-span-2 h-fit">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <button type="button" onClick={() => setListaAbierta(!listaAbierta)} className="w-full p-4 bg-slate-50 flex justify-between items-center font-black text-slate-700 text-sm">
                {catalogoActivo.titulo} {listaAbierta ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {listaAbierta && (
                <div className="p-4 overflow-y-auto max-h-[450px] space-y-2">
                  {catalogoActivo.isCustom
                    ? kitsList.map((kit) => (
                        <div key={kit.id} className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl flex justify-between items-center group">
                          <div className="flex items-center gap-3">
                            {kit.foto_url ? (
                              <img src={kit.foto_url} className="w-12 h-12 rounded-lg border object-cover bg-white" />
                            ) : kit.qr_url ? (
                              <img src={kit.qr_url} className="w-12 h-12 rounded-lg border bg-white" />
                            ) : (
                              <div className="w-12 h-12 rounded-lg border bg-white flex items-center justify-center"><Wrench className="text-slate-400" size={18} /></div>
                            )}
                            <div>
                              <p className="font-bold text-sm text-slate-800">{kit.descripcion}</p>
                              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">En Stock: {kit.cantidad}</p>
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setFormKit({
                                  descripcion: kit.descripcion,
                                  foto_url: kit.foto_url || "",
                                  id_categoria: kit.id_categoria || "",
                                  id_almacen: kit.id_almacen || "",
                                  fila: kit.fila || "",
                                  precio_unitario: kit.precio_unitario || 0,
                                  cantidad: kit.cantidad || 0,
                                  componentes: kit.kit_componentes.map(c => ({
                                    id_producto: c.id_producto,
                                    cantidad_necesaria: c.cantidad_necesaria,
                                    stock_actual: c.inventario?.cantidad || 0,
                                    searchTerm: getSuperLinea(c.inventario),
                                    showDropdown: false
                                  })),
                                });
                                setFotoPreview(kit.foto_url || null);
                                setFotoArchivo(null);
                                setEditandoCatId(kit.id);
                                setListaAbierta(false);
                              }}
                              className="p-2 text-slate-400 hover:text-blue-600"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => eliminarKit(kit)} className="p-2 text-slate-400 hover:text-red-500">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    : itemsCatalogo.map((item) => (
                        <div key={item.id} className="p-3 bg-white border border-slate-100 rounded-xl flex justify-between items-center group hover:border-slate-300">
                          <span className="font-bold text-sm text-slate-800">{item.nombre}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setFormCatalogo({ nombre: item.nombre, enlace: item.enlace || "" });
                                setEditandoCatId(item.id);
                                setListaAbierta(false);
                              }}
                              className="p-2 text-slate-400 hover:text-blue-600"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => eliminarCatalogo(item.id)} className="p-2 text-slate-400 hover:text-red-500">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN PERFIL Y CONTRASEÑA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2"><User size={20} className="text-blue-700" /> Mi Perfil</h2>
          <form onSubmit={handleChangeName} className="space-y-4 mt-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Nombre Completo</label>
              <input type="text" required value={currentName} onChange={(e) => setCurrentName(e.target.value)} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl font-bold text-slate-800" />
            </div>
            <button type="submit" disabled={isNameLoading} className="w-full py-3 bg-blue-700 text-white rounded-xl font-bold text-xs uppercase shadow-md active:scale-95 disabled:opacity-50">
              {isNameLoading ? "Guardando..." : "Guardar Nombre"}
            </button>
          </form>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2"><KeyRound size={20} className="text-blue-700" /> Seguridad</h2>
          <form onSubmit={handleChangePassword} className="space-y-4 mt-4">
            <div className="relative">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Nueva Contraseña</label>
              <input type={showNewPassword ? "text" : "password"} minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-300 text-slate-800 p-3 rounded-xl font-bold" />
              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 bottom-3.5 text-slate-400">{showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
            <button type="submit" disabled={isPasswordLoading || !newPassword} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold text-xs uppercase shadow-md active:scale-95 disabled:opacity-50">
              Actualizar Contraseña
            </button>
          </form>
        </div>
      </div>

      {/* SECCIÓN ADMIN: FIRMA Y BACKUP */}
      {userRole === "admin" && (
        <>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2"><PenTool size={20} className="text-blue-700" /> Firma de Correo Corporativa</h2>
            <div className="space-y-4 mt-4">
              <ReactQuill theme="snow" value={firma} onChange={setFirma} className="bg-white rounded-xl text-slate-800" />
              <div className="flex justify-end">
                <button onClick={handleGuardarFirma} disabled={isFirmaLoading} className="py-3 px-8 bg-blue-700 text-white font-black rounded-xl text-xs uppercase shadow-lg shadow-blue-700/20">{isFirmaLoading ? "Guardando..." : "Guardar Firma"}</button>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="bg-blue-900/50 p-3 rounded-xl"><Database size={24} className="text-blue-400" /></div>
              <div>
                <h3 className="text-lg font-black text-white">Respaldo Maestro</h3>
                <p className="text-xs text-slate-400 font-medium">Descarga un archivo JSON con toda la base de datos de MILAS (Inventario, Tareas, Auditoría).</p>
              </div>
            </div>
            <button onClick={handleDescargarRespaldo} disabled={isBackupLoading} className="w-full md:w-auto bg-blue-600 text-white font-black py-3 px-8 rounded-xl hover:bg-blue-500 transition-all flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest disabled:opacity-50 active:scale-95">
              {isBackupLoading ? <ServerCog className="animate-spin" size={16} /> : <DownloadCloud size={16} />}
              {isBackupLoading ? "Procesando..." : "Descargar Respaldo JSON"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}