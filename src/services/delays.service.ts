import { supabase } from '../lib/supabase';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function reportarDemora(profesionalId: string, minutos: number): Promise<void> {
  const today = todayIso();
  await clearDemora(profesionalId);
  const { error } = await supabase.from('demoras_profesionales').insert({
    profesional_id: profesionalId,
    fecha: today,
    minutos_demora: minutos,
    activo: true,
  });
  if (error) throw error;
}

export async function clearDemora(profesionalId: string): Promise<void> {
  const today = todayIso();
  const { error } = await supabase
    .from('demoras_profesionales')
    .update({ activo: false })
    .eq('profesional_id', profesionalId)
    .eq('fecha', today);
  if (error) throw error;
}
