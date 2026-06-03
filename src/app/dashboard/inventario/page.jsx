"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/app/_lib/supabase/supabase";
import Swal from "sweetalert2";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable'; // 🟢 Importación para el nuevo reporte de tabla
import {
  Plus,
  QrCode,
  Edit2,
  Trash2,
  ScanLine,
  AlertTriangle,
  CheckCircle,
  Package,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  Link as LinkIcon,
  PackagePlus,
  PackageMinus,
  Wrench,
  Copy,
  Image as ImageIcon,
  Table // 🟢 Ícono para el nuevo botón
} from "lucide-react";

import ModalAjusteStock from "@/app/_components/ModalAjusteStock";
import ModalFormProducto from "@/app/_components/ModalFormProducto";
import LectorQR from "@/app/_components/LectorQR";
import FiltrosInventario from "@/app/_components/FiltrosInventario";

export default function InventarioPage() {
  const [inventario, setInventario] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [busqueda, setBusqueda] = useState("");
  const [filtros, setFiltros] = useState({
    marca: "",
    categoria: "",
    medida: "",
    almacen: "",
    estatus: "",
  });
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 15;

  // 🟢 ESTADO PARA SELECCIÓN MÚLTIPLE
  const [selectedIds, setSelectedIds] = useState([]);

  const [catalogos, setCatalogos] = useState({
    udms: [],
    marcas: [],
    almacenes: [],
    condiciones: [],
    categorias: [],
    proveedores: [],
    medidas: [],
  });

  const [isModalAddOpen, setIsModalAddOpen] = useState(false);
  const [isModalScannerOpen, setIsModalScannerOpen] = useState(false);
  const [isModalAjusteOpen, setIsModalAjusteOpen] = useState(false);

  const [productoToEdit, setProductoToEdit] = useState(null);
  const [productoScanner, setProductoScanner] = useState(null);

  const cargarCatalogos = async () => {
    const { data: udms } = await supabase.from("inventario_udm").select("*");
    const { data: marcas } = await supabase.from("inventario_marcas").select("*");
    const { data: almacenes } = await supabase.from("inventario_almacenes").select("*");
    const { data: condiciones } = await supabase.from("inventario_condiciones").select("*");
    const { data: categorias } = await supabase.from("inventario_categorias").select("*");
    const { data: proveedores } = await supabase.from("inventario_proveedores").select("*");
    const { data: medidas } = await supabase.from("inventario_medidas").select("*");

    setCatalogos({
      udms: udms || [],
      marcas: marcas || [],
      almacenes: almacenes || [],
      condiciones: condiciones || [],
      categorias: categorias || [],
      proveedores: proveedores || [],
      medidas: medidas || [],
    });
  };

  const cargarInventario = async () => {
    const { data, error } = await supabase
      .from("inventario")
      .select(
        `
        *, 
        udm:inventario_udm(nombre), marca:inventario_marcas(nombre), almacen:inventario_almacenes(nombre), 
        condicion:inventario_condiciones(nombre), categoria:inventario_categorias(nombre),
        proveedor:inventario_proveedores(nombre, enlace), medida_cat:inventario_medidas(nombre)
      `,
      )
      .order("descripcion");

    if (!error) setInventario(data || []);
    setCargando(false);
  };

  useEffect(() => {
    cargarCatalogos();
    cargarInventario();
  }, []);

  const limpiarFiltros = () => {
    setFiltros({ marca: "", categoria: "", medida: "", almacen: "", estatus: "" });
    setPaginaActual(1);
    setSelectedIds([]); // Limpiamos selección al cambiar filtros
  };

  const buscarYAbrirAjuste = (id) => {
    const prod = inventario.find((p) => p.id === id);
    if (prod) {
      setProductoScanner(prod);
      setIsModalAjusteOpen(true);
    } else {
      Swal.fire("No Encontrado", "Este QR no corresponde a ningún producto.", "warning");
    }
  };

  // 🟢 LÓGICA DE SELECCIÓN MÚLTIPLE
  const handleSelectAll = (e, itemsDePagina) => {
    if (e.target.checked) {
      const nuevosIds = itemsDePagina.map(p => p.id).filter(id => !selectedIds.includes(id));
      setSelectedIds([...selectedIds, ...nuevosIds]);
    } else {
      const idsPagina = itemsDePagina.map(p => p.id);
      setSelectedIds(selectedIds.filter(id => !idsPagina.includes(id)));
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // 🟢 BORRADO MASIVO
  const eliminarSeleccionados = async () => {
    if (selectedIds.length === 0) return;

    const confirm = await Swal.fire({
      title: `¿Eliminar ${selectedIds.length} productos?`,
      text: "¿Estás seguro de que deseas borrar lo seleccionado?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Sí, borrar todo",
      cancelButtonText: "Cancelar"
    });

    if (confirm.isConfirmed) {
      setCargando(true);
      let borrados = 0;

      for (const id of selectedIds) {
        const producto = inventario.find(p => p.id === id);
        if (!producto) continue;

      try {
          // Limpiar QR
          if (producto.qr_url) {
            const qrName = `qr_${producto.id}.png`;
            await supabase.storage.from("qr").remove([qrName]);
          }

          // 🟢 LIMPIAR FOTO
          if (producto.foto_url) {
            const urlParts = producto.foto_url.split('/');
            const photoName = urlParts[urlParts.length - 1];
            await supabase.storage.from("fotos_productos").remove([photoName]);
          }

          const { error } = await supabase.from("inventario").delete().eq("id", id);
          if (!error) borrados++;
          
        } catch (error) {
          console.error("Error al borrar:", error);
        }
      }

      Swal.fire(
        "Completado",
        `Se borraron ${borrados} productos.`,
        "success"
      );
      
      setSelectedIds([]);
      cargarInventario();
    }
  };

  const duplicarProducto = async (p) => {
    const confirm = await Swal.fire({
      title: "¿Duplicar producto?",
      text: `Se creará una copia de: ${p.descripcion}`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, duplicar",
    });

    if (confirm.isConfirmed) {
      setCargando(true);
      try {
        const nuevoProducto = {
          descripcion: `${p.descripcion} (DUPLICADO)`,
          modelo: p.modelo || null,
          id_categoria: p.id_categoria || null,
          id_marca: p.id_marca || null,
          id_proveedor: p.id_proveedor || null,
          id_almacen: p.id_almacen || null,
          id_condicion: p.id_condicion || null,
          id_udm: p.id_udm || null,
          id_medida: p.id_medida || null,
          fila: p.fila || null,
          precio_unitario: p.precio_unitario || 0,
          stock_minimo: p.stock_minimo || 1,
          cantidad: 0,
          es_kit: p.es_kit || false,
          foto_url: p.foto_url || null, // 🟢 Clonar también la URL de la foto
        };

        const { data: nuevo, error } = await supabase.from("inventario").insert([nuevoProducto]).select().single();
        if (error) throw error;

        const qrDataUrl = await QRCode.toDataURL(String(nuevo.id), { width: 300 });
        const resBlob = await fetch(qrDataUrl);
        const blob = await resBlob.blob();
        const fileName = `qr_${nuevo.id}.png`;

        await supabase.storage.from("qr").upload(fileName, blob, { upsert: true });
        const { data: urlData } = supabase.storage.from("qr").getPublicUrl(fileName);
        await supabase.from("inventario").update({ qr_url: urlData.publicUrl }).eq("id", nuevo.id);

        Swal.fire("Copiado", "Producto duplicado con éxito.", "success");
        cargarInventario();
      } catch (error) {
        Swal.fire("Error", error.message, "error");
      } finally {
        setCargando(false);
      }
    }
  };

  // 🟢 BORRADO INDIVIDUAL CON LIMPIEZA TOTAL DE ARCHIVOS
  const eliminarProducto = async (producto) => {
    const confirm = await Swal.fire({
      title: "¿Eliminar Producto?",
      text: "Se borrará el registro, su QR y su foto del sistema. ¿Confirmar?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Sí, borrar todo",
      cancelButtonText: "Cancelar",
    });

    if (confirm.isConfirmed) {
      setCargando(true);
      try {
        // 1. Limpiar archivo QR del bucket 'qr'
        if (producto.qr_url) {
          const fileName = `qr_${producto.id}.png`;
          await supabase.storage.from("qr").remove([fileName]);
        }

        // 2. Limpiar archivo de FOTO del bucket 'fotos_productos'
        if (producto.foto_url) {
          const urlParts = producto.foto_url.split('/');
          const fileName = urlParts[urlParts.length - 1];
          await supabase.storage.from("fotos_productos").remove([fileName]);
        }
        
        // 3. Borrar registro de la base de datos
        const { error } = await supabase.from("inventario").delete().eq("id", producto.id);
        if (error) throw error;

        Swal.fire({ icon: "success", title: "Eliminado", toast: true, position: "top-end", timer: 2000, showConfirmButton: false });
        setSelectedIds(selectedIds.filter(id => id !== producto.id));
        cargarInventario();
      } catch (error) {
        Swal.fire("Error", "No se pudo eliminar el producto o sus archivos.", "error");
      } finally {
        setCargando(false);
      }
    }
  };

  const armarKit = async (kit) => {
    Swal.fire({ title: "Verificando stock...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
      const { data: componentes } = await supabase.from("kit_componentes").select("*").eq("id_kit", kit.id);
      let faltantes = [];
      let detallesComponentes = [];

      for (let comp of componentes) {
        const { data: prod } = await supabase.from("inventario").select("descripcion, cantidad").eq("id", comp.id_producto).single();
        if (Number(prod.cantidad) < Number(comp.cantidad_necesaria)) {
          faltantes.push(`• ${prod.descripcion} (Te faltan ${Number(comp.cantidad_necesaria) - Number(prod.cantidad)})`);
        }
        detallesComponentes.push({ ...comp, actualStock: prod.cantidad });
      }

      if (faltantes.length > 0) return Swal.fire("Stock Insuficiente", "No puedes armar este kit. Faltan:\n\n" + faltantes.join("\n"), "error");

      Swal.fire({ title: "Armando Kit...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });

      for (let comp of detallesComponentes) {
        const nuevoStock = Number(comp.actualStock) - Number(comp.cantidad_necesaria);
        await supabase.from("inventario").update({ cantidad: nuevoStock }).eq("id", comp.id_producto);
      }

      await supabase.from("inventario").update({ cantidad: Number(kit.cantidad) + 1 }).eq("id", kit.id);
      cargarInventario();
      Swal.fire({ icon: "success", title: "Kit Armado", toast: true, position: "top-end", timer: 2500, showConfirmButton: false });
    } catch (error) {
      Swal.fire("Error", "Fallo al armar kit: " + error.message, "error");
    }
  };

  const desarmarKit = async (kit) => {
    if (Number(kit.cantidad) <= 0) return Swal.fire("Atención", "No tienes kits armados para desarmar.", "warning");
    Swal.fire({ title: "Desarmando Kit...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
      const { data: componentes } = await supabase.from("kit_componentes").select("*").eq("id_kit", kit.id);

      for (let comp of componentes) {
        const { data: prod } = await supabase.from("inventario").select("cantidad").eq("id", comp.id_producto).single();
        const nuevoStock = Number(prod.cantidad) + Number(comp.cantidad_necesaria);
        await supabase.from("inventario").update({ cantidad: nuevoStock }).eq("id", comp.id_producto);
      }

      await supabase.from("inventario").update({ cantidad: Number(kit.cantidad) - 1 }).eq("id", kit.id);
      cargarInventario();
      Swal.fire({ icon: "success", title: "Kit Desarmado", toast: true, position: "top-end", timer: 2500, showConfirmButton: false });
    } catch (error) {
      Swal.fire("Error", "Fallo al desarmar kit: " + error.message, "error");
    }
  };

  const generarCatalogoPDF = async () => {
    if (inventarioFiltrado.length === 0) return Swal.fire("Atención", "No hay productos en la lista.", "warning");
    Swal.fire({ title: "Generando catálogo...", text: "Procesando imágenes y códigos...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      
      const convertirImagenABase64 = (url) =>
        new Promise((resolve) => {
          if (!url) return resolve(null);
          const img = new Image();
          img.crossOrigin = "Anonymous";
          img.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = img.width; canvas.height = img.height;
              canvas.getContext("2d").drawImage(img, 0, 0);
              resolve(canvas.toDataURL("image/jpeg"));
            } catch (err) { resolve(null); }
          };
          img.onerror = () => resolve(null);
          img.src = url;
        });

      const imagenesBase64 = await Promise.all(
        inventarioFiltrado.map((p) => convertirImagenABase64(p.foto_url || p.qr_url))
      );

      const columnas = 4; const filas = 2; const itemsPorPagina = columnas * filas;
      const cardWidth = 65; const cardHeight = 85; const marginX = 10; const marginY = 20; const espacioX = 68; const espacioY = 92;

      for (let i = 0; i < inventarioFiltrado.length; i++) {
        const producto = inventarioFiltrado[i];
        if (i % itemsPorPagina === 0) {
          if (i > 0) doc.addPage();
          doc.setFont("helvetica", "bold"); doc.setFontSize(18);
          doc.text("CATÁLOGO COMERCIAL - MILAS", pageWidth / 2, 12, { align: "center" });
          doc.setFontSize(9); doc.setTextColor(120);
          doc.text(`Total de equipos/productos: ${inventarioFiltrado.length}`, pageWidth / 2, 18, { align: "center" });
          doc.setTextColor(0);
        }
        const indexPagina = i % itemsPorPagina;
        const col = indexPagina % columnas; const row = Math.floor(indexPagina / columnas);
        const x = marginX + col * espacioX; const y = marginY + row * espacioY;

        doc.setDrawColor(220); doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3);
        doc.setFont("helvetica", "bold"); doc.setFontSize(9);
        const nombreProducto = producto.es_kit ? `[KIT] ${producto.descripcion}` : producto.descripcion || "Sin descripción";
        doc.text(doc.splitTextToSize(nombreProducto, cardWidth - 6), x + 3, y + 6);
        doc.setFont("helvetica", "normal"); doc.setFontSize(8);
        doc.text(`Modelo: ${producto.modelo || "N/A"}`, x + 3, y + 18);
        doc.text(`Marca: ${producto.marca?.nombre || "N/A"}`, x + 3, y + 23);
        doc.text(`Stock: ${producto.cantidad}`, x + 3, y + 28);

        const imgBase64 = imagenesBase64[i];
        if (imgBase64) {
          try { 
            doc.addImage(imgBase64, "JPEG", x + 12, y + 33, 40, 40); 
          } catch (err) { 
            doc.setFontSize(7); doc.text("Imagen no disponible", x + 18, y + 55); 
          }
        } else {
          doc.setFontSize(7); doc.text("Sin Imagen", x + 18, y + 55);
        }
        doc.setFontSize(7); doc.setTextColor(120); doc.text(`ID: ${producto.id}`, x + 3, y + 80); doc.setTextColor(0);
      }
      doc.save("Catalogo_MILAS.pdf");
      Swal.close();
      Swal.fire("¡Listo!", "El catálogo comercial PDF se generó correctamente.", "success");
    } catch (error) {
      Swal.close();
      Swal.fire("Error", "Hubo un fallo generando el PDF.", "error");
    }
  };

  // 🟢 NUEVO: REPORTE EN TABLA PARA CONTEO FÍSICO Y VALORACIÓN
// 🟢 NUEVO: REPORTE EN TABLA PARA CONTEO FÍSICO Y VALORACIÓN (ACTUALIZADO A 3 COLUMNAS)
  const generarReporteTablaPDF = () => {
    if (inventarioFiltrado.length === 0) return Swal.fire("Atención", "No hay productos para el reporte.", "warning");

    const doc = new jsPDF();
    
    // Título
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Reporte de Inventario - MILAS", 14, 20);
    
    // Subtítulo con fecha y cantidad de ítems filtrados
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString()} | Total Ítems: ${inventarioFiltrado.length}`, 14, 26);

    // Preparar datos (Exactamente las 3 columnas solicitadas)
    const bodyData = inventarioFiltrado.map(p => {
      // Unimos descripción + medida (si tiene) + modelo en una sola celda
      const nombreCompleto = `${p.es_kit ? '[KIT] ' : ''}${p.descripcion} ${p.medida_cat?.nombre ? `| ${p.medida_cat.nombre}` : ''} ${p.modelo ? `| Mod: ${p.modelo}` : ''}`;
      
      return [
        nombreCompleto,
        p.cantidad,
        `$${Number(p.precio_unitario).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      ];
    });

    autoTable(doc, {
      startY: 32,
      head: [['Producto / Detalles', 'Stock', 'Precio']],
      body: bodyData,
      theme: 'striped',
      headStyles: { fillColor: [30, 58, 138] }, // Azul corporativo MILAS
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 'auto' }, // Toma todo el espacio disponible para que el nombre no se corte
        1: { halign: 'center', cellWidth: 30 }, // Stock centrado
        2: { halign: 'right', cellWidth: 40 }   // Precio alineado a la derecha como buen formato financiero
      }
    });

    doc.save("Reporte_Tabla_MILAS.pdf");
  };

  const inventarioFiltrado = inventario.filter((p) => {
    const matchBusqueda =
      p.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.modelo?.toLowerCase().includes(busqueda.toLowerCase());
    const matchMarca = filtros.marca ? p.id_marca == filtros.marca : true;
    const matchCategoria = filtros.categoria ? p.id_categoria == filtros.categoria : true;
    const matchMedida = filtros.medida ? p.id_medida == filtros.medida : true;
    const matchAlmacen = filtros.almacen ? p.id_almacen == filtros.almacen : true;
    let matchEstatus = true;
    if (filtros.estatus === "comprar") matchEstatus = Number(p.cantidad) <= Number(p.stock_minimo);
    if (filtros.estatus === "suficiente") matchEstatus = Number(p.cantidad) > Number(p.stock_minimo);
    return matchBusqueda && matchMarca && matchCategoria && matchMedida && matchAlmacen && matchEstatus;
  });

  const totalPaginas = Math.ceil(inventarioFiltrado.length / itemsPorPagina) || 1;
  const inventarioPaginado = inventarioFiltrado.slice((paginaActual - 1) * itemsPorPagina, paginaActual * itemsPorPagina);
  const valorTotalInventario = inventarioFiltrado.reduce((acc, p) => acc + Number(p.cantidad) * Number(p.precio_unitario), 0);

  const isAllSelectedOnPage = inventarioPaginado.length > 0 && inventarioPaginado.every(p => selectedIds.includes(p.id));

  return (
    <div className="max-w-[90rem] mx-auto space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Package className="text-blue-700" /> Control de Inventario
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Gestión, existencias y valoración.</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-4 w-full xl:w-auto shadow-sm">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <DollarSign size={24} strokeWidth={3} />
          </div>
          <div>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Valor Filtrado</p>
            <p className="text-2xl font-black text-emerald-900 leading-none">
              ${valorTotalInventario.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 w-full xl:w-auto shrink-0 flex-wrap">
          {selectedIds.length > 0 && (
            <button
              onClick={eliminarSeleccionados}
              className="flex-1 xl:flex-none bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-100 transition-all shadow-sm animate-in zoom-in duration-200"
            >
              <Trash2 size={16} /> Borrar ({selectedIds.length})
            </button>
          )}

          {/* 🟢 NUEVO BOTÓN PARA EL REPORTE DE TABLA */}
          <button
            onClick={generarReporteTablaPDF}
            className="flex-1 xl:flex-none bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors shadow-sm"
          >
            <Table size={16} /> Reporte Tabla
          </button>

          <button
            onClick={generarCatalogoPDF}
            className="flex-1 xl:flex-none bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors shadow-sm"
          >
            <FileText size={16} /> Catálogo PDF
          </button>
          <button
            onClick={() => setIsModalScannerOpen(true)}
            className="flex-1 xl:flex-none bg-slate-800 text-white px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-900 transition-colors shadow-sm"
          >
            <ScanLine size={16} /> Escanear QR
          </button>
          <button
            onClick={() => {
              setProductoToEdit(null);
              setIsModalAddOpen(true);
            }}
            className="flex-1 xl:flex-none bg-blue-700 text-white px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-800 transition-colors shadow-md active:scale-95"
          >
            <Plus size={16} /> Nuevo
          </button>
        </div>
      </div>

      <FiltrosInventario
        busqueda={busqueda}
        setBusqueda={(val) => { setBusqueda(val); setPaginaActual(1); }}
        filtros={filtros}
        setFiltros={(val) => { setFiltros(val); setPaginaActual(1); }}
        catalogos={catalogos}
        limpiarFiltros={limpiarFiltros}
      />

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[60vh]">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="p-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    checked={isAllSelectedOnPage}
                    onChange={(e) => handleSelectAll(e, inventarioPaginado)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer accent-blue-600"
                  />
                </th>
                <th className="p-4">Producto / Kit</th>
                <th className="p-4">Categoría</th>
                <th className="p-4 text-center">Condición</th>
                <th className="p-4">Proveedor</th>
                <th className="p-4 text-center">Enlace</th>
                <th className="p-4">Ubicación</th>
                <th className="p-4 text-center">Precio Unit.</th> 
                <th className="p-4 text-center">Cant.</th>
                <th className="p-4 text-center">Estatus</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargando ? (
                <tr>
                  <td colSpan="10" className="p-12 text-center text-slate-400 font-bold animate-pulse">
                    Cargando almacén...
                  </td>
                </tr>
              ) : (
                inventarioPaginado.map((p) => {
                  const solicitar = Number(p.cantidad) <= Number(p.stock_minimo);
                  const isSelected = selectedIds.includes(p.id);

                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors ${isSelected ? "bg-blue-50/50" : p.es_kit ? "bg-indigo-50/20 hover:bg-indigo-50/50" : "hover:bg-slate-50"}`}
                    >
                      <td className="p-4 text-center">
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => handleSelectOne(p.id)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer accent-blue-600"
                        />
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800 flex items-center gap-3">
                          
                          <div 
                            onClick={() => { setProductoScanner(p); setIsModalAjusteOpen(true); }} 
                            className="group relative cursor-pointer shrink-0"
                          >
                            {p.foto_url ? (
                              <img src={p.foto_url} alt="Prod" className="w-12 h-12 border border-slate-200 rounded-xl shadow-sm object-cover bg-white" />
                            ) : p.qr_url ? (
                              <img src={p.qr_url} alt="QR" className="w-12 h-12 border border-slate-200 rounded-xl shadow-sm object-contain bg-white p-1" />
                            ) : (
                              <div className="w-12 h-12 bg-slate-100 flex items-center justify-center rounded-xl border border-slate-200">
                                {p.es_kit ? <Wrench className="text-slate-400" size={16} /> : <ImageIcon className="text-slate-300" size={16} />}
                              </div>
                            )}

                            {(p.foto_url || p.qr_url) && (
                              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-xl">
                                <div className="bg-white p-2 rounded-2xl border border-slate-200 flex flex-col items-center gap-2 w-32">
                                  {p.foto_url && p.qr_url ? (
                                    <>
                                      <img src={p.qr_url} className="w-24 h-24 object-contain" />
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center w-full border-t border-slate-100 pt-2">Escanear QR</span>
                                    </>
                                  ) : p.qr_url ? (
                                    <>
                                      <img src={p.qr_url} className="w-24 h-24 object-contain" />
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center w-full border-t border-slate-100 pt-2">Escanear QR</span>
                                    </>
                                  ) : (
                                    <>
                                      <img src={p.foto_url} className="w-24 h-24 object-cover rounded-xl" />
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center w-full border-t border-slate-100 pt-2">Foto de Producto</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <p className="whitespace-normal min-w-[180px] max-w-[250px] leading-tight mb-1 flex items-center gap-2">
                              {p.es_kit && <span className="bg-indigo-600 text-white px-1.5 py-0.5 rounded text-[9px] uppercase tracking-widest shrink-0">KIT</span>}
                              {p.descripcion}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {p.medida_cat?.nombre && <span className="bg-slate-800 text-white px-1.5 py-0.5 rounded text-[9px] uppercase tracking-widest font-black">{p.medida_cat.nombre}</span>}
                              {!p.es_kit && <span className="text-[10px] text-slate-500">Mod: {p.modelo || "N/A"} • {p.marca?.nombre}</span>}
                            </div>
                          </div>

                        </div>
                      </td>
                      <td className="p-4">
                        {p.categoria ? <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-widest font-bold">{p.categoria.nombre}</span> : <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Sin asignar</span>}
                      </td>
                      <td className="p-4 text-center">
                        {p.condicion ? <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-widest font-bold">{p.condicion.nombre}</span> : <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">N/A</span>}
                      </td>
                      <td className="p-4">
                        {p.proveedor ? <span className="font-bold text-slate-700 text-xs truncate max-w-[120px] block" title={p.proveedor.nombre}>{p.proveedor.nombre}</span> : <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Sin asignar</span>}
                      </td>
                      <td className="p-4 text-center">
                        {p.proveedor?.enlace ? <a href={p.proveedor.enlace} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center bg-blue-50 text-blue-600 p-2 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><LinkIcon size={16} /></a> : <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Sin Link</span>}
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-700 text-xs">{p.almacen?.nombre || (p.es_kit ? "Zona de Kits" : "N/A")}</p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Fila: {p.fila || "N/A"}</p>
                      </td>
                      <td className="p-4 text-center">
                        <p className="font-black text-slate-700 text-sm">
                          ${Number(p.precio_unitario || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-base font-black ${p.es_kit ? "text-indigo-700" : solicitar ? "text-red-600" : "text-blue-700"}`}>{p.cantidad}</span>
                      </td>
                      <td className="p-4 text-center">
                        {p.es_kit ? (
                          <span className="inline-flex items-center justify-center gap-1 text-[9px] font-black px-2 py-1 bg-indigo-100 text-indigo-700 rounded uppercase tracking-widest">Ensamblaje</span>
                        ) : solicitar ? (
                          <span className="inline-flex items-center justify-center gap-1 text-[9px] font-black px-2 py-1 bg-red-100 text-red-700 rounded uppercase tracking-widest"><AlertTriangle size={10} /> Comprar</span>
                        ) : (
                          <span className="inline-flex items-center justify-center gap-1 text-[9px] font-black px-2 py-1 bg-emerald-100 text-emerald-700 rounded uppercase tracking-widest"><CheckCircle size={10} /> Suficiente</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {p.es_kit ? (
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => armarKit(p)} className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors" title="Armar Kit"><PackagePlus size={16} /></button>
                            <button onClick={() => desarmarKit(p)} className="p-2 bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white rounded-lg transition-colors" title="Desarmar Kit"><PackageMinus size={16} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => { setProductoToEdit(p); setIsModalAddOpen(true); }} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-colors" title="Editar"><Edit2 size={16} /></button>
                            <button onClick={() => eliminarProducto(p)} className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-colors" title="Borrar"><Trash2 size={16} /></button>
                            <button onClick={() => duplicarProducto(p)} className="p-2 bg-slate-50 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors" title="Duplicar"><Copy size={16} /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
              {inventarioPaginado.length === 0 && !cargando && (
                <tr>
                  <td colSpan="10" className="p-12 text-center text-slate-400 font-bold">No se encontraron productos con estos filtros.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!cargando && inventarioFiltrado.length > itemsPorPagina && (
          <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center shrink-0">
            <button onClick={() => setPaginaActual((p) => Math.max(1, p - 1))} disabled={paginaActual === 1} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 font-bold text-xs hover:bg-slate-100 disabled:opacity-40 transition-colors flex items-center gap-1">
              <ChevronLeft size={16} /> Anterior
            </button>
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
              Página {paginaActual} de {totalPaginas}
            </span>
            <button onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 font-bold text-xs hover:bg-slate-100 disabled:opacity-40 transition-colors flex items-center gap-1">
              Siguiente <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {isModalScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 relative overflow-hidden">
            <button onClick={() => setIsModalScannerOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 z-[100] bg-white rounded-full transition-colors"><X size={24} /></button>
            <div className="text-center mb-4 pt-2">
              <h3 className="font-black text-slate-800 text-lg">Escáner de Inventario</h3>
              <p className="text-xs text-slate-500 font-medium">Da permiso a la cámara y apunta al código QR.</p>
            </div>
            <LectorQR onScanExitoso={(idScaneado) => { setIsModalScannerOpen(false); buscarYAbrirAjuste(idScaneado); }} />
          </div>
        </div>
      )}

      <ModalAjusteStock isOpen={isModalAjusteOpen} onClose={() => setIsModalAjusteOpen(false)} producto={productoScanner} onActualizado={cargarInventario} />
      <ModalFormProducto isOpen={isModalAddOpen} onClose={() => setIsModalAddOpen(false)} productoEdicion={productoToEdit} catalogos={catalogos} onGuardado={cargarInventario} />
    </div>
  );
}