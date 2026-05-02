"use client";
import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { supabase } from "@/app/_lib/supabase/supabase";
import ClienteFormModal from "@/app/_components/ClienteFormModal";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
} from "lucide-react";

export default function GestionClientes() {
  const [clientes, setClientes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // ✅ EFFECT SIN WARNING
  useEffect(() => {
    let mounted = true;

    const loadClientes = async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("id", { ascending: true });

      if (!mounted) return;

      if (error) {
        console.error("Error cargando clientes:", error);
        Swal.fire("Error", "No se pudieron cargar los clientes", "error");
      } else {
        setClientes(data || []);
      }

      setIsLoading(false);
    };

    loadClientes();

    return () => {
      mounted = false;
    };
  }, []);

  // 🔁 FETCH PARA ACCIONES (DELETE / SAVE)
  const fetchClientes = async () => {
    const { data } = await supabase
      .from("clientes")
      .select("*")
      .order("id", { ascending: true });

    setClientes(data || []);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const filteredClientes = clientes.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.razon_social?.toLowerCase().includes(term) ||
      c.rfc?.toLowerCase().includes(term)
    );
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentClientes = filteredClientes.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );
  const totalPages = Math.ceil(filteredClientes.length / itemsPerPage);

  const openModal = (cliente = null) => {
    setSelectedCliente(cliente);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "¿Seguro que deseas eliminar a este cliente? Si tiene facturas vinculadas, no podrás borrarlo.",
      )
    )
      return;

    try {
      const { error } = await supabase.from("clientes").delete().eq("id", id);

      if (error) {
        if (error.code === "23503") {
          throw new Error(
            "No puedes eliminar este cliente porque tiene facturas.",
          );
        }
        throw error;
      }

      await fetchClientes();

      if (currentClientes.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      }

      Swal.fire("Eliminado", "El cliente ha sido borrado.", "success");
    } catch (error) {
      Swal.fire("No permitido", error.message, "warning");
    }
  };

  return (
    <div className="max-w-[90rem] mx-auto">
      {/* HEADER */}
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users /> Clientes
        </h1>

        <button
          onClick={() => openModal()}
          className="bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <Plus size={16} /> Agregar
        </button>
      </div>

      {/* BUSCADOR */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="w-full p-2 border rounded"
        />
      </div>

      {/* TABLA */}
      <table className="w-full text-sm border">
        <thead>
          <tr className="bg-gray-100">
            <th>ID</th>
            <th>Nombre</th>
            <th>RFC</th>
            <th>Contacto</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan="5" className="text-center p-6">
                Cargando...
              </td>
            </tr>
          ) : (
            currentClientes.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.razon_social}</td>
                <td>{c.rfc}</td>
                <td>
                  {c.telefonos?.join(" / ") || "—"}
                  <br />
                  {c.correos?.join(" / ") || ""}
                </td>
                <td className="flex gap-2">
                  <button onClick={() => openModal(c)}>
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(c.id)}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* PAGINACIÓN */}
      <div className="flex justify-between mt-4">
        <button
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft />
        </button>

        <span>
          {currentPage} / {totalPages}
        </span>

        <button
          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          <ChevronRight />
        </button>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <ClienteFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          clienteAEditar={selectedCliente}
          onSaveSuccess={fetchClientes}
        />
      )}
    </div>
  );
}
