"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/app/_lib/supabase/supabase";
import Swal from "sweetalert2";
import {
  Users,
  Search,
  Mail,
  Phone,
  Trash2,
  ShieldCheck,
  Megaphone,
  Plus,
  Edit2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import ClienteFormModal from "@/app/_components/ClienteFormModal";

export default function ClientesPage() {
  const [activeTab, setActiveTab] = useState("registrados");

  const [clientes, setClientes] = useState([]);
  const [prospectos, setProspectos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // 🟢 ESTADOS DEL MODAL Y EDICIÓN
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clienteToEdit, setClienteToEdit] = useState(null);

  // 🟢 ESTADOS DE PAGINACIÓN
  const [paginaRegistrados, setPaginaRegistrados] = useState(1);
  const [paginaProspectos, setPaginaProspectos] = useState(1);
  const itemsPorPagina = 10; // Muestra 10 registros por página

  useEffect(() => {
    cargarDatos();
  }, []);

  // Resetea a la página 1 cuando se busca algo o se cambia de pestaña
  useEffect(() => {
    setPaginaRegistrados(1);
    setPaginaProspectos(1);
  }, [searchTerm, activeTab]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const { data: dataClientes, error: errorClientes } = await supabase
        .from("clientes")
        .select("*")
        .order("razon_social");

      if (errorClientes) throw errorClientes;
      setClientes(dataClientes || []);

      const { data: dataProspectos, error: errorProspectos } = await supabase
        .from("prospectos")
        .select("*")
        .order("razon_social");

      if (errorProspectos) throw errorProspectos;
      setProspectos(dataProspectos || []);
    } catch (error) {
      console.error("Error al cargar el directorio:", error);
    } finally {
      setCargando(false);
    }
  };

  // 🟢 FUNCIÓN PARA ELIMINAR CLIENTES CON SEGURIDAD
  const eliminarCliente = async (id) => {
    const confirm = await Swal.fire({
      title: "¿Eliminar Cliente?",
      text: "Si este cliente tiene facturas registradas, el sistema no permitirá borrarlo para proteger tu contabilidad.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Sí, intentar borrar",
      cancelButtonText: "Cancelar",
    });

    if (confirm.isConfirmed) {
      try {
        const { error } = await supabase.from("clientes").delete().eq("id", id);
        if (error) throw error;

        cargarDatos();
        Swal.fire({
          title: "Eliminado",
          icon: "success",
          toast: true,
          position: "top-end",
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (error) {
        Swal.fire(
          "No permitido",
          "Este cliente no se puede borrar porque probablemente tiene facturas o historial asociado.",
          "error",
        );
      }
    }
  };

  const eliminarProspecto = async (id) => {
    const confirm = await Swal.fire({
      title: "¿Eliminar Prospecto?",
      text: "¿Seguro que deseas eliminarlo de tu lista de marketing?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    });

    if (confirm.isConfirmed) {
      try {
        const { error } = await supabase
          .from("prospectos")
          .delete()
          .eq("id", id);
        if (error) throw error;

        setProspectos(prospectos.filter((p) => p.id !== id));
        Swal.fire({
          title: "Eliminado",
          icon: "success",
          toast: true,
          position: "top-end",
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (error) {
        Swal.fire("Error", "No se pudo eliminar el prospecto", "error");
      }
    }
  };

  // 🟢 FILTRADO DINÁMICO
  const clientesFiltrados = clientes.filter(
    (c) =>
      c.razon_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.rfc?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const prospectosFiltrados = prospectos.filter(
    (p) =>
      p.razon_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.correos?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // 🟢 CÁLCULOS DE PAGINACIÓN
  const totalPaginasRegistrados =
    Math.ceil(clientesFiltrados.length / itemsPorPagina) || 1;
  const clientesPaginados = clientesFiltrados.slice(
    (paginaRegistrados - 1) * itemsPorPagina,
    paginaRegistrados * itemsPorPagina,
  );

  const totalPaginasProspectos =
    Math.ceil(prospectosFiltrados.length / itemsPorPagina) || 1;
  const prospectosPaginados = prospectosFiltrados.slice(
    (paginaProspectos - 1) * itemsPorPagina,
    paginaProspectos * itemsPorPagina,
  );

  return (
    <div className="max-w-[90rem] mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Users className="text-blue-700" /> Directorio y Marketing
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Gestiona tus clientes de facturación y tu lista de contactos para
            campañas.
          </p>
        </div>

        {/* 🟢 BOTÓN NUEVO CLIENTE */}
        <button
          onClick={() => {
            setClienteToEdit(null);
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto bg-blue-700 text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-800 transition-colors shadow-md active:scale-95"
        >
          <Plus size={16} /> Nuevo Cliente
        </button>
      </div>

      {/* CONTROLES (PESTAÑAS Y BUSCADOR) */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex w-full md:w-auto bg-slate-100 p-1.5 rounded-xl gap-1">
          <button
            onClick={() => setActiveTab("registrados")}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${
              activeTab === "registrados"
                ? "bg-white text-blue-700 shadow-sm border border-slate-200/60"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
            }`}
          >
            <ShieldCheck size={16} /> Registrados ({clientesFiltrados.length})
          </button>
          <button
            onClick={() => setActiveTab("prospectos")}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${
              activeTab === "prospectos"
                ? "bg-blue-700 text-white shadow-md shadow-blue-700/20"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
            }`}
          >
            <Megaphone size={16} /> Prospectos ({prospectosFiltrados.length})
          </button>
        </div>

        <div className="relative w-full md:w-96 px-2 md:px-0">
          <Search
            className="absolute left-4 md:left-3 top-3 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar por empresa, correo o RFC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 transition-all font-medium text-slate-800"
          />
        </div>
      </div>

      {/* ÁREA DE CONTENIDO (TABLAS) */}
      {cargando ? (
        <div className="flex flex-col items-center justify-center p-12 gap-3">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold text-sm">
            Cargando directorio...
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[50vh]">
          {/* ========================================================= */}
          {/* 🟢 TABLA 1: CLIENTES REGISTRADOS */}
          {/* ========================================================= */}
          {activeTab === "registrados" && (
            <>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-4 w-1/4">Razón Social</th>
                      <th className="p-4">RFC</th>
                      <th className="p-4">Contacto (Correos)</th>
                      <th className="p-4">Teléfonos</th>
                      <th className="p-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {clientesPaginados.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="p-10 text-center text-slate-400 font-medium"
                        >
                          No se encontraron clientes registrados con esa
                          búsqueda.
                        </td>
                      </tr>
                    ) : (
                      clientesPaginados.map((c) => (
                        <tr
                          key={c.id}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="p-4 font-black text-slate-800 flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                              <ShieldCheck size={18} />
                            </div>
                            <span
                              className="truncate max-w-[200px]"
                              title={c.razon_social}
                            >
                              {c.razon_social}
                            </span>
                          </td>
                          <td className="p-4 text-slate-600 font-bold tracking-widest">
                            {c.rfc}
                          </td>
                          <td className="p-4">
                            {c.correos && c.correos.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {c.correos.map((correo, idx) => (
                                  <span
                                    key={idx}
                                    className="text-xs font-semibold text-slate-600 flex items-center gap-1.5"
                                  >
                                    <Mail
                                      size={12}
                                      className="text-slate-400"
                                    />{" "}
                                    {correo}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs italic text-slate-400">
                                Sin correo guardado
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            {c.telefonos && c.telefonos.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {c.telefonos.map((tel, idx) => (
                                  <span
                                    key={idx}
                                    className="text-xs font-semibold text-slate-600 flex items-center gap-1.5"
                                  >
                                    <Phone
                                      size={12}
                                      className="text-slate-400"
                                    />{" "}
                                    {tel}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs italic text-slate-400">
                                ---
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setClienteToEdit(c);
                                  setIsModalOpen(true);
                                }}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar Cliente"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => eliminarCliente(c.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar Cliente"
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
              {/* PAGINACIÓN CLIENTES */}
              {clientesFiltrados.length > itemsPorPagina && (
                <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center shrink-0">
                  <button
                    onClick={() =>
                      setPaginaRegistrados((p) => Math.max(1, p - 1))
                    }
                    disabled={paginaRegistrados === 1}
                    className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 font-bold text-xs hover:bg-slate-100 disabled:opacity-40 transition-colors flex items-center gap-1"
                  >
                    <ChevronLeft size={16} /> Anterior
                  </button>
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                    Página {paginaRegistrados} de {totalPaginasRegistrados}
                  </span>
                  <button
                    onClick={() =>
                      setPaginaRegistrados((p) =>
                        Math.min(totalPaginasRegistrados, p + 1),
                      )
                    }
                    disabled={paginaRegistrados === totalPaginasRegistrados}
                    className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 font-bold text-xs hover:bg-slate-100 disabled:opacity-40 transition-colors flex items-center gap-1"
                  >
                    Siguiente <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}

          {/* ========================================================= */}
          {/* 🟠 TABLA 2: PROSPECTOS DE MARKETING */}
          {/* ========================================================= */}
          {activeTab === "prospectos" && (
            <>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-sm">
                  <thead className="bg-blue-50 text-blue-800 uppercase tracking-wider text-[10px] font-bold border-b border-blue-100">
                    <tr>
                      <th className="p-4 w-1/3">Posible Cliente / Empresa</th>
                      <th className="p-4 w-1/2">
                        Correos Asociados (Recuperados)
                      </th>
                      <th className="p-4 text-center w-24">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {prospectosPaginados.length === 0 ? (
                      <tr>
                        <td
                          colSpan="3"
                          className="p-10 text-center text-slate-400 font-medium"
                        >
                          No se encontraron prospectos en la lista.
                        </td>
                      </tr>
                    ) : (
                      prospectosPaginados.map((p) => (
                        <tr
                          key={p.id}
                          className="hover:bg-slate-50 transition-colors group"
                        >
                          <td className="p-4">
                            <div className="font-bold text-slate-800 flex items-center gap-3">
                              <div className="p-2 bg-orange-50 text-orange-500 rounded-lg shrink-0">
                                <Megaphone size={18} />
                              </div>
                              {p.razon_social}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mt-2 ml-11">
                              <Phone size={12} />{" "}
                              {p.telefono !== "Sin teléfono registrado"
                                ? p.telefono
                                : "Sin teléfono"}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-2">
                              {p.correos &&
                                p.correos.split(", ").map((correo, index) => (
                                  <span
                                    key={index}
                                    className="text-[11px] font-semibold bg-white text-slate-600 px-2 py-1 rounded-md border border-slate-200 flex items-center gap-1.5 shadow-sm"
                                  >
                                    <Mail size={12} className="text-blue-500" />{" "}
                                    {correo}
                                  </span>
                                ))}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => eliminarProspecto(p.id)}
                              title="Eliminar Prospecto"
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {/* PAGINACIÓN PROSPECTOS */}
              {prospectosFiltrados.length > itemsPorPagina && (
                <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center shrink-0">
                  <button
                    onClick={() =>
                      setPaginaProspectos((p) => Math.max(1, p - 1))
                    }
                    disabled={paginaProspectos === 1}
                    className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 font-bold text-xs hover:bg-slate-100 disabled:opacity-40 transition-colors flex items-center gap-1"
                  >
                    <ChevronLeft size={16} /> Anterior
                  </button>
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                    Página {paginaProspectos} de {totalPaginasProspectos}
                  </span>
                  <button
                    onClick={() =>
                      setPaginaProspectos((p) =>
                        Math.min(totalPaginasProspectos, p + 1),
                      )
                    }
                    disabled={paginaProspectos === totalPaginasProspectos}
                    className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 font-bold text-xs hover:bg-slate-100 disabled:opacity-40 transition-colors flex items-center gap-1"
                  >
                    Siguiente <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 🟢 MODAL PARA CREAR O EDITAR CLIENTES */}
      <ClienteFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        clienteAEditar={clienteToEdit}
        onSaveSuccess={cargarDatos}
      />
    </div>
  );
}
