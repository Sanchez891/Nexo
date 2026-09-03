-- ============================================================================
-- Hospital Pediátrico Juan Pablo II — Esquema inicial
-- Sistema de gestión centralizada de turnos (Web, WhatsApp, Secretaría,
-- Asistente Social, Profesionales -> misma base de datos, misma agenda)
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------

create type user_role as enum (
  'TUTOR',
  'ADMINISTRATIVO',
  'PROFESIONAL',
  'ASISTENTE_SOCIAL',
  'ADMIN'
);

create type tipo_agenda as enum ('SERVICIO', 'PROFESIONAL');

create type tipo_relacion_tutor as enum (
  'MADRE',
  'PADRE',
  'TUTOR_LEGAL',
  'ABUELO',
  'ABUELA',
  'TIO',
  'TIA',
  'HERMANO',
  'HERMANA',
  'OTRO'
);

create type slot_estado as enum ('DISPONIBLE', 'RESERVADO', 'BLOQUEADO', 'CANCELADO');

create type turno_estado as enum (
  'PENDIENTE_DE_LLEGADA',
  'EN_ESPERA',
  'EN_CONSULTORIO',
  'ATENDIDO',
  'CANCELADO',
  'NO_ASISTIO'
);

create type canal_origen as enum ('WEB', 'WHATSAPP', 'TELEFONO', 'PRESENCIAL', 'ASISTENTE_SOCIAL');

create type preferencia_horaria as enum ('MANANA', 'TARDE', 'INDISTINTO');

create type lista_espera_estado as enum ('ACTIVO', 'ASIGNADO', 'CANCELADO');

-- ----------------------------------------------------------------------------
-- utilidad: trigger genérico para updated_at
-- ----------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- PROFILES: usuario autenticado (o cuenta demo) del sistema
-- ----------------------------------------------------------------------------

create table profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  nombre text not null,
  apellido text not null default '',
  dni text,
  telefono text,
  email text,
  localidad text,
  rol user_role not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_auth_user_id on profiles(auth_user_id);
create index idx_profiles_rol on profiles(rol);

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- TUTORES
-- ----------------------------------------------------------------------------

create table tutores (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete set null,
  dni text not null,
  nombre text not null,
  apellido text not null,
  telefono text not null,
  email text,
  localidad text not null,
  domicilio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dni)
);

create index idx_tutores_profile_id on tutores(profile_id);
create index idx_tutores_dni on tutores(dni);

create trigger trg_tutores_updated_at
  before update on tutores
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- PACIENTES (personas a cargo)
-- ----------------------------------------------------------------------------

create table pacientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  apellido text not null default '',
  dni text not null,
  fecha_nacimiento date not null,
  localidad text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dni),
  -- Hospital pediátrico: mayores de 1 mes y hasta 15 años inclusive
  constraint chk_paciente_rango_pediatrico check (
    fecha_nacimiento <= (current_date - interval '1 month')
    and fecha_nacimiento > (current_date - interval '16 years')
  )
);

create index idx_pacientes_dni on pacientes(dni);
create index idx_pacientes_nombre on pacientes(nombre, apellido);

create trigger trg_pacientes_updated_at
  before update on pacientes
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- RELACIÓN TUTOR - PACIENTE
-- ----------------------------------------------------------------------------

create table tutor_paciente (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references tutores(id) on delete cascade,
  paciente_id uuid not null references pacientes(id) on delete cascade,
  tipo_relacion tipo_relacion_tutor not null,
  responsable_principal boolean not null default false,
  autorizado_gestionar_turnos boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tutor_id, paciente_id)
);

create index idx_tutor_paciente_tutor on tutor_paciente(tutor_id);
create index idx_tutor_paciente_paciente on tutor_paciente(paciente_id);

-- ----------------------------------------------------------------------------
-- SERVICIOS
-- ----------------------------------------------------------------------------

create table servicios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  descripcion text,
  tipo_agenda tipo_agenda not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- PROFESIONALES
-- ----------------------------------------------------------------------------

create table profesionales (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete set null,
  nombre text not null,
  apellido text not null,
  matricula text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profesionales_profile_id on profesionales(profile_id);

create trigger trg_profesionales_updated_at
  before update on profesionales
  for each row execute function set_updated_at();

create table profesional_servicio (
  id uuid primary key default gen_random_uuid(),
  profesional_id uuid not null references profesionales(id) on delete cascade,
  servicio_id uuid not null references servicios(id) on delete cascade,
  activo boolean not null default true,
  unique (profesional_id, servicio_id)
);

create index idx_prof_servicio_profesional on profesional_servicio(profesional_id);
create index idx_prof_servicio_servicio on profesional_servicio(servicio_id);

-- ----------------------------------------------------------------------------
-- AGENDA_SLOTS
-- ----------------------------------------------------------------------------

create table agenda_slots (
  id uuid primary key default gen_random_uuid(),
  servicio_id uuid not null references servicios(id) on delete cascade,
  profesional_id uuid references profesionales(id) on delete cascade,
  fecha date not null,
  hora_inicio time not null,
  hora_fin time not null,
  estado slot_estado not null default 'DISPONIBLE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_slot_horario check (hora_fin > hora_inicio)
);

create index idx_agenda_slots_fecha on agenda_slots(fecha);
create index idx_agenda_slots_servicio on agenda_slots(servicio_id);
create index idx_agenda_slots_profesional on agenda_slots(profesional_id);
create index idx_agenda_slots_estado on agenda_slots(estado);
create index idx_agenda_slots_busqueda on agenda_slots(servicio_id, fecha, estado);

-- Evita doble turno para el mismo profesional en el mismo horario exacto
create unique index uq_agenda_slots_profesional_horario
  on agenda_slots(profesional_id, fecha, hora_inicio)
  where profesional_id is not null;

create trigger trg_agenda_slots_updated_at
  before update on agenda_slots
  for each row execute function set_updated_at();

-- Si el servicio es de agenda PROFESIONAL, el slot debe tener profesional asignado.
-- Si es de agenda SERVICIO, el profesional puede ser NULL.
create or replace function chk_agenda_slot_tipo_agenda()
returns trigger
language plpgsql
as $$
declare
  v_tipo tipo_agenda;
begin
  select tipo_agenda into v_tipo from servicios where id = new.servicio_id;
  if v_tipo = 'PROFESIONAL' and new.profesional_id is null then
    raise exception 'PROFESIONAL_REQUERIDO: el servicio % requiere profesional asignado en el slot', new.servicio_id;
  end if;
  return new;
end;
$$;

create trigger trg_agenda_slots_tipo_agenda
  before insert or update on agenda_slots
  for each row execute function chk_agenda_slot_tipo_agenda();

-- ----------------------------------------------------------------------------
-- TURNOS
-- ----------------------------------------------------------------------------

create table turnos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  paciente_id uuid not null references pacientes(id),
  tutor_solicitante_id uuid references tutores(id),
  servicio_id uuid not null references servicios(id),
  profesional_id uuid references profesionales(id),
  slot_id uuid not null references agenda_slots(id),
  tipo_agenda tipo_agenda not null,
  estado turno_estado not null default 'PENDIENTE_DE_LLEGADA',
  canal_origen canal_origen not null,
  created_by_profile_id uuid references profiles(id),
  motivo_resumido text,
  observaciones text,
  fecha_creacion timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Un slot solo puede tener un turno activo (no cancelado) a la vez.
create unique index uq_turnos_slot_activo
  on turnos(slot_id)
  where estado <> 'CANCELADO';

create index idx_turnos_paciente on turnos(paciente_id);
create index idx_turnos_tutor on turnos(tutor_solicitante_id);
create index idx_turnos_servicio on turnos(servicio_id);
create index idx_turnos_profesional on turnos(profesional_id);
create index idx_turnos_estado on turnos(estado);
create index idx_turnos_slot on turnos(slot_id);
create index idx_turnos_codigo on turnos(codigo);

create trigger trg_turnos_updated_at
  before update on turnos
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- LISTA DE ESPERA
-- ----------------------------------------------------------------------------

create table lista_espera (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id),
  tutor_id uuid references tutores(id),
  servicio_id uuid not null references servicios(id),
  profesional_preferido_id uuid references profesionales(id),
  preferencia_horaria preferencia_horaria not null default 'INDISTINTO',
  localidad text,
  estado lista_espera_estado not null default 'ACTIVO',
  canal_origen canal_origen not null default 'WEB',
  fecha_ingreso timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_lista_espera_servicio on lista_espera(servicio_id);
create index idx_lista_espera_estado on lista_espera(estado);
create index idx_lista_espera_paciente on lista_espera(paciente_id);

create trigger trg_lista_espera_updated_at
  before update on lista_espera
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- AUSENCIAS DE PROFESIONALES
-- ----------------------------------------------------------------------------

create table ausencias_profesionales (
  id uuid primary key default gen_random_uuid(),
  profesional_id uuid not null references profesionales(id) on delete cascade,
  fecha_desde date not null,
  fecha_hasta date not null,
  motivo text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  constraint chk_ausencia_rango check (fecha_hasta >= fecha_desde)
);

create index idx_ausencias_profesional on ausencias_profesionales(profesional_id, fecha_desde, fecha_hasta);

-- ----------------------------------------------------------------------------
-- DEMORAS DE PROFESIONALES
-- ----------------------------------------------------------------------------

create table demoras_profesionales (
  id uuid primary key default gen_random_uuid(),
  profesional_id uuid not null references profesionales(id) on delete cascade,
  fecha date not null,
  minutos_demora integer not null check (minutos_demora in (15, 30, 45, 60)),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_demoras_profesional_fecha on demoras_profesionales(profesional_id, fecha);
