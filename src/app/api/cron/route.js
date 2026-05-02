import { NextResponse } from "next/server";
import { supabase } from "@/app/_lib/supabase/supabase";

export async function GET(request) {
  // 🟢 BLOQUEO DE SEGURIDAD VERCEL CRON
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    // Hacemos la consulta más ligera posible: solo pedir 1 ID de la tabla productos
    const { data, error } = await supabase
      .from("productos")
      .select("id")
      .limit(1);

    if (error) throw error;

    console.log("⏰ Cron Job ejecutado: Supabase está despierto.");
    return NextResponse.json({
      success: true,
      message: "Ping a Supabase exitoso",
      data,
    });
  } catch (error) {
    console.error("Error en el Cron Job:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
