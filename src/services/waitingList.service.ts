import { supabase } from '../lib/supabase';
import { RequestChannel, WaitlistEntry } from '../types';
import { CanalOrigenDb, ListaEsperaRow, PreferenciaHorariaDb } from '../types/database';
import { calculateAgeFromBirthdate, toLocalidad } from './mappers';

const CANAL_TO_DB: Record<RequestChannel, CanalOrigenDb> = {
  web: 'WEB',
  whatsapp: 'WHATSAPP',
  telefono: 'TELEFONO',
  presencial: 'PRESENCIAL',
  asistente_social: 'ASISTENTE_SOCIAL',
};
const CANAL_TO_UI: Record<CanalOrigenDb, RequestChannel> = {
  WEB: 'web',
  WHATSAPP: 'whatsapp',
  TELEFONO: 'telefono',
  PRESENCIAL: 'presencial',
  ASISTENTE_SOCIAL: 'asistente_social',
};

const PREF_TO_DB: Record<'cualquiera' | 'manana' | 'tarde', PreferenciaHorariaDb> = {
  cualquiera: 'INDISTINTO',
  manana: 'MANANA',
  tarde: 'TARDE',
};
const PREF_TO_UI: Record<PreferenciaHorariaDb, 'cualquiera' | 'manana' | 'tarde'> = {
  INDISTINTO: 'cualquiera',
  MANANA: 'manana',
  TARDE: 'tarde',
};

interface ListaEsperaJoinRow extends ListaEsperaRow {
  pacientes: { nombre: string; apellido: string; dni: string; fecha_nacimiento: string; localidad: string } | null;
  tutores: { nombre: string; apellido: string; telefono: string } | null;
  servicios: { nombre: string } | null;
}

function mapEntry(row: ListaEsperaJoinRow, posicion: number): WaitlistEntry {
  const age = row.pacientes ? calculateAgeFromBirthdate(row.pacientes.fecha_nacimiento) : { years: 0 };
  return {
    id: row.id,
    pacienteId: row.paciente_id,
    pacienteNombre: row.pacientes ? `${row.pacientes.nombre} ${row.pacientes.apellido}`.trim() : 'Paciente',
    dni: row.pacientes?.dni || '',
    edad: age.years,
    especialidad: row.servicios?.nombre || '',
    tipoPrestacion: 'consulta_medica',
    localidad: toLocalidad(row.localidad),
    fechaSolicitud: row.fecha_ingreso,
    preferenciaHorario: PREF_TO_UI[row.preferencia_horaria],
    prioridad: 'normal',
    telefono: row.tutores?.telefono || '',
    estado: row.estado === 'ACTIVO' ? 'esperando' : row.estado === 'ASIGNADO' ? 'asignado' : 'notificado',
    posicion,
    tutorResponsableId: row.tutor_id || undefined,
    tutorResponsableNombre: row.tutores ? `${row.tutores.nombre} ${row.tutores.apellido}` : undefined,
    tutorResponsableTelefono: row.tutores?.telefono,
    origenCanal: CANAL_TO_UI[row.canal_origen],
  };
}

const SELECT = `*, pacientes(nombre, apellido, dni, fecha_nacimiento, localidad), tutores(nombre, apellido, telefono), servicios(nombre)`;

export async function getListaEspera(): Promise<WaitlistEntry[]> {
  const { data, error } = await supabase
    .from('lista_espera')
    .select(SELECT)
    .eq('estado', 'ACTIVO')
    .order('fecha_ingreso', { ascending: true });
  if (error) throw error;

  const rows = (data as unknown as ListaEsperaJoinRow[]) || [];
  const posicionPorServicio = new Map<string, number>();
  return rows.map((row) => {
    const pos = (posicionPorServicio.get(row.servicio_id) || 0) + 1;
    posicionPorServicio.set(row.servicio_id, pos);
    return mapEntry(row, pos);
  });
}

export async function addToWaitlist(data: {
  pacienteId: string;
  tutorId?: string;
  servicioId: string;
  profesionalPreferidoId?: string;
  preferenciaHorario: 'cualquiera' | 'manana' | 'tarde';
  localidad: string;
  origenCanal: RequestChannel;
}): Promise<WaitlistEntry> {
  const { data: row, error } = await supabase
    .from('lista_espera')
    .insert({
      paciente_id: data.pacienteId,
      tutor_id: data.tutorId,
      servicio_id: data.servicioId,
      profesional_preferido_id: data.profesionalPreferidoId,
      preferencia_horaria: PREF_TO_DB[data.preferenciaHorario],
      localidad: data.localidad,
      estado: 'ACTIVO',
      canal_origen: CANAL_TO_DB[data.origenCanal],
    })
    .select(SELECT)
    .single();
  if (error) throw error;

  const { count } = await supabase
    .from('lista_espera')
    .select('id', { count: 'exact', head: true })
    .eq('servicio_id', data.servicioId)
    .eq('estado', 'ACTIVO');

  return mapEntry(row as unknown as ListaEsperaJoinRow, count || 1);
}

export async function removeFromWaitlist(id: string): Promise<void> {
  const { error } = await supabase.from('lista_espera').update({ estado: 'CANCELADO' }).eq('id', id);
  if (error) throw error;
}

export async function marcarAsignado(id: string): Promise<void> {
  const { error } = await supabase.from('lista_espera').update({ estado: 'ASIGNADO' }).eq('id', id);
  if (error) throw error;
}

/** Candidatos compatibles con el turno recién cancelado (mismo servicio /
 * profesional preferido). La asignación final siempre la confirma un humano. */
export async function getCandidatosCompatibles(turnoId: string): Promise<WaitlistEntry[]> {
  const { data, error } = await supabase.rpc('candidatos_lista_espera', { p_turno_id: turnoId });
  if (error) throw error;
  const ids = (data || []).map((r: any) => r.id as string);
  if (ids.length === 0) return [];

  const { data: full, error: fullError } = await supabase.from('lista_espera').select(SELECT).in('id', ids);
  if (fullError) throw fullError;
  return ((full as unknown as ListaEsperaJoinRow[]) || []).map((row, idx) => mapEntry(row, idx + 1));
}
