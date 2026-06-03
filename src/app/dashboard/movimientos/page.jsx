"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/app/_lib/supabase/supabase";
import Swal from "sweetalert2";
import { jsPDF } from "jspdf";
import {
  FileText,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  Package,
  ArrowDownRight,
  ArrowUpRight,
  Globe,
  MapPin,
  Calculator,
  Calendar,
  Percent,
} from "lucide-react";

import ModalMovimiento from "@/app/_components/ModalMovimiento";

export default function MovimientosPage() {
  const [movimientos, setMovimientos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);

  // 🟢 ESTADOS DE FILTROS
  const [filtroTipo, setFiltroTipo] = useState("todas"); // 'todas', 'nacional', 'importacion'
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth() + 1);
  const [anioFiltro, setAnioFiltro] = useState(new Date().getFullYear());
// 🟢 NUEVO: Estado para filtrar entradas o salidas
  const [filtroOperacion, setFiltroOperacion] = useState("ambos");
  const [expandedRows, setExpandedRows] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [movimientoAEditar, setMovimientoAEditar] = useState(null);

  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 15;

  const meses = [
    { v: 1, n: "Enero" },
    { v: 2, n: "Febrero" },
    { v: 3, n: "Marzo" },
    { v: 4, n: "Abril" },
    { v: 5, n: "Mayo" },
    { v: 6, n: "Junio" },
    { v: 7, n: "Julio" },
    { v: 8, n: "Agosto" },
    { v: 9, n: "Septiembre" },
    { v: 10, n: "Octubre" },
    { v: 11, n: "Noviembre" },
    { v: 12, n: "Diciembre" },
  ];

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      // 1. Cargar catálogo de productos completo para la Súper-Línea
      const { data: prods } = await supabase
        .from("inventario")
        .select(
          `
          id, descripcion, modelo, cantidad, precio_unitario, es_kit,
          medida_cat:inventario_medidas(nombre),
          marca:inventario_marcas(nombre),
          proveedor:inventario_proveedores(nombre),
          condicion:inventario_condiciones(nombre) 
        `,
        )
        .order("descripcion");
      setProductos(prods || []);

      // 2. Cargar Movimientos Maestros con sus Detalles
      const { data: movs, error } = await supabase
        .from("movimientos_cabecera")
        .select(
          `
          *,
          movimientos_detalles (
            id, cantidad, precio_unitario, subtotal, id_producto,
            inventario ( descripcion, modelo )
          )
        `,
        )
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMovimientos(movs || []);
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "No se pudieron cargar los movimientos.", "error");
    } finally {
      setCargando(false);
    }
  };

  // 🟢 MANEJO DE ACORDEÓN (EXPANDIR FILAS)
  const toggleRow = (id) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  };

  // 🟢 BORRADO SEGURO CON MATEMÁTICA INVERS
  const eliminarMovimiento = async (mov) => {
    const confirm = await Swal.fire({
      title: "¿Eliminar Factura?",
      text: "Esto revertirá el stock de todos los productos involucrados en esta operación.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Sí, revertir y borrar",
    });

    if (confirm.isConfirmed) {
      setCargando(true);
      try {
        // Revertir inventario
        for (let det of mov.movimientos_detalles) {
          const { data: prod } = await supabase
            .from("inventario")
            .select("cantidad")
            .eq("id", det.id_producto)
            .single();
          const revertAmount =
            mov.tipo === "entrada"
              ? -Number(det.cantidad)
              : Number(det.cantidad);
          await supabase
            .from("inventario")
            .update({ cantidad: Number(prod.cantidad) + revertAmount })
            .eq("id", det.id_producto);
        }

        // Borrar cabecera
        await supabase.from("movimientos_cabecera").delete().eq("id", mov.id);

        Swal.fire({
          icon: "success",
          title: "Eliminado",
          toast: true,
          position: "top-end",
          timer: 2500,
          showConfirmButton: false,
        });
        cargarDatos();
      } catch (error) {
        Swal.fire("Error", "Fallo al eliminar: " + error.message, "error");
      } finally {
        setCargando(false);
      }
    }
  };

  // 🟢 GENERACIÓN DE REPORTES PDF
  const generarPDF = () => {
    if (movimientosFiltrados.length === 0)
      return Swal.fire("Atención", "No hay datos para imprimir.", "warning");

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 15;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(
      `REPORTE DE OPERACIONES - ${meses.find((m) => m.v === Number(mesFiltro))?.n} ${anioFiltro}`,
      pageWidth / 2,
      currentY,
      { align: "center" },
    );
    currentY += 10;

    const printSection = (titulo, data) => {
      if (data.length === 0) return;
      if (currentY > 260) {
        doc.addPage();
        currentY = 15;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(29, 78, 216);
      doc.text(titulo, 14, currentY);
      currentY += 6;
      doc.setTextColor(0, 0, 0);

      data.forEach((mov) => {
        if (currentY > 270) {
          doc.addPage();
          currentY = 15;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        const tipoLabel = mov.tipo.toUpperCase();
        const infoExtra = mov.es_importacion
          ? ` | Pedimento: ${mov.numero_pedimento} | Gastos: ${mov.porcentaje_importacion}% | TC: $${mov.tipo_cambio}`
          : ` | Nacional`;
        doc.text(`${mov.fecha} - ${tipoLabel}${infoExtra}`, 14, currentY);

        doc.setFont("helvetica", "normal");
        const totalTxt = mov.es_importacion
          ? `Total: $${mov.total_usd.toFixed(2)} USD / $${mov.total_mxn.toFixed(2)} MXN`
          : `Total: $${mov.total_mxn.toFixed(2)} MXN`;
        doc.text(totalTxt, pageWidth - 14, currentY, { align: "right" });
        currentY += 5;

        doc.setFontSize(8);
        doc.setTextColor(100);
        mov.movimientos_detalles.forEach((det) => {
          if (currentY > 280) {
            doc.addPage();
            currentY = 15;
          }
          const desc = `${det.cantidad}x ${det.inventario?.descripcion} (Mod: ${det.inventario?.modelo || "N/A"}) - $${det.precio_unitario} c/u`;
          doc.text(`   • ${desc}`, 14, currentY);
          currentY += 4;
        });

        doc.setDrawColor(220);
        doc.line(14, currentY, pageWidth - 14, currentY);
        currentY += 6;
        doc.setTextColor(0);
      });
      currentY += 5;
    };

    if (filtroTipo === "todas" || filtroTipo === "importacion") {
      const imports = movimientosFiltrados.filter((m) => m.es_importacion);
      printSection("EQUIPOS DE IMPORTACIÓN", imports);
    }

    if (filtroTipo === "todas" || filtroTipo === "nacional") {
      const nacionales = movimientosFiltrados.filter((m) => !m.es_importacion);
      printSection("EQUIPOS NACIONALES", nacionales);
    }

    doc.save(`Movimientos_MILAS_${anioFiltro}_${mesFiltro}.pdf`);
  };

  // 🟢 FILTRADO DE TABLA (Por Mes, Año y Tipo)
 // 🟢 FILTRADO DE TABLA (Por Mes, Año y Tipo)
  const movimientosFiltrados = movimientos.filter((m) => {
    const fechaMov = new Date(m.fecha + "T00:00:00");
    const coincideMes = fechaMov.getMonth() + 1 === Number(mesFiltro);
    const coincideAnio = fechaMov.getFullYear() === Number(anioFiltro);

    let coincideTipo = true;
    if (filtroTipo === "nacional") coincideTipo = !m.es_importacion;
    if (filtroTipo === "importacion") coincideTipo = m.es_importacion;

    // 🟢 NUEVO: Lógica para validar si es entrada o salida
    let coincideOperacion = true;
    if (filtroOperacion !== "ambos") coincideOperacion = m.tipo === filtroOperacion;

    return coincideMes && coincideAnio && coincideTipo && coincideOperacion;
  });
  // 🟢 CÁLCULO DE RECUADROS FINANCIEROS EN TIEMPO REAL
  const totalEntradas = movimientosFiltrados
    .filter((m) => m.tipo === "entrada")
    .reduce((acc, m) => acc + Number(m.total_mxn || 0), 0);

  const totalSalidas = movimientosFiltrados
    .filter((m) => m.tipo === "salida")
    .reduce((acc, m) => acc + Number(m.total_mxn || 0), 0);

  const totalImpuestosGastos = movimientosFiltrados
    .filter((m) => m.tipo === "entrada")
    .reduce((acc, m) => {
      if (m.es_importacion) {
        // Gastos de Importación en MXN = Total Factura MXN - Costo Material en MXN
        const costoMaterialMXN = Number(m.subtotal_original || 0) * Number(m.tipo_cambio || 1);
        const gastosMXN = Number(m.total_mxn || 0) - costoMaterialMXN;
        return acc + gastosMXN;
      } else {
        // IVA de Compras Nacionales
        return acc + Number(m.iva || 0);
      }
    }, 0);

  const totalPaginas = Math.ceil(movimientosFiltrados.length / itemsPorPagina) || 1;
  const movsPaginados = movimientosFiltrados.slice(
    (paginaActual - 1) * itemsPorPagina,
    paginaActual * itemsPorPagina,
  );

  return (
    <div className="max-w-[90rem] mx-auto space-y-6 pb-12">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Calculator className="text-blue-700" /> Historial de Operaciones
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Gestión de entradas, salidas y facturación multilínea.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto shrink-0 flex-wrap">
          <button
            onClick={generarPDF}
            className=" sm:flex-none bg-slate-100 text-slate-700 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors shadow-sm"
          >
            <FileText size={16} /> PDF
          </button>
          <button
            onClick={() => {
              setMovimientoAEditar(null);
              setIsModalOpen(true);
            }}
            className=" sm:flex-none bg-blue-700 text-white px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-800 transition-colors shadow-md active:scale-95"
          >
            <Plus size={16} /> Nueva Operación
          </button>
        </div>
      </div>

      {/* CONTROLES DE FILTRO */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex overflow-x-auto scrollbar-hide">
          <button
            onClick={() => {
              setFiltroTipo("todas");
              setPaginaActual(1);
            }}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all whitespace-nowrap ${filtroTipo === "todas" ? "bg-slate-800 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"}`}
          >
            Todos
          </button>
          <button
            onClick={() => {
              setFiltroTipo("nacional");
              setPaginaActual(1);
            }}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${filtroTipo === "nacional" ? "bg-emerald-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"}`}
          >
            <MapPin size={14} /> Nacionales
          </button>
          <button
            onClick={() => {
              setFiltroTipo("importacion");
              setPaginaActual(1);
            }}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${filtroTipo === "importacion" ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"}`}
          >
            <Globe size={14} /> Importaciones
          </button>
        </div>

      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex gap-2 overflow-x-auto">
          
          {/* 🟢 NUEVO SELECTOR DE ENTRADA / SALIDA */}
          <select
            value={filtroOperacion}
            onChange={(e) => {
              setFiltroOperacion(e.target.value);
              setPaginaActual(1);
            }}
            className="flex-1 bg-slate-800  border-none rounded-xl text-xs font-white uppercase tracking-widest p-2.5 outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer min-w-max"
          >
            <option value="ambos">Entradas y Salidas</option>
            <option value="entrada">Solo Entradas</option>
            <option value="salida">Solo Salidas</option>
          </select>

          {/* SELECTOR DE MES */}
          <select
            value={mesFiltro}
            onChange={(e) => {
              setMesFiltro(e.target.value);
              setPaginaActual(1);
            }}
            className="flex-1 bg-slate-800 border-none rounded-xl text-xs font-slate-800 uppercase tracking-widest p-2.5 outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
          >
            {meses.map((m) => (
              <option key={m.v} value={m.v}>
                {m.n}
              </option>
            ))}
          </select>
          
          {/* INPUT DE AÑO */}
          <input
            type="number"
            value={anioFiltro}
            onChange={(e) => {
              setAnioFiltro(e.target.value);
              setPaginaActual(1);
            }}
            className="w-24 bg-slate-800 border-none rounded-xl text-xs font-slate-800 uppercase tracking-widest p-2.5 outline-none focus:ring-2 focus:ring-blue-600 text-center"
          />
        </div>
      </div>

      {/* 🟢 RECUADROS FINANCIEROS DINÁMICOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ENTRADAS */}
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <ArrowDownRight size={24} strokeWidth={3} />
          </div>
          <div>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Entradas</p>
            <p className="text-2xl font-black text-emerald-900 leading-none mt-1">
              $ {totalEntradas.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* SALIDAS */}
        <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
            <ArrowUpRight size={24} strokeWidth={3} />
          </div>
          <div>
            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Total Salidas</p>
            <p className="text-2xl font-black text-orange-900 leading-none mt-1">
              $ {totalSalidas.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* IMPUESTOS Y GASTOS */}
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shrink-0">
            <Percent size={22} strokeWidth={3} />
          </div>
          <div>
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Impuestos y Gastos</p>
            <p className="text-2xl font-black text-red-900 leading-none mt-1">
              $ {totalImpuestosGastos.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* TABLA PRINCIPAL EXPANDIBLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[60vh]">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="p-4 w-10 text-center">Detalle</th>
                <th className="p-4">Fecha / Tipo</th>
                <th className="p-4">Origen</th>
                <th className="p-4">Artículos</th>
                <th className="p-4 text-right">Totales (MXN)</th>
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
                    Cargando operaciones...
                  </td>
                </tr>
              ) : (
                movsPaginados.map((mov) => {
                  const isExpanded = expandedRows.includes(mov.id);
                  const isEntrada = mov.tipo === "entrada";
                  return (
                    <React.Fragment key={mov.id}>
                      {/* FILA CABECERA */}
                      <tr
                        className={`transition-colors hover:bg-slate-50 ${isExpanded ? "bg-blue-50/30" : ""}`}
                      >
                        <td className="p-4 text-center">
                          <button
                            onClick={() => toggleRow(mov.id)}
                            className="p-1.5 bg-slate-100 text-slate-500 rounded hover:bg-blue-100 hover:text-blue-700 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )}
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg ${isEntrada ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"}`}
                            >
                              {isEntrada ? (
                                <ArrowDownRight size={18} />
                              ) : (
                                <ArrowUpRight size={18} />
                              )}
                            </div>
                            <div>
                              <p className="font-black text-slate-800 uppercase tracking-widest text-xs">
                                {mov.tipo}
                              </p>
                              <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1 mt-0.5">
                                <Calendar size={10} /> {mov.fecha}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          {mov.es_importacion ? (
                            <div>
                              <span className="bg-blue-100 text-blue-800 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest flex items-center gap-1 w-fit">
                                <Globe size={10} /> Importación
                              </span>
                              <p className="text-[10px] font-bold text-slate-500 mt-1">
                                Pedimento:{" "}
                                <span className="text-slate-800">
                                  {mov.numero_pedimento}
                                </span>
                              </p>
                            </div>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest flex items-center gap-1 w-fit">
                              <MapPin size={10} /> Nacional
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-black px-2 py-1 rounded-full">
                            {mov.movimientos_detalles?.length || 0} Partidas
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <p className="text-lg font-black text-slate-800">
                            $
                            {mov.total_mxn.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                            })}
                          </p>
                          {mov.es_importacion && (
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                              USD $
                              {mov.total_usd.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                              })}{" "}
                              • TC: ${mov.tipo_cambio}
                            </p>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setMovimientoAEditar(mov);
                                setIsModalOpen(true);
                              }}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => eliminarMovimiento(mov)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* FILA DETALLES (EXPANDIBLE) */}
                      {isExpanded && (
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <td colSpan="6" className="p-0">
                            <div className="p-6 pl-16 animate-in fade-in slide-in-from-top-2">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-2">
                                Desglose de Partidas (
                                {mov.movimientos_detalles?.length || 0})
                              </h4>
                              <div className="space-y-2">
                                {mov.movimientos_detalles?.map((det, idx) => (
                                  <div
                                    key={idx}
                                    className="flex justify-between items-center bg-white border border-slate-200 p-3 rounded-xl shadow-sm"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-slate-400 font-black text-xs shrink-0">
                                        x{det.cantidad}
                                      </div>
                                      <div>
                                        <p className="text-sm font-bold text-slate-800">
                                          {det.inventario?.descripcion}
                                        </p>
                                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                                          Mod: {det.inventario?.modelo || "N/A"}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-xs font-black text-slate-700">
                                        $
                                        {det.subtotal.toLocaleString("en-US", {
                                          minimumFractionDigits: 2,
                                        })}{" "}
                                        {mov.es_importacion ? "USD" : "MXN"}
                                      </p>
                                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                        $ {det.precio_unitario} c/u
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
              {movimientosFiltrados.length === 0 && !cargando && (
                <tr>
                  <td
                    colSpan="6"
                    className="p-12 text-center text-slate-400 font-bold"
                  >
                    No se encontraron operaciones con estos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE OPERACIONES */}
      <ModalMovimiento
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        movimientoAEditar={movimientoAEditar}
        productos={productos}
        onGuardado={cargarDatos}
      />
    </div>
  );
}