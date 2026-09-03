// Tipos de la base de datos Supabase, escritos a mano a partir de
// supabase/migrations/0001_schema.sql. Si tenés la Supabase CLI instalada,
// podés regenerarlos automáticamente con:
//
//   npx supabase gen types typescript --project-id <tu-project-id> > src/types/database.ts
//
// (o --local si corrés Supabase local). Mientras tanto, mantené este archivo
// sincronizado a mano con las migraciones.

export type UserRoleDb = 'TUTOR' | 'ADMINISTRATIVO' | 'PROFESIONAL' | 'ASISTENTE_SOCIAL' | 'ADMIN';
export type TipoAgendaDb = 'SERVICIO' | 'PROFESIONAL';
export type TipoRelacionTutorDb =
  | 'MADRE'
  | 'PADRE'
  | 'TUTOR_LEGAL'
  | 'ABUELO'
  | 'ABUELA'
  | 'TIO'
  | 'TIA'
  | 'HERMANO'
  | 'HERMANA'
  | 'OTRO';
export type SlotEstadoDb = 'DISPONIBLE' | 'RESERVADO' | 'BLOQUEADO' | 'CANCELADO';
export type TurnoEstadoDb =
  | 'PENDIENTE_DE_LLEGADA'
  | 'EN_ESPERA'
  | 'EN_CONSULTORIO'
  | 'ATENDIDO'
  | 'CANCELADO'
  | 'NO_ASISTIO';
export type CanalOrigenDb = 'WEB' | 'WHATSAPP' | 'TELEFONO' | 'PRESENCIAL' | 'ASISTENTE_SOCIAL';
export type PreferenciaHorariaDb = 'MANANA' | 'TARDE' | 'INDISTINTO';
export type ListaEsperaEstadoDb = 'ACTIVO' | 'ASIGNADO' | 'CANCELADO';

export interface ProfileRow {
  id: string;
  auth_user_id: string | null;
  nombre: string;
  apellido: string;
  dni: string | null;
  telefono: string | null;
  email: string | null;
  localidad: string | null;
  rol: UserRoleDb;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface TutorRow {
  id: string;
  profile_id: string | null;
  dni: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string | null;
  localidad: string;
  domicilio: string | null;
  created_at: string;
  updated_at: string;
}

export interface PacienteRow {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  fecha_nacimiento: string;
  localidad: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface TutorPacienteRow {
  id: string;
  tutor_id: string;
  paciente_id: string;
  tipo_relacion: TipoRelacionTutorDb;
  responsable_principal: boolean;
  autorizado_gestionar_turnos: boolean;
  created_at: string;
}

export interface ServicioRow {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo_agenda: TipoAgendaDb;
  activo: boolean;
  created_at: string;
}

export interface ProfesionalRow {
  id: string;
  profile_id: string | null;
  nombre: string;
  apellido: string;
  matricula: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfesionalServicioRow {
  id: string;
  profesional_id: string;
  servicio_id: string;
  activo: boolean;
}

export interface AgendaSlotRow {
  id: string;
  servicio_id: string;
  profesional_id: string | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: SlotEstadoDb;
  created_at: string;
  updated_at: string;
}

export interface TurnoRow {
  id: string;
  codigo: string;
  paciente_id: string;
  tutor_solicitante_id: string | null;
  servicio_id: string;
  profesional_id: string | null;
  slot_id: string;
  tipo_agenda: TipoAgendaDb;
  estado: TurnoEstadoDb;
  canal_origen: CanalOrigenDb;
  created_by_profile_id: string | null;
  motivo_resumido: string | null;
  observaciones: string | null;
  fecha_creacion: string;
  created_at: string;
  updated_at: string;
}

export interface ListaEsperaRow {
  id: string;
  paciente_id: string;
  tutor_id: string | null;
  servicio_id: string;
  profesional_preferido_id: string | null;
  preferencia_horaria: PreferenciaHorariaDb;
  localidad: string | null;
  estado: ListaEsperaEstadoDb;
  canal_origen: CanalOrigenDb;
  fecha_ingreso: string;
  created_at: string;
  updated_at: string;
}

export interface AusenciaProfesionalRow {
  id: string;
  profesional_id: string;
  fecha_desde: string;
  fecha_hasta: string;
  motivo: string | null;
  created_by: string | null;
  created_at: string;
}

export interface DemoraProfesionalRow {
  id: string;
  profesional_id: string;
  fecha: string;
  minutos_demora: number;
  activo: boolean;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: ProfileRow; Insert: Partial<ProfileRow>; Update: Partial<ProfileRow> };
      tutores: { Row: TutorRow; Insert: Partial<TutorRow>; Update: Partial<TutorRow> };
      pacientes: { Row: PacienteRow; Insert: Partial<PacienteRow>; Update: Partial<PacienteRow> };
      tutor_paciente: {
        Row: TutorPacienteRow;
        Insert: Partial<TutorPacienteRow>;
        Update: Partial<TutorPacienteRow>;
      };
      servicios: { Row: ServicioRow; Insert: Partial<ServicioRow>; Update: Partial<ServicioRow> };
      profesionales: {
        Row: ProfesionalRow;
        Insert: Partial<ProfesionalRow>;
        Update: Partial<ProfesionalRow>;
      };
      profesional_servicio: {
        Row: ProfesionalServicioRow;
        Insert: Partial<ProfesionalServicioRow>;
        Update: Partial<ProfesionalServicioRow>;
      };
      agenda_slots: {
        Row: AgendaSlotRow;
        Insert: Partial<AgendaSlotRow>;
        Update: Partial<AgendaSlotRow>;
      };
      turnos: { Row: TurnoRow; Insert: Partial<TurnoRow>; Update: Partial<TurnoRow> };
      lista_espera: {
        Row: ListaEsperaRow;
        Insert: Partial<ListaEsperaRow>;
        Update: Partial<ListaEsperaRow>;
      };
      ausencias_profesionales: {
        Row: AusenciaProfesionalRow;
        Insert: Partial<AusenciaProfesionalRow>;
        Update: Partial<AusenciaProfesionalRow>;
      };
      demoras_profesionales: {
        Row: DemoraProfesionalRow;
        Insert: Partial<DemoraProfesionalRow>;
        Update: Partial<DemoraProfesionalRow>;
      };
    };
    Functions: {
      reservar_turno: {
        Args: {
          p_slot_id: string;
          p_paciente_id: string;
          p_tutor_solicitante_id: string | null;
          p_canal_origen: CanalOrigenDb;
          p_created_by_profile_id?: string | null;
          p_motivo_resumido?: string | null;
        };
        Returns: TurnoRow;
      };
      cancelar_turno: {
        Args: { p_turno_id: string; p_motivo?: string | null };
        Returns: TurnoRow;
      };
      checkin_turno: { Args: { p_turno_id: string }; Returns: TurnoRow };
      atender_turno: { Args: { p_turno_id: string }; Returns: TurnoRow };
      finalizar_turno: { Args: { p_turno_id: string }; Returns: TurnoRow };
      marcar_no_asistio: { Args: { p_turno_id: string }; Returns: TurnoRow };
      candidatos_lista_espera: { Args: { p_turno_id: string }; Returns: ListaEsperaRow[] };
      turnos_afectados_por_ausencia: {
        Args: { p_profesional_id: string; p_fecha_desde: string; p_fecha_hasta: string };
        Returns: TurnoRow[];
      };
    };
  };
}
