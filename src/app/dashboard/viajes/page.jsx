"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/app/_lib/supabase/supabase";
import Swal from "sweetalert2";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  CarFront, 
  Plus, 
  MapPin, 
  Calendar, 
  Users, 
  DollarSign, 
  Clock,
  Edit2,
  Eye,
  CheckCircle
} from "lucide-react";

import ModalNuevoViaje from "@/app/_components/ModalNuevoViaje";
import ModalDetalleViaje from "@/app/_components/ModalDetalleViaje";

export default function ViajesPage() {
  const [cargando, setCargando] = useState(true);
  const [viajes, setViajes] = useState([]);
  const [rolUsuario, setRolUsuario] = useState(null);
  const [idUsuarioActual, setIdUsuarioActual] = useState(null);

  const [isModalNuevoOpen, setIsModalNuevoOpen] = useState(false);
  const [viajeAEditar, setViajeAEditar] = useState(null);

  const [isModalDetalleOpen, setIsModalDetalleOpen] = useState(false);
  const [viajeDetalle, setViajeDetalle] = useState(null);

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    setCargando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setIdUsuarioActual(user.id);

      const { data: perfil } = await supabase
        .from("perfiles")
        .select("rol")
        .eq("id", user.id)
        .single();
      
      const esAdmin = perfil?.rol === "admin";
      setRolUsuario(perfil?.rol);

      let query = supabase
        .from("viajes")
        .select(`
          *,
          viaje_usuarios!inner ( id_usuario, perfiles ( nombre ) ),
          viaje_gastos ( id, monto, estatus, categoria, descripcion, foto_ticket_url, motivo_rechazo, created_at )
        `)
        .order("fecha_inicio", { ascending: false });

      if (!esAdmin) {
        query = query.eq("viaje_usuarios.id_usuario", user.id);
      }

      const { data: viajesData, error } = await query;
      if (error) throw error;

      setViajes(viajesData || []);

      setViajeDetalle(actual => {
        if (!actual) return null;
        return viajesData?.find(v => v.id === actual.id) || actual;
      });

    } catch (error) {
      console.error(error);
      Swal.fire("Error", "No se pudieron cargar los viajes.", "error");
    } finally {
      setCargando(false);
    }
  };

  const abrirNuevoViaje = () => {
    setViajeAEditar(null);
    setIsModalNuevoOpen(true);
  };

  const abrirEditarViaje = (e, viaje) => {
    e.stopPropagation(); 
    setViajeAEditar(viaje);
    setIsModalNuevoOpen(true);
  };

  const abrirDetalles = (viaje) => {
    setViajeDetalle(viaje);
    setIsModalDetalleOpen(true);
  };

  const verResumenPDF = (e, viaje) => {
    e.stopPropagation();
    const doc = new jsPDF();
    
    // 🟢 SUMA CORRECTA DE LOS 6 RUBROS PARA LA BOLSA TOTAL
    const bolsaTotal = 
      Number(viaje.presupuesto_gasolina || 0) + 
      Number(viaje.presupuesto_casetas || 0) + 
      Number(viaje.presupuesto_alimentos || 0) + 
      Number(viaje.presupuesto_hospedaje || 0) + 
      Number(viaje.presupuesto_material || 0) + 
      Number(viaje.presupuesto_otros || 0);

    const gastosAprobados = viaje.viaje_gastos?.filter(g => g.estatus === 'aprobado') || [];
    const totalGastado = gastosAprobados.reduce((acc, g) => acc + Number(g.monto), 0);
    const saldoADevolver = bolsaTotal - totalGastado;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("LIQUIDACIÓN DE VIÁTICOS - MILAS", 105, 20, { align: "center" });
    
    doc.setFontSize(11);
    doc.text(`Destino: ${viaje.nombre} - ${viaje.destino}`, 14, 32);
    doc.setFont("helvetica", "normal");
    doc.text(`Fechas: ${viaje.fecha_inicio} al ${viaje.fecha_fin} (${viaje.dias} días)`, 14, 38);
    doc.text(`Personal: ${viaje.viaje_usuarios?.map(u => u.perfiles?.nombre).join(", ")}`, 14, 44);

    doc.setFillColor(240, 244, 248);
    doc.rect(14, 50, 182, 30, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("RESUMEN FINANCIERO GENERAL", 18, 56);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Fondo Total Entregado: $${bolsaTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, 18, 63);
    doc.text(`Gastos Comprobados y Aprobados: $${totalGastado.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, 18, 69);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(saldoADevolver >= 0 ? 22 : 220, saldoADevolver >= 0 ? 163 : 38, saldoADevolver >= 0 ? 74 : 38); 
    doc.text(`SALDO FINAL (CAMBIO): $${saldoADevolver.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, 18, 76);
    doc.setTextColor(0);

    let currentY = 90;

    const categoriasMapa = [
      { id: 'Comidas/Alimentos', key: 'presupuesto_alimentos' },
      { id: 'Gasolina', key: 'presupuesto_gasolina' },
      { id: 'Casetas', key: 'presupuesto_casetas' },
      { id: 'Hospedaje', key: 'presupuesto_hospedaje' },
      { id: 'Material', key: 'presupuesto_material' },
      { id: 'Otros', key: 'presupuesto_otros' }
    ];

    categoriasMapa.forEach(cat => {
      const presupuestoAsignado = Number(viaje[cat.key] || 0);
      const gastosCat = gastosAprobados.filter(g => g.categoria === cat.id);
      const totalCat = gastosCat.reduce((acc, g) => acc + Number(g.monto), 0);
      const balance = presupuestoAsignado - totalCat;

      if (presupuestoAsignado > 0 || gastosCat.length > 0) {
        const bodyData = gastosCat.map(g => [
          new Date(g.created_at).toLocaleDateString(),
          g.descripcion,
          `$${Number(g.monto).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
        ]);

        bodyData.push([
          '', 
          `Presupuesto: $${presupuestoAsignado.toLocaleString()} | Gastado: $${totalCat.toLocaleString()} | ${balance >= 0 ? 'SOBRÓ' : 'FALTÓ'}:`, 
          `$${Math.abs(balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [[`Categoría: ${cat.id}`, 'Descripción', 'Monto']],
          body: bodyData,
          theme: 'grid',
          headStyles: { fillColor: [30, 58, 138] },
          styles: { fontSize: 9 },
          columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } },
          willDrawCell: function(data) {
            if (data.row.index === bodyData.length - 1) {
               doc.setFillColor(balance >= 0 ? 220 : 255, balance >= 0 ? 252 : 224, balance >= 0 ? 231 : 224);
               doc.setTextColor(balance >= 0 ? 10 : 150, balance >= 0 ? 100 : 20, balance >= 0 ? 40 : 20);
            }
          }
        });
        currentY = doc.lastAutoTable.finalY + 10;
        doc.setTextColor(0); 
      }
    });

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-[90rem] mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <CarFront className="text-blue-700" /> Control de Viajes y Viáticos
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Gestión de destinos, personal asignado y comprobación de gastos.
          </p>
        </div>
        
        {rolUsuario === "admin" && (
          <button
            onClick={abrirNuevoViaje}
            className="w-full sm:w-auto bg-blue-700 text-white px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-800 transition-colors shadow-md active:scale-95"
          >
            <Plus size={16} /> Crear Viaje
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {cargando && viajes.length === 0 ? (
          <div className="col-span-full py-20 text-center">
            <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-sm">
              Cargando viajes...
            </p>
          </div>
        ) : viajes.length === 0 ? (
          <div className="col-span-full py-20 bg-slate-50 border border-dashed border-slate-300 rounded-3xl text-center">
            <CarFront size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-black text-slate-700 mb-1">No hay viajes registrados</h3>
            <p className="text-sm text-slate-500 font-medium">
              {rolUsuario === "admin" 
                ? "Crea el primer viaje para empezar a controlar los viáticos." 
                : "Aún no has sido asignado a ningún viaje."}
            </p>
          </div>
        ) : (
          viajes.map((viaje) => {
            // 🟢 SUMATORIA GENERAL CORREGIDA PARA LA TARJETA
            const presupuestoTotalEstimado = 
              Number(viaje.presupuesto_gasolina || 0) + 
              Number(viaje.presupuesto_casetas || 0) + 
              Number(viaje.presupuesto_alimentos || 0) + 
              Number(viaje.presupuesto_hospedaje || 0) + 
              Number(viaje.presupuesto_material || 0) + 
              Number(viaje.presupuesto_otros || 0);

            const gastosAprobados = viaje.viaje_gastos
              ?.filter(g => g.estatus === 'aprobado')
              .reduce((acc, g) => acc + Number(g.monto), 0) || 0;

            const gastosPendientes = viaje.viaje_gastos?.filter(g => g.estatus === 'pendiente').length || 0;

            return (
              <div 
                key={viaje.id} 
                onClick={() => abrirDetalles(viaje)}
                className={`bg-white border ${viaje.estatus === 'finalizado' ? 'border-emerald-300 shadow-emerald-100' : 'border-slate-200'} rounded-3xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group relative`}
              >
                <div className="absolute top-4 right-4 flex gap-2 z-10">
                  {viaje.estatus === 'finalizado' && (
                    <button 
                      onClick={(e) => verResumenPDF(e, viaje)}
                      className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-600 hover:text-white hover:bg-emerald-600 rounded-xl transition-colors"
                      title="Ver Reporte PDF"
                    >
                      <Eye size={16} />
                    </button>
                  )}
                  {rolUsuario === "admin"  && (
                    <button 
                      onClick={(e) => abrirEditarViaje(e, viaje)}
                      className="p-2 bg-slate-50 border border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                      title="Editar Viaje"
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                </div>

                <div className="flex justify-between items-start mb-4 pr-24">
                  <div>
                    <h3 className="text-lg font-black text-slate-800 group-hover:text-blue-700 transition-colors line-clamp-1 flex items-center gap-2">
                      {viaje.estatus === 'finalizado' && <CheckCircle size={16} className="text-emerald-500" />}
                      {viaje.nombre}
                    </h3>
                    <p className="text-xs font-bold text-slate-500 flex items-center gap-1 mt-1">
                      <MapPin size={12} /> {viaje.destino}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <Calendar size={14} className="text-slate-400 shrink-0" />
                    <span>{viaje.fecha_inicio} al {viaje.fecha_fin} <span className="text-blue-600 font-bold ml-1">({viaje.dias} Días)</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <Users size={14} className="text-slate-400 shrink-0" />
                    <span className="truncate">
                      {viaje.viaje_usuarios?.map(u => u.perfiles?.nombre.split(' ')[0]).join(", ")}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <DollarSign size={10} /> Bolsa Total
                    </p>
                    <p className="text-sm font-black text-slate-700">
                      ${presupuestoTotalEstimado.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className={`${viaje.estatus === 'finalizado' ? 'bg-slate-800 text-white' : 'bg-emerald-50 text-emerald-700'} rounded-xl p-3 border border-emerald-100`}>
                    <p className={`text-[9px] font-black uppercase tracking-widest mb-1 flex items-center gap-1 ${viaje.estatus === 'finalizado' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      <DollarSign size={10} /> Gastado Real
                    </p>
                    <p className="text-sm font-black">
                      ${gastosAprobados.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {gastosPendientes > 0 && rolUsuario === "admin" && viaje.estatus !== 'finalizado' && (
                  <div className="mt-3 bg-orange-50 text-orange-700 text-[10px] font-black uppercase tracking-widest p-2 rounded-lg text-center flex items-center justify-center gap-1 border border-orange-100">
                    <Clock size={12} /> {gastosPendientes} Tickets Pendientes
                  </div>
                )}
                {viaje.estatus === 'finalizado' && (
                  <div className="mt-3 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-widest p-2 rounded-lg text-center flex items-center justify-center gap-1 border border-emerald-200">
                    VIAJE FINALIZADO Y CUENTAS CERRADAS
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <ModalNuevoViaje 
        isOpen={isModalNuevoOpen}
        onClose={() => setIsModalNuevoOpen(false)}
        onGuardado={cargarDatosIniciales}
        viajeEdicion={viajeAEditar}
      />

      <ModalDetalleViaje 
        isOpen={isModalDetalleOpen}
        onClose={() => setIsModalDetalleOpen(false)}
        viaje={viajeDetalle}
        onActualizado={cargarDatosIniciales}
        rolUsuario={rolUsuario}
      />

    </div>
  );
}