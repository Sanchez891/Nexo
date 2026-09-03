import { supabase } from '../lib/supabase';
import { TipoAgenda } from '../types';

export interface AvailableSlot {
  slotId: string;
  fecha: string;
  hora: string;
  profesional: string;
  profesionalId?: string;
  consultorio: string;
  tipoAgenda: TipoAgenda;
}

interface SlotJoinRow {
  id: string;
  fecha: string;
  hora_inicio: string;
  profesional_id: string | null;
  profesionales: { nombre: string; apellido: string } | null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Máximo hoy + 30 días, tal como exige el hospital para turnos programados. */
export function maxBookingDate(): string {
  return addDaysIso(30);
}

/** Slots DISPONIBLE de un servicio (y opcionalmente un profesional puntual)
 * dentro de la ventana [hoy, hoy+30 días]. Consulta real a agenda_slots. */
export async function getSlotsDisponibles(params: {
  servicioId: string;
  profesionalId?: string;
  tipoAgenda: TipoAgenda;
}): Promise<AvailableSlot[]> {
  let query = supabase
    .from('agenda_slots')
    .select('id, fecha, hora_inicio, profesional_id, profesionales(nombre, apellido)')
    .eq('servicio_id', params.servicioId)
    .eq('estado', 'DISPONIBLE')
    .gte('fecha', todayIso())
    .lte('fecha', maxBookingDate())
    .order('fecha', { ascending: true })
    .order('hora_inicio', { ascending: true });

  if (params.profesionalId) {
    query = query.eq('profesional_id', params.profesionalId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return ((data as unknown as SlotJoinRow[]) || []).map((row) => ({
    slotId: row.id,
    fecha: row.fecha,
    hora: row.hora_inicio.slice(0, 5),
    profesional: row.profesionales
      ? `Dr./Dra. ${row.profesionales.nombre} ${row.profesionales.apellido}`
      : 'Se asignará al momento de la atención',
    profesionalId: row.profesional_id || undefined,
    consultorio: 'A confirmar en recepción',
    tipoAgenda: params.tipoAgenda,
  }));
}

/** Busca un slot DISPONIBLE puntual (mismo servicio/profesional/fecha/hora),
 * usado por la reprogramación administrativa. */
export async function findSlotExacto(params: {
  servicioId: string;
  profesionalId?: string;
  fecha: string;
  hora: string;
}): Promise<string | null> {
  let query = supabase
    .from('agenda_slots')
    .select('id')
    .eq('servicio_id', params.servicioId)
    .eq('fecha', params.fecha)
    .eq('hora_inicio', `${params.hora}:00`)
    .eq('estado', 'DISPONIBLE')
    .limit(1);

  if (params.profesionalId) query = query.eq('profesional_id', params.profesionalId);

  const { data, error } = await query;
  if (error) throw error;
  return data && data[0] ? data[0].id : null;
}

/** Cantidad de turnos activos (no cancelados/atendidos/no-show) por
 * profesional dentro de un servicio, usada para repartir la asignación
 * automática de forma equitativa y no sobrecargar siempre al mismo médico. */
export async function getCargaPorProfesional(
  servicioId: string,
  profesionalIds: string[]
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  const ids = Array.from(new Set(profesionalIds.filter(Boolean)));
  ids.forEach((id) => {
    counts[id] = 0;
  });
  if (ids.length === 0) return counts;

  const { data, error } = await supabase
    .from('turnos')
    .select('profesional_id')
    .eq('servicio_id', servicioId)
    .in('profesional_id', ids)
    .not('estado', 'in', '(CANCELADO,ATENDIDO,NO_ASISTIO)');
  if (error) throw error;

  (data || []).forEach((row: any) => {
    if (row.profesional_id) counts[row.profesional_id] = (counts[row.profesional_id] || 0) + 1;
  });
  return counts;
}

/** Entre varios slots candidatos para el mismo horario (distintos
 * profesionales de la misma especialidad), elige el del profesional con
 * menos turnos activos en curso; ante empate, elige al azar entre los
 * menos cargados para repartir parejo en el tiempo. */
export async function pickBalancedSlot(servicioId: string, candidates: AvailableSlot[]): Promise<AvailableSlot> {
  if (candidates.length <= 1) return candidates[0];

  const profesionalIds = candidates.map((c) => c.profesionalId).filter((id): id is string => Boolean(id));
  if (profesionalIds.length === 0) return candidates[0];

  const carga = await getCargaPorProfesional(servicioId, profesionalIds);

  let minCount = Infinity;
  let winners: AvailableSlot[] = [];
  for (const c of candidates) {
    const count = c.profesionalId ? carga[c.profesionalId] ?? 0 : 0;
    if (count < minCount) {
      minCount = count;
      winners = [c];
    } else if (count === minCount) {
      winners.push(c);
    }
  }
  return winners[Math.floor(Math.random() * winners.length)];
}

export function filterByPreferenciaHoraria(
  slots: AvailableSlot[],
  preferencia: 'manana' | 'tarde' | 'cualquiera'
): AvailableSlot[] {
  if (preferencia === 'cualquiera') return slots;
  return slots.filter((s) => {
    const hour = parseInt(s.hora.split(':')[0], 10);
    return preferencia === 'manana' ? hour < 13 : hour >= 13;
  });
}
