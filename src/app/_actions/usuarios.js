"use server";
import { createClient } from "@supabase/supabase-js";

// Inicializamos el cliente de Supabase con permisos de administrador.
// IMPORTANTE: Esto solo debe ejecutarse en el servidor ("use server").
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export async function crearUsuarioDesdeAdmin(datos) {
  const { email, password, nombre, rol } = datos;

  try {
    // 1. Crear usuario en Auth (Supabase GoTrue)
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: email.trim(),
        password: password,
        email_confirm: true, // Esto evita enviar correos de confirmación si no tienes el SMTP configurado
      });

    if (authError) {
      console.error("Error en Auth al crear usuario:", authError);
      return { error: authError.message };
    }

    if (!authData?.user?.id) {
      return { error: "No se pudo obtener el ID del usuario creado." };
    }

    // 2. Insertar su información en la tabla pública 'perfiles'
    const { error: perfilError } = await supabaseAdmin.from("perfiles").insert([
      {
        id: authData.user.id,
        nombre: nombre.trim(),
        rol: rol,
      },
    ]);

    if (perfilError) {
      console.error("Error al crear perfil en DB:", perfilError);
      // Si falla al crear el perfil, lo ideal sería borrar el usuario de Auth para no dejar "fantasmas"
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return { error: perfilError.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Excepción inesperada creando usuario:", err);
    return { error: "Ocurrió un error inesperado al procesar la solicitud." };
  }
}

// 🟢 FUNCIÓN PARA ELIMINAR USUARIO COMPLETAMENTE
export async function eliminarUsuarioDesdeAdmin(idUsuario) {
  if (!idUsuario) {
    return { error: "ID de usuario no proporcionado." };
  }

  try {
    // 1. Borramos al usuario de la bóveda de autenticación (auth.users)
    // Nota: Si tienes "On Delete Cascade" en Postgres de auth.users a public.perfiles,
    // este paso automáticamente borrará el registro de la tabla 'perfiles'.
    const { error: authError } =
      await supabaseAdmin.auth.admin.deleteUser(idUsuario);

    if (authError) {
      console.error("Error borrando desde Auth:", authError);
      return { error: authError.message };
    }

    // 2. Por precaución, forzamos el borrado en la tabla 'perfiles'
    // en caso de que el Cascade no esté activado.
    const { error: dbError } = await supabaseAdmin
      .from("perfiles")
      .delete()
      .eq("id", idUsuario);

    if (dbError) {
      console.error("Error borrando de perfiles:", dbError);
      // No retornamos error si solo falla esta parte porque el usuario ya no puede hacer login,
      // pero es bueno tener el log.
    }

    return { success: true };
  } catch (err) {
    console.error("Excepción inesperada eliminando usuario:", err);
    return { error: "Ocurrió un error inesperado al eliminar el usuario." };
  }
}
