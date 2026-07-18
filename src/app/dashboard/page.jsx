"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Calendar,
  CheckCircle2,
  Download,
  ListTodo,
  Percent,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import Swal from "sweetalert2";
import { supabase } from "@/app/_lib/supabase/supabase";
import ModalReporteDashboard from "@/app/_components/ModalReporteDashboard";

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

const MESES_CORTOS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const SERIES_INICIALES = {
  ingresos: true,
  gastos: true,
  utilidad: true,
};

const formatearMoneda = (cantidad) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(Number(cantidad || 0));

const nombreEstadoFactura = (factura) =>
  factura.estados_factura?.nombre?.trim().toUpperCase() ?? "";

const fechaFactura = (valor) => {
  if (!valor) return null;
  return new Date(`${valor}T12:00:00`);
};

const fechaGasto = (valor) => {
  if (!valor) return null;
  return new Date(`${valor}T12:00:00`);
};

const convertirPeriodo = (anio, mes) => Number(anio) * 12 + Number(mes);

const fechaDentroPeriodo = (
  fecha,
  anioInicio,
  mesInicio,
  anioFin,
  mesFin,
) => {
  if (!fecha) return false;

  const periodoFecha = convertirPeriodo(fecha.getFullYear(), fecha.getMonth());
  const inicio = convertirPeriodo(anioInicio, mesInicio);
  const fin = convertirPeriodo(anioFin, mesFin);

  return periodoFecha >= inicio && periodoFecha <= fin;
};

function ToggleSerie({
  activo,
  nombre,
  color,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 transition hover:bg-slate-50"
    >
      <span
        className={`relative h-6 w-11 rounded-full transition ${
          activo ? color : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
            activo ? "left-6" : "left-1"
          }`}
        />
      </span>

      <span className="text-xs font-black text-slate-700">{nombre}</span>
    </button>
  );
}

