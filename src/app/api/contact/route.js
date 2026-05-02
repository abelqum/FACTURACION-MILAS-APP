import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request) {
  try {
    // 1. Recibir los datos del formulario que mandó el cliente
    const body = await request.json();
    const { nombre, correo, mensaje } = body;

    if (!nombre || !correo || !mensaje) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    // 2. Conectarnos a tu Gmail (Usa las mismas variables que el backup)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 3. Preparar el correo
    const mailOptions = {
      from: '"Página Web WOOX" <' + process.env.EMAIL_USER + ">", // Sale desde tu sistema
      to: process.env.EMAIL_USER, // Te llega a tu misma bandeja (adwebdev29@gmail.com)
      replyTo: correo, // 🟢 MAGIA: Si le das "Responder" en Gmail, le contestará directo al cliente
      subject: `🚨 Nuevo mensaje web de: ${nombre}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #131b2e; padding: 20px; border: 1px solid #bec9c2; border-radius: 10px;">
          <h2 style="color: #004532;">Nuevo Contacto desde la Web</h2>
          <p><strong>👤 Nombre del cliente:</strong> ${nombre}</p>
          <p><strong>📧 Correo de contacto:</strong> ${correo}</p>
          <hr style="border: none; border-top: 1px solid #bec9c2; margin: 20px 0;">
          <p><strong>💬 Mensaje:</strong></p>
          <p style="background: #f2f3ff; padding: 15px; border-radius: 8px;">${mensaje}</p>
        </div>
      `,
    };

    // 4. Enviar
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: "Correo enviado" });
  } catch (error) {
    console.error("Error al enviar el formulario:", error);
    return NextResponse.json(
      { error: "No se pudo enviar el mensaje." },
      { status: 500 },
    );
  }
}
