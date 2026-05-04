const fs = require("fs");

// Lista de dominios genéricos comunes
const dominiosGenericos = [
  "gmail",
  "hotmail",
  "yahoo",
  "outlook",
  "live",
  "icloud",
  "msn",
];

function extraerClientes(rutaArchivo) {
  console.log("Iniciando autómata de recuperación...");

  // Leemos el archivo CSV (puede ser pesado, pero Node lo maneja rápido)
  const contenido = fs.readFileSync(rutaArchivo, "utf-8");
  const lineas = contenido.split(/\r?\n/);

  const clientesExtraidos = [];
  const correosVistos = new Set(); // Para no meter duplicados

  // Expresiones regulares para cazar correos y teléfonos
  const regexCorreo = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  // Busca números de 10 a 12 dígitos, ignorando espacios, guiones o paréntesis
  const regexTelefono =
    /(?:\+?52)?\s*?\(?\d{2,3}\)?[\s.-]?\d{3,4}[\s.-]?\d{4}/g;

  lineas.forEach((linea) => {
    // 1. Buscamos correos en el renglón
    const correosEncontrados = linea.match(regexCorreo);
    if (!correosEncontrados) return; // Si no hay correo, pasamos al siguiente renglón

    // 2. Buscamos un teléfono en el renglón
    const telefonosEncontrados = linea.match(regexTelefono);
    let telefonoLimpio = "";

    if (telefonosEncontrados) {
      // Limpiamos la basura (dejamos puros números)
      telefonoLimpio = telefonosEncontrados[0].replace(/\D/g, "");
      // Si tiene más de 10 dígitos (ej. código de país), tomamos los últimos 10
      if (telefonoLimpio.length > 10) {
        telefonoLimpio = telefonoLimpio.substring(telefonoLimpio.length - 10);
      }
    }

    // 3. Procesamos cada correo encontrado
    correosEncontrados.forEach((correoRaw) => {
      const correo = correoRaw.toLowerCase();

      // Evitamos duplicados
      if (correosVistos.has(correo)) return;
      correosVistos.add(correo);

      // Separamos la información
      const partes = correo.split("@");
      const usuario = partes[0];
      const dominioCompleto = partes[1];
      const dominioBase = dominioCompleto.split(".")[0]; // ej: nissan, gmail, milass

      let razonSocial = "";

      // LÓGICA INTELIGENTE DE NOMBRES
      if (dominiosGenericos.includes(dominioBase)) {
        // Si es genérico, transformamos "juan.perez_ventas" en "Juan Perez Ventas"
        razonSocial = usuario
          .replace(/[._-]/g, " ") // Cambia puntos/guiones por espacios
          .replace(/\b\w/g, (letra) => letra.toUpperCase()); // Mayúscula inicial
      } else {
        // Si es corporativo, la empresa es el dominio (ej. nissan -> Nissan)
        razonSocial =
          dominioBase.charAt(0).toUpperCase() + dominioBase.slice(1);
      }

      // Guardamos el cliente en nuestro arreglo final
      clientesExtraidos.push({
        razon_social: razonSocial,
        correo: correo,
        telefono: telefonoLimpio || "Sin teléfono registrado",
        estatus: "recuperado_outlook",
      });
    });
  });

  // Generamos el archivo JSON listo para Supabase
  fs.writeFileSync(
    "clientes_listos.json",
    JSON.stringify(clientesExtraidos, null, 2),
  );

  console.log("========================================");
  console.log(`¡Misión Cumplida! 🚀`);
  console.log(`Se recuperaron ${clientesExtraidos.length} clientes únicos.`);
  console.log(`Archivo generado: clientes_listos.json`);
  console.log("========================================");
}

// Ejecutamos el script apuntando a tu archivo CSV
extraerClientes("./contactos.csv");
