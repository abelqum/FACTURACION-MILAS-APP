import { NextResponse } from "next/server";
import { supabase } from "@/app/_lib/supabase/supabase";
import nodemailer from "nodemailer";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const isDownload = searchParams.get("download") === "true";

    // 🟢 BLOQUEO DE SEGURIDAD PARA NETLIFY:
    // Solo permitimos pasar si es una descarga manual desde el Dashboard
    // O si la petición trae el token secreto que configuraremos en Netlify.
    if (!isDownload) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${process.env.NETLIFY_CRON_SECRET}`) {
        return NextResponse.json(
          { error: "No autorizado. Token de Cron inválido." },
          { status: 401 },
        );
      }
    }

    // 1. Extraemos TODA la información de la base de datos de MILAS
    const [
      resInv,
      resCat,
      resProv,
      resMar,
      resUdm,
      resAlm,
      resCond,
      resMed,
      resTareas,
      resPerfiles,
    ] = await Promise.all([
      supabase.from("inventario").select("*"),
      supabase.from("inventario_categorias").select("*"),
      supabase.from("inventario_proveedores").select("*"),
      supabase.from("inventario_marcas").select("*"),
      supabase.from("inventario_udm").select("*"),
      supabase.from("inventario_almacenes").select("*"),
      supabase.from("inventario_condiciones").select("*"),
      supabase.from("inventario_medidas").select("*"),
      supabase.from("tareas").select("*"),
      supabase.from("perfiles").select("*"),
    ]);

    // 2. Armamos el objeto maestro del respaldo
    const backupData = {
      fecha_respaldo: new Date().toISOString(),
      empresa: "MILAS Equipos Industriales y Accesorios",
      estadisticas: {
        total_productos: resInv.data?.length || 0,
        total_categorias: resCat.data?.length || 0,
        total_proveedores: resProv.data?.length || 0,
        total_marcas: resMar.data?.length || 0,
        total_almacenes: resAlm.data?.length || 0,
        total_tareas: resTareas.data?.length || 0,
        total_usuarios: resPerfiles.data?.length || 0,
      },
      datos: {
        inventario: resInv.data || [],
        catalogos: {
          categorias: resCat.data || [],
          proveedores: resProv.data || [],
          marcas: resMar.data || [],
          udm: resUdm.data || [],
          almacenes: resAlm.data || [],
          condiciones: resCond.data || [],
          medidas: resMed.data || [],
        },
        gestion: {
          tareas: resTareas.data || [],
          perfiles: resPerfiles.data || [],
        },
      },
    };

    // 3. Si es descarga manual desde el Dashboard
    if (isDownload) {
      const jsonString = JSON.stringify(backupData, null, 2);
      const bytes = new TextEncoder().encode(jsonString);

      return new Response(bytes, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="respaldo_milas_${new Date().toISOString().split("T")[0]}.json"`,
        },
      });
    }

    // 4. Lógica para el CRON JOB: Envío de correo mediante SMTP corporativo
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: '"MILAS Backups" <ventas@milass.com.mx>',
      to: "ventas@milass.com.mx",
      subject: `🛡️ Respaldo Automático MILAS - ${new Date().toLocaleDateString()}`,
      text: "Hola,\n\nSe adjunta el respaldo automático de la base de datos del sistema de MILAS en formato JSON.\n\nContiene todo el inventario de equipos industriales, catálogos, proveedores y gestión de tareas al día de hoy.\n\nEste proceso también mantiene activa la conexión con Supabase.",
      attachments: [
        {
          filename: `milas_backup_${new Date().toISOString().split("T")[0]}.json`,
          content: JSON.stringify(backupData, null, 2),
        },
      ],
    });

    return NextResponse.json({
      success: true,
      message:
        "Cron ejecutado. Respaldo enviado por correo corporativo correctamente.",
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