function TooltipMoneda({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
      <p className="mb-2 text-sm font-black text-slate-800">{label}</p>

      {payload.map((elemento) => (
        <p
          key={elemento.dataKey}
          className="mt-1 text-xs font-bold"
          style={{ color: elemento.color }}
        >
          {elemento.name}: {formatearMoneda(elemento.value)}
        </p>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const hoyRef = useRef(new Date());

  const graficaHistoricaRef = useRef(null);
  const graficaMensualRef = useRef(null);
  const graficaDistribucionRef = useRef(null);
  const graficaCategoriasRef = useRef(null);

  const [usuarioActivo, setUsuarioActivo] = useState(null);
  const [facturas, setFacturas] = useState([]);
  const [gastosManuales, setGastosManuales] = useState([]);
  const [gastosViajes, setGastosViajes] = useState([]);
  const [misTareas, setMisTareas] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [seriesHistoricas, setSeriesHistoricas] =
    useState(SERIES_INICIALES);

  const [seriesMensuales, setSeriesMensuales] =
    useState(SERIES_INICIALES);

  const [anioMensual, setAnioMensual] = useState(
    hoyRef.current.getFullYear(),
  );

  const [mesInicio, setMesInicio] = useState(hoyRef.current.getMonth());
  const [anioInicio, setAnioInicio] = useState(
    hoyRef.current.getFullYear(),
  );

  const [mesFin, setMesFin] = useState(hoyRef.current.getMonth());
  const [anioFin, setAnioFin] = useState(hoyRef.current.getFullYear());

  const [mesCategoriaInicio, setMesCategoriaInicio] = useState(
    hoyRef.current.getMonth(),
  );
  const [anioCategoriaInicio, setAnioCategoriaInicio] = useState(
    hoyRef.current.getFullYear(),
  );
  const [mesCategoriaFin, setMesCategoriaFin] = useState(
    hoyRef.current.getMonth(),
  );
  const [anioCategoriaFin, setAnioCategoriaFin] = useState(
    hoyRef.current.getFullYear(),
  );

  const [modalReporteAbierto, setModalReporteAbierto] = useState(false);
  const [generandoReporte, setGenerandoReporte] = useState(false);

  const [opcionesReporte, setOpcionesReporte] = useState({
    resumen: true,
    historica: true,
    mensual: true,
    distribucion: true,
    categorias: true,
  });

  const cargarDashboard = useCallback(async () => {
    setCargando(true);

    try {
      const {
        data: { session },
        error: errorSesion,
      } = await supabase.auth.getSession();

      if (errorSesion || !session) {
        throw new Error("No existe una sesión activa.");
      }

      const { data: perfil, error: errorPerfil } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (errorPerfil) throw errorPerfil;

      setUsuarioActivo(perfil);

      if (perfil.rol === "admin" || perfil.rol === "editor") {
        const [facturasResult, gastosResult, viaticosResult] =
          await Promise.all([
            supabase
              .from("facturas")
              .select(`
                *,
                estados_factura(nombre)
              `)
              .order("fecha", { ascending: true }),

            supabase
              .from("gastos")
              .select("*")
              .order("fecha", { ascending: true }),

            supabase
              .from("viaje_gastos")
              .select(`
                *,
                viajes(nombre, destino)
              `)
              .eq("estatus", "aprobado")
              .order("created_at", { ascending: true }),
          ]);

        if (facturasResult.error) throw facturasResult.error;
        if (gastosResult.error) throw gastosResult.error;
        if (viaticosResult.error) throw viaticosResult.error;

        setFacturas(facturasResult.data ?? []);
        setGastosManuales(gastosResult.data ?? []);
        setGastosViajes(viaticosResult.data ?? []);
      } else {
        const { data, error } = await supabase
          .from("tareas")
          .select(`
            *,
            creador:perfiles!tareas_creado_por_fkey(nombre)
          `)
          .contains("asignados_ids", [perfil.id])
          .neq("estado", "completada")
          .order("fecha_limite", {
            ascending: true,
            nullsFirst: false,
          })
          .limit(6);

        if (error) throw error;

        setMisTareas(data ?? []);
      }
    } catch (error) {
      console.error("Error cargando dashboard:", error);

      await Swal.fire({
        icon: "error",
        title: "No se pudo cargar el dashboard",
        text: error.message ?? "Ocurrió un error inesperado.",
      });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarDashboard();
  }, [cargarDashboard]);

  const aniosDisponibles = useMemo(() => {
    const conjunto = new Set([hoyRef.current.getFullYear()]);

    facturas.forEach((factura) => {
      const fecha = fechaFactura(factura.fecha);
      if (fecha) conjunto.add(fecha.getFullYear());
    });

    gastosManuales.forEach((gasto) => {
      const fecha = fechaGasto(gasto.fecha);
      if (fecha) conjunto.add(fecha.getFullYear());
    });

    gastosViajes.forEach((gasto) => {
      const fecha = new Date(gasto.created_at);
      if (!Number.isNaN(fecha.getTime())) conjunto.add(fecha.getFullYear());
    });

    return [...conjunto].sort((a, b) => a - b);
  }, [facturas, gastosManuales, gastosViajes]);

  const obtenerTotalesPeriodo = useCallback(
    (
      periodoAnioInicio,
      periodoMesInicio,
      periodoAnioFin,
      periodoMesFin,
    ) => {
      const resumen = {
        ingresos: 0,
        pendiente: 0,
        gastosManuales: 0,
        viaticos: 0,
        gastos: 0,
        utilidad: 0,
        margen: 0,
      };

      facturas.forEach((factura) => {
        const fecha = fechaFactura(factura.fecha);

        if (
          !fechaDentroPeriodo(
            fecha,
            periodoAnioInicio,
            periodoMesInicio,
            periodoAnioFin,
            periodoMesFin,
          )
        ) {
          return;
        }

        const estado = nombreEstadoFactura(factura);

        if (estado === "CANCELADO") return;

        const total = Number(factura.total || 0);

        if (estado === "PAGADO") resumen.ingresos += total;
        if (estado === "PENDIENTE") resumen.pendiente += total;
      });

      gastosManuales.forEach((gasto) => {
        const fecha = fechaGasto(gasto.fecha);

        if (
          fechaDentroPeriodo(
            fecha,
            periodoAnioInicio,
            periodoMesInicio,
            periodoAnioFin,
            periodoMesFin,
          )
        ) {
          resumen.gastosManuales += Number(gasto.monto || 0);
        }
      });

      gastosViajes.forEach((gasto) => {
        const fecha = new Date(gasto.created_at);

        if (
          fechaDentroPeriodo(
            fecha,
            periodoAnioInicio,
            periodoMesInicio,
            periodoAnioFin,
            periodoMesFin,
          )
        ) {
          resumen.viaticos += Number(gasto.monto || 0);
        }
      });

      resumen.gastos = resumen.gastosManuales + resumen.viaticos;
      resumen.utilidad = resumen.ingresos - resumen.gastos;
      resumen.margen =
        resumen.ingresos > 0
          ? (resumen.utilidad / resumen.ingresos) * 100
          : 0;

      return resumen;
    },
    [facturas, gastosManuales, gastosViajes],
  );

  const datosHistoricos = useMemo(
    () =>
      aniosDisponibles.map((anio) => {
        const resumen = obtenerTotalesPeriodo(anio, 0, anio, 11);

        return {
          anio: String(anio),
          ingresos: resumen.ingresos,
          gastos: resumen.gastos,
          utilidad: resumen.utilidad,
        };
      }),
    [aniosDisponibles, obtenerTotalesPeriodo],
  );

  const datosMensuales = useMemo(
    () =>
      MESES_CORTOS.map((mes, indice) => {
        const resumen = obtenerTotalesPeriodo(
          anioMensual,
          indice,
          anioMensual,
          indice,
        );

        return {
          mes,
          ingresos: resumen.ingresos,
          gastos: resumen.gastos,
          utilidad: resumen.utilidad,
        };
      }),
    [anioMensual, obtenerTotalesPeriodo],
  );

  const rangoDistribucionValido =
    convertirPeriodo(anioInicio, mesInicio) <=
    convertirPeriodo(anioFin, mesFin);

  const resumenDistribucion = useMemo(() => {
    if (!rangoDistribucionValido) {
      return {
        ingresos: 0,
        pendiente: 0,
        gastosManuales: 0,
        viaticos: 0,
        gastos: 0,
        utilidad: 0,
        margen: 0,
      };
    }

    return obtenerTotalesPeriodo(
      anioInicio,
      mesInicio,
      anioFin,
      mesFin,
    );
  }, [
    anioFin,
    anioInicio,
    mesFin,
    mesInicio,
    obtenerTotalesPeriodo,
    rangoDistribucionValido,
  ]);

  const datosPastel = useMemo(() => {
    if (
      resumenDistribucion.ingresos === 0 &&
      resumenDistribucion.gastos === 0
    ) {
      return [
        {
          nombre: "Sin movimientos",
          valor: 1,
          color: "#cbd5e1",
        },
      ];
    }

    if (resumenDistribucion.utilidad >= 0) {
      return [
        {
          nombre: "Gastos",
          valor: resumenDistribucion.gastos,
          color: "#ef4444",
        },
        {
          nombre: "Utilidad",
          valor: resumenDistribucion.utilidad,
          color: "#10b981",
        },
      ].filter((elemento) => elemento.valor > 0);
    }

    return [
      {
        nombre: "Ingresos",
        valor: resumenDistribucion.ingresos,
        color: "#10b981",
      },
      {
        nombre: "Déficit",
        valor: Math.abs(resumenDistribucion.utilidad),
        color: "#f59e0b",
      },
    ];
  }, [resumenDistribucion]);

  const rangoCategoriasValido =
    convertirPeriodo(anioCategoriaInicio, mesCategoriaInicio) <=
    convertirPeriodo(anioCategoriaFin, mesCategoriaFin);

  const datosCategorias = useMemo(() => {
    if (!rangoCategoriasValido) return [];

    const categorias = new Map();

    gastosManuales.forEach((gasto) => {
      const fecha = fechaGasto(gasto.fecha);

      if (
        !fechaDentroPeriodo(
          fecha,
          anioCategoriaInicio,
          mesCategoriaInicio,
          anioCategoriaFin,
          mesCategoriaFin,
        )
      ) {
        return;
      }

      const categoria = gasto.categoria || "Otros";

      categorias.set(
        categoria,
        (categorias.get(categoria) ?? 0) + Number(gasto.monto || 0),
      );
    });

    gastosViajes.forEach((gasto) => {
      const fecha = new Date(gasto.created_at);

      if (
        !fechaDentroPeriodo(
          fecha,
          anioCategoriaInicio,
          mesCategoriaInicio,
          anioCategoriaFin,
          mesCategoriaFin,
        )
      ) {
        return;
      }

      const categoria = `Viáticos: ${gasto.categoria || "Otros"}`;

      categorias.set(
        categoria,
        (categorias.get(categoria) ?? 0) + Number(gasto.monto || 0),
      );
    });

    return [...categorias.entries()]
      .map(([categoria, total]) => ({
        categoria,
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [
    anioCategoriaFin,
    anioCategoriaInicio,
    gastosManuales,
    gastosViajes,
    mesCategoriaFin,
    mesCategoriaInicio,
    rangoCategoriasValido,
  ]);

  const cambiarSerie = (setter, serie) => {
    setter((actual) => ({
      ...actual,
      [serie]: !actual[serie],
    }));
  };

  const agregarGraficaAlPdf = async (doc, elemento, titulo, posicionY) => {
    if (!elemento) return posicionY;

    const canvas = await html2canvas(elemento, {
      scale: 1.5,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });

    const imagen = canvas.toDataURL("image/png", 0.95);
    const anchoPagina = doc.internal.pageSize.getWidth();
    const altoPagina = doc.internal.pageSize.getHeight();

    const anchoDisponible = anchoPagina - 24;
    const altoImagen = (canvas.height * anchoDisponible) / canvas.width;

    if (posicionY + altoImagen + 18 > altoPagina - 12) {
      doc.addPage();
      posicionY = 16;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text(titulo, 12, posicionY);

    posicionY += 5;

    doc.addImage(
      imagen,
      "PNG",
      12,
      posicionY,
      anchoDisponible,
      Math.min(altoImagen, altoPagina - posicionY - 12),
    );

    return posicionY + altoImagen + 10;
  };

  const generarReporte = async () => {
    setGenerandoReporte(true);

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "letter",
      });

      const anchoPagina = doc.internal.pageSize.getWidth();

      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, anchoPagina, 32, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(19);
      doc.text("Reporte financiero operativo", 12, 14);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("MILAS Equipos Industriales", 12, 21);
      doc.text(
        new Intl.DateTimeFormat("es-MX", {
          dateStyle: "long",
          timeStyle: "short",
        }).format(new Date()),
        12,
        27,
      );

      let posicionY = 42;

      if (opcionesReporte.resumen) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text("Resumen del periodo seleccionado", 12, posicionY);

        autoTable(doc, {
          startY: posicionY + 5,
          theme: "grid",
          headStyles: {
            fillColor: [29, 78, 216],
          },
          head: [["Indicador", "Resultado"]],
          body: [
            ["Ingresos pagados", formatearMoneda(resumenDistribucion.ingresos)],
            [
              "Gastos manuales",
              formatearMoneda(resumenDistribucion.gastosManuales),
            ],
            [
              "Viáticos aprobados",
              formatearMoneda(resumenDistribucion.viaticos),
            ],
            ["Gastos totales", formatearMoneda(resumenDistribucion.gastos)],
            [
              resumenDistribucion.utilidad >= 0 ? "Utilidad" : "Déficit",
              formatearMoneda(resumenDistribucion.utilidad),
            ],
            ["Margen retenido", `${resumenDistribucion.margen.toFixed(1)}%`],
            [
              "Pendiente por cobrar",
              formatearMoneda(resumenDistribucion.pendiente),
            ],
            [
              "Periodo",
              `${MESES[mesInicio]} ${anioInicio} - ${MESES[mesFin]} ${anioFin}`,
            ],
          ],
        });

        posicionY = doc.lastAutoTable.finalY + 10;
      }

      if (opcionesReporte.historica) {
        posicionY = await agregarGraficaAlPdf(
          doc,
          graficaHistoricaRef.current,
          "Evolución histórica anual",
          posicionY,
        );
      }

      if (opcionesReporte.mensual) {
        posicionY = await agregarGraficaAlPdf(
          doc,
          graficaMensualRef.current,
          `Evolución mensual de ${anioMensual}`,
          posicionY,
        );
      }

      if (opcionesReporte.distribucion) {
        posicionY = await agregarGraficaAlPdf(
          doc,
          graficaDistribucionRef.current,
          "Distribución del periodo",
          posicionY,
        );
      }

      if (opcionesReporte.categorias) {
        await agregarGraficaAlPdf(
          doc,
          graficaCategoriasRef.current,
          "Categorías de gastos",
          posicionY,
        );
      }

      const paginas = doc.internal.getNumberOfPages();

      for (let pagina = 1; pagina <= paginas; pagina += 1) {
        doc.setPage(pagina);
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(
          `Página ${pagina} de ${paginas}`,
          anchoPagina - 12,
          doc.internal.pageSize.getHeight() - 7,
          {
            align: "right",
          },
        );
      }

      doc.save(`reporte_dashboard_${Date.now()}.pdf`);
      setModalReporteAbierto(false);
    } catch (error) {
      console.error("Error generando PDF:", error);

      await Swal.fire({
        icon: "error",
        title: "No se pudo generar el reporte",
        text: error.message ?? "Ocurrió un error inesperado.",
      });
    } finally {
      setGenerandoReporte(false);
    }
  };

  const selectClass =
    "rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20";

  if (cargando) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-blue-700 border-t-transparent" />
      </div>
    );
  }

  if (usuarioActivo?.rol === "empleado") {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl bg-blue-700 p-8 text-white shadow-lg">
          <h1 className="text-3xl font-black">
            ¡Bienvenido(a), {usuarioActivo?.nombre?.split(" ")[0] ?? "Usuario"}!
          </h1>

          <p className="mt-3 text-sm font-medium text-blue-100">
            Consulta tus próximas actividades y administra tus tareas desde el
            módulo correspondiente.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-800">
            <ListTodo className="text-blue-700" />
            Próximas tareas
          </h2>

          {misTareas.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center">
              <CheckCircle2
                size={38}
                className="mx-auto mb-3 text-emerald-500"
              />

              <p className="font-black text-slate-700">
                No tienes tareas pendientes
              </p>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              {misTareas.map((tarea) => (
                <article
                  key={tarea.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <h3 className="font-black text-slate-800">{tarea.titulo}</h3>

                  <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                    {tarea.descripcion || "Sin descripción adicional."}
                  </p>

                  <p className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-500">
                    <Calendar size={14} />

                    {tarea.fecha_limite
                      ? new Intl.DateTimeFormat("es-MX", {
                          dateStyle: "medium",
                        }).format(new Date(tarea.fecha_limite))
                      : "Sin fecha límite"}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[95rem] space-y-7 pb-12">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-800">
            <TrendingUp className="text-blue-700" />
            Resumen financiero
          </h1>

          <p className="mt-1 text-sm font-medium text-slate-500">
            Ingresos, gastos, utilidad y evolución operativa de la empresa.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalReporteAbierto(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-blue-800"
        >
          <Download size={17} />
          Generar reporte
        </button>
      </header>

      <section
        ref={graficaHistoricaRef}
        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-lg font-black text-slate-800">
              Evolución histórica anual
            </h2>

            <p className="mt-1 text-xs font-semibold text-slate-500">
              Incluye automáticamente todos los años disponibles.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ToggleSerie
              activo={seriesHistoricas.ingresos}
              nombre="Ingresos"
              color="bg-emerald-600"
              onClick={() =>
                cambiarSerie(setSeriesHistoricas, "ingresos")
              }
            />

            <ToggleSerie
              activo={seriesHistoricas.gastos}
              nombre="Gastos"
              color="bg-red-600"
              onClick={() => cambiarSerie(setSeriesHistoricas, "gastos")}
            />

            <ToggleSerie
              activo={seriesHistoricas.utilidad}
              nombre="Utilidad"
              color="bg-blue-700"
              onClick={() =>
                cambiarSerie(setSeriesHistoricas, "utilidad")
              }
            />
          </div>
        </div>

        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={datosHistoricos}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
            />

            <XAxis dataKey="anio" axisLine={false} tickLine={false} />
            <YAxis axisLine={false} tickLine={false} />
            <Tooltip content={<TooltipMoneda />} />
            <Legend />

            {seriesHistoricas.ingresos && (
              <Bar
                dataKey="ingresos"
                name="Ingresos"
                fill="#10b981"
                radius={[6, 6, 0, 0]}
              />
            )}

            {seriesHistoricas.gastos && (
              <Bar
                dataKey="gastos"
                name="Gastos"
                fill="#ef4444"
                radius={[6, 6, 0, 0]}
              />
            )}

            {seriesHistoricas.utilidad && (
              <Bar
                dataKey="utilidad"
                name="Utilidad"
                fill="#2563eb"
                radius={[6, 6, 0, 0]}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section
        ref={graficaMensualRef}
        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-lg font-black text-slate-800">
              Evolución mensual
            </h2>

            <p className="mt-1 text-xs font-semibold text-slate-500">
              Comparación de enero a diciembre del año seleccionado.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={anioMensual}
              onChange={(event) => setAnioMensual(Number(event.target.value))}
              className={selectClass}
            >
              {aniosDisponibles.map((anio) => (
                <option key={anio} value={anio}>
                  {anio}
                </option>
              ))}
            </select>

            <ToggleSerie
              activo={seriesMensuales.ingresos}
              nombre="Ingresos"
              color="bg-emerald-600"
              onClick={() => cambiarSerie(setSeriesMensuales, "ingresos")}
            />

            <ToggleSerie
              activo={seriesMensuales.gastos}
              nombre="Gastos"
              color="bg-red-600"
              onClick={() => cambiarSerie(setSeriesMensuales, "gastos")}
            />

            <ToggleSerie
              activo={seriesMensuales.utilidad}
              nombre="Utilidad"
              color="bg-blue-700"
              onClick={() => cambiarSerie(setSeriesMensuales, "utilidad")}
            />
          </div>
        </div>

        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={datosMensuales}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
            />

            <XAxis dataKey="mes" axisLine={false} tickLine={false} />
            <YAxis axisLine={false} tickLine={false} />
            <Tooltip content={<TooltipMoneda />} />
            <Legend />

            {seriesMensuales.ingresos && (
              <Bar
                dataKey="ingresos"
                name="Ingresos"
                fill="#10b981"
                radius={[6, 6, 0, 0]}
              />
            )}

            {seriesMensuales.gastos && (
              <Bar
                dataKey="gastos"
                name="Gastos"
                fill="#ef4444"
                radius={[6, 6, 0, 0]}
              />
            )}

            {seriesMensuales.utilidad && (
              <Bar
                dataKey="utilidad"
                name="Utilidad"
                fill="#2563eb"
                radius={[6, 6, 0, 0]}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section
        ref={graficaDistribucionRef}
        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-6 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <h2 className="text-lg font-black text-slate-800">
              Distribución financiera del periodo
            </h2>

            <p className="mt-1 text-xs font-semibold text-slate-500">
              Selecciona el primer y último mes que deseas analizar.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <select
              value={mesInicio}
              onChange={(event) => setMesInicio(Number(event.target.value))}
              className={selectClass}
            >
              {MESES.map((mes, indice) => (
                <option key={mes} value={indice}>
                  Desde: {mes}
                </option>
              ))}
            </select>

            <select
              value={anioInicio}
              onChange={(event) => setAnioInicio(Number(event.target.value))}
              className={selectClass}
            >
              {aniosDisponibles.map((anio) => (
                <option key={anio} value={anio}>
                  {anio}
                </option>
              ))}
            </select>

            <select
              value={mesFin}
              onChange={(event) => setMesFin(Number(event.target.value))}
              className={selectClass}
            >
              {MESES.map((mes, indice) => (
                <option key={mes} value={indice}>
                  Hasta: {mes}
                </option>
              ))}
            </select>

            <select
              value={anioFin}
              onChange={(event) => setAnioFin(Number(event.target.value))}
              className={selectClass}
            >
              {aniosDisponibles.map((anio) => (
                <option key={anio} value={anio}>
                  {anio}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!rangoDistribucionValido && (
          <p className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
            La fecha inicial no puede ser posterior a la fecha final.
          </p>
        )}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:col-span-3 xl:grid-cols-2">
            <article className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
              <ArrowUpRight className="text-emerald-600" />

              <p className="mt-4 text-xs font-black uppercase tracking-widest text-emerald-700">
                Ingresos
              </p>

              <p className="mt-2 text-2xl font-black text-emerald-900">
                {formatearMoneda(resumenDistribucion.ingresos)}
              </p>
            </article>

            <article className="rounded-2xl border border-red-100 bg-red-50 p-5">
              <ArrowDownRight className="text-red-600" />

              <p className="mt-4 text-xs font-black uppercase tracking-widest text-red-700">
                Gastos
              </p>

              <p className="mt-2 text-2xl font-black text-red-900">
                {formatearMoneda(resumenDistribucion.gastos)}
              </p>
            </article>

            <article className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <Banknote className="text-blue-700" />

              <p className="mt-4 text-xs font-black uppercase tracking-widest text-blue-700">
                {resumenDistribucion.utilidad >= 0 ? "Utilidad" : "Déficit"}
              </p>

              <p className="mt-2 text-2xl font-black text-blue-950">
                {formatearMoneda(resumenDistribucion.utilidad)}
              </p>
            </article>

            <article className="rounded-2xl border border-violet-100 bg-violet-50 p-5">
              <Percent className="text-violet-700" />

              <p className="mt-4 text-xs font-black uppercase tracking-widest text-violet-700">
                Margen
              </p>

              <p className="mt-2 text-2xl font-black text-violet-950">
                {resumenDistribucion.margen.toFixed(1)}%
              </p>
            </article>
          </div>

          <div className="relative xl:col-span-2">
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={datosPastel}
                  dataKey="valor"
                  nameKey="nombre"
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={120}
                  paddingAngle={3}
                >
                  {datosPastel.map((elemento) => (
                    <Cell
                      key={elemento.nombre}
                      fill={elemento.color}
                    />
                  ))}
                </Pie>

                <Tooltip formatter={(valor) => formatearMoneda(valor)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Ingresos
              </p>

              <p className="text-base font-black text-slate-800">
                {formatearMoneda(resumenDistribucion.ingresos)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        ref={graficaCategoriasRef}
        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-6 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <h2 className="text-lg font-black text-slate-800">
              Gastos por categoría
            </h2>

            <p className="mt-1 text-xs font-semibold text-slate-500">
              Este bloque cuenta con filtros independientes.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <select
              value={mesCategoriaInicio}
              onChange={(event) =>
                setMesCategoriaInicio(Number(event.target.value))
              }
              className={selectClass}
            >
              {MESES.map((mes, indice) => (
                <option key={mes} value={indice}>
                  Desde: {mes}
                </option>
              ))}
            </select>

            <select
              value={anioCategoriaInicio}
              onChange={(event) =>
                setAnioCategoriaInicio(Number(event.target.value))
              }
              className={selectClass}
            >
              {aniosDisponibles.map((anio) => (
                <option key={anio} value={anio}>
                  {anio}
                </option>
              ))}
            </select>

            <select
              value={mesCategoriaFin}
              onChange={(event) =>
                setMesCategoriaFin(Number(event.target.value))
              }
              className={selectClass}
            >
              {MESES.map((mes, indice) => (
                <option key={mes} value={indice}>
                  Hasta: {mes}
                </option>
              ))}
            </select>

            <select
              value={anioCategoriaFin}
              onChange={(event) =>
                setAnioCategoriaFin(Number(event.target.value))
              }
              className={selectClass}
            >
              {aniosDisponibles.map((anio) => (
                <option key={anio} value={anio}>
                  {anio}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!rangoCategoriasValido ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
            La fecha inicial no puede ser posterior a la fecha final.
          </p>
        ) : datosCategorias.length === 0 ? (
          <div className="flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50">
            <div className="text-center">
              <ReceiptText
                size={38}
                className="mx-auto mb-3 text-slate-300"
              />

              <p className="font-black text-slate-500">
                No hay gastos en este periodo
              </p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={380}>
            <BarChart
              data={datosCategorias}
              layout="vertical"
              margin={{
                left: 35,
                right: 25,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="#e2e8f0"
              />

              <XAxis type="number" axisLine={false} tickLine={false} />

              <YAxis
                type="category"
                dataKey="categoria"
                width={145}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip content={<TooltipMoneda />} />

              <Bar
                dataKey="total"
                name="Gasto"
                fill="#7c3aed"
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      <ModalReporteDashboard
        isOpen={modalReporteAbierto}
        onClose={() => setModalReporteAbierto(false)}
        opciones={opcionesReporte}
        setOpciones={setOpcionesReporte}
        generando={generandoReporte}
        onGenerar={generarReporte}
      />
    </div>
  );
}