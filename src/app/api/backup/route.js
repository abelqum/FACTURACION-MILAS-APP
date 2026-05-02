import { NextResponse } from "next/server";
import { supabase } from "@/app/_lib/supabase/supabase";
import nodemailer from "nodemailer";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const isDownload = searchParams.get("download") === "true";

    // 🟢 BLOQUEO DE SEGURIDAD:
    // Solo permitimos pasar si es una descarga manual desde el Dashboard
    // O si trae el token secreto del Cron Job de Vercel.
    if (!isDownload) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json(
          { error: "No autorizado por Vercel Cron" },
          { status: 401 },
        );
      }
    }

    // 1. Extraemos toda la información de la base de datos
    const [resProd, resCat, resMar] = await Promise.all([
      supabase.from("productos").select("*"),
      supabase.from("categorias").select("*"),
      supabase.from("marcas").select("*"),
    ]);

    // 2. Armamos el objeto maestro del respaldo
    const backupData = {
      fecha_respaldo: new Date().toISOString(),
      estadisticas: {
        total_productos: resProd.data?.length || 0,
        total_categorias: resCat.data?.length || 0,
        total_marcas: resMar.data?.length || 0,
      },
      datos: {
        productos: resProd.data || [],
        categorias: resCat.data || [],
        marcas: resMar.data || [],
      },
    };

    // 3. Si es descarga manual desde el Dashboard
    if (isDownload) {
      const jsonString = JSON.stringify(backupData, null, 2);
      const bytes = new TextEncoder().encode(jsonString);

      return new Response(bytes, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="respaldo_woox_${
            new Date().toISOString().split("T")[0]
          }.json"`,
        },
      });
    }

    // 4. Lógica para el CRON JOB: Envío de correo
    // Solo entramos aquí si NO se pidió descarga directa (ya validamos que es el Cron)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // adwebdev29@gmail.com
        pass: process.env.EMAIL_PASS, // La contraseña de aplicación de 16 letras
      },
    });

    await transporter.sendMail({
      from: '"WOOX Backups" <adwebdev29@gmail.com>',
      to: "adwebdev29@gmail.com", // Te lo envías a ti mismo
      subject: `🛡️ Respaldo Automático WOOX - ${new Date().toLocaleDateString()}`,
      text: "Hola, \n\nSe adjunta el respaldo automático de la base de datos de WOOX en formato JSON.\n\nEste proceso también ha mantenido activa la conexión con Supabase.",
      attachments: [
        {
          filename: `woox_backup_${new Date().toISOString().split("T")[0]}.json`,
          content: JSON.stringify(backupData, null, 2),
        },
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Cron ejecutado. Respaldo enviado por correo correctamente.",
      estadisticas: backupData.estadisticas,
    });
  } catch (error) {
    console.error("Error en API de backup:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al generar el respaldo: " + error.message,
      },
      { status: 500 },
    );
  }
}
