"use client";
import { useState, useEffect, useMemo } from "react";
import Swal from "sweetalert2";
import { supabase } from "@/app/_lib/supabase/supabase";
import FacturaFormModal from "@/app/_components/FacturaFormModal";
import jsPDF from "jspdf";
// 🟢 CORRECCIÓN: Importamos autoTable como una función independiente
import autoTable from "jspdf-autotable";
import {
  Plus,
  Pencil,
  Trash2,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Receipt,
  Landmark,
  Clock,
  AlertCircle,
  FileDown,
} from "lucide-react";

export default function GestionFacturas() {
  const [facturas, setFacturas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState(null);

  // FILTROS
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCliente, setFilterCliente] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [filterMes, setFilterMes] = useState("");
  const [filterAno, setFilterAno] = useState("");
  const [filtroTipoFecha, setFiltroTipoFecha] = useState("emision");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      const { data: resFacturas, error } = await supabase
        .from("facturas")
        .select(`*, clientes ( razon_social ), estados_factura ( nombre )`)
        .order("fecha", { ascending: false })
        .order("no_factura", { ascending: false });
      const { data: resClientes } = await supabase
        .from("clientes")
        .select("id, razon_social")
        .order("razon_social");
      if (!isMounted) return;
      if (error) {
        Swal.fire("Error", "No se pudieron cargar las facturas", "error");
      } else {
        setFacturas(resFacturas || []);
        setClientes(resClientes || []);
      }
      setIsLoading(false);
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const fetchData = async () => {
    const { data: resFacturas } = await supabase
      .from("facturas")
      .select(`*, clientes ( razon_social ), estados_factura ( nombre )`)
      .order("fecha", { ascending: false })
      .order("no_factura", { ascending: false });
    const { data: resClientes } = await supabase
      .from("clientes")
      .select("id, razon_social")
      .order("razon_social");
    setFacturas(resFacturas || []);
    setClientes(resClientes || []);
  };

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setCurrentPage(1);
  };

  const filteredFacturas = useMemo(() => {
    return facturas.filter((f) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        f.clientes?.razon_social?.toLowerCase().includes(term) ||
        f.no_factura?.toString().includes(term);
      const matchCliente = filterCliente
        ? f.cliente_id.toString() === filterCliente
        : true;
      const matchEstado = filterEstado
        ? f.estados_factura?.nombre === filterEstado
        : true;
      let matchMes = true;
      let matchAno = true;

      if (filterMes || filterAno) {
        const fechaAFiltrar =
          filtroTipoFecha === "pago" ? f.fecha_pago : f.fecha;
        if (!fechaAFiltrar) {
          matchMes = false;
          matchAno = false;
        } else {
          const facturaFechaObj = new Date(fechaAFiltrar + "T12:00:00Z");
          const fMes = (facturaFechaObj.getUTCMonth() + 1)
            .toString()
            .padStart(2, "0");
          const fAno = facturaFechaObj.getUTCFullYear().toString();
          if (filterMes) matchMes = fMes === filterMes;
          if (filterAno) matchAno = fAno === filterAno;
        }
      }
      return matchSearch && matchCliente && matchEstado && matchMes && matchAno;
    });
  }, [
    facturas,
    searchTerm,
    filterCliente,
    filterEstado,
    filterMes,
    filterAno,
    filtroTipoFecha,
  ]);

  const totales = useMemo(() => {
    return filteredFacturas.reduce(
      (acc, factura) => {
        acc.subtotal += Number(factura.subtotal) || 0;
        acc.iva += Number(factura.iva) || 0;
        acc.total += Number(factura.total) || 0;
        return acc;
      },
      { subtotal: 0, iva: 0, total: 0 },
    );
  }, [filteredFacturas]);

  const totalesPendientes = useMemo(() => {
    return facturas
      .filter((f) => {
        const term = searchTerm.toLowerCase();
        const matchSearch =
          f.clientes?.razon_social?.toLowerCase().includes(term) ||
          f.no_factura?.toString().includes(term);
        const matchCliente = filterCliente
          ? f.cliente_id.toString() === filterCliente
          : true;
        const matchEstado = f.estados_factura?.nombre === "PENDIENTE";
        let matchMes = true;
        let matchAno = true;

        if (filterMes || filterAno) {
          const fechaAFiltrar = f.fecha;
          if (!fechaAFiltrar) {
            matchMes = false;
            matchAno = false;
          } else {
            const facturaFechaObj = new Date(fechaAFiltrar + "T12:00:00Z");
            const fMes = (facturaFechaObj.getUTCMonth() + 1)
              .toString()
              .padStart(2, "0");
            const fAno = facturaFechaObj.getUTCFullYear().toString();
            if (filterMes) matchMes = fMes === filterMes;
            if (filterAno) matchAno = fAno === filterAno;
          }
        }
        return (
          matchSearch && matchCliente && matchEstado && matchMes && matchAno
        );
      })
      .reduce(
        (acc, factura) => {
          acc.subtotal += Number(factura.subtotal) || 0;
          acc.iva += Number(factura.iva) || 0;
          acc.total += Number(factura.total) || 0;
          return acc;
        },
        { subtotal: 0, iva: 0, total: 0 },
      );
  }, [facturas, searchTerm, filterCliente, filterMes, filterAno]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentFacturas = filteredFacturas.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );
  const totalPages = Math.ceil(filteredFacturas.length / itemsPerPage);

  const openModal = (factura = null) => {
    setSelectedFactura(factura);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm("¿Seguro que deseas eliminar este registro de factura?")
    )
      return;
    try {
      const { error } = await supabase.from("facturas").delete().eq("id", id);
      if (error) throw error;
      await fetchData();
      if (currentFacturas.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      }
      Swal.fire("Eliminada", "La factura ha sido borrada.", "success");
    } catch (err) {
      Swal.fire("Error", err.message, "error");
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);

  // 🟢 FUNCIÓN MÁGICA PARA GENERAR PDF
  const handleExportarPDF = async () => {
    if (filteredFacturas.length === 0) {
      Swal.fire(
        "Atención",
        "No hay registros para exportar con los filtros actuales.",
        "warning",
      );
      return;
    }

    const { value: comentario } = await Swal.fire({
      title: "Exportar Reporte",
      input: "textarea",
      inputLabel:
        "Puedes agregar una nota para el contador al final del documento (Opcional)",
      inputPlaceholder: "Escribe aquí...",
      showCancelButton: true,
      confirmButtonText: "Generar PDF",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#1d4ed8",
    });

    if (comentario !== undefined) {
      const doc = new jsPDF("p", "pt", "letter");

      // Encabezado
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("MILAS EQUIPOS INDUSTRIALES Y ACCESORIOS", 40, 40);

      // Título Dinámico
      let subtitulo = "REPORTE DE FACTURAS";
      if (filtroTipoFecha === "pago" && filterMes && filterAno) {
        const mesesNombres = [
          "ENERO",
          "FEBRERO",
          "MARZO",
          "ABRIL",
          "MAYO",
          "JUNIO",
          "JULIO",
          "AGOSTO",
          "SEPTIEMBRE",
          "OCTUBRE",
          "NOVIEMBRE",
          "DICIEMBRE",
        ];
        const mesNombre = mesesNombres[parseInt(filterMes) - 1];
        subtitulo = `FACTURAS PAGADAS EN ${mesNombre} ${filterAno}`;
      } else if (filterMes || filterAno) {
        subtitulo = `REPORTE DE FACTURAS FILTRADAS`;
      }

      doc.setFontSize(11);
      doc.text(subtitulo, 40, 60);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Fecha de impresión: ${new Date().toLocaleDateString("es-MX")}`,
        40,
        75,
      );

      const tableData = filteredFacturas.map((f) => [
        f.no_factura,
        new Date(f.fecha + "T12:00:00Z").toLocaleDateString("es-MX"),
        f.fecha_pago
          ? new Date(f.fecha_pago + "T12:00:00Z").toLocaleDateString("es-MX")
          : "---",
        f.clientes?.razon_social || "Desconocido",
        formatCurrency(f.total),
        f.estados_factura?.nombre || "",
      ]);

      // 🟢 CORRECCIÓN: Usamos autoTable pasando el doc como primer parámetro
      autoTable(doc, {
        startY: 90,
        head: [
          ["Folio", "Emisión", "Fecha Pago", "Cliente", "Total", "Estado"],
        ],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [29, 78, 216], fontSize: 9 }, // Azul corporativo
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 249] },
      });

      // Agregar Comentario
      const finalY = doc.lastAutoTable.finalY || 90;

      // Resumen Totales en el PDF
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(
        `Total Sumado: ${formatCurrency(totales.total)}`,
        40,
        finalY + 30,
      );

      if (comentario) {
        doc.setFontSize(10);
        doc.text("Notas Adicionales:", 40, finalY + 60);
        doc.setFont("helvetica", "normal");
        const splitText = doc.splitTextToSize(comentario, 530);
        doc.text(splitText, 40, finalY + 75);
      }

      // Descargar PDF
      doc.save(`Reporte_MILAS_${new Date().getTime()}.pdf`);
    }
  };

  return (
    <div className="max-w-[90rem] mx-auto space-y-8">
      {/* HEADER Y BOTONES DE ACCIÓN */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#131b2e] flex items-center gap-2">
            <FileText className="text-blue-700" /> Historial de Facturación
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Control de cobranza, emisiones y estatus de facturación MILAS.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
          <button
            onClick={handleExportarPDF}
            className="w-full sm:w-auto bg-white text-blue-700 border border-blue-200 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-50 transition-all shadow-sm active:scale-95"
          >
            <FileDown size={16} /> Exportar PDF
          </button>

          <button
            onClick={() => openModal()}
            className="w-full sm:w-auto bg-blue-700 text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-800 transition-all shadow-md shadow-blue-700/20 active:scale-95"
          >
            <Plus size={16} /> Nueva Factura
          </button>
        </div>
      </div>

      {/* 📊 SECCIÓN DE KPIs DOBLE */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Landmark size={16} /> Resumen de la Vista Actual (Según Filtros)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5 transition-shadow hover:shadow-md">
              <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <Wallet size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Total en Pantalla
                </p>
                <p className="text-xl font-black text-[#131b2e] mt-0.5">
                  {formatCurrency(totales.total)}
                </p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5 transition-shadow hover:shadow-md">
              <div className="p-3.5 bg-blue-50 text-blue-600 rounded-xl">
                <Receipt size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Subtotal Pantalla
                </p>
                <p className="text-xl font-black text-[#131b2e] mt-0.5">
                  {formatCurrency(totales.subtotal)}
                </p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5 transition-shadow hover:shadow-md">
              <div className="p-3.5 bg-purple-50 text-purple-600 rounded-xl">
                <Landmark size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  I.V.A. Pantalla
                </p>
                <p className="text-xl font-black text-[#131b2e] mt-0.5">
                  {formatCurrency(totales.iva)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-3 flex items-center gap-2">
            <AlertCircle size={16} /> Por Cobrar (Solo Facturas Pendientes)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-orange-200 flex items-center gap-5 transition-shadow hover:shadow-md">
              <div className="p-3.5 bg-orange-50 text-orange-600 rounded-xl">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-orange-600/80 uppercase tracking-widest">
                  Deuda Total
                </p>
                <p className="text-xl font-black text-orange-700 mt-0.5">
                  {formatCurrency(totalesPendientes.total)}
                </p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-orange-200 flex items-center gap-5 transition-shadow hover:shadow-md">
              <div className="p-3.5 bg-orange-50 text-orange-600 rounded-xl">
                <Receipt size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-orange-600/80 uppercase tracking-widest">
                  Subtotal Deuda
                </p>
                <p className="text-xl font-black text-orange-700 mt-0.5">
                  {formatCurrency(totalesPendientes.subtotal)}
                </p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-orange-200 flex items-center gap-5 transition-shadow hover:shadow-md">
              <div className="p-3.5 bg-orange-50 text-orange-600 rounded-xl">
                <Landmark size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-orange-600/80 uppercase tracking-widest">
                  I.V.A. Deuda
                </p>
                <p className="text-xl font-black text-orange-700 mt-0.5">
                  {formatCurrency(totalesPendientes.iva)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FILTROS AVANZADOS */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
        <div className="relative w-full lg:col-span-2">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
            Buscador
          </label>
          <Search
            className="absolute left-4 top-[34px] text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Folio o cliente..."
            value={searchTerm}
            onChange={handleFilterChange(setSearchTerm)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 transition-all font-medium text-slate-800"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
            Cliente
          </label>
          <select
            value={filterCliente}
            onChange={handleFilterChange(setFilterCliente)}
            className="w-full py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 text-slate-800 font-medium cursor-pointer"
          >
            <option value="">Todos los Clientes</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id.toString()}>
                {c.razon_social}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
            Estatus
          </label>
          <select
            value={filterEstado}
            onChange={handleFilterChange(setFilterEstado)}
            className="w-full py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 text-slate-800 font-medium cursor-pointer"
          >
            <option value="">Cualquier Estado</option>
            <option value="PAGADO">Pagadas</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="CANCELADO">Canceladas</option>
          </select>
        </div>

        <div className="lg:col-span-2 bg-blue-50/50 p-2 rounded-xl border border-blue-100 flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <label className="text-[10px] font-bold text-blue-800 uppercase tracking-widest">
              Filtrar Fechas Por:
            </label>
            <select
              value={filtroTipoFecha}
              onChange={handleFilterChange(setFiltroTipoFecha)}
              className="text-[10px] bg-white border border-blue-200 rounded px-2 py-0.5 font-bold text-blue-700 outline-none cursor-pointer"
            >
              <option value="emision">Emisión (Creación)</option>
              <option value="pago">Fecha de Pago (Cierre)</option>
            </select>
          </div>

          <div className="flex gap-2">
            <select
              value={filterMes}
              onChange={handleFilterChange(setFilterMes)}
              className="w-1/2 py-2.5 px-3 bg-white border border-blue-200 rounded-lg text-sm font-medium text-slate-800 cursor-pointer focus:outline-none focus:border-blue-700"
            >
              <option value="">Mes</option>
              {[
                "01",
                "02",
                "03",
                "04",
                "05",
                "06",
                "07",
                "08",
                "09",
                "10",
                "11",
                "12",
              ].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={filterAno}
              onChange={handleFilterChange(setFilterAno)}
              className="w-1/2 py-2.5 px-3 bg-white border border-blue-200 rounded-lg text-sm font-medium text-slate-800 cursor-pointer focus:outline-none focus:border-blue-700"
            >
              <option value="">Año</option>
              {["2026", "2025", "2024", "2023", "2022"].map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="p-4 w-24">Folio</th>
                <th className="p-4">F. Emisión</th>
                <th className="p-4">F. Pago</th>
                <th className="p-4">Cliente</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-8 h-8 border-4 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-slate-500 font-bold text-sm">
                        Cargando facturas...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : currentFacturas.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="p-12 text-center text-slate-400 font-medium"
                  >
                    No se encontraron facturas con estos filtros.
                  </td>
                </tr>
              ) : (
                currentFacturas.map((f) => {
                  let statusColor =
                    f.estados_factura?.nombre === "PAGADO"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-orange-50 text-orange-700 border border-orange-200";
                  if (f.estados_factura?.nombre === "CANCELADO")
                    statusColor =
                      "bg-red-50 text-red-700 border border-red-200";

                  return (
                    <tr
                      key={f.id}
                      className="hover:bg-slate-50 transition-colors group"
                    >
                      <td className="p-4 font-bold text-[#131b2e] group-hover:text-blue-700 transition-colors">
                        {f.no_factura}
                      </td>
                      <td className="p-4 text-slate-600 font-medium">
                        {new Date(f.fecha + "T12:00:00Z").toLocaleDateString(
                          "es-MX",
                        )}
                      </td>
                      <td className="p-4 text-slate-500 text-xs italic">
                        {f.fecha_pago
                          ? new Date(
                              f.fecha_pago + "T12:00:00Z",
                            ).toLocaleDateString("es-MX")
                          : "---"}
                      </td>
                      <td
                        className="p-4 font-bold text-[#131b2e] truncate max-w-[250px]"
                        title={f.clientes?.razon_social}
                      >
                        {f.clientes?.razon_social}
                      </td>
                      <td className="p-4 text-right font-black text-[#131b2e]">
                        {formatCurrency(f.total)}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`text-[10px] font-bold px-3 py-1 rounded-md uppercase tracking-wide ${statusColor}`}
                        >
                          {f.estados_factura?.nombre}
                        </span>
                      </td>
                      <td className="p-4 flex justify-center gap-2">
                        <button
                          onClick={() => openModal(f)}
                          className="p-2 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-all"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(f.id)}
                          className="p-2 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredFacturas.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-200 bg-slate-50/50">
            <span className="text-xs text-slate-500 font-medium">
              Página{" "}
              <span className="font-bold text-slate-800">{currentPage}</span> de{" "}
              <span className="font-bold text-slate-800">{totalPages}</span>
            </span>
            <div className="flex items-center gap-2 mt-4 sm:mt-0">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 bg-white"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 bg-white"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <FacturaFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          clientes={clientes}
          facturaAEditar={selectedFactura}
          onSaveSuccess={fetchData}
        />
      )}
    </div>
  );
}
