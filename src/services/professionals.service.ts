import { supabase } from '../lib/supabase';
import { Doctor } from '../types';

interface ProfesionalServicioJoin {
  id: string;
  profesional_id: string;
  servicio_id: string;
  profesionales: { id: string; nombre: string; apellido: string; activo: boolean } | null;
  servicios: { id: string; nombre: string } | null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Trae la lista "profesional x servicio" (una fila Doctor por combinación) con
 * demora/ausencia vigentes hoy resueltas desde las tablas reales. */
export async function getProfesionales(): Promise<Doctor[]> {
  const today = todayIso();

  const [{ data: joins, error: joinsError }, { data: demoras, error: demorasError }, { data: ausencias, error: ausenciasError }] =
    await Promise.all([
      supabase
        .from('profesional_servicio')
        .select('id, profesional_id, servicio_id, profesionales(id, nombre, apellido, activo), servicios(id, nombre)')
        .eq('activo', true),
      supabase.from('demoras_profesionales').select('*').eq('fecha', today).eq('activo', true),
      supabase.from('ausencias_profesionales').select('*').lte('fecha_desde', today).gte('fecha_hasta', today),
    ]);

  if (joinsError) throw joinsError;
  if (demorasError) throw demorasError;
  if (ausenciasError) throw ausenciasError;

  const demoraByProfesional = new Map((demoras || []).map((d) => [d.profesional_id, d.minutos_demora]));
  const ausenciaByProfesional = new Map((ausencias || []).map((a) => [a.profesional_id, a.motivo || 'Licencia / ausencia registrada']));

  return ((joins as unknown as ProfesionalServicioJoin[]) || [])
    .filter((j) => j.profesionales && j.servicios && j.profesionales.activo)
    .map((j) => ({
      id: `${j.profesional_id}::${j.servicio_id}`,
      nombre: `Dr./Dra. ${j.profesionales!.nombre} ${j.profesionales!.apellido}`,
      especialidad: j.servicios!.nombre,
      tipoAgenda: 'PROFESIONAL' as const,
      consultorio: 'A confirmar',
      diasAtencion: 'Lunes a Viernes',
      horario: '08:00 - 17:00',
      demoraMinutos: demoraByProfesional.get(j.profesional_id) || 0,
      ausente: ausenciaByProfesional.has(j.profesional_id),
      motivoAusencia: ausenciaByProfesional.get(j.profesional_id),
    }));
}

/** Extrae el profesional_id "real" (UUID de la tabla profesionales) desde un id
 * compuesto "profesionalId::servicioId" usado en el Doctor mapeado. */
export function realProfesionalId(doctorId: string): string {
  return doctorId.split('::')[0];
}

export function realServicioIdFromDoctor(doctorId: string): string | undefined {
  return doctorId.split('::')[1];
}
