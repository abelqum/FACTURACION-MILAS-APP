"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/app/_lib/supabase/supabase";
import Swal from "sweetalert2";
import jsPDF from "jspdf"; // 🟢 LIBRERÍA DE PDF
import {
  Search,
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
} from "lucide-react";

import ModalAjusteStock from "@/app/_components/ModalAjusteStock";
import ModalFormProducto from "@/app/_components/ModalFormProducto";
import LectorQR from "@/app/_components/LectorQR";

export default function InventarioPage() {
  const [inventario, setInventario] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 15;

  const [catalogos, setCatalogos] = useState({
    udms: [],
    marcas: [],
    almacenes: [],
    condiciones: [],
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
    setCatalogos({
      udms: udms || [],
      marcas: marcas || [],
      almacenes: almacenes || [],
      condiciones: condiciones || [],
    });
  };

  const cargarInventario = async () => {
    const { data, error } = await supabase
      .from("inventario")
      .select(
        `*, udm:inventario_udm(nombre), marca:inventario_marcas(nombre), almacen:inventario_almacenes(nombre), condicion:inventario_condiciones(nombre)`,
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

  const abrirParaEditar = (producto) => {
    setProductoToEdit(producto);
    setIsModalAddOpen(true);
  };

  const abrirParaCrear = () => {
    setProductoToEdit(null);
    setIsModalAddOpen(true);
  };

  // 🟢 SÚPER FUNCIÓN: GENERAR CATÁLOGO PDF (Formato Grid para imprimir)
  const generarCatalogoPDF = async () => {
    if (inventarioFiltrado.length === 0) {
      return Swal.fire("Atención", "No hay productos en la lista.", "warning");
    }

    Swal.fire({
      title: "Generando catálogo...",
      text: "Procesando códigos QR...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      // PDF HORIZONTAL
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // =========================
      // CONVERTIR URL A BASE64
      // =========================
      const convertirImagenABase64 = (url) => {
        return new Promise((resolve) => {
          if (!url) {
            resolve(null);
            return;
          }

          const img = new Image();

          img.crossOrigin = "Anonymous";

          img.onload = () => {
            try {
              const canvas = document.createElement("canvas");

              const ctx = canvas.getContext("2d");

              canvas.width = img.width;
              canvas.height = img.height;

              ctx.drawImage(img, 0, 0);

              // FORZAMOS JPEG
              const dataURL = canvas.toDataURL("image/jpeg");

              resolve(dataURL);
            } catch (err) {
              console.error("Error convirtiendo imagen:", err);
              resolve(null);
            }
          };

          img.onerror = () => {
            resolve(null);
          };

          img.src = url;
        });
      };

      // =========================
      // PRE-CARGAR TODOS LOS QR
      // =========================
      const imagenesQR = await Promise.all(
        inventarioFiltrado.map((p) => convertirImagenABase64(p.qr_url)),
      );

      // =========================
      // CONFIG GRID
      // =========================
      const columnas = 4;
      const filas = 2;

      const itemsPorPagina = columnas * filas;

      const cardWidth = 65;
      const cardHeight = 85;

      const marginX = 10;
      const marginY = 20;

      const espacioX = 68;
      const espacioY = 92;

      // =========================
      // LOOP PRODUCTOS
      // =========================
      for (let i = 0; i < inventarioFiltrado.length; i++) {
        const producto = inventarioFiltrado[i];

        // NUEVA PÁGINA
        if (i % itemsPorPagina === 0) {
          if (i > 0) {
            doc.addPage();
          }

          // HEADER
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
            {
              align: "center",
            },
          );

          doc.setTextColor(0);
        }

        const indexPagina = i % itemsPorPagina;

        const col = indexPagina % columnas;

        const row = Math.floor(indexPagina / columnas);

        const x = marginX + col * espacioX;

        const y = marginY + row * espacioY;

        // =========================
        // CARD
        // =========================
        doc.setDrawColor(220);

        doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3);

        // =========================
        // DESCRIPCIÓN
        // =========================
        doc.setFont("helvetica", "bold");

        doc.setFontSize(9);

        const texto = doc.splitTextToSize(
          producto.descripcion || "Sin descripción",
          cardWidth - 6,
        );

        doc.text(texto, x + 3, y + 6);

        // =========================
        // INFO
        // =========================
        doc.setFont("helvetica", "normal");

        doc.setFontSize(8);

        doc.text(`Modelo: ${producto.modelo || "N/A"}`, x + 3, y + 18);

        doc.text(`Marca: ${producto.marca?.nombre || "N/A"}`, x + 3, y + 23);

        doc.text(`Cantidad: ${producto.cantidad}`, x + 3, y + 28);

        // =========================
        // QR
        // =========================
        const qrBase64 = imagenesQR[i];

        if (qrBase64) {
          try {
            doc.addImage(qrBase64, "JPEG", x + 12, y + 33, 40, 40);
          } catch (err) {
            console.error("Error agregando QR:", err);

            doc.setFontSize(7);

            doc.text("QR no disponible", x + 18, y + 55);
          }
        } else {
          doc.setFontSize(7);

          doc.text("QR no disponible", x + 18, y + 55);
        }

        // =========================
        // ID
        // =========================
        doc.setFontSize(7);

        doc.setTextColor(120);

        doc.text(`ID: ${producto.id}`, x + 3, y + 80);

        doc.setTextColor(0);
      }

      // =========================
      // GUARDAR
      // =========================
      doc.save("Catalogo_MILAS.pdf");

      Swal.close();

      Swal.fire(
        "¡Listo!",
        "El catálogo PDF se generó correctamente.",
        "success",
      );
    } catch (error) {
      console.error(error);

      Swal.close();

      Swal.fire("Error", "Hubo un fallo generando el PDF.", "error");
    }
  };

  const inventarioFiltrado = inventario.filter(
    (p) =>
      p.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.modelo?.toLowerCase().includes(busqueda.toLowerCase()),
  );

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
              Valor en Almacén
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
            onClick={abrirParaCrear}
            className="flex-1 xl:flex-none bg-blue-700 text-white px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-800 transition-colors shadow-md active:scale-95"
          >
            <Plus size={16} /> Nuevo
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Buscar por descripción o modelo..."
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setPaginaActual(1);
          }}
          className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 shadow-sm"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[60vh]">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="p-4">Producto</th>
                <th className="p-4">Ubicación</th>
                <th className="p-4 text-center">Cant.</th>
                <th className="p-4 text-right">Inversión (Total)</th>
                <th className="p-4 text-center">Estatus</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargando ? (
                <tr>
                  <td
                    colSpan="6"
                    className="p-12 text-center text-slate-400 font-bold animate-pulse"
                  >
                    Cargando almacén...
                  </td>
                </tr>
              ) : (
                inventarioPaginado.map((p) => {
                  const precioTotal =
                    Number(p.cantidad) * Number(p.precio_unitario);
                  const solicitar =
                    Number(p.cantidad) <= Number(p.stock_minimo);

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-4">
                        <div className="font-bold text-slate-800 flex items-center gap-3">
                          {/* 🟢 EVENTO CLIC EN LA IMAGEN */}
                          {p.qr_url ? (
                            <div
                              onClick={() => {
                                setProductoScanner(p);
                                setIsModalAjusteOpen(true);
                              }}
                              className="group relative cursor-pointer"
                            >
                              <img
                                src={p.qr_url}
                                alt="QR"
                                className="w-12 h-12 border border-slate-200 rounded-xl shadow-sm object-contain bg-white group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-blue-900/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>
                          ) : (
                            <div className="w-12 h-12 bg-slate-100 flex items-center justify-center rounded-xl border border-slate-200">
                              <QrCode className="text-slate-300" size={16} />
                            </div>
                          )}
                          <div>
                            <p className="whitespace-normal min-w-[200px]">
                              {p.descripcion}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Mod: {p.modelo || "N/A"} • {p.marca?.nombre} •{" "}
                              {p.udm?.nombre}
                            </p>
                          </div>
                        </div>
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
                          className={`text-base font-black ${solicitar ? "text-red-600" : "text-blue-700"}`}
                        >
                          {p.cantidad}
                        </span>
                      </td>
                      <td className="p-4 text-right font-black text-emerald-700 text-xs">
                        $
                        {precioTotal.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
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
                          onClick={() => abrirParaEditar(p)}
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
                    colSpan="6"
                    className="p-12 text-center text-slate-400 font-bold"
                  >
                    No se encontraron productos.
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
