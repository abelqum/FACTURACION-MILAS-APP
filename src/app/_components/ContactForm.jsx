"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import H3 from "./H3";

// 1. El Formulario Interactivo
function FormularioInteractivo() {
  const searchParams = useSearchParams();
  const productoInteres = searchParams.get("producto") || "";

  // ESTADO PARA MANEJAR EL MENSAJE
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // LA MAGIA: Interceptamos el envío
  const handleSubmit = async (e) => {
    e.preventDefault(); // Evita que la página recargue o te mande a la pantalla en blanco
    setIsSubmitting(true);
    setStatus({ type: "loading", message: "Enviando tu mensaje..." });

    const form = e.target;
    const formData = new FormData(form);

    try {
      // Hacemos la petición por "debajo del agua" (AJAX)
      const response = await fetch(form.action, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      });

      if (response.ok) {
        // ¡Éxito!
        setStatus({
          type: "success",
          message:
            "¡Enviado correctamente! Nos pondremos en contacto muy pronto.",
        });
        form.reset(); // Limpiamos los campos
      } else {
        // Error de FormSubmit
        setStatus({
          type: "error",
          message:
            "Hubo un problema al enviar el formulario. Inténtalo de nuevo.",
        });
      }
    } catch (error) {
      // Error de conexión (sin internet, etc)
      setStatus({
        type: "error",
        message: "Error de conexión. Revisa tu internet y vuelve a intentarlo.",
      });
    } finally {
      setIsSubmitting(false);

      // Opcional: Ocultar el mensaje de éxito después de 5 segundos
      if (status.type !== "error") {
        setTimeout(() => setStatus({ type: "", message: "" }), 5000);
      }
    }
  };

  return (
    <form
      id="contactForm"
      action="https://formsubmit.co/ajax/ventas@milass.com.mx"
      method="POST"
      onSubmit={handleSubmit} // Conectamos nuestra función aquí
      className="space-y-5"
    >
      <input type="hidden" name="_captcha" value="false" />
      <input
        type="hidden"
        name="_subject"
        value="Nueva Cotización desde Sitio Web MILAS!"
      />

      {/* RENDERIZADO DEL MENSAJE DE ESTADO */}
      {status.message && (
        <div
          className={`p-4 rounded-lg text-center font-bold mb-6 transition-all ${
            status.type === "success"
              ? "bg-green-100 text-green-700 border border-green-300"
              : status.type === "error"
                ? "bg-red-100 text-red-700 border border-red-300"
                : "bg-blue-100 text-blue-700 border border-blue-300 animate-pulse"
          }`}
        >
          {status.message}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Nombre Completo
          </label>
          <input
            type="text"
            name="nombre"
            required
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors"
            placeholder="Tu nombre"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Empresa
          </label>
          <input
            type="text"
            name="empresa"
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors"
            placeholder="Nombre de tu empresa"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Teléfono
          </label>
          <input
            type="tel"
            name="telefono"
            required
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors"
            placeholder="10 dígitos"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Correo Electrónico
          </label>
          <input
            type="email"
            name="email"
            required
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors"
            placeholder="ejemplo@empresa.com"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          Producto o Servicio de Interés
        </label>
        <input
          type="text"
          name="interes"
          id="input-interes"
          defaultValue={productoInteres}
          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors"
          placeholder="Ej: Bomba Samson, Instalación..."
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          Mensaje
        </label>
        <textarea
          name="mensaje"
          rows="4"
          required
          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors"
          placeholder="Cuéntanos más sobre tu proyecto..."
        ></textarea>
      </div>

      <button
        type="submit"
        disabled={isSubmitting} // Deshabilita el botón mientras envía para evitar clics dobles
        className="w-full bg-yellow-600 text-white font-bold py-4 rounded-lg shadow-lg hover:bg-yellow-700 hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Enviando..." : "Solicitar Cotización"}
      </button>
    </form>
  );
}

// 2. Componente Padre
export default function ContactForm() {
  return (
    <div className="w-full lg:w-3/5 p-8 lg:p-12 relative">
      <H3 color="text-slate-800">Envíanos un mensaje</H3>

      <Suspense
        fallback={
          <div className="animate-pulse h-64 bg-slate-100 rounded-lg mt-4 w-full"></div>
        }
      >
        <FormularioInteractivo />
      </Suspense>
    </div>
  );
}
