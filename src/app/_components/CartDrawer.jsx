"use client";
import { useCart } from "@/app/_context/CartContext";
import {
  X,
  Trash2,
  Plus,
  Minus,
  MessageCircle,
  ShoppingBag,
  Mail,
} from "lucide-react";
import Link from "next/link";

export default function CartDrawer() {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity,
    totalPrice,
    mostrarPrecios,
  } = useCart();

  if (!isCartOpen) return null;

  const getWhatsAppMessage = () => {
    let message =
      "¡Hola, equipo de WOOX! Me gustaría cotizar los siguientes productos:\n\n";
    cart.forEach((item) => {
      // 🟢 Mostramos el nombre con la etiqueta para que WOOX sepa si le pidieron cajas o piezas
      const nombreItem = item.etiquetaActual
        ? `${item.nombre} (${item.etiquetaActual})`
        : item.nombre;

      if (mostrarPrecios) {
        message += `• ${nombreItem}\n  Cant: ${item.quantity} x $${Number(item.precio).toLocaleString()} = $${(item.precio * item.quantity).toLocaleString()}\n`;
      } else {
        message += `• ${nombreItem}\n  Cant: ${item.quantity}\n`;
      }
    });

    if (mostrarPrecios) {
      message += `\n*TOTAL ESTIMADO: $${totalPrice.toLocaleString()}*`;
    } else {
      message += `\n*(Solicitud de cotización)*`;
    }
    return encodeURIComponent(message);
  };

  // 🟢 Función para manejar el input tipeado manualmente (ahora usa cartItemId)
  const handleInputChange = (e, cartItemId) => {
    const val = parseInt(e.target.value);
    // Solo actualiza si es un número válido y mayor a 0
    if (!isNaN(val) && val > 0) {
      updateQuantity(cartItemId, val);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-300">
      <div
        className="absolute inset-0 bg-[#131b2e]/60 backdrop-blur-sm"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col slide-in-from-right-full duration-300 border-l border-[#bec9c2]/30">
        <div className="flex items-center justify-between p-6 border-b border-[#bec9c2]/20 bg-[#f8faf9]">
          <h2 className="text-xl font-black text-[#131b2e] flex items-center gap-2 uppercase tracking-tight">
            <ShoppingBag className="text-[#004532]" />
            Tu Cotización
          </h2>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 text-[#bec9c2] hover:text-red-500 hover:bg-white rounded-full transition-all shadow-sm"
          >
            <X size={24} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-[#faf8ff]">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#bec9c2] space-y-4">
              <ShoppingBag size={64} strokeWidth={1} />
              <p className="text-lg font-bold text-[#3f4944]">
                El carrito está vacío
              </p>
              <Link
                href="/catalogo"
                onClick={() => setIsCartOpen(false)}
                className="mt-4 px-6 py-3 bg-[#131b2e] text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-[#004532] transition-colors shadow-md inline-block text-center"
              >
                Explorar Catálogo
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {cart.map((item) => (
                <li
                  // 🟢 Usamos cartItemId como key
                  key={item.cartItemId}
                  className="p-4 bg-white border border-[#bec9c2]/30 rounded-xl shadow-sm flex gap-4 transition-all hover:shadow-md hover:border-[#bec9c2]/60"
                >
                  <div className="w-20 h-20 bg-[#f2f3ff] rounded-lg p-2 shrink-0 border border-[#bec9c2]/20">
                    <img
                      src={item.imagen_url || "https://via.placeholder.com/150"}
                      alt={item.nombre}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-bold text-[#131b2e] text-sm leading-tight truncate">
                          {item.nombre.split("(")[0].trim()}
                        </h4>
                        <button
                          // 🟢 Eliminamos usando cartItemId
                          onClick={() => removeFromCart(item.cartItemId)}
                          className="text-[#bec9c2] hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {item.etiquetaActual && (
                        <span className="text-[9px] text-[#004532] font-bold bg-[#004532]/10 px-2 py-0.5 rounded-full mt-1.5 w-max block uppercase tracking-wider">
                          Nivel: {item.etiquetaActual}
                        </span>
                      )}

                      {mostrarPrecios && (
                        <p className="text-[#004532] font-black mt-1">
                          ${Number(item.precio).toLocaleString()}{" "}
                          <span className="text-[10px] font-normal opacity-70">
                            c/u
                          </span>
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 mt-3">
                      <div className="flex items-center gap-2 bg-[#f2f3ff] w-max rounded-lg p-1 border border-[#bec9c2]/20">
                        <button
                          // 🟢 Disminuimos usando cartItemId
                          onClick={() =>
                            updateQuantity(item.cartItemId, item.quantity - 1)
                          }
                          className="p-1 hover:bg-white hover:text-[#004532] rounded text-[#3f4944] transition-colors shadow-sm"
                        >
                          <Minus size={14} strokeWidth={2.5} />
                        </button>

                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          // 🟢 Actualizamos input usando cartItemId
                          onChange={(e) =>
                            handleInputChange(e, item.cartItemId)
                          }
                          className="w-12 text-center text-xs font-black text-[#131b2e] bg-transparent border-none p-0 focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />

                        <button
                          // 🟢 Aumentamos usando cartItemId
                          onClick={() =>
                            updateQuantity(item.cartItemId, item.quantity + 1)
                          }
                          className="p-1 hover:bg-white hover:text-[#004532] rounded text-[#3f4944] transition-colors shadow-sm"
                        >
                          <Plus size={14} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6 bg-white border-t border-[#bec9c2]/30 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            {mostrarPrecios ? (
              <div className="flex justify-between items-end mb-6">
                <span className="text-xs font-bold text-[#3f4944] uppercase tracking-widest">
                  Total Estimado
                </span>
                <span className="text-3xl font-black text-[#131b2e] tracking-tight">
                  ${totalPrice.toLocaleString()}
                </span>
              </div>
            ) : (
              <div className="mb-6 text-center border-b border-[#bec9c2]/20 pb-4">
                <span className="text-[#004532] font-black uppercase tracking-widest text-sm block">
                  Lista para cotizar
                </span>
                <span className="text-[10px] text-[#3f4944] mt-1 font-medium">
                  Envía tu lista para que un asesor te dé los mejores precios.
                </span>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Link
                href="/contacto"
                onClick={() => setIsCartOpen(false)}
                className="w-full py-4 bg-[#131b2e] hover:bg-[#004532] text-white font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all rounded-xl shadow-md hover:-translate-y-0.5"
              >
                <Mail size={18} />
                Pedir por email
              </Link>
              <a
                href={`https://wa.me/525554946246?text=${getWhatsAppMessage()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 bg-white border-2 border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all rounded-xl shadow-sm hover:shadow-md"
              >
                <MessageCircle size={18} strokeWidth={2.5} /> Pedir por WhatsApp
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
