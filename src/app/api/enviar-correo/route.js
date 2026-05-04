import { NextResponse } from "next/dist/server/web/spec-extension/response";
import nodemailer from "nodemailer";

export async function POST(request) {
  try {
    const body = await request.json();
    const { destinatarios, asunto, mensajeHtml, adjuntos } = body;

    if (
      !destinatarios ||
      destinatarios.length === 0 ||
      !asunto ||
      !mensajeHtml
    ) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios" },
        { status: 400 },
      );
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465, // Convertimos a número por si acaso
      secure: true, // true funciona con el puerto 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: {
        // 🟢 ESTO ES CLAVE: Ignora errores de certificados del servidor de hosting
        rejectUnauthorized: false,
      },
    });

    // Formateamos los archivos para nodemailer
    const attachments = adjuntos
      ? adjuntos.map((file) => ({
          filename: file.filename,
          content: file.content,
          encoding: "base64",
        }))
      : [];

    const mailOptions = {
      from: `"MILAS Equipos Industriales" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // Para evitar que vean la lista
      bcc: destinatarios, // Copia oculta a todos los clientes
      subject: asunto,
      html: mensajeHtml,
      attachments: attachments, // 🟢 Aquí van los PDFs o archivos
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json(
      { message: "Correos enviados exitosamente" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error enviando correo:", error);
    return NextResponse.json(
      { error: "Hubo un error al procesar el envío" },
      { status: 500 },
    );
  }
}
