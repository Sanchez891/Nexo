import { supabase } from '../lib/supabase';
import { Appointment } from '../types';
import { getTurnoById } from './appointments.service';

export async function reportarAusencia(data: {
  profesionalId: string;
  fechaDesde: string;
  fechaHasta: string;
  motivo?: string;
  createdBy?: string;
}): Promise<void> {
  const { error } = await supabase.from('ausencias_profesionales').insert({
    profesional_id: data.profesionalId,
    fecha_desde: data.fechaDesde,
    fecha_hasta: data.fechaHasta,
    motivo: data.motivo,
    created_by: data.createdBy,
  });
  if (error) throw error;
}

export async function clearAusencia(profesionalId: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from('ausencias_profesionales')
    .delete()
    .eq('profesional_id', profesionalId)
    .lte('fecha_desde', today)
    .gte('fecha_hasta', today);
  if (error) throw error;
}

/** Turnos afectados por una ausencia (próximos 30 días), para que el
 * administrativo decida manualmente cómo reubicarlos. */
export async function getTurnosAfectadosPorAusencia(
  profesionalId: string,
  fechaDesde: string,
  fechaHasta: string
): Promise<Appointment[]> {
  const { data, error } = await supabase.rpc('turnos_afectados_por_ausencia', {
    p_profesional_id: profesionalId,
    p_fecha_desde: fechaDesde,
    p_fecha_hasta: fechaHasta,
  });
  if (error) throw error;

  const ids = (data || []).map((t: any) => t.id as string);
  const turnos = await Promise.all(ids.map((id) => getTurnoById(id)));
  return turnos.filter((t): t is Appointment => Boolean(t));
}
