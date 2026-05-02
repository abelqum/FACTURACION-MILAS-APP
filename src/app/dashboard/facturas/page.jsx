"use client";
import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { supabase } from "@/app/_lib/supabase/supabase";
import FacturaFormModal from "@/app/_components/FacturaFormModal";
import {
  Plus,
  Pencil,
  Trash2,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function GestionFacturas() {
  const [facturas, setFacturas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCliente, setFilterCliente] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [filterMes, setFilterMes] = useState("");
  const [filterAno, setFilterAno] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // ✅ EFFECT LIMPIO (SIN WARNING)
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      // Ordenamos por fecha descendente y luego por número de factura descendente
      // Dentro de loadData y fetchData cambia el ordenamiento:
      const { data: resFacturas, error } = await supabase
        .from("facturas")
        .select(
          `
    *,
    clientes ( razon_social ),
    estados_factura ( nombre )
  `,
        )
        // Primero ordenamos por la fecha de emisión (más recientes arriba)
        .order("fecha", { ascending: false })
        // Luego, para el mismo día, ordenamos por folio de forma descendente
        .order("no_factura", { ascending: false });

      const { data: resClientes } = await supabase
        .from("clientes")
        .select("id, razon_social")
        .order("razon_social");

      if (!isMounted) return;

      if (error) {
        console.error(error);
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

  // 🔁 FETCH PARA ACCIONES (DELETE / SAVE)
  const fetchData = async () => {
    const { data: resFacturas } = await supabase
      .from("facturas")
      .select(
        `
        *,
        clientes ( razon_social ),
        estados_factura ( nombre )
      `,
      )
      .order("fecha", { ascending: false })
      .order("no_factura", { ascending: false });

    const { data: resClientes } = await supabase
      .from("clientes")
      .select("id, razon_social")
      .order("razon_social");

    setFacturas(resFacturas || []);
    setClientes(resClientes || []);
  };

  // MANEJADORES DE FILTROS (SIN USEEFFECTS EXTRA)
  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setCurrentPage(1);
  };

  // 🔎 FILTROS INTELIGENTES SÍNCRONOS
  const filteredFacturas = facturas.filter((f) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      f.clientes?.razon_social?.toLowerCase().includes(term) ||
      f.no_factura?.toLowerCase().includes(term);

    const matchCliente = filterCliente
      ? f.cliente_id.toString() === filterCliente
      : true;
    const matchEstado = filterEstado
      ? f.estados_factura?.nombre === filterEstado
      : true;

    const facturaFecha = new Date(f.fecha);
    const facturaMes = (facturaFecha.getUTCMonth() + 1)
      .toString()
      .padStart(2, "0");
    const facturaAno = facturaFecha.getUTCFullYear().toString();

    const matchMes = filterMes ? facturaMes === filterMes : true;
    const matchAno = filterAno ? facturaAno === filterAno : true;

    return matchSearch && matchCliente && matchEstado && matchMes && matchAno;
  });

  // 📄 PAGINACIÓN
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

  return (
    <div className="max-w-[90rem] mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-[#bec9c2]/30 pb-6">
        <div>
          <h1 className="text-2xl font-black text-[#131b2e] flex items-center gap-2">
            <FileText className="text-[#004532]" /> Registro de Facturas
          </h1>
          <p className="text-sm text-[#3f4944] mt-1">
            Control de cobranza, emisiones y estatus de facturación MILAS.
          </p>
        </div>

        <button
          onClick={() => openModal()}
          className="bg-[#004532] text-white px-5 py-3 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-[#131b2e] transition-all shadow-md active:scale-95"
        >
          <Plus size={16} /> Agregar Factura
        </button>
      </div>

      {/* FILTROS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-[#bec9c2]/30 mb-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-center transition-shadow hover:shadow-md">
        <div className="relative w-full lg:col-span-2">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar folio o nombre del cliente..."
            value={searchTerm}
            onChange={handleFilterChange(setSearchTerm)}
            className="w-full pl-12 pr-4 py-3 bg-[#f8faf9] border border-[#bec9c2]/40 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004532] transition-all"
          />
        </div>

        <select
          value={filterCliente}
          onChange={handleFilterChange(setFilterCliente)}
          className="w-full py-3 px-4 bg-[#f8faf9] border border-[#bec9c2]/40 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004532] text-[#3f4944] transition-all"
        >
          <option value="">Todos los Clientes</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id.toString()}>
              {c.razon_social}
            </option>
          ))}
        </select>

        <select
          value={filterEstado}
          onChange={handleFilterChange(setFilterEstado)}
          className="w-full py-3 px-4 bg-[#f8faf9] border border-[#bec9c2]/40 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004532] text-[#3f4944] transition-all"
        >
          <option value="">Cualquier Estado</option>
          <option value="PAGADO">PAGADAS</option>
          <option value="PENDIENTE">PENDIENTES</option>
          <option value="CANCELADO">CANCELADAS</option>
        </select>

        <div className="flex gap-2 w-full">
          <select
            value={filterMes}
            onChange={handleFilterChange(setFilterMes)}
            className="w-1/2 py-3 px-2 bg-[#f8faf9] border border-[#bec9c2]/40 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004532] text-[#3f4944] transition-all"
          >
            <option value="">Mes</option>
            <option value="01">Enero</option>
            <option value="02">Febrero</option>
            <option value="03">Marzo</option>
            <option value="04">Abril</option>
            <option value="05">Mayo</option>
            <option value="06">Junio</option>
            <option value="07">Julio</option>
            <option value="08">Agosto</option>
            <option value="09">Septiembre</option>
            <option value="10">Octubre</option>
            <option value="11">Noviembre</option>
            <option value="12">Diciembre</option>
          </select>
          <select
            value={filterAno}
            onChange={handleFilterChange(setFilterAno)}
            className="w-1/2 py-3 px-2 bg-[#f8faf9] border border-[#bec9c2]/40 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004532] text-[#3f4944] transition-all"
          >
            <option value="">Año</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2022">2022</option>
          </select>
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-xl shadow-sm border border-[#bec9c2]/30 flex flex-col overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#f2f3ff] text-[#3f4944] uppercase tracking-wider text-[10px] font-bold border-b border-[#bec9c2]/30">
              <tr>
                <th className="p-4 w-24">Folio</th>
                <th className="p-4">Fecha</th>
                <th className="p-4">Cliente</th>
                <th className="p-4 text-right">Subtotal</th>
                <th className="p-4 text-right">I.V.A.</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#bec9c2]/20">
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="text-center p-12">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-8 h-8 border-4 border-[#004532] border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-[#3f4944] font-bold text-sm">
                        Cargando facturas...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : currentFacturas.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="p-12 text-center text-slate-400 font-medium"
                  >
                    No se encontraron facturas con esos filtros.
                  </td>
                </tr>
              ) : (
                currentFacturas.map((f) => {
                  let statusColor =
                    "bg-gray-100 text-gray-800 border border-gray-200";
                  if (f.estados_factura?.nombre === "PAGADO")
                    statusColor =
                      "bg-[#e6f4ed] text-[#004532] border border-green-200";
                  if (f.estados_factura?.nombre === "PENDIENTE")
                    statusColor =
                      "bg-orange-50 text-orange-700 border border-orange-200";
                  if (f.estados_factura?.nombre === "CANCELADO")
                    statusColor =
                      "bg-red-50 text-red-700 border border-red-200";

                  return (
                    <tr
                      key={f.id}
                      className="hover:bg-slate-50 transition-colors group"
                    >
                      <td className="p-4 font-bold text-[#131b2e] group-hover:text-[#004532] transition-colors">
                        {f.no_factura}
                      </td>
                      <td className="p-4 text-[#3f4944]">
                        {new Date(f.fecha + "T12:00:00Z").toLocaleDateString(
                          "es-MX",
                        )}
                      </td>
                      <td className="p-4">
                        <p
                          className="font-bold text-[#131b2e] truncate max-w-[250px]"
                          title={f.clientes?.razon_social}
                        >
                          {f.clientes?.razon_social || "Desconocido"}
                        </p>
                      </td>
                      <td className="p-4 text-right text-[#3f4944]">
                        {formatCurrency(f.subtotal)}
                      </td>
                      <td className="p-4 text-right text-[#3f4944]">
                        {formatCurrency(f.iva)}
                      </td>
                      <td className="p-4 text-right font-black text-[#004532]">
                        {formatCurrency(f.total)}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`text-[10px] font-bold px-3 py-1 rounded-md uppercase tracking-wider shadow-sm ${statusColor}`}
                        >
                          {f.estados_factura?.nombre}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => openModal(f)}
                            className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-lg transition-colors shadow-sm"
                            title="Editar Factura"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(f.id)}
                            className="p-2 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded-lg transition-colors shadow-sm"
                            title="Borrar Factura"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINACIÓN */}
        {!isLoading && filteredFacturas.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-[#bec9c2]/30 bg-[#f8faf9]">
            <span className="text-xs text-[#3f4944] font-medium">
              Mostrando{" "}
              <span className="font-bold text-[#131b2e]">
                {indexOfFirstItem + 1}
              </span>{" "}
              a{" "}
              <span className="font-bold text-[#131b2e]">
                {Math.min(indexOfLastItem, filteredFacturas.length)}
              </span>{" "}
              de{" "}
              <span className="font-bold text-[#131b2e]">
                {filteredFacturas.length}
              </span>
            </span>

            <div className="flex items-center gap-2 mt-4 sm:mt-0">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-[#bec9c2]/30 text-[#131b2e] hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:hover:bg-transparent disabled:shadow-none transition-all"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="text-xs font-bold px-3 text-[#131b2e] bg-white py-1.5 rounded-lg border border-[#bec9c2]/20 shadow-sm">
                Página {currentPage} de {totalPages}
              </span>

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-[#bec9c2]/30 text-[#131b2e] hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:hover:bg-transparent disabled:shadow-none transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL */}
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
