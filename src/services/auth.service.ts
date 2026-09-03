import { supabase } from '../lib/supabase';

/**
 * El MVP actual navega por rol mediante el selector "Modo demo" (ver
 * Navbar.tsx / HospitalContext) sin pedir login real, para no romper la
 * demostración del hackathon. Esta capa deja preparado el camino a
 * Supabase Auth real para cuando existan cuentas por tutor/profesional:
 *
 *   1. Crear usuarios reales en Supabase Auth (Dashboard > Authentication,
 *      o supabase.auth.admin.createUser desde un script con la service key,
 *      NUNCA desde el navegador).
 *   2. Vincular cada auth.users.id a una fila de `profiles` (auth_user_id).
 *   3. Reemplazar el selector de rol por supabase.auth.signInWithPassword
 *      (o magic link) y leer el rol real desde `profiles.rol`.
 *   4. Activar las políticas RLS estrictas documentadas (comentadas) en
 *      supabase/migrations/0003_rls.sql.
 */

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentProfile() {
  const { data: sessionData } = await supabase.auth.getSession();
  const authUserId = sessionData.session?.user.id;
  if (!authUserId) return null;

  const { data, error } = await supabase.from('profiles').select('*').eq('auth_user_id', authUserId).maybeSingle();
  if (error) throw error;
  return data;
}
