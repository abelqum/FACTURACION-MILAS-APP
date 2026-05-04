const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

// 🔴 PON AQUÍ TUS CLAVES REALES DE SUPABASE
const supabaseUrl = "https://tigtaudyzuwccotsupwu.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpZ3RhdWR5enV3Y2NvdHN1cHd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MjM1OTUsImV4cCI6MjA5MzI5OTU5NX0.hXsZAohm1g6xPW8TvSe38-CoBHaE0Wpurw-YfH7uOmo";
const supabase = createClient(supabaseUrl, supabaseKey);

// Función para limpiar nombres y hacer match (Quita espacios, puntos y pasa a minúsculas)
const limpiarTexto = (txt) =>
  txt
    ? txt
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "")
    : "";

async function actualizarClientes() {
  console.log(
    "1. Conectando a Supabase y descargando tu tabla de clientes actual...",
  );

  const { data: clientesDB, error: errorDB } = await supabase
    .from("clientes")
    .select("*");
  if (errorDB) return console.error("Error al conectar:", errorDB);

  console.log("2. Leyendo el archivo recuperado de Outlook...");
  const rawData = fs.readFileSync("clientes_listos.json");
  const recuperados = JSON.parse(rawData);

  let actualizadosCount = 0;

  console.log("3. Buscando coincidencias e inyectando datos...\n");

  // Recorremos los clientes que YA TIENES en tu base de datos
  for (const cliente of clientesDB) {
    const nombreDB_limpio = limpiarTexto(cliente.razon_social);

    // Usamos Set para evitar que se duplique un correo si lo corres dos veces
    let nuevosCorreos = new Set(cliente.correos || []);
    let nuevosTelefonos = new Set(cliente.telefonos || []);
    let necesitaActualizar = false;

    // Buscamos si este cliente existe en el archivo de Outlook
    for (const rec of recuperados) {
      const nombreOutlook_limpio = limpiarTexto(rec.razon_social);

      // Si el nombre se parece (Ej. "amher" está dentro de "amher sa de cv")
      if (
        nombreDB_limpio.includes(nombreOutlook_limpio) ||
        nombreOutlook_limpio.includes(nombreDB_limpio)
      ) {
        // Si encontramos un correo nuevo, lo agregamos al Set
        if (rec.correo && !nuevosCorreos.has(rec.correo)) {
          nuevosCorreos.add(rec.correo);
          necesitaActualizar = true;
        }

        // Si encontramos un teléfono válido, lo agregamos al Set
        if (
          rec.telefono &&
          rec.telefono !== "Sin teléfono registrado" &&
          !nuevosTelefonos.has(rec.telefono)
        ) {
          nuevosTelefonos.add(rec.telefono);
          necesitaActualizar = true;
        }
      }
    }

    // Si le encontramos nuevos datos, mandamos el UPDATE a Supabase
    if (necesitaActualizar) {
      const arrayCorreos = Array.from(nuevosCorreos);
      const arrayTelefonos = Array.from(nuevosTelefonos);

      const { error: updateError } = await supabase
        .from("clientes")
        .update({
          correos: arrayCorreos, // Supabase lo convierte mágicamente a text[]
          telefonos: arrayTelefonos, // Supabase lo convierte mágicamente a text[]
        })
        .eq("id", cliente.id);

      if (!updateError) {
        console.log(
          `✅ ACTUALIZADO: ${cliente.razon_social} -> +${arrayCorreos.length} correos | +${arrayTelefonos.length} teléfonos`,
        );
        actualizadosCount++;
      } else {
        console.log(
          `❌ ERROR con ${cliente.razon_social}:`,
          updateError.message,
        );
      }
    }
  }

  console.log("\n==============================================");
  console.log(
    `¡Misión Cumplida! Se actualizaron con éxito ${actualizadosCount} clientes en tu base de datos.`,
  );
  console.log("==============================================");
}

actualizarClientes();
