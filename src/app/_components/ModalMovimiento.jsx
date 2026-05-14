"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/app/_lib/supabase/supabase";
import Swal from "sweetalert2";
import {
  X,
  Plus,
  Trash2,
  Save,
  Calculator,
  Globe,
  MapPin,
  DollarSign,
  Package,
} from "lucide-react";

export default function ModalMovimiento({
  isOpen,
  onClose,
  movimientoAEditar,
  productos,
  onGuardado,
}) {
  const [cargando, setCargando] = useState(false);

  // 🟢 ESTADO DE CABECERA
  const [cabecera, setCabecera] = useState({
    tipo: "entrada",
    es_importacion: false,
    numero_pedimento: "",
    fecha: new Date().toISOString().split("T")[0],
    tipo_cambio: 1.0,
    porcentaje_importacion: 40.0,
  });

  // 🟢 ESTADO DE PARTIDAS
  const [detalles, setDetalles] = useState([
    { id_producto: "", cantidad: 1, precio_unitario: 0 },
  ]);

  useEffect(() => {
    if (movimientoAEditar) {
      setCabecera({
        tipo: movimientoAEditar.tipo,
        es_importacion: movimientoAEditar.es_importacion,
        numero_pedimento: movimientoAEditar.numero_pedimento || "",
        fecha: movimientoAEditar.fecha,
        tipo_cambio: movimientoAEditar.tipo_cambio || 1.0,
        porcentaje_importacion: movimientoAEditar.porcentaje_importacion || 0.0,
      });
      if (movimientoAEditar.movimientos_detalles) {
        setDetalles(
          movimientoAEditar.movimientos_detalles.map((d) => ({
            id_producto: d.id_producto,
            cantidad: d.cantidad,
            precio_unitario: d.precio_unitario,
          })),
        );
      }
    } else {
      setCabecera({
        tipo: "entrada",
        es_importacion: false,
        numero_pedimento: "",
        fecha: new Date().toISOString().split("T")[0],
        tipo_cambio: 1.0,
        porcentaje_importacion: 40.0,
      });
      setDetalles([{ id_producto: "", cantidad: 1, precio_unitario: 0 }]);
    }
  }, [movimientoAEditar, isOpen]);

  if (!isOpen) return null;

  // 🟢 LÓGICA MATEMÁTICA
  const subtotalOriginal = detalles.reduce(
    (acc, det) => acc + Number(det.cantidad) * Number(det.precio_unitario),
    0,
  );

  let iva = 0;
  let totalUSD = 0;
  let totalMXN = 0;

  if (cabecera.es_importacion) {
    const gastosUSD =
      subtotalOriginal * (Number(cabecera.porcentaje_importacion) / 100);
    totalUSD = subtotalOriginal + gastosUSD;
    totalMXN = totalUSD * Number(cabecera.tipo_cambio);
  } else {
    iva = subtotalOriginal * 0.16;
    totalMXN = subtotalOriginal + iva;
  }

  // 🟢 MANEJO DE FILAS
  const agregarFila = () =>
    setDetalles([
      ...detalles,
      { id_producto: "", cantidad: 1, precio_unitario: 0 },
    ]);
  const quitarFila = (idx) => setDetalles(detalles.filter((_, i) => i !== idx));
  const actualizarDetalle = (idx, campo, valor) => {
    const nuevos = [...detalles];
    nuevos[idx][campo] = valor;
    setDetalles(nuevos);
  };

  // 🟢 FUNCIÓN DE GUARDADO
  const handleSubmit = async (e) => {
    e.preventDefault();

    const detallesValidos = detalles.filter(
      (d) => d.id_producto !== "" && d.cantidad > 0,
    );
    if (detallesValidos.length === 0)
      return Swal.fire(
        "Atención",
        "Agrega al menos un producto válido.",
        "warning",
      );
    if (cabecera.es_importacion && !cabecera.numero_pedimento.trim())
      return Swal.fire(
        "Atención",
        "El número de pedimento es obligatorio en importaciones.",
        "warning",
      );

    setCargando(true);
    try {
      let idMovimiento = null;

      // 1. SI ES EDICIÓN: Revertir inventario viejo
      if (movimientoAEditar) {
        idMovimiento = movimientoAEditar.id;
        const { data: viejosDetalles } = await supabase
          .from("movimientos_detalles")
          .select("*")
          .eq("id_movimiento", idMovimiento);

        for (let old of viejosDetalles || []) {
          const { data: prod } = await supabase
            .from("inventario")
            .select("cantidad")
            .eq("id", old.id_producto)
            .single();
          const revertAmount =
            movimientoAEditar.tipo === "entrada" ? -old.cantidad : old.cantidad;
          await supabase
            .from("inventario")
            .update({ cantidad: Number(prod.cantidad) + Number(revertAmount) })
            .eq("id", old.id_producto);
        }

        await supabase
          .from("movimientos_detalles")
          .delete()
          .eq("id_movimiento", idMovimiento);
        await supabase
          .from("movimientos_cabecera")
          .update({
            tipo: cabecera.tipo,
            es_importacion: cabecera.es_importacion,
            numero_pedimento: cabecera.numero_pedimento,
            fecha: cabecera.fecha,
            tipo_cambio: cabecera.tipo_cambio,
            porcentaje_importacion: cabecera.porcentaje_importacion,
            subtotal_original: subtotalOriginal,
            iva: iva,
            total_usd: totalUSD,
            total_mxn: totalMXN,
          })
          .eq("id", idMovimiento);
      } else {
        // 2. SI ES NUEVO: Crear cabecera
        const { data: nuevaCabecera, error: cabErr } = await supabase
          .from("movimientos_cabecera")
          .insert([
            {
              tipo: cabecera.tipo,
              es_importacion: cabecera.es_importacion,
              numero_pedimento: cabecera.numero_pedimento,
              fecha: cabecera.fecha,
              tipo_cambio: cabecera.tipo_cambio,
              porcentaje_importacion: cabecera.porcentaje_importacion,
              subtotal_original: subtotalOriginal,
              iva: iva,
              total_usd: totalUSD,
              total_mxn: totalMXN,
            },
          ])
          .select()
          .single();
        if (cabErr) throw cabErr;
        idMovimiento = nuevaCabecera.id;
      }

      // 3. INSERTAR DETALLES Y ACTUALIZAR INVENTARIO
      for (let det of detallesValidos) {
        const subtotalFila = Number(det.cantidad) * Number(det.precio_unitario);
        await supabase.from("movimientos_detalles").insert([
          {
            id_movimiento: idMovimiento,
            id_producto: det.id_producto,
            cantidad: det.cantidad,
            precio_unitario: det.precio_unitario,
            subtotal: subtotalFila,
          },
        ]);
        // ... dentro del bucle de detalles ...

        // 1. Buscamos si la condición del producto permite actualizar precio
        const { data: prodInfo } = await supabase
          .from("inventario")
          .select(
            "id_condicion, inventario_condiciones(permite_actualizar_precio)",
          )
          .eq("id", det.id_producto)
          .single();

        const puedeActualizarPrecio =
          prodInfo?.inventario_condiciones?.permite_actualizar_precio;

        const updatePayload = { cantidad: nuevaCantidad };

        // Solo si es Entrada Y la condición lo permite, actualizamos el precio
        if (cabecera.tipo === "entrada" && puedeActualizarPrecio) {
          if (cabecera.es_importacion) {
            const costoUnitarioUSD = Number(det.precio_unitario);
            const costoGastosUSD =
              costoUnitarioUSD *
              (Number(cabecera.porcentaje_importacion) / 100);
            const costoRealMXN =
              (costoUnitarioUSD + costoGastosUSD) *
              Number(cabecera.tipo_cambio);
            updatePayload.precio_unitario = costoRealMXN;
          } else {
            updatePayload.precio_unitario = det.precio_unitario;
          }
        } else if (cabecera.tipo === "entrada" && !puedeActualizarPrecio) {
          // Si no puede actualizar, se queda el precio que ya tenía el catálogo
          console.log(
            "Este producto tiene una condición que no altera el precio de catálogo.",
          );
        }

        await supabase
          .from("inventario")
          .update(updatePayload)
          .eq("id", det.id_producto);
      }

      Swal.fire({
        icon: "success",
        title: "Operación Exitosa",
        text: "El inventario ha sido actualizado.",
        timer: 2500,
        showConfirmButton: false,
      });
      onGuardado();
      onClose();
    } catch (error) {
      console.error(error);
      Swal.fire(
        "Error",
        "No se pudo procesar el movimiento: " + error.message,
        "error",
      );
    } finally {
      setCargando(false);
    }
  };

  // 🟢 Generador Resistente de la Súper-Línea
  // 🟢 Generador Resistente de la Súper-Línea
  const getSuperLinea = (p) => {
    if (!p) return "Producto no identificado";
    const partes = [];
    if (p.descripcion) partes.push(p.descripcion);
    if (p.modelo) partes.push(`Mod: ${p.modelo}`);

    // 🟢 NUEVO: Agregamos la Condición a la Súper-Línea
    if (p.condicion?.nombre) partes.push(`Cond: ${p.condicion.nombre}`);

    if (p.medida_cat?.nombre) partes.push(p.medida_cat.nombre);
    if (p.marca?.nombre) partes.push(`Marca: ${p.marca.nombre}`);
    if (p.proveedor?.nombre) partes.push(`Prov: ${p.proveedor.nombre}`);

    return partes.join(" | ");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-slate-50 w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        {/* HEADER */}
        <div className="p-6 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-black text-slate-800 text-xl flex items-center gap-2">
              <Package className="text-blue-700" />
              {movimientoAEditar
                ? "Editar Movimiento Multilínea"
                : "Nuevo Movimiento de Inventario"}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Registra entradas o salidas y ajusta el stock y los costos
              automáticamente.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-red-500 bg-slate-100 hover:bg-red-50 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          {/* SECCIÓN 1: CABECERA */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Tipo de Operación
              </label>
              <select
                value={cabecera.tipo}
                onChange={(e) =>
                  setCabecera({ ...cabecera, tipo: e.target.value })
                }
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-600 outline-none"
              >
                <option value="entrada">Entrada (Suma Stock)</option>
                <option value="salida">Salida (Resta Stock)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Fecha del Movimiento
              </label>
              <input
                type="date"
                value={cabecera.fecha}
                onChange={(e) =>
                  setCabecera({ ...cabecera, fecha: e.target.value })
                }
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-600 outline-none"
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-4 bg-slate-100 p-2.5 rounded-xl border border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer w-full">
                <input
                  type="checkbox"
                  checked={cabecera.es_importacion}
                  onChange={(e) =>
                    setCabecera({
                      ...cabecera,
                      es_importacion: e.target.checked,
                    })
                  }
                  className="w-5 h-5 accent-blue-600 rounded"
                />
                <div>
                  <span className="text-sm font-black text-blue-900 block flex items-center gap-1">
                    <Globe size={14} /> Es una Importación
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* SECCIÓN 1.5: DATOS DE IMPORTACIÓN */}
          {cabecera.es_importacion && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-blue-50 p-5 rounded-2xl border border-blue-200 shadow-sm animate-in fade-in slide-in-from-top-2">
              <div>
                <label className="block text-[10px] font-black text-blue-800 uppercase tracking-widest mb-1.5">
                  Número de Pedimento *
                </label>
                <input
                  required={cabecera.es_importacion}
                  type="text"
                  placeholder="Ej. 21 47 3847 1000188"
                  value={cabecera.numero_pedimento}
                  onChange={(e) =>
                    setCabecera({
                      ...cabecera,
                      numero_pedimento: e.target.value,
                    })
                  }
                  className="w-full p-2.5 bg-white border border-blue-200 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-blue-800 uppercase tracking-widest mb-1.5">
                  % Gastos Importación
                </label>
                <input
                  required={cabecera.es_importacion}
                  type="number"
                  step="0.01"
                  value={cabecera.porcentaje_importacion}
                  onChange={(e) =>
                    setCabecera({
                      ...cabecera,
                      porcentaje_importacion: e.target.value,
                    })
                  }
                  className="w-full p-2.5 bg-white border border-blue-200 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-600 outline-none text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-blue-800 uppercase tracking-widest mb-1.5">
                  Tipo de Cambio (MXN) *
                </label>
                <input
                  required={cabecera.es_importacion}
                  type="number"
                  step="0.0001"
                  value={cabecera.tipo_cambio}
                  onChange={(e) =>
                    setCabecera({ ...cabecera, tipo_cambio: e.target.value })
                  }
                  className="w-full p-2.5 bg-white border border-blue-200 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-600 outline-none text-center"
                />
              </div>
            </div>
          )}

          {/* SECCIÓN 2: PARTIDAS (PRODUCTOS) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-black text-slate-700 text-sm uppercase tracking-widest flex items-center gap-2">
                <MapPin size={16} /> Ítems de la Operación
              </h4>
              <button
                type="button"
                onClick={agregarFila}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors flex items-center gap-1"
              >
                <Plus size={14} /> Fila
              </button>
            </div>

            <div className="space-y-3 ">
              {detalles.map((det, index) => (
                <div
                  key={index}
                  className="flex flex-col lg:flex-row gap-3 items-start lg:items-center bg-slate-50 p-3 rounded-xl border border-slate-200"
                >
                  <div className=" w-full">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Buscar Producto
                    </label>
                    <select
                      required
                      value={det.id_producto}
                      onChange={(e) =>
                        actualizarDetalle(index, "id_producto", e.target.value)
                      }
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-600 outline-none"
                    >
                      <option value="">Selecciona el producto...</option>
                      {productos?.map((p) => (
                        <option key={p.id} value={p.id}>
                          {getSuperLinea(p)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-3 w-full lg:w-auto">
                    <div className="w-24">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Cant.
                      </label>
                      <input
                        required
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={det.cantidad}
                        onChange={(e) =>
                          actualizarDetalle(index, "cantidad", e.target.value)
                        }
                        className="w-full p-2 text-slate-800 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center focus:border-blue-600 outline-none"
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                        {cabecera.es_importacion ? (
                          <DollarSign size={10} />
                        ) : null}{" "}
                        P. Unit. {cabecera.es_importacion ? "USD" : "MXN"}
                      </label>
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        value={det.precio_unitario}
                        onChange={(e) =>
                          actualizarDetalle(
                            index,
                            "precio_unitario",
                            e.target.value,
                          )
                        }
                        className="w-full p-2 text-slate-800 bg-white border border-slate-300 rounded-lg text-xs font-bold text-right focus:border-blue-600 outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => quitarFila(index)}
                      disabled={detalles.length === 1}
                      className="mt-5 p-2 text-slate-300 hover:text-red-500 bg-white border border-slate-200 rounded-lg disabled:opacity-30"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECCIÓN 3: RESUMEN */}
          <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                <Calculator size={24} />
              </div>
              <div>
                <h4 className="font-black text-emerald-900 text-sm">
                  Resumen Financiero
                </h4>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                  {cabecera.es_importacion
                    ? "Factura de Importación"
                    : "Factura Nacional"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-6 text-right">
              {cabecera.es_importacion ? (
                <>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase">
                      Subtotal USD
                    </p>
                    <p className="font-bold text-slate-700">
                      ${subtotalOriginal.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase">
                      + Gastos ({cabecera.porcentaje_importacion}%)
                    </p>
                    <p className="font-bold text-slate-700">
                      ${(totalUSD - subtotalOriginal).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-emerald-700 uppercase">
                      Total USD
                    </p>
                    <p className="text-xl font-black text-emerald-700">
                      ${totalUSD.toFixed(2)}
                    </p>
                  </div>
                  <div className="border-l border-emerald-200 pl-6">
                    <p className="text-[10px] font-black text-emerald-900 uppercase">
                      TOTAL MXN (x{cabecera.tipo_cambio})
                    </p>
                    <p className="text-2xl font-black text-emerald-900">
                      ${totalMXN.toFixed(2)}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase">
                      Subtotal MXN
                    </p>
                    <p className="font-bold text-slate-700">
                      ${subtotalOriginal.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase">
                      + I.V.A. (16%)
                    </p>
                    <p className="font-bold text-slate-700">
                      ${iva.toFixed(2)}
                    </p>
                  </div>
                  <div className="border-l border-emerald-200 pl-6">
                    <p className="text-[10px] font-black text-emerald-900 uppercase">
                      TOTAL MXN
                    </p>
                    <p className="text-2xl font-black text-emerald-900">
                      ${totalMXN.toFixed(2)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </form>

        {/* FOOTER */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 shrink-0 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 bg-white border border-slate-300 text-slate-600 font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={cargando}
            className="px-8 py-3 bg-blue-700 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-blue-700/30 hover:shadow-blue-800/40 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {cargando ? "Procesando..." : "Confirmar Operación"}{" "}
            <Save size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
