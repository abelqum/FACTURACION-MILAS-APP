"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../_lib/supabase/supabase";

const CartContext = createContext();

// 🟢 1. LA FUNCIÓN MÁGICA: Ahora busca el 'precioBase' original para no quedarse atorada
const calcularPrecioMayoreo = (producto, cantidad) => {
  const esCaja2 = producto.etiqueta_2?.toLowerCase().includes("caja");
  const esCaja3 = producto.etiqueta_3?.toLowerCase().includes("caja");

  const min2 = esCaja2 ? Infinity : producto.min_2 || Infinity;
  const min3 = esCaja3 ? Infinity : producto.min_3 || Infinity;

  // 🟢 EL FIX: Si el producto ya está en el carrito, usamos su precioBase intacto.
  // Si es apenas un producto nuevo entrando, usamos su precio normal.
  const precioOriginal = producto.precioBase || producto.precio;

  if (cantidad >= min3 && producto.precio_3) {
    return {
      precioActual: producto.precio_3,
      etiquetaActual: producto.etiqueta_3,
    };
  } else if (cantidad >= min2 && producto.precio_2) {
    return {
      precioActual: producto.precio_2,
      etiquetaActual: producto.etiqueta_2,
    };
  } else {
    return {
      precioActual: precioOriginal, // 🟢 Regresamos al precio real
      etiquetaActual: producto.etiqueta_1 || "1 Pieza",
    };
  }
};

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mostrarPrecios, setMostrarPrecios] = useState(true);

  useEffect(() => {
    const fetchConfiguracion = async () => {
      try {
        const { data, error } = await supabase
          .from("configuracion_app")
          .select("mostrar_precios")
          .eq("id", 1)
          .single();
        if (error) throw error;
        if (data !== null) {
          setMostrarPrecios(data.mostrar_precios);
        }
      } catch (error) {
        console.error("Error al cargar la configuración de precios:", error);
      }
    };
    fetchConfiguracion();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCart = localStorage.getItem("woox_cart");
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          const migratedCart = parsedCart.map((item) => ({
            ...item,
            cartItemId: item.cartItemId || item.id,
            // 🟢 Parche por si tenías productos viejos en el localStorage
            precioBase: item.precioBase || item.precio,
          }));
          setCart(migratedCart);
        } catch (error) {
          console.error("Error leyendo el carrito:", error);
        }
      }
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("woox_cart", JSON.stringify(cart));
    }
  }, [cart, isLoaded]);

  const addToCart = (product, cantidadInicial = 1, esCaja = false) => {
    setCart((prevCart) => {
      const cartItemId = esCaja ? `${product.id}-caja` : product.id;
      const existingItem = prevCart.find(
        (item) => item.cartItemId === cartItemId,
      );

      if (existingItem) {
        const nuevaCantidad = existingItem.quantity + cantidadInicial;

        if (esCaja) {
          return prevCart.map((item) =>
            item.cartItemId === cartItemId
              ? { ...item, quantity: nuevaCantidad }
              : item,
          );
        } else {
          const { precioActual, etiquetaActual } = calcularPrecioMayoreo(
            existingItem, // Pasamos el existingItem que ya tiene el precioBase
            nuevaCantidad,
          );

          return prevCart.map((item) =>
            item.cartItemId === cartItemId
              ? {
                  ...item,
                  quantity: nuevaCantidad,
                  precio: precioActual,
                  etiquetaActual,
                }
              : item,
          );
        }
      }

      if (esCaja) {
        return [
          ...prevCart,
          {
            ...product,
            cartItemId,
            isCaja: true,
            quantity: cantidadInicial,
            precio: product.precioCajaAplicado,
            etiquetaActual: product.etiquetaCajaAplicada,
          },
        ];
      } else {
        const { precioActual, etiquetaActual } = calcularPrecioMayoreo(
          product,
          cantidadInicial,
        );
        return [
          ...prevCart,
          {
            ...product,
            cartItemId,
            precioBase: product.precio, // 🟢 EL FIX: Guardamos el precio 1 original intocable
            isCaja: false,
            quantity: cantidadInicial,
            precio: precioActual,
            etiquetaActual,
          },
        ];
      }
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (cartItemId) => {
    setCart((prevCart) =>
      prevCart.filter((item) => item.cartItemId !== cartItemId),
    );
  };

  const updateQuantity = (cartItemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.cartItemId === cartItemId) {
          if (item.isCaja) {
            return {
              ...item,
              quantity: newQuantity,
            };
          } else {
            const { precioActual, etiquetaActual } = calcularPrecioMayoreo(
              item, // Pasamos el item que tiene el precioBase
              newQuantity,
            );
            return {
              ...item,
              quantity: newQuantity,
              precio: precioActual,
              etiquetaActual,
            };
          }
        }
        return item;
      }),
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = cart.reduce(
    (total, item) => total + item.precio * item.quantity,
    0,
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        mostrarPrecios,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
