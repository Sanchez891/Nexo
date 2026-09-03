import { createClient } from '@supabase/supabase-js';

// Nota: el cliente se deja SIN el generic `Database<...>` de supabase-js a
// propósito. Ese generic exige que src/types/database.ts calce exactamente
// con el contrato interno de PostgREST typegen (Row/Insert/Update/
// Relationships por tabla), lo que es frágil de mantener a mano. En su lugar,
// src/types/database.ts documenta la forma real de cada fila y los services
// (src/services/*.service.ts) mapean manualmente cada respuesta a los tipos
// del dominio (src/types.ts) — ver services/mappers.ts.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.error(
    '[Supabase] Faltan variables de entorno VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Copiá .env.example a .env.local y completá los valores de tu proyecto Supabase.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
