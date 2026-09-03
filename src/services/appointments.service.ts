import { supabase } from '../lib/supabase';
import { Appointment, AppointmentStatus, RequestChannel, TipoAgenda } from '../types';
import { CanalOrigenDb, TurnoEstadoDb } from '../types/database';
import { calculateAgeFromBirthdate, toLocalidad } from './mappers';

export class SlotNoDisponibleError extends Error {
  constructor() {
    super('Este horario acaba de ser reservado. Elegí otra opción disponible.');
    this.name = 'SlotNoDisponibleError';
  }
}

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

const ESTADO_TO_UI: Record<TurnoEstadoDb, AppointmentStatus> = {
  PENDIENTE_DE_LLEGADA: 'PENDIENTE_DE_LLEGADA',
  EN_ESPERA: 'EN_ESPERA',
  EN_CONSULTORIO: 'EN_CONSULTORIO',
  ATENDIDO: 'ATENDIDO',
  CANCELADO: 'CANCELADO',
  NO_ASISTIO: 'NO_ASISTIO',
};

interface TurnoJoinRow {
  id: string;
  codigo: string;
  paciente_id: string;
  tutor_solicitante_id: string | null;
  servicio_id: string;
  profesional_id: string | null;
  slot_id: string;
  tipo_agenda: TipoAgenda;
  estado: TurnoEstadoDb;
  canal_origen: CanalOrigenDb;
  motivo_resumido: string | null;
  observaciones: string | null;
  created_at: string;
  pacientes: { id: string; nombre: string; apellido: string; fecha_nacimiento: string; localidad: string } | null;
  tutor_solicitante: { id: string; nombre: string; apellido: string; telefono: string } | null;
  servicios: { id: string; nombre: string } | null;
  profesionales: { id: string; nombre: string; apellido: string } | null;
  agenda_slots: { fecha: string; hora_inicio: string } | null;
}

const SELECT_TURNO = `
  id, codigo, paciente_id, tutor_solicitante_id, servicio_id, profesional_id, slot_id,
  tipo_agenda, estado, canal_origen, motivo_resumido, observaciones, created_at,
  pacientes(id, nombre, apellido, fecha_nacimiento, localidad),
  tutor_solicitante:tutores!turnos_tutor_solicitante_id_fkey(id, nombre, apellido, telefono),
  servicios(id, nombre),
  profesionales(id, nombre, apellido),
  agenda_slots(fecha, hora_inicio)
`;

function mapTurno(row: TurnoJoinRow): Appointment {
  const age = row.pacientes ? calculateAgeFromBirthdate(row.pacientes.fecha_nacimiento) : { years: 0 };
  const pacienteNombre = row.pacientes ? `${row.pacientes.nombre} ${row.pacientes.apellido}`.trim() : 'Paciente';
  const profesionalNombre = row.profesionales
    ? `Dr./Dra. ${row.profesionales.nombre} ${row.profesionales.apellido}`
    : 'Se asignará al momento de la atención';

  return {
    id: row.id,
    codigo: row.codigo,
    pacienteId: row.paciente_id,
    pacienteNombre,
    pacienteEdad: age.years,
    pacienteLocalidad: toLocalidad(row.pacientes?.localidad),
    tutorSolicitanteId: row.tutor_solicitante_id || undefined,
    tutorSolicitanteNombre: row.tutor_solicitante
      ? `${row.tutor_solicitante.nombre} ${row.tutor_solicitante.apellido}`
      : undefined,
    tutorSolicitanteTelefono: row.tutor_solicitante?.telefono,
    tipoPrestacion: 'consulta_medica',
    tipoAgenda: row.tipo_agenda,
    especialidad: row.servicios?.nombre || '',
    profesional: profesionalNombre,
    profesionalId: row.profesional_id || undefined,
    slotId: row.slot_id,
    consultorio: 'A confirmar en recepción',
    fecha: row.agenda_slots?.fecha || '',
    hora: row.agenda_slots?.hora_inicio?.slice(0, 5) || '',
    estado: ESTADO_TO_UI[row.estado],
    origenCanal: CANAL_TO_UI[row.canal_origen],
    tieneDerivacion: true,
    tipoConsulta: 'Primera consulta',
    motivoResumido: row.motivo_resumido || undefined,
    observaciones: row.observaciones || undefined,
    createdAt: row.created_at,
  };
}

export interface TurnosFilter {
  fecha?: string;
  servicioId?: string;
  profesionalId?: string;
  estado?: AppointmentStatus;
  tutorId?: string;
  pacienteId?: string;
}

