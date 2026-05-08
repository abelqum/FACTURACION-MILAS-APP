"use client";
import { Search, Filter, X } from "lucide-react";

export default function FiltrosInventario({
  busqueda,
  setBusqueda,
  filtros,
  setFiltros,
  catalogos,
  limpiarFiltros,
}) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
      {/* BARRA DE BÚSQUEDA */}
      <div className="relative">
        <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Buscar por descripción o modelo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 shadow-inner transition-all"
        />
      </div>

      {/* FILTROS AVANZADOS */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-widest mr-2">
          <Filter size={16} /> Filtros:
        </div>

        <select
          value={filtros.marca}
          onChange={(e) => setFiltros({ ...filtros, marca: e.target.value })}
          className="flex-1 min-w-[140px] bg-white border border-slate-200 p-2.5 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-600 cursor-pointer"
        >
          <option value="">Todas las Marcas</option>
          {catalogos.marcas?.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>

        <select
          value={filtros.categoria}
          onChange={(e) =>
            setFiltros({ ...filtros, categoria: e.target.value })
          }
          className="flex-1 min-w-[140px] bg-white border border-slate-200 p-2.5 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-600 cursor-pointer"
        >
          <option value="">Todas las Categorías</option>
          {catalogos.categorias?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>

        <select
          value={filtros.medida}
          onChange={(e) => setFiltros({ ...filtros, medida: e.target.value })}
          className="flex-1 min-w-[120px] bg-white border border-slate-200 p-2.5 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-600 cursor-pointer"
        >
          <option value="">Cualquier Medida</option>
          {catalogos.medidas?.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>

        <select
          value={filtros.almacen}
          onChange={(e) => setFiltros({ ...filtros, almacen: e.target.value })}
          className="flex-1 min-w-[140px] bg-white border border-slate-200 p-2.5 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-600 cursor-pointer"
        >
          <option value="">Cualquier Ubicación</option>
          {catalogos.almacenes?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
            </option>
          ))}
        </select>

        <select
          value={filtros.estatus}
          onChange={(e) => setFiltros({ ...filtros, estatus: e.target.value })}
          className="flex-1 min-w-[140px] bg-white border border-slate-200 p-2.5 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-600 cursor-pointer"
        >
          <option value="">Todos los Estatus</option>
          <option value="comprar">Stock Bajo (Por Comprar)</option>
          <option value="suficiente">Stock Suficiente</option>
        </select>

        {/* Botón para limpiar filtros */}
        {(filtros.marca ||
          filtros.categoria ||
          filtros.medida ||
          filtros.almacen ||
          filtros.estatus) && (
          <button
            onClick={limpiarFiltros}
            className="p-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors flex items-center justify-center shrink-0"
            title="Limpiar filtros"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
