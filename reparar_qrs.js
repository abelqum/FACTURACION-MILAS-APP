const { createClient } = require("@supabase/supabase-js");
const QRCode = require("qrcode");

// Reemplaza con tus credenciales de .env
const SUPABASE_URL = "https://tigtaudyzuwccotsupwu.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpZ3RhdWR5enV3Y2NvdHN1cHd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzcyMzU5NSwiZXhwIjoyMDkzMjk5NTk1fQ.sC0gPku9_OixAG5C1Icqq3LUS7DK2g1qxytW8SqLXM0"; // Usa la Service Role Key para saltar políticas de RLS durante el mantenimiento

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function generarQRFaltantes() {
  console.log("Iniciando búsqueda de productos sin QR...");

  // 1. Obtener productos que no tienen qr_url
  const { data: productos, error } = await supabase
    .from("inventario")
    .select("id, descripcion")
    .or('qr_url.is.null,qr_url.eq.""');

  if (error) {
    console.error("Error al obtener productos:", error.message);
    return;
  }

  if (productos.length === 0) {
    console.log("No se encontraron productos sin QR.");
    return;
  }

  console.log(`Se encontraron ${productos.length} productos para procesar.`);

  for (const producto of productos) {
    try {
      console.log(`Procesando: ${producto.descripcion} (ID: ${producto.id})`);

      // 2. Generar el QR en formato Buffer
      const qrBuffer = await QRCode.toBuffer(String(producto.id), {
        width: 300,
        margin: 2,
      });

      const fileName = `qr_${producto.id}.png`;

      // 3. Subir al Storage (Bucket 'qr')
      const { error: uploadError } = await supabase.storage
        .from("qr")
        .upload(fileName, qrBuffer, {
          contentType: "image/png",
          upsert: true, // Sobrescribe si ya existe
        });

      if (uploadError) throw uploadError;

      // 4. Obtener la URL pública
      const { data: urlData } = supabase.storage
        .from("qr")
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      // 5. Actualizar la base de datos
      const { error: updateError } = await supabase
        .from("inventario")
        .update({ qr_url: publicUrl })
        .eq("id", producto.id);

      if (updateError) throw updateError;

      console.log(`✅ QR generado y actualizado con éxito.`);
    } catch (err) {
      console.error(`❌ Error con el producto ${producto.id}:`, err.message);
    }
  }

  console.log("Proceso de reparación finalizado.");
}

generarQRFaltantes();
