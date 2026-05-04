"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/app/_lib/supabase/supabase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  Wallet,
  Clock,
  Landmark,
  Calendar,
  History,
  CheckCircle2,
  Circle,
  ListTodo,
  User,
} from "lucide-react";

export default function Dashboard() {
  const [usuarioActivo, setUsuarioActivo] = useState(null);
  const [facturas, setFacturas] = useState([]);
  const [misTareas, setMisTareas] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [anioSeleccionado, setAnioSeleccionado] = useState(
    new Date().getFullYear().toString(),
  );

  useEffect(() => {
    const inicializar = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;

        const { data: perfil } = await supabase
          .from("perfiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        setUsuarioActivo(perfil);

        if (perfil.rol === "admin" || perfil.rol === "editor") {
          // Si es admin, cargamos facturas para las gráficas
          const { data: dataFacturas } = await supabase
            .from("facturas")
            .select(`*, estados_factura ( nombre )`);
          setFacturas(dataFacturas || []);
        } else {
          // Si es empleado, SOLO cargamos sus tareas pendientes
          const { data: dataTareas } = await supabase
            .from("tareas")
            .select(`*, creador:perfiles!tareas_creado_por_fkey(nombre)`)
            .contains("asignados_ids", [perfil.id])
            .eq("estado", "pendiente")
            .order("fecha_limite", { ascending: true, nullsFirst: false });
          setMisTareas(dataTareas || []);
        }
      } catch (error) {
        console.error("Error cargando dashboard:", error);
      } finally {
        setCargando(false);
      }
    };
    inicializar();
  }, []);

  // --- LÓGICA DE GRÁFICAS (SOLO PARA ADMINS) ---
  const datosProcesados = useMemo(() => {
    const facturasDelAnio = facturas.filter((f) => {
      if (!f.fecha) return false;
      const fAno = new Date(f.fecha + "T12:00:00Z").getFullYear().toString();
      return fAno === anioSeleccionado;
    });

    const mesesBase = [
      { mes: "Ene", pagado: 0, pendiente: 0, total: 0 },
      { mes: "Feb", pagado: 0, pendiente: 0, total: 0 },
      { mes: "Mar", pagado: 0, pendiente: 0, total: 0 },
      { mes: "Abr", pagado: 0, pendiente: 0, total: 0 },
      { mes: "May", pagado: 0, pendiente: 0, total: 0 },
      { mes: "Jun", pagado: 0, pendiente: 0, total: 0 },
      { mes: "Jul", pagado: 0, pendiente: 0, total: 0 },
      { mes: "Ago", pagado: 0, pendiente: 0, total: 0 },
      { mes: "Sep", pagado: 0, pendiente: 0, total: 0 },
      { mes: "Oct", pagado: 0, pendiente: 0, total: 0 },
      { mes: "Nov", pagado: 0, pendiente: 0, total: 0 },
      { mes: "Dic", pagado: 0, pendiente: 0, total: 0 },
    ];

    let resumen = { ingresos: 0, porCobrar: 0, totalEmitido: 0 };

    facturasDelAnio.forEach((f) => {
      const mesIndex = new Date(f.fecha + "T12:00:00Z").getMonth();
      const totalFactura = Number(f.total) || 0;
      if (f.estados_factura?.nombre === "CANCELADO") return;

      resumen.totalEmitido += totalFactura;
      mesesBase[mesIndex].total += totalFactura;

      if (f.estados_factura?.nombre === "PAGADO") {
        resumen.ingresos += totalFactura;
        mesesBase[mesIndex].pagado += totalFactura;
      } else if (f.estados_factura?.nombre === "PENDIENTE") {
        resumen.porCobrar += totalFactura;
        mesesBase[mesIndex].pendiente += totalFactura;
      }
    });

    return { grafica: mesesBase, resumen };
  }, [facturas, anioSeleccionado]);

  const datosPorAnio = useMemo(() => {
    const agrupado = {};
    facturas.forEach((f) => {
      if (!f.fecha) return;
      const fAno = new Date(f.fecha + "T12:00:00Z").getFullYear().toString();
      const totalFactura = Number(f.total) || 0;
      if (f.estados_factura?.nombre === "CANCELADO") return;

      if (!agrupado[fAno])
        agrupado[fAno] = { anio: fAno, pagado: 0, pendiente: 0, total: 0 };
      agrupado[fAno].total += totalFactura;
      if (f.estados_factura?.nombre === "PAGADO")
        agrupado[fAno].pagado += totalFactura;
      else if (f.estados_factura?.nombre === "PENDIENTE")
        agrupado[fAno].pendiente += totalFactura;
    });
    return Object.values(agrupado).sort(
      (a, b) => Number(a.anio) - Number(b.anio),
    );
  }, [facturas]);

  const aniosDisponibles = useMemo(() => {
    const anios = facturas
      .map((f) =>
        f.fecha
          ? new Date(f.fecha + "T12:00:00Z").getFullYear().toString()
          : null,
      )
      .filter(Boolean);
    const unicos = [...new Set(anios)].sort((a, b) => b - a);
    if (unicos.length === 0) unicos.push(new Date().getFullYear().toString());
    return unicos;
  }, [facturas]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const esAnio = label && label.length === 4 && !isNaN(label);
      const tituloTooltip = esAnio
        ? `Año ${label}`
        : `${label} ${anioSeleccionado}`;
      return (
        <div className="bg-white p-4 border border-slate-200 shadow-xl rounded-xl">
          <p className="font-black text-slate-800 mb-2">{tituloTooltip}</p>
          {payload.map((entry, index) => (
            <p
              key={index}
              className="text-sm font-bold flex items-center gap-2"
              style={{ color: entry.color }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              ></span>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const toggleTarea = async (id) => {
    try {
      await supabase
        .from("tareas")
        .update({ estado: "completada" })
        .eq("id", id);
      setMisTareas(misTareas.filter((t) => t.id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  if (cargando) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (usuarioActivo?.rol === "empleado") {
    return (
      <div className="max-w-4xl mx-auto space-y-8 mt-4">
        {/* TARJETA AZUL DE BIENVENIDA */}
        <div className="bg-blue-700 rounded-3xl p-8 text-white shadow-lg shadow-blue-700/20 relative overflow-hidden">
          <h1 className="text-3xl font-black relative z-10 uppercase tracking-wide text-center">
            ¡Bienvenido(a), {usuarioActivo.nombre.split(" ")[0]}!
          </h1>
        </div>

        {/* TARJETA INFORMATIVA (LETRAS ESPACIOSAS Y CLARAS) */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm flex items-start gap-8 relative overflow-hidden group">
          <div className="absolute left-0 top-0 bottom-0 w-2 bg-blue-500"></div>

          <div className="hidden sm:flex p-5 bg-blue-50 text-blue-600 rounded-2xl shrink-0 group-hover:scale-110 transition-transform duration-300"></div>

          <div className="flex flex-col gap-6">
            <h2 className="text-2xl font-black text-slate-800 tracking-wide">
              Guía rápida de tu portal 💡
            </h2>

            {/* Textos con leading-loose (interlineado amplio) y tracking-wide (espaciado de letras) */}
            <p className="text-[15px] font-medium text-slate-600 leading-loose tracking-wide">
              En este espacio de trabajo encontrarás las herramientas necesarias
              para tu día a día en{" "}
              <span className="font-bold text-blue-700">
                MILAS Equipos Industriales
              </span>
              .
            </p>

            <p className="text-[15px] font-medium text-slate-600 leading-loose tracking-wide">
              Para revisar, gestionar y completar las actividades que tienes
              asignadas, por favor dirígete a la sección de{" "}
              <span className="font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-md">
                Tareas
              </span>{" "}
              en el menú lateral izquierdo. Ahí podrás ver todos los detalles y
              marcar tus avances.
            </p>

            <p className="text-[15px] font-medium text-slate-600 leading-loose tracking-wide">
              También tienes acceso a la pestaña de{" "}
              <span className="font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-md">
                Configuración
              </span>
              , donde podrás cambiar tu contraseña temporal por una personal más
              segura.{" "}
            </p>
          </div>
        </div>
      </div>
    );
  }
  // 🟢 VISTA PARA ADMINISTRADORES (GRÁFICAS)
  return (
    <div className="max-w-[90rem] mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <TrendingUp className="text-blue-700" /> Resumen Financiero
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Análisis de ingresos y cuentas por cobrar de MILAS.
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-1.5 flex items-center shadow-sm">
          <div className="bg-slate-100 p-2 rounded-lg text-slate-500">
            <Calendar size={18} />
          </div>
          <select
            value={anioSeleccionado}
            onChange={(e) => setAnioSeleccionado(e.target.value)}
            className="bg-transparent border-none outline-none pl-3 pr-4 py-1 font-black text-slate-800 cursor-pointer"
          >
            {aniosDisponibles.map((anio) => (
              <option key={anio} value={anio}>
                Año {anio}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5 relative overflow-hidden group">
          <div className="absolute right-[-20px] top-[-20px] opacity-5 group-hover:opacity-10 transition-opacity">
            <Wallet size={120} />
          </div>
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl z-10">
            <Wallet size={28} />
          </div>
          <div className="z-10">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              Ingresos Pagados
            </p>
            <p className="text-3xl font-black text-emerald-600 mt-1">
              {formatCurrency(datosProcesados.resumen.ingresos)}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5 relative overflow-hidden group">
          <div className="absolute right-[-20px] top-[-20px] opacity-5 group-hover:opacity-10 transition-opacity">
            <Clock size={120} />
          </div>
          <div className="p-4 bg-orange-50 text-orange-600 rounded-xl z-10">
            <Clock size={28} />
          </div>
          <div className="z-10">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              Cuentas por Cobrar
            </p>
            <p className="text-3xl font-black text-orange-600 mt-1">
              {formatCurrency(datosProcesados.resumen.porCobrar)}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5 relative overflow-hidden group">
          <div className="absolute right-[-20px] top-[-20px] opacity-5 group-hover:opacity-10 transition-opacity">
            <Landmark size={120} />
          </div>
          <div className="p-4 bg-blue-50 text-blue-600 rounded-xl z-10">
            <Landmark size={28} />
          </div>
          <div className="z-10">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              Total Facturado
            </p>
            <p className="text-3xl font-black text-[#131b2e] mt-1">
              {formatCurrency(datosProcesados.resumen.totalEmitido)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest mb-8 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Calendar size={18} className="text-blue-700" /> Evolución Mensual del{" "}
          {anioSeleccionado}
        </h3>
        <div className="w-full">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={datosProcesados.grafica}
              margin={{ top: 10, right: 10, left: 20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />
              <XAxis
                dataKey="mes"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 12, fontWeight: "bold" }}
                dy={10}
              />
              <YAxis
                tickFormatter={(value) =>
                  `$${value >= 1000 ? (value / 1000).toFixed(0) + "k" : value}`
                }
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 12, fontWeight: "bold" }}
                dx={-10}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "#f8faf9" }}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{
                  paddingTop: "20px",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              />
              <Bar
                dataKey="pagado"
                name="Ingreso Pagado"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
              />
              <Bar
                dataKey="pendiente"
                name="Pendiente de Cobro"
                fill="#f97316"
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest mb-8 border-b border-slate-100 pb-3 flex items-center gap-2">
          <History size={18} className="text-blue-700" /> Comparativa Anual
          (Histórico)
        </h3>
        <div className="w-full">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={datosPorAnio}
              margin={{ top: 10, right: 10, left: 20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />
              <XAxis
                dataKey="anio"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#1e293b", fontSize: 14, fontWeight: "900" }}
                dy={10}
              />
              <YAxis
                tickFormatter={(value) =>
                  `$${value >= 1000 ? (value / 1000).toFixed(0) + "k" : value}`
                }
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 12, fontWeight: "bold" }}
                dx={-10}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "#f8faf9" }}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{
                  paddingTop: "20px",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              />
              <Bar
                dataKey="pagado"
                name="Ingreso Pagado"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                maxBarSize={80}
              />
              <Bar
                dataKey="pendiente"
                name="Pendiente de Cobro"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
                maxBarSize={80}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest mb-8 border-b border-slate-100 pb-3">
          Tendencia de Facturación Total ({anioSeleccionado})
        </h3>
        <div className="w-full">
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart
              data={datosProcesados.grafica}
              margin={{ top: 10, right: 10, left: 20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />
              <XAxis dataKey="mes" hide />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="total"
                name="Total Facturado"
                stroke="#1d4ed8"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorTotal)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
