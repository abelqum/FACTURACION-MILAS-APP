"use server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export async function crearUsuarioDesdeAdmin(datos) {
  const { email, password, nombre, rol } = datos;

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
  });

  if (error) return { error: error.message };

  const { error: perfilError } = await supabaseAdmin
    .from("perfiles")
    .insert([{ id: data.user.id, nombre: nombre, rol: rol }]);

  if (perfilError) return { error: perfilError.message };

  return { success: true };
}

// 🟢 NUEVA FUNCIÓN PARA ELIMINAR
export async function eliminarUsuarioDesdeAdmin(idUsuario) {
  // 1. Borramos al usuario de la bóveda de autenticación (auth.users)
  const { error: authError } =
    await supabaseAdmin.auth.admin.deleteUser(idUsuario);

  if (authError) return { error: authError.message };

  // 2. Por seguridad, también lo borramos de la tabla pública 'perfiles'
  // (Aunque si configuraste "Delete Cascade" en tu base de datos, esto se haría solo)
  await supabaseAdmin.from("perfiles").delete().eq("id", idUsuario);

  return { success: true };
}
