const { createClient } = require("@supabase/supabase-js");
const QRCode = require("qrcode");

// 🔴 1. PEGA AQUÍ TUS CREDENCIALES (Sácalas de tu archivo .env)
// Te recomiendo usar la SUPABASE_SERVICE_ROLE_KEY para que tenga permisos totales de subir archivos
const SUPABASE_URL = "https://tigtaudyzuwccotsupwu.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpZ3RhdWR5enV3Y2NvdHN1cHd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzcyMzU5NSwiZXhwIjoyMDkzMjk5NTk1fQ.sC0gPku9_OixAG5C1Icqq3LUS7DK2g1qxytW8SqLXM0";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function procesarInventario() {
  console.log("🔍 Buscando productos sin código QR...");

  try {
    // 1. Obtenemos todos los productos donde el qr_url está vacío (nulo)
    const { data: productos, error } = await supabase
      .from("inventario")
      .select("id, descripcion")
      .is("qr_url", null);

    if (error) throw error;

    if (productos.length === 0) {
      console.log("✅ ¡Todos los productos ya tienen su QR generado!");
      return;
    }

    console.log(
      `📦 Se encontraron ${productos.length} productos sin QR. Empezando generación...`,
    );

    // 2. Recorremos cada producto
    for (let i = 0; i < productos.length; i++) {
      const producto = productos[i];
      console.log(
        `⏳ [${i + 1}/${productos.length}] Generando QR para: ${producto.descripcion.substring(0, 30)}...`,
      );

      // A. Generamos el QR como imagen (Buffer) en la memoria
      const qrBuffer = await QRCode.toBuffer(producto.id, {
        width: 300,
        margin: 2,
      });

      const fileName = `qr_${producto.id}.png`;

      // B. Subimos la imagen al Bucket 'qr'
      const { error: uploadError } = await supabase.storage
        .from("qr")
        .upload(fileName, qrBuffer, {
          contentType: "image/png",
          upsert: true, // Si ya existe uno viejo, lo sobreescribe
        });

      if (uploadError) {
        console.error(
          `❌ Error subiendo QR de ${producto.id}:`,
          uploadError.message,
        );
        continue; // Saltamos al siguiente si falla
      }

      // C. Obtenemos la URL pública de la imagen que acabamos de subir
      const { data: publicUrlData } = supabase.storage
        .from("qr")
        .getPublicUrl(fileName);

      // D. Guardamos esa URL en la tabla del inventario
      const { error: updateError } = await supabase
        .from("inventario")
        .update({ qr_url: publicUrlData.publicUrl })
        .eq("id", producto.id);

      if (updateError) {
        console.error(
          `❌ Error actualizando BD para ${producto.id}:`,
          updateError.message,
        );
      }
    }

    console.log(
      "\n🚀 ¡PROCESO TERMINADO CON ÉXITO! Ve a revisar tu Dashboard.",
    );
  } catch (err) {
    console.error("💥 Error general:", err.message);
  }
}

procesarInventario();
