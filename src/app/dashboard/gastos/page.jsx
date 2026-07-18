"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  ChevronRight,
  DollarSign,
  Plus,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import Swal from "sweetalert2";
import { supabase } from "@/app/_lib/supabase/supabase";
import ModalGasto from "@/app/_components/ModalGasto";

const MESES = [
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

const formatearDinero = (cantidad) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(Number(cantidad || 0));

const claveMes = (anio, mes) =>
  `${anio}-${String(mes + 1).padStart(2, "0")}`;

const crearRangoMeses = (inicio, fin) => {
  const resultado = [];
  const cursor = new Date(inicio.anio, inicio.mes, 1);
  const limite = new Date(fin.anio, fin.mes, 1);

  while (cursor <= limite) {
    resultado.push({
      anio: cursor.getFullYear(),
      mes: cursor.getMonth(),
    });

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return resultado;
};

export default function GastosPage() {
  const hoy = useMemo(() => new Date(), []);

  const [mesInicio, setMesInicio] = useState(hoy.getMonth());
  const [anioInicio, setAnioInicio] = useState(hoy.getFullYear());
  const [mesFin, setMesFin] = useState(hoy.getMonth());
  const [anioFin, setAnioFin] = useState(hoy.getFullYear());

  const [gastosManuales, setGastosManuales] = useState([]);
  const [gastosViajes, setGastosViajes] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [gastoSeleccionado, setGastoSeleccionado] = useState(null);
  const [fechaInicialModal, setFechaInicialModal] = useState(null);

  const rangoValido =
    anioInicio < anioFin ||
    (anioInicio === anioFin && mesInicio <= mesFin);

  const fechaDesde = `${anioInicio}-${String(mesInicio + 1).padStart(
    2,
    "0",
  )}-01`;

  const fechaHasta = `${anioFin}-${String(mesFin + 1).padStart(
    2,
    "0",
  )}-${String(new Date(anioFin, mesFin + 1, 0).getDate()).padStart(2, "0")}`;

  const cargarGastos = useCallback(async () => {
    if (!rangoValido) {
      setGastosManuales([]);
      setGastosViajes([]);
      setCargando(false);
      return;
    }

    setCargando(true);

    try {
      const inicioISO = new Date(
        anioInicio,
        mesInicio,
        1,
        0,
        0,
        0,
      ).toISOString();

      const finExclusivoISO = new Date(
        anioFin,
        mesFin + 1,
        1,
        0,
        0,
        0,
      ).toISOString();

      const [manualesResult, viajesResult] = await Promise.all([
        supabase
          .from("gastos")
          .select(
            "id, concepto, categoria, monto, fecha, descripcion, created_at",
          )
          .gte("fecha", fechaDesde)
          .lte("fecha", fechaHasta)
          .order("fecha", { ascending: false }),

        supabase
          .from("viaje_gastos")
          .select(
            "id, monto, categoria, descripcion, created_at, viajes(nombre, destino)",
          )
          .eq("estatus", "aprobado")
          .gte("created_at", inicioISO)
          .lt("created_at", finExclusivoISO)
          .order("created_at", { ascending: false }),
      ]);

      if (manualesResult.error) {
        throw manualesResult.error;
      }

      if (viajesResult.error) {
        throw viajesResult.error;
      }

      setGastosManuales(manualesResult.data ?? []);
      setGastosViajes(viajesResult.data ?? []);
    } catch (error) {
      console.error(error);

      await Swal.fire({
        icon: "error",
        title: "No se pudieron cargar los gastos",
        text: error.message ?? "Ocurrió un error inesperado.",
      });
    } finally {
      setCargando(false);
    }
  }, [
    anioFin,
    anioInicio,
    fechaDesde,
    fechaHasta,
    mesFin,
    mesInicio,
    rangoValido,
  ]);

  useEffect(() => {
    void cargarGastos();
  }, [cargarGastos]);

  const mesesDelRango = useMemo(() => {
    if (!rangoValido) return [];

    return crearRangoMeses(
      {
        anio: anioInicio,
        mes: mesInicio,
      },
      {
        anio: anioFin,
        mes: mesFin,
      },
    );
  }, [anioFin, anioInicio, mesFin, mesInicio, rangoValido]);

  const resumenPorMes = useMemo(() => {
    const resumen = new Map(
      mesesDelRango.map(({ anio, mes }) => [
        claveMes(anio, mes),
        {
          anio,
          mes,
          manuales: [],
          viaticos: [],
        },
      ]),
    );

    gastosManuales.forEach((gasto) => {
      const [anio, mes] = gasto.fecha.split("-").map(Number);
      const registro = resumen.get(claveMes(anio, mes - 1));

      registro?.manuales.push(gasto);
    });

    gastosViajes.forEach((gasto) => {
      const fecha = new Date(gasto.created_at);
      const registro = resumen.get(
        claveMes(fecha.getFullYear(), fecha.getMonth()),
      );

      registro?.viaticos.push(gasto);
    });

    return [...resumen.values()];
  }, [gastosManuales, gastosViajes, mesesDelRango]);

  const totalManuales = useMemo(
    () =>
      gastosManuales.reduce(
        (total, gasto) => total + Number(gasto.monto || 0),
        0,
      ),
    [gastosManuales],
  );

  const totalViaticos = useMemo(
    () =>
      gastosViajes.reduce(
        (total, gasto) => total + Number(gasto.monto || 0),
        0,
      ),
    [gastosViajes],
  );

  const totalGeneral = totalManuales + totalViaticos;

  const aniosDisponibles = useMemo(() => {
    const anioActual = hoy.getFullYear();

    return Array.from(
      {
        length: 11,
      },
      (_, indice) => anioActual - 5 + indice,
    );
  }, [hoy]);

  const abrirNuevo = (anio = anioInicio, mes = mesInicio) => {
    setGastoSeleccionado(null);

    setFechaInicialModal(
      `${anio}-${String(mes + 1).padStart(2, "0")}-01`,
    );

    setModalAbierto(true);
  };

  const abrirEdicion = (gasto) => {
    setGastoSeleccionado(gasto);
    setFechaInicialModal(null);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setGastoSeleccionado(null);
    setFechaInicialModal(null);
  };

  const selectClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition hover:border-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20";

  return (
    <div className="mx-auto max-w-[90rem] space-y-6 pb-12">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-800">
            <WalletCards className="text-blue-700" />

            Control de Gastos
          </h1>

          <p className="mt-1 text-sm font-medium text-slate-500">
            Consulta egresos manuales y viáticos aprobados en un solo lugar.
          </p>
        </div>

        <button
          type="button"
          onClick={() => abrirNuevo()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-md transition hover:bg-blue-800 active:scale-95 sm:w-auto"
        >
          <Plus size={16} />

          Agregar gasto
        </button>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-slate-700">
          <CalendarRange size={18} className="text-blue-700" />

          <h2 className="text-sm font-black uppercase tracking-widest">
            Periodo a consultar
          </h2>
        </div>

        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-[1fr_1fr_auto_1fr_1fr]">
          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-slate-600">
              Mes inicial
            </span>

            <select
              value={mesInicio}
              onChange={(event) =>
                setMesInicio(Number(event.target.value))
              }
              className={selectClass}
            >
              {MESES.map((mes, indice) => (
                <option
                  key={mes}
                  value={indice}
                  className="bg-white text-slate-800"
                >
                  {mes}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-slate-600">
              Año inicial
            </span>

            <select
              value={anioInicio}
              onChange={(event) =>
                setAnioInicio(Number(event.target.value))
              }
              className={selectClass}
            >
              {aniosDisponibles.map((anio) => (
                <option
                  key={anio}
                  value={anio}
                  className="bg-white text-slate-800"
                >
                  {anio}
                </option>
              ))}
            </select>
          </label>

          <ChevronRight className="mx-auto mb-3 hidden text-slate-300 md:block" />

          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-slate-600">
              Mes final
            </span>

            <select
              value={mesFin}
              onChange={(event) => setMesFin(Number(event.target.value))}
              className={selectClass}
            >
              {MESES.map((mes, indice) => (
                <option
                  key={mes}
                  value={indice}
                  className="bg-white text-slate-800"
                >
                  {mes}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-slate-600">
              Año final
            </span>

            <select
              value={anioFin}
              onChange={(event) => setAnioFin(Number(event.target.value))}
              className={selectClass}
            >
              {aniosDisponibles.map((anio) => (
                <option
                  key={anio}
                  value={anio}
                  className="bg-white text-slate-800"
                >
                  {anio}
                </option>
              ))}
            </select>
          </label>
        </div>

        {!rangoValido && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
            La fecha inicial no puede ser posterior a la fecha final.
          </p>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-slate-800 p-6 text-white shadow-lg">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">
            Gasto total del periodo
          </p>

          <p className="mt-3 text-3xl font-black">
            {formatearDinero(totalGeneral)}
          </p>

          <p className="mt-2 text-xs font-semibold text-slate-400">
            {MESES[mesInicio]} {anioInicio} — {MESES[mesFin]} {anioFin}
          </p>
        </div>

        <div className="rounded-3xl border border-blue-100 bg-blue-50 p-6">
          <p className="text-xs font-black uppercase tracking-widest text-blue-600">
            Gastos manuales
          </p>

          <p className="mt-3 text-2xl font-black text-blue-950">
            {formatearDinero(totalManuales)}
          </p>

          <p className="mt-2 text-xs font-semibold text-blue-700/70">
            {gastosManuales.length} registros
          </p>
        </div>

        <div className="rounded-3xl border border-amber-100 bg-amber-50 p-6">
          <p className="text-xs font-black uppercase tracking-widest text-amber-700">
            Viáticos aprobados
          </p>

          <p className="mt-3 text-2xl font-black text-amber-950">
            {formatearDinero(totalViaticos)}
          </p>

          <p className="mt-2 text-xs font-semibold text-amber-700/70">
            {gastosViajes.length} comprobantes
          </p>
        </div>
      </section>

      {cargando ? (
        <div className="rounded-3xl border border-slate-200 bg-white py-20 text-center text-sm font-black uppercase tracking-widest text-slate-400">
          Cargando gastos...
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {resumenPorMes.map(({ anio, mes, manuales, viaticos }) => {
            const totalMesManuales = manuales.reduce(
              (total, gasto) => total + Number(gasto.monto || 0),
              0,
            );

            const totalMesViaticos = viaticos.reduce(
              (total, gasto) => total + Number(gasto.monto || 0),
              0,
            );

            const totalMes = totalMesManuales + totalMesViaticos;

            return (
              <article
                key={claveMes(anio, mes)}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() => abrirNuevo(anio, mes)}
                  className="flex w-full items-center justify-between bg-slate-800 px-5 py-4 text-left text-white transition hover:bg-slate-900"
                >
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">
                      {anio}
                    </p>

                    <h3 className="text-xl font-black">{MESES[mes]}</h3>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Total mensual
                    </p>

                    <p className="text-lg font-black">
                      {formatearDinero(totalMes)}
                    </p>
                  </div>
                </button>

                <div className="space-y-4 p-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-blue-50 p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                        Manuales
                      </p>

                      <p className="mt-1 text-sm font-black text-blue-950">
                        {formatearDinero(totalMesManuales)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-amber-50 p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                        Viáticos
                      </p>

                      <p className="mt-1 text-sm font-black text-amber-950">
                        {formatearDinero(totalMesViaticos)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-slate-500">
                        <ReceiptText size={13} />

                        Gastos registrados
                      </h4>

                      <button
                        type="button"
                        onClick={() => abrirNuevo(anio, mes)}
                        className="text-[10px] font-black uppercase tracking-widest text-blue-700 hover:text-blue-900"
                      >
                        + Agregar
                      </button>
                    </div>

                    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                      {manuales.map((gasto) => (
                        <button
                          type="button"
                          key={`manual-${gasto.id}`}
                          onClick={() => abrirEdicion(gasto)}
                          className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
                        >
                          <div className="min-w-0 pr-3">
                            <p className="truncate text-xs font-black text-slate-800">
                              {gasto.concepto}
                            </p>

                            <p className="mt-1 text-[10px] font-bold text-slate-500">
                              {gasto.fecha} · {gasto.categoria}
                            </p>
                          </div>

                          <p className="shrink-0 text-xs font-black text-slate-800">
                            {formatearDinero(gasto.monto)}
                          </p>
                        </button>
                      ))}

                      {viaticos.map((gasto) => (
                        <div
                          key={`viaje-${gasto.id}`}
                          className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3"
                        >
                          <div className="min-w-0 pr-3">
                            <p className="truncate text-xs font-black text-slate-800">
                              {gasto.descripcion ||
                                gasto.categoria ||
                                "Gasto de viático"}
                            </p>

                            <p className="mt-1 truncate text-[10px] font-bold text-amber-700">
                              Viático ·{" "}
                              {gasto.viajes?.nombre ||
                                gasto.viajes?.destino ||
                                "Viaje"}
                            </p>
                          </div>

                          <p className="shrink-0 text-xs font-black text-amber-900">
                            {formatearDinero(gasto.monto)}
                          </p>
                        </div>
                      ))}

                      {manuales.length === 0 && viaticos.length === 0 && (
                        <button
                          type="button"
                          onClick={() => abrirNuevo(anio, mes)}
                          className="w-full rounded-2xl border border-dashed border-slate-300 bg-white py-8 text-center transition hover:border-blue-400 hover:bg-blue-50"
                        >
                          <DollarSign
                            size={24}
                            className="mx-auto mb-2 text-slate-300"
                          />

                          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                            Sin gastos registrados
                          </p>

                          <p className="mt-1 text-[10px] font-semibold text-blue-600">
                            Haz clic para agregar uno
                          </p>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <ModalGasto
        isOpen={modalAbierto}
        onClose={cerrarModal}
        gasto={gastoSeleccionado}
        fechaInicial={fechaInicialModal}
        onGuardado={cargarGastos}
      />
    </div>
  );
}