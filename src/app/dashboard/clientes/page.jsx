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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-[#bec9c2]/30 pb-6">
        <div>
          <h1 className="text-2xl font-black text-[#131b2e] flex items-center gap-2">
            <Users className="text-[#004532]" /> Directorio de Clientes
          </h1>
          <p className="text-sm text-[#3f4944] mt-1">
            Gestiona la cartera de clientes, RFCs e información de contacto de
            MILAS.
          </p>
        </div>

        <button
          onClick={() => openModal()}
          className="bg-blue-700 text-white px-5 py-3 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-blue-800 transition-all shadow-md shadow-blue-700/20 active:scale-95"
        >
          <Plus size={16} /> Agregar Cliente
        </button>
      </div>

      {/* BUSCADOR */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-[#bec9c2]/30 mb-6 flex items-center transition-shadow hover:shadow-md">
        <div className="relative w-full md:w-1/2">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar por Razón Social o RFC..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-12 pr-4 py-3 bg-[#f8faf9] border border-[#bec9c2]/40 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004532] transition-all border-slate-200 p-3 rounded-lg focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 transition-all text-slate-800 font-medium bg-slate-50"
          />
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-xl shadow-sm border border-[#bec9c2]/30 flex flex-col overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#f2f3ff] text-[#3f4944] uppercase tracking-wider text-[10px] font-bold border-b border-[#bec9c2]/30">
              <tr>
                <th className="p-4 w-16 text-center">ID</th>
                <th className="p-4">Razón Social</th>
                <th className="p-4">RFC</th>
                <th className="p-4">Contacto</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#bec9c2]/20">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="text-center p-12">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-8 h-8 border-4 border-[#004532] border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-[#3f4944] font-bold text-sm">
                        Cargando directorio...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : currentClientes.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="p-12 text-center text-slate-400 font-medium"
                  >
                    No se encontraron clientes en la búsqueda.
                  </td>
                </tr>
              ) : (
                currentClientes.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50 transition-colors group"
                  >
                    <td className="p-4 text-center font-bold text-slate-400 group-hover:text-[#004532] transition-colors">
                      {c.id}
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-[#131b2e]">
                        {c.razon_social}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-xs bg-[#e6f4ed] text-[#004532] px-2.5 py-1 rounded-md font-bold tracking-wider">
                        {c.rfc}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-[#3f4944] space-y-1.5">
                      {c.telefonos?.length > 0 && c.telefonos[0] !== "" ? (
                        <div className="flex items-center gap-2">
                          <Phone size={12} className="text-slate-400" />
                          <span className="font-medium">
                            {c.telefonos.join(" / ")}
                          </span>
                        </div>
                      ) : null}
                      {c.correos?.length > 0 && c.correos[0] !== "" ? (
                        <div className="flex items-center gap-2">
                          <Mail size={12} className="text-slate-400" />
                          <span className="font-medium">
                            {c.correos.join(" / ")}
                          </span>
                        </div>
                      ) : null}
                      {(!c.telefonos ||
                        c.telefonos.length === 0 ||
                        c.telefonos[0] === "") &&
                        (!c.correos ||
                          c.correos.length === 0 ||
                          c.correos[0] === "") && (
                          <span className="text-slate-300 italic">
                            Sin datos de contacto
                          </span>
                        )}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => openModal(c)}
                          className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-lg transition-colors shadow-sm"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-2 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded-lg transition-colors shadow-sm"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINACIÓN */}
        {!isLoading && filteredClientes.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-[#bec9c2]/30 bg-[#f8faf9]">
            <span className="text-xs text-[#3f4944] font-medium">
              Mostrando{" "}
              <span className="font-bold text-[#131b2e]">
                {indexOfFirstItem + 1}
              </span>{" "}
              a{" "}
              <span className="font-bold text-[#131b2e]">
                {Math.min(indexOfLastItem, filteredClientes.length)}
              </span>{" "}
              de{" "}
              <span className="font-bold text-[#131b2e]">
                {filteredClientes.length}
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
