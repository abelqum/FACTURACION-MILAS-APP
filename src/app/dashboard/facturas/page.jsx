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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function GestionFacturas() {
  const [facturas, setFacturas] = useState([]);
  const [clientes, setClientes] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCliente, setFilterCliente] = useState("");
  const [filterEstado, setFilterEstado] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // ✅ EFFECT LIMPIO (SIN WARNING)
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      const { data: resFacturas, error } = await supabase
        .from("facturas")
        .select(
          `
          *,
          clientes ( razon_social ),
          estados_factura ( nombre )
        `,
        )
        .order("fecha", { ascending: false });

      const { data: resClientes } = await supabase
        .from("clientes")
        .select("id, razon_social")
        .order("razon_social");

      if (!isMounted) return;

      if (error) {
        console.error(error);
        return;
      }

      setFacturas(resFacturas || []);
      setClientes(resClientes || []);
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
      .order("fecha", { ascending: false });

    const { data: resClientes } = await supabase
      .from("clientes")
      .select("id, razon_social");

    setFacturas(resFacturas || []);
    setClientes(resClientes || []);
  };

  // 🔎 FILTROS
  const filteredFacturas = facturas.filter((f) => {
    const matchSearch =
      f.clientes?.razon_social
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      f.no_factura?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchCliente = filterCliente
      ? f.cliente_id.toString() === filterCliente
      : true;

    const matchEstado = filterEstado
      ? f.estados_factura?.nombre === filterEstado
      : true;

    return matchSearch && matchCliente && matchEstado;
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
    if (!window.confirm("¿Eliminar factura?")) return;

    try {
      await supabase.from("facturas").delete().eq("id", id);
      await fetchData();

      if (currentFacturas.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }

      Swal.fire("Eliminada", "", "success");
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
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText /> Facturas
        </h1>

        <button
          onClick={() => openModal()}
          className="bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <Plus size={16} /> Agregar
        </button>
      </div>

      {/* FILTROS */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <input
          type="text"
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="p-2 border rounded"
        />

        <select
          value={filterCliente}
          onChange={(e) => {
            setFilterCliente(e.target.value);
            setCurrentPage(1);
          }}
          className="p-2 border rounded"
        >
          <option value="">Clientes</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.razon_social}
            </option>
          ))}
        </select>

        <select
          value={filterEstado}
          onChange={(e) => {
            setFilterEstado(e.target.value);
            setCurrentPage(1);
          }}
          className="p-2 border rounded"
        >
          <option value="">Estado</option>
          <option value="PAGADO">Pagado</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
      </div>

      {/* TABLA */}
      <table className="w-full text-sm border">
        <thead>
          <tr className="bg-gray-100">
            <th>Folio</th>
            <th>Cliente</th>
            <th>Total</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {currentFacturas.map((f) => (
            <tr key={f.id}>
              <td>{f.no_factura}</td>
              <td>{f.clientes?.razon_social}</td>
              <td>{formatCurrency(f.total)}</td>

              <td className="flex gap-2">
                <button onClick={() => openModal(f)}>
                  <Pencil size={16} />
                </button>

                <button onClick={() => handleDelete(f.id)}>
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* PAGINACIÓN */}
      <div className="flex justify-between mt-4">
        <button
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft />
        </button>

        <span>
          {currentPage} / {totalPages}
        </span>

        <button
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight />
        </button>
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