export async function getTurnos(filter: TurnosFilter = {}): Promise<Appointment[]> {
  let query = supabase.from('turnos').select(SELECT_TURNO).order('created_at', { ascending: false });

  if (filter.servicioId) query = query.eq('servicio_id', filter.servicioId);
  if (filter.profesionalId) query = query.eq('profesional_id', filter.profesionalId);
  if (filter.estado) query = query.eq('estado', filter.estado);
  if (filter.tutorId) query = query.eq('tutor_solicitante_id', filter.tutorId);
  if (filter.pacienteId) query = query.eq('paciente_id', filter.pacienteId);

  const { data, error } = await query;
  if (error) throw error;

  let rows = ((data as unknown as TurnoJoinRow[]) || []).map(mapTurno);
  if (filter.fecha) rows = rows.filter((a) => a.fecha === filter.fecha);
  return rows;
}

export interface ReservarTurnoParams {
  slotId: string;
  pacienteId: string;
  tutorSolicitanteId?: string;
  canalOrigen: RequestChannel;
  motivoResumido?: string;
  createdByProfileId?: string;
}

export interface BookingResult {
  success: boolean;
  appointment?: Appointment;
  error?: string;
}

export async function reservarTurno(params: ReservarTurnoParams): Promise<BookingResult> {
  const { data, error } = await supabase.rpc('reservar_turno', {
    p_slot_id: params.slotId,
    p_paciente_id: params.pacienteId,
    p_tutor_solicitante_id: params.tutorSolicitanteId || null,
    p_canal_origen: CANAL_TO_DB[params.canalOrigen],
    p_created_by_profile_id: params.createdByProfileId || null,
    p_motivo_resumido: params.motivoResumido || null,
  });

  if (error) {
    if (error.message?.includes('SLOT_NO_DISPONIBLE')) {
      return { success: false, error: 'Este horario acaba de ser reservado. Elegí otra opción disponible.' };
    }
    return { success: false, error: error.message };
  }

  const turnoId = (data as { id: string }).id;
  const turno = await getTurnoById(turnoId);
  return { success: true, appointment: turno || undefined };
}

export async function getTurnoById(id: string): Promise<Appointment | null> {
  const { data, error } = await supabase.from('turnos').select(SELECT_TURNO).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapTurno(data as unknown as TurnoJoinRow) : null;
}

export async function cancelarTurno(turnoId: string, motivo?: string): Promise<Appointment> {
  const { error } = await supabase.rpc('cancelar_turno', { p_turno_id: turnoId, p_motivo: motivo || null });
  if (error) throw error;
  const turno = await getTurnoById(turnoId);
  if (!turno) throw new Error('No se pudo recuperar el turno cancelado.');
  return turno;
}

export async function checkinTurno(turnoId: string): Promise<Appointment> {
  const { error } = await supabase.rpc('checkin_turno', { p_turno_id: turnoId });
  if (error) throw error;
  const turno = await getTurnoById(turnoId);
  if (!turno) throw new Error('No se pudo recuperar el turno.');
  return turno;
}

export async function atenderTurno(turnoId: string): Promise<Appointment> {
  const { error } = await supabase.rpc('atender_turno', { p_turno_id: turnoId });
  if (error) throw error;
  const turno = await getTurnoById(turnoId);
  if (!turno) throw new Error('No se pudo recuperar el turno.');
  return turno;
}

export async function finalizarTurno(turnoId: string): Promise<Appointment> {
  const { error } = await supabase.rpc('finalizar_turno', { p_turno_id: turnoId });
  if (error) throw error;
  const turno = await getTurnoById(turnoId);
  if (!turno) throw new Error('No se pudo recuperar el turno.');
  return turno;
}

/** Tiempo promedio de atención real (EN_CONSULTORIO -> ATENDIDO), en
 * minutos, sobre los turnos ya atendidos que tienen ambos timestamps. */
export async function getTiempoPromedioAtencionMinutos(): Promise<number | null> {
  const { data, error } = await supabase
    .from('turnos')
    .select('hora_inicio_atencion, hora_fin_atencion')
    .eq('estado', 'ATENDIDO')
    .not('hora_inicio_atencion', 'is', null)
    .not('hora_fin_atencion', 'is', null);
  if (error) throw error;

  const rows = data || [];
  if (rows.length === 0) return null;

  const totalMinutos = rows.reduce((sum, row: any) => {
    const inicio = new Date(row.hora_inicio_atencion).getTime();
    const fin = new Date(row.hora_fin_atencion).getTime();
    return sum + Math.max(0, (fin - inicio) / 60000);
  }, 0);

  return totalMinutos / rows.length;
}

export async function marcarNoAsistio(turnoId: string): Promise<Appointment> {
  const { error } = await supabase.rpc('marcar_no_asistio', { p_turno_id: turnoId });
  if (error) throw error;
  const turno = await getTurnoById(turnoId);
  if (!turno) throw new Error('No se pudo recuperar el turno.');
  return turno;
}
