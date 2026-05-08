"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/app/_lib/supabase/supabase";
import Swal from "sweetalert2";
import { jsPDF } from "jspdf";

import {
  FileSpreadsheet,
  Plus,
  Filter,
  Trash2,
  FileText,
  Globe,
  ArrowDownRight,
  ArrowUpRight,
  Edit2,
} from "lucide-react";

import ModalMovimiento from "@/app/_components/ModalMovimiento";

const NOMBRES_MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export default function MovimientosPage() {
  const [movimientos, setMovimientos] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [movimientoToEdit, setMovimientoToEdit] = useState(null);

  const fechaActual = new Date();

  const [filtros, setFiltros] = useState({
    mes: (fechaActual.getMonth() + 1).toString(),
    anio: fechaActual.getFullYear().toString(),
    origen: "todos",
  });

  const fetchDatos = async () => {
    try {
      setCargando(true);

      const [inventarioRes, movimientosRes] = await Promise.all([
        supabase
          .from("inventario")
          .select("id, descripcion, modelo, cantidad")
          .order("descripcion"),

        supabase
          .from("movimientos_inventario")
          .select("*, producto:inventario(descripcion, modelo)")
          .order("fecha", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

      if (inventarioRes.data) setInventario(inventarioRes.data);

      if (movimientosRes.data) setMovimientos(movimientosRes.data);
    } catch (error) {
      console.error(error);

      Swal.fire("Error", "No se pudieron cargar los movimientos.", "error");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchDatos();
  }, []);

  const cargarDatos = async () => {
    await fetchDatos();
  };

  const eliminarMovimiento = async (id) => {
    const confirm = await Swal.fire({
      title: "¿Borrar este registro?",
      text: "Esto solo borrará el registro de auditoría, NO afectará tu inventario real.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Sí, borrar",
    });

    if (confirm.isConfirmed) {
      try {
        await supabase.from("movimientos_inventario").delete().eq("id", id);

        await cargarDatos();

        Swal.fire({
          icon: "success",
          title: "Borrado",
          toast: true,
          position: "top-end",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error(error);

        Swal.fire("Error", "No se pudo eliminar.", "error");
      }
    }
  };

  const movimientosFiltrados = movimientos.filter((m) => {
    if (!m.fecha) return false;

    const [anioMov, mesMov] = m.fecha.split("-");

    const matchMes = parseInt(mesMov).toString() === filtros.mes;

    const matchAnio = anioMov === filtros.anio;

    let matchOrigen = true;

    if (filtros.origen === "nacional") {
      matchOrigen = m.es_importacion === false;
    }

    if (filtros.origen === "importacion") {
      matchOrigen = m.es_importacion === true;
    }

    return matchMes && matchAnio && matchOrigen;
  });

  const totalSubtotal = movimientosFiltrados.reduce(
    (acc, m) => acc + Number(m.subtotal || 0),
    0,
  );

  const totalIVA = movimientosFiltrados.reduce(
    (acc, m) => acc + Number(m.iva || 0),
    0,
  );

  const totalGeneral = movimientosFiltrados.reduce(
    (acc, m) => acc + Number(m.total || 0),
    0,
  );

  const generarReportePDF = () => {
    if (movimientosFiltrados.length === 0) {
      return Swal.fire(
        "Atención",
        "No hay registros para exportar.",
        "warning",
      );
    }

    const doc = new jsPDF({
      orientation: "landscape",
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    const nombreMesActual = NOMBRES_MESES[parseInt(filtros.mes) - 1];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);

    doc.text("REPORTE DE ENTRADAS Y SALIDAS - MILAS", pageWidth / 2, 15, {
      align: "center",
    });

    doc.setFontSize(10);

    doc.text(
      `Periodo: ${nombreMesActual} del ${filtros.anio} | Origen: ${filtros.origen.toUpperCase()}`,
      pageWidth / 2,
      22,
      {
        align: "center",
      },
    );

    let y = 35;

    // =========================
    // HEADER TABLA PDF
    // =========================

    doc.setFillColor(240, 244, 248);

    doc.rect(10, y - 5, pageWidth - 20, 8, "F");

    doc.setFontSize(8);

    doc.text("FECHA", 12, y);
    doc.text("TIPO", 33, y);
    doc.text("PRODUCTO", 52, y);
    doc.text("CANT", 145, y);
    doc.text("SUBTOTAL", 163, y);
    doc.text("IVA", 192, y);
    doc.text("TOTAL", 215, y);
    doc.text("PEDIMENTO", 245, y);

    y += 8;

    doc.setFont("helvetica", "normal");

    movimientosFiltrados.forEach((m) => {
      if (y > 190) {
        doc.addPage();
        y = 20;
      }

      doc.text(m.fecha || "N/A", 12, y);

      doc.text((m.tipo || "").toUpperCase(), 33, y);

      // 🔥 MÁS REDUCIDO PARA QUE QUEPA PEDIMENTO
      const desc = doc.splitTextToSize(m.producto?.descripcion || "N/A", 75);

      doc.text(desc, 52, y);

      doc.text(String(m.cantidad || 0), 145, y);

      doc.text(`$${Number(m.subtotal || 0).toFixed(2)}`, 163, y);

      doc.text(`$${Number(m.iva || 0).toFixed(2)}`, 192, y);

      doc.text(`$${Number(m.total || 0).toFixed(2)}`, 215, y);

      // 🔥 AHORA YA CABE PERFECTO EL PEDIMENTO DE 15 CARACTERES
      doc.text(String(m.numero_pedimento || "N/A"), 245, y);

      y += desc.length * 4 + 4;

      doc.setDrawColor(200);

      doc.line(10, y - 3, pageWidth - 10, y - 3);
    });

    // =========================
    // TOTALES
    // =========================

    y += 6;

    doc.setFont("helvetica", "bold");

    doc.text("TOTALES DEL PERIODO:", 120, y);

    doc.text(
      `$${totalSubtotal.toLocaleString("en-US", {
        minimumFractionDigits: 2,
      })}`,
      163,
      y,
    );

    doc.text(
      `$${totalIVA.toLocaleString("en-US", {
        minimumFractionDigits: 2,
      })}`,
      192,
      y,
    );

    doc.text(
      `$${totalGeneral.toLocaleString("en-US", {
        minimumFractionDigits: 2,
      })}`,
      215,
      y,
    );

    doc.save(`Auditoria_MILAS_${filtros.anio}_${nombreMesActual}.pdf`);
  };

  return (
    <div className="max-w-[90rem] mx-auto space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="text-blue-700" />
            Historial de Movimientos
          </h1>

          <p className="text-sm text-slate-500 mt-1 font-medium">
            Auditoría financiera y control de entradas/salidas.
          </p>
        </div>

        <div className="flex gap-2 w-full xl:w-auto shrink-0 flex-wrap">
          <button
            onClick={generarReportePDF}
            className="flex-1 xl:flex-none bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors shadow-sm"
          >
            <FileText size={16} />
            Reporte PDF
          </button>

          <button
            onClick={() => {
              setMovimientoToEdit(null);
              setIsModalOpen(true);
            }}
            className="flex-1 xl:flex-none bg-blue-700 text-white px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-800 transition-colors shadow-md active:scale-95"
          >
            <Plus size={16} />
            Registrar Movimiento
          </button>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-widest mr-2">
            <Filter size={16} />
            Ver:
          </div>

          <select
            value={filtros.mes}
            onChange={(e) =>
              setFiltros({
                ...filtros,
                mes: e.target.value,
              })
            }
            className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-600"
          >
            {NOMBRES_MESES.map((nombre, i) => (
              <option key={i} value={(i + 1).toString()}>
                {nombre}
              </option>
            ))}
          </select>

          <select
            value={filtros.anio}
            onChange={(e) =>
              setFiltros({
                ...filtros,
                anio: e.target.value,
              })
            }
            className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-600"
          >
            {[2024, 2025, 2026, 2027].map((a) => (
              <option key={a} value={a.toString()}>
                {a}
              </option>
            ))}
          </select>

          <select
            value={filtros.origen}
            onChange={(e) =>
              setFiltros({
                ...filtros,
                origen: e.target.value,
              })
            }
            className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-600"
          >
            <option value="todos">Nacional e Importación</option>

            <option value="nacional">Solo Nacional</option>

            <option value="importacion">Solo Importación</option>
          </select>
        </div>

        <div className="flex gap-6 w-full md:w-auto justify-between md:justify-end text-right">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              IVA del Mes
            </p>

            <p className="text-lg font-black text-red-400">
              $
              {totalIVA.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
              Total del Mes
            </p>

            <p className="text-2xl font-black text-emerald-800 leading-none">
              $
              {totalGeneral.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="p-4">Fecha</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Producto</th>
                <th className="p-4 text-center">Cant.</th>
                <th className="p-4 text-right">Finanzas</th>
                <th className="p-4 text-center">Origen</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {cargando ? (
                <tr>
                  <td
                    colSpan="7"
                    className="p-12 text-center text-slate-400 font-bold animate-pulse"
                  >
                    Cargando registros...
                  </td>
                </tr>
              ) : movimientosFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="p-12 text-center text-slate-400 font-bold"
                  >
                    No hay registros en este periodo.
                  </td>
                </tr>
              ) : (
                movimientosFiltrados.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="p-4 font-bold text-slate-700 text-xs">
                      {m.fecha}
                    </td>

                    <td className="p-4">
                      {m.tipo === "entrada" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 bg-emerald-100 text-emerald-700 rounded uppercase tracking-widest">
                          <ArrowDownRight size={12} />
                          Entrada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 bg-orange-100 text-orange-700 rounded uppercase tracking-widest">
                          <ArrowUpRight size={12} />
                          Salida
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      <p className="font-bold text-slate-800 whitespace-normal min-w-[200px] leading-tight">
                        {m.producto?.descripcion}
                      </p>

                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Mod: {m.producto?.modelo || "N/A"}
                      </p>
                    </td>

                    <td className="p-4 text-center font-black text-blue-700 text-base">
                      {m.cantidad}
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-slate-400">
                          Sub: $
                          {Number(m.subtotal).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </span>

                        <span className="text-xs font-black text-emerald-700">
                          Tot: $
                          {Number(m.total).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </td>

                    <td className="p-4 text-center">
                      {m.es_importacion ? (
                        <div className="flex flex-col items-center gap-1">
                          <Globe size={16} className="text-indigo-600" />

                          <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {m.numero_pedimento}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Nacional
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-center">
                      <button
                        onClick={() => {
                          setMovimientoToEdit(m);
                          setIsModalOpen(true);
                        }}
                        className="p-2 mr-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>

                      <button
                        onClick={() => eliminarMovimiento(m.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ModalMovimiento
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGuardado={cargarDatos}
        inventario={inventario}
        movimientoEdicion={movimientoToEdit}
      />
    </div>
  );
}
