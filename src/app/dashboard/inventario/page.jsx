"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/app/_lib/supabase/supabase";
import Swal from "sweetalert2";
import { jsPDF } from "jspdf";
import {
  Plus,
  QrCode,
  Edit2,
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
    const { data: marcas } = await supabase
      .from("inventario_marcas")
      .select("*");
    const { data: almacenes } = await supabase
      .from("inventario_almacenes")
      .select("*");
    const { data: condiciones } = await supabase
      .from("inventario_condiciones")
      .select("*");
    const { data: categorias } = await supabase
      .from("inventario_categorias")
      .select("*");
    const { data: proveedores } = await supabase
      .from("inventario_proveedores")
      .select("*");
    const { data: medidas } = await supabase
      .from("inventario_medidas")
      .select("*");

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
        udm:inventario_udm(nombre), 
        marca:inventario_marcas(nombre), 
        almacen:inventario_almacenes(nombre), 
        condicion:inventario_condiciones(nombre),
        categoria:inventario_categorias(nombre),
        proveedor:inventario_proveedores(nombre, enlace),
        medida_cat:inventario_medidas(nombre)
      `,
      )
      .order("descripcion");
    if (!error) setInventario(data);
    setCargando(false);
  };

  useEffect(() => {
    const inicializarDatos = async () => {
      await cargarCatalogos();
      await cargarInventario();
    };
    inicializarDatos();
  }, []);

  const buscarYAbrirAjuste = (id) => {
    const prod = inventario.find((p) => p.id === id);
    if (prod) {
      setProductoScanner(prod);
      setIsModalAjusteOpen(true);
    } else {
      Swal.fire(
        "No Encontrado",
        "Este QR no corresponde a ningún producto del inventario.",
        "warning",
      );
    }
  };

  const limpiarFiltros = () => {
    setFiltros({
      marca: "",
      categoria: "",
      medida: "",
      almacen: "",
      estatus: "",
    });
    setPaginaActual(1);
  };

  const generarCatalogoPDF = async () => {
    if (inventarioFiltrado.length === 0)
      return Swal.fire("Atención", "No hay productos en la lista.", "warning");
    Swal.fire({
      title: "Generando catálogo...",
      text: "Procesando códigos QR...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = doc.internal.pageSize.getWidth();
      const convertirImagenABase64 = (url) => {
        return new Promise((resolve) => {
          if (!url) return resolve(null);
          const img = new Image();
          img.crossOrigin = "Anonymous";
          img.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = img.width;
              canvas.height = img.height;
              canvas.getContext("2d").drawImage(img, 0, 0);
              resolve(canvas.toDataURL("image/jpeg"));
            } catch (err) {
              resolve(null);
            }
          };
          img.onerror = () => resolve(null);
          img.src = url;
        });
      };
      const imagenesQR = await Promise.all(
        inventarioFiltrado.map((p) => convertirImagenABase64(p.qr_url)),
      );
      const columnas = 4;
      const filas = 2;
      const itemsPorPagina = columnas * filas;
      const cardWidth = 65;
      const cardHeight = 85;
      const marginX = 10;
      const marginY = 20;
      const espacioX = 68;
      const espacioY = 92;

      for (let i = 0; i < inventarioFiltrado.length; i++) {
        const producto = inventarioFiltrado[i];
        if (i % itemsPorPagina === 0) {
          if (i > 0) doc.addPage();
          doc.setFont("helvetica", "bold");
          doc.setFontSize(18);
          doc.text("CATÁLOGO DE INVENTARIO - MILAS", pageWidth / 2, 12, {
            align: "center",
          });
          doc.setFontSize(9);
          doc.setTextColor(120);
          doc.text(
            `Total de productos: ${inventarioFiltrado.length}`,
            pageWidth / 2,
            18,
            { align: "center" },
          );
          doc.setTextColor(0);
        }
        const indexPagina = i % itemsPorPagina;
        const col = indexPagina % columnas;
        const row = Math.floor(indexPagina / columnas);
        const x = marginX + col * espacioX;
        const y = marginY + row * espacioY;

        doc.setDrawColor(220);
        doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(
          doc.splitTextToSize(
            producto.descripcion || "Sin descripción",
            cardWidth - 6,
          ),
          x + 3,
          y + 6,
        );
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`Modelo: ${producto.modelo || "N/A"}`, x + 3, y + 18);
        doc.text(`Marca: ${producto.marca?.nombre || "N/A"}`, x + 3, y + 23);
        doc.text(`Cantidad: ${producto.cantidad}`, x + 3, y + 28);
        const qrBase64 = imagenesQR[i];
        if (qrBase64) {
          try {
            doc.addImage(qrBase64, "JPEG", x + 12, y + 33, 40, 40);
          } catch (err) {
            doc.setFontSize(7);
            doc.text("QR no disponible", x + 18, y + 55);
          }
        } else {
          doc.setFontSize(7);
          doc.text("QR no disponible", x + 18, y + 55);
        }
        doc.setFontSize(7);
        doc.setTextColor(120);
        doc.text(`ID: ${producto.id}`, x + 3, y + 80);
        doc.setTextColor(0);
      }
      doc.save("Catalogo_MILAS.pdf");
      Swal.close();
      Swal.fire(
        "¡Listo!",
        "El catálogo PDF se generó correctamente.",
        "success",
      );
    } catch (error) {
      Swal.close();
      Swal.fire("Error", "Hubo un fallo generando el PDF.", "error");
    }
  };

  // 🟢 LÓGICA DE FILTRADO COMPUESTO
  const inventarioFiltrado = inventario.filter((p) => {
    const matchBusqueda =
      p.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.modelo?.toLowerCase().includes(busqueda.toLowerCase());
    const matchMarca = filtros.marca ? p.id_marca == filtros.marca : true;
    const matchCategoria = filtros.categoria
      ? p.id_categoria == filtros.categoria
      : true;
    const matchMedida = filtros.medida ? p.id_medida == filtros.medida : true;
    const matchAlmacen = filtros.almacen
      ? p.id_almacen == filtros.almacen
      : true;

    let matchEstatus = true;
    if (filtros.estatus === "comprar")
      matchEstatus = Number(p.cantidad) <= Number(p.stock_minimo);
    if (filtros.estatus === "suficiente")
      matchEstatus = Number(p.cantidad) > Number(p.stock_minimo);

    return (
      matchBusqueda &&
      matchMarca &&
      matchCategoria &&
      matchMedida &&
      matchAlmacen &&
      matchEstatus
    );
  });

  const totalPaginas =
    Math.ceil(inventarioFiltrado.length / itemsPorPagina) || 1;
  const inventarioPaginado = inventarioFiltrado.slice(
    (paginaActual - 1) * itemsPorPagina,
    paginaActual * itemsPorPagina,
  );
  const valorTotalInventario = inventarioFiltrado.reduce(
    (acc, p) => acc + Number(p.cantidad) * Number(p.precio_unitario),
    0,
  );

  return (
    <div className="max-w-[90rem] mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Package className="text-blue-700" /> Control de Inventario
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Gestión, existencias y valoración.
          </p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-4 w-full xl:w-auto shadow-sm">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <DollarSign size={24} strokeWidth={3} />
          </div>
          <div>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
              Valor Filtrado
            </p>
            <p className="text-2xl font-black text-emerald-900 leading-none">
              $
              {valorTotalInventario.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>

        <div className="flex gap-2 w-full xl:w-auto shrink-0 flex-wrap">
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
            <ScanLine size={16} /> Escanear
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
        setBusqueda={(val) => {
          setBusqueda(val);
          setPaginaActual(1);
        }}
        filtros={filtros}
        setFiltros={(val) => {
          setFiltros(val);
          setPaginaActual(1);
        }}
        catalogos={catalogos}
        limpiarFiltros={limpiarFiltros}
      />

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[60vh]">
        <div className="overflow-x-auto flex-1">
          {/* 🟢 TABLA DE 8 COLUMNAS CON ENLACE SEPARADO */}
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="p-4">Producto</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Proveedor</th>
                <th className="p-4 text-center">Enlace</th>
                <th className="p-4">Ubicación</th>
                <th className="p-4 text-center">Cant.</th>
                <th className="p-4 text-center">Estatus</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargando ? (
                <tr>
                  <td
                    colSpan="8"
                    className="p-12 text-center text-slate-400 font-bold animate-pulse"
                  >
                    Cargando almacén...
                  </td>
                </tr>
              ) : (
                inventarioPaginado.map((p) => {
                  const solicitar =
                    Number(p.cantidad) <= Number(p.stock_minimo);
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-4">
                        <div className="font-bold text-slate-800 flex items-center gap-3">
                          {p.qr_url ? (
                            <div
                              onClick={() => {
                                setProductoScanner(p);
                                setIsModalAjusteOpen(true);
                              }}
                              className="group relative cursor-pointer shrink-0"
                            >
                              <img
                                src={p.qr_url}
                                alt="QR"
                                className="w-12 h-12 border border-slate-200 rounded-xl shadow-sm object-contain bg-white group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-blue-900/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>
                          ) : (
                            <div className="w-12 h-12 bg-slate-100 flex items-center justify-center rounded-xl border border-slate-200 shrink-0">
                              <QrCode className="text-slate-300" size={16} />
                            </div>
                          )}
                          <div>
                            <p className="whitespace-normal min-w-[180px] max-w-[250px] leading-tight mb-1">
                              {p.descripcion}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {p.medida_cat?.nombre && (
                                <span className="bg-slate-800 text-white px-1.5 py-0.5 rounded text-[9px] uppercase tracking-widest font-black">
                                  {p.medida_cat.nombre}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-500">
                                Mod: {p.modelo || "N/A"} • {p.marca?.nombre}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        {p.categoria ? (
                          <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-widest font-bold">
                            {p.categoria.nombre}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                            Sin asignar
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        {p.proveedor ? (
                          <span
                            className="font-bold text-slate-700 text-xs truncate max-w-[120px] block"
                            title={p.proveedor.nombre}
                          >
                            {p.proveedor.nombre}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                            Sin asignar
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        {p.proveedor?.enlace ? (
                          <a
                            href={p.proveedor.enlace}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center bg-blue-50 text-blue-600 p-2 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                            title="Abrir enlace del proveedor"
                          >
                            <LinkIcon size={16} />
                          </a>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                            Sin Link
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <p className="font-bold text-slate-700 text-xs">
                          {p.almacen?.nombre}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          Fila: {p.fila || "N/A"}
                        </p>
                      </td>

                      <td className="p-4 text-center">
                        <span
                          className={`text-base font-black ${
                            solicitar ? "text-red-600" : "text-blue-700"
                          }`}
                        >
                          {p.cantidad}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        {solicitar ? (
                          <span className="inline-flex items-center justify-center gap-1 text-[9px] font-black px-2 py-1 bg-red-100 text-red-700 rounded uppercase tracking-widest">
                            <AlertTriangle size={10} /> Comprar
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center gap-1 text-[9px] font-black px-2 py-1 bg-emerald-100 text-emerald-700 rounded uppercase tracking-widest">
                            <CheckCircle size={10} /> Suficiente
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <button
                          onClick={() => {
                            setProductoToEdit(p);
                            setIsModalAddOpen(true);
                          }}
                          className="p-2 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors font-bold text-[10px] uppercase flex items-center gap-1 mx-auto"
                        >
                          <Edit2 size={14} /> Editar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
              {inventarioPaginado.length === 0 && !cargando && (
                <tr>
                  <td
                    colSpan="8"
                    className="p-12 text-center text-slate-400 font-bold"
                  >
                    No se encontraron productos con estos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!cargando && inventarioFiltrado.length > itemsPorPagina && (
          <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center shrink-0">
            <button
              onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
              disabled={paginaActual === 1}
              className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 font-bold text-xs hover:bg-slate-100 disabled:opacity-40 transition-colors flex items-center gap-1"
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
              Página {paginaActual} de {totalPaginas}
            </span>
            <button
              onClick={() =>
                setPaginaActual((p) => Math.min(totalPaginas, p + 1))
              }
              disabled={paginaActual === totalPaginas}
              className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 font-bold text-xs hover:bg-slate-100 disabled:opacity-40 transition-colors flex items-center gap-1"
            >
              Siguiente <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {isModalScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 relative overflow-hidden">
            <button
              onClick={() => setIsModalScannerOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-red-500 z-[100] bg-white rounded-full transition-colors"
            >
              <X size={24} />
            </button>
            <div className="text-center mb-4 pt-2">
              <h3 className="font-black text-slate-800 text-lg">
                Escáner de Inventario
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Da permiso a la cámara y apunta al código QR.
              </p>
            </div>
            <LectorQR
              onScanExitoso={(idScaneado) => {
                setIsModalScannerOpen(false);
                buscarYAbrirAjuste(idScaneado);
              }}
            />
          </div>
        </div>
      )}

      <ModalAjusteStock
        isOpen={isModalAjusteOpen}
        onClose={() => setIsModalAjusteOpen(false)}
        producto={productoScanner}
        onActualizado={cargarInventario}
      />

      <ModalFormProducto
        isOpen={isModalAddOpen}
        onClose={() => setIsModalAddOpen(false)}
        productoEdicion={productoToEdit}
        catalogos={catalogos}
        onGuardado={cargarInventario}
      />
    </div>
  );
}
