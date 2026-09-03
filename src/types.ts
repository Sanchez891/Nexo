export type UserRole =
  | 'familiar'
  | 'administrativo'
  | 'medico'
  | 'asistente_social'
  | 'administrador';

export type AppointmentStatus =
  | 'PENDIENTE_DE_LLEGADA'
  | 'EN_ESPERA'
  | 'EN_CONSULTORIO'
  | 'ATENDIDO'
  | 'CANCELADO'
  | 'NO_ASISTIO';

export type TipoAgenda = 'SERVICIO' | 'PROFESIONAL';

export type TipoPrestacion =
  | 'consulta_medica'
  | 'estudios_imagenes'
  | 'laboratorio'
  | 'odontologia';

export type RequestChannel =
  | 'whatsapp'
  | 'telefono'
  | 'presencial'
  | 'web'
  | 'asistente_social';

export type Localidad =
  | 'Corrientes Capital'
  | 'Goya'
  | 'Mercedes'
  | 'Paso de los Libres'
  | 'Curuzú Cuatiá'
  | 'Bella Vista'
  | 'Ituzaingó'
  | 'Santo Tomé'
  | 'San Luis del Palmar'
  | 'Esquina'
  | 'Monte Caseros'
  | 'Saladas'
  | 'Otra';

export type TipoRelacionTutor =
  | 'Madre'
  | 'Padre'
  | 'Tutor legal'
  | 'Abuelo/a'
  | 'Tío/a'
  | 'Hermano/a mayor responsable'
  | 'Otro responsable autorizado';

export interface Tutor {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento?: string;
  telefono: string;
  email: string;
  localidad: Localidad;
  domicilio?: string;
}

export interface Patient {
  id: string;
  dni: string;
  nombre: string; // Nombre de pila o nombre completo
  apellido?: string;
  fechaNacimiento: string; // YYYY-MM-DD
  edad: number; // En años (ej: 0.2 para 2 meses, 8 para 8 años). Debe ser > 0.08 y <= 15
  edadMeses?: number;
  sexo?: 'M' | 'F' | 'Otro';
  localidad: Localidad;
  telefono: string;
  tutor: string; // Nombre del tutor responsable principal
  tutorId?: string;
  relacionConTutor?: TipoRelacionTutor | string;
  distanciaKm?: number;
  antecedentes?: string;
}

export interface RelacionTutorPaciente {
  id: string;
  tutorId: string;
  pacienteId: string;
  tipoRelacion: TipoRelacionTutor;
  responsablePrincipal: boolean;
  autorizadoAGestionarTurnos: boolean;
}

export interface Appointment {
  id: string;
  codigo: string;
  pacienteId: string;
  pacienteNombre: string;
  pacienteEdad: number;
  pacienteLocalidad: Localidad;
  tutorSolicitanteId?: string;
  tutorSolicitanteNombre?: string;
  tutorSolicitanteRelacion?: string;
  tutorSolicitanteTelefono?: string;
  tipoPrestacion: TipoPrestacion;
  tipoAgenda: TipoAgenda;
  especialidad: string;
  profesional: string; // Nombre del profesional o "Se asignará al momento de la atención"
  profesionalId?: string;
  consultorio: string;
  fecha: string; // YYYY-MM-DD
  hora: string;  // HH:MM
  estado: AppointmentStatus;
  origenCanal: RequestChannel;
  tieneDerivacion: boolean;
  tipoConsulta: 'Primera consulta' | 'Control' | 'Estudio' | 'Laboratorio' | 'Odontología';
  motivoResumido?: string;
  optimizadoViaje?: boolean;
  createdAt: string;
  observaciones?: string;
}

export interface WaitlistEntry {
  id: string;
  pacienteId: string;
  pacienteNombre: string;
  dni: string;
  edad: number;
  especialidad: string;
  tipoPrestacion: TipoPrestacion;
  localidad: Localidad;
  fechaSolicitud: string;
  preferenciaHorario: 'cualquiera' | 'manana' | 'tarde';
  prioridad: 'alta' | 'normal';
  telefono: string;
  estado: 'esperando' | 'notificado' | 'asignado';
  posicion: number;
  motivo?: string;
  tutorResponsableId?: string;
  tutorResponsableNombre?: string;
  tutorResponsableTelefono?: string;
  tutorResponsableRelacion?: string;
  origenCanal?: RequestChannel;
}

export interface InboundRequest {
  id: string;
  canal: RequestChannel;
  remitente: string;
  telefono: string;
  mensajeOriginal: string;
  fechaHora: string;
  interpretacion: {
    especialidad: string;
    tipoPrestacion?: TipoPrestacion;
    tipoAgenda?: TipoAgenda;
    localidad: Localidad;
    tipoConsulta: string;
    pacienteNombre: string;
    pacienteEdad?: number;
    urgencia: 'baja' | 'media' | 'alta';
  };
  estado: 'pendiente' | 'asignado' | 'descartado';
}

export interface Doctor {
  id: string;
  nombre: string;
  especialidad: string;
  tipoAgenda: TipoAgenda;
  consultorio: string;
  diasAtencion: string;
  horario: string;
  avatarColor?: string;
  demoraMinutos?: number; // 0, 15, 30, 45, 60
  ausente?: boolean;
  motivoAusencia?: string;
}

export interface Specialty {
  id: string;
  nombre: string;
  tipoPrestacion: TipoPrestacion;
  tipoAgenda: TipoAgenda;
  descripcion: string;
  consultoriosHabilitados: string[];
  duracionMinutos: number;
  demandaEstimada: string;
}

export interface UrgencyEntry {
  id: string;
  pacienteNombre: string;
  pacienteEdad: number;
  dni: string;
  localidad: Localidad;
  tutor: string;
  telefono: string;
  motivoUrgencia: string;
  fechaHora: string;
  triage: 'rojo' | 'amarillo' | 'verde';
  estado: 'en_atencion_urgencia' | 'estabilizado' | 'derivado';
}

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDIENTE_DE_LLEGADA: 'Pendiente de llegada',
  EN_ESPERA: 'En espera',
  EN_CONSULTORIO: 'En consultorio',
  ATENDIDO: 'Atendido',
  CANCELADO: 'Cancelado',
  NO_ASISTIO: 'No asistió',
};

export const PRESTACION_LABELS: Record<TipoPrestacion, string> = {
  consulta_medica: 'Consulta médica',
  estudios_imagenes: 'Estudios / Imágenes',
  laboratorio: 'Laboratorio',
  odontologia: 'Odontología',
};
