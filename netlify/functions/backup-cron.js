const { schedule } = require("@netlify/functions");

// 🟢 "0 0 * * *" significa: Ejecutar todos los días a la medianoche.
exports.handler = schedule("0 0 * * *", async (event) => {
  // Netlify nos da la variable process.env.URL automáticamente con tu dominio de producción
  const baseUrl = process.env.URL || "http://localhost:3000";
  const secret = process.env.NETLIFY_CRON_SECRET;

  console.log(`⏰ Iniciando Cron Job de MILAS hacia: ${baseUrl}/api/backup`);

  try {
    const response = await fetch(`${baseUrl}/api/backup`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secret}`,
      },
    });

    const data = await response.json();
    console.log("✅ Resultado del Cron:", data);

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("❌ Error al golpear la API:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
});
