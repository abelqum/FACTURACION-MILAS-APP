"use client";
import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { supabase } from "@/app/_lib/supabase/supabase";
import ProductFormModal from "@/app/_components/ProductFormModal";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";

export default function GestionProductos() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [marcas, setMarcas] = useState([]);

  // ESTADOS DEL MODAL
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // ESTADOS PARA LOS FILTROS
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");
  const [filterMarca, setFilterMarca] = useState("");

  // ESTADOS PARA PAGINACIÓN
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [resProd, resCat, resMar] = await Promise.all([
      supabase.from("productos").select("*").order("id", { ascending: true }),
      supabase.from("categorias").select("nombre").order("nombre"),
      supabase.from("marcas").select("nombre").order("nombre"),
    ]);

    if (resProd.data) setProductos(resProd.data);
    if (resCat.data) setCategorias(resCat.data);
    if (resMar.data) setMarcas(resMar.data);
  };

  // LÓGICA DE FILTRADO
  const filteredProducts = productos.filter((p) => {
    const matchSearch = p.nombre
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchCategoria = filterCategoria
      ? p.categoria === filterCategoria
      : true;
    const matchMarca = filterMarca ? p.marca === filterMarca : true;
    return matchSearch && matchCategoria && matchMarca;
  });

  // LÓGICA DE PAGINACIÓN
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategoria, filterMarca]);

  const openModal = (producto = null) => {
    setSelectedProduct(producto);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este producto?")) return;
    try {
      const productoAEliminar = productos.find((p) => p.id === id);

      if (
        productoAEliminar?.imagen_url?.includes("supabase.co") &&
        productoAEliminar?.imagen_url?.includes("/productos/")
      ) {
        try {
          const url = new URL(productoAEliminar.imagen_url);
          const pathSegments = url.pathname.split("/");
          let fileName = decodeURIComponent(
            pathSegments[pathSegments.length - 1],
          );
          await supabase.storage.from("productos").remove([fileName]);
        } catch (urlError) {
          console.error("Error al borrar imagen:", urlError);
        }
      }

      const { error } = await supabase.from("productos").delete().eq("id", id);
      if (error) throw error;

      await fetchData();
      if (currentProducts.length === 1 && currentPage > 1)
        setCurrentPage(currentPage - 1);
    } catch (error) {
      Swal.fire({ title: "Error", text: error.message, icon: "error" });
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* HEADER DASHBOARD */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-[#bec9c2]/30 pb-6">
        <div>
          <h1 className="text-2xl font-black text-[#131b2e] flex items-center gap-2">
            <Package className="text-[#004532]" /> Catálogo de Productos
          </h1>
          <p className="text-sm text-[#3f4944] mt-1">
            Gestiona tu inventario y precios por volumen de forma inteligente.
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-[#004532] text-white px-5 py-3 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-[#131b2e] transition-colors"
        >
          <Plus size={16} /> Agregar Producto
        </button>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-[#bec9c2]/30 mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#f8faf9] border border-[#bec9c2]/40 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004532]"
          />
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <select
            value={filterCategoria}
            onChange={(e) => setFilterCategoria(e.target.value)}
            className="w-full md:w-48 py-2 px-3 bg-[#f8faf9] border border-[#bec9c2]/40 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004532] text-[#3f4944]"
          >
            <option value="">Todas las Categorías</option>
            {categorias.map((c) => (
              <option key={c.nombre} value={c.nombre}>
                {c.nombre}
              </option>
            ))}
          </select>
          <select
            value={filterMarca}
            onChange={(e) => setFilterMarca(e.target.value)}
            className="w-full md:w-48 py-2 px-3 bg-[#f8faf9] border border-[#bec9c2]/40 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004532] text-[#3f4944]"
          >
            <option value="">Todas las Marcas</option>
            {marcas.map((m) => (
              <option key={m.nombre} value={m.nombre}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TABLA DE PRODUCTOS */}
      <div className="bg-white rounded-xl shadow-sm border border-[#bec9c2]/30 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#f2f3ff] text-[#3f4944] uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="p-4 rounded-tl-xl">Producto</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Precio Base</th>
                <th className="p-4">Mayoreos</th>
                <th className="p-4">Stock</th>
                <th className="p-4 text-center rounded-tr-xl">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#bec9c2]/20">
              {currentProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden border border-[#bec9c2]/20 shrink-0">
                      {p.imagen_url ? (
                        <img
                          src={p.imagen_url}
                          alt={p.nombre}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-full h-full p-2 text-slate-300" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-[#131b2e] truncate max-w-[200px]">
                        {p.nombre}
                      </p>
                      {p.destacado && (
                        <span className="text-[9px] bg-yellow-100 text-yellow-800 font-bold px-2 py-0.5 rounded-full uppercase">
                          Destacado
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-[#3f4944]">{p.categoria}</td>
                  <td className="p-4 font-bold text-[#004532]">
                    ${Number(p.precio).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      <span
                        className="w-2 h-2 rounded-full bg-[#004532]"
                        title="Nivel 1 configurado"
                      ></span>
                      {p.min_2 && (
                        <span
                          className="w-2 h-2 rounded-full bg-emerald-500"
                          title={`Min 2: ${p.min_2} pzas`}
                        ></span>
                      )}
                      {p.min_3 && (
                        <span
                          className="w-2 h-2 rounded-full bg-teal-400"
                          title={`Min 3: ${p.min_3} pzas`}
                        ></span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">{p.stock}</td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => openModal(p)}
                        className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-400">
                    No se encontraron productos con esos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* CONTROLES DE PAGINACIÓN */}
        {filteredProducts.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-[#bec9c2]/30 gap-4 bg-white rounded-b-xl">
            <span className="text-xs text-[#3f4944] font-medium">
              Mostrando {indexOfFirstItem + 1} a{" "}
              {Math.min(indexOfLastItem, filteredProducts.length)} de{" "}
              {filteredProducts.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setCurrentPage(currentPage > 1 ? currentPage - 1 : 1)
                }
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-[#bec9c2]/30 text-[#131b2e] hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-bold px-3 text-[#131b2e]">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage(
                    currentPage < totalPages ? currentPage + 1 : totalPages,
                  )
                }
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-[#bec9c2]/30 text-[#131b2e] hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RENDERIZADO DEL COMPONENTE MODAL */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        categorias={categorias}
        marcas={marcas}
        productoAEditar={selectedProduct}
        onSaveSuccess={fetchData}
      />
    </div>
  );
}
