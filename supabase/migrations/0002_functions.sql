-- ============================================================================
-- Funciones RPC transaccionales — Hospital Pediátrico Juan Pablo II
-- ============================================================================

-- ----------------------------------------------------------------------------
-- reservar_turno: operación atómica de reserva.
-- 1) intenta marcar el slot como RESERVADO solo si está DISPONIBLE
--    (UPDATE ... WHERE estado = 'DISPONIBLE' es atómico a nivel de fila en
--    Postgres: dos transacciones concurrentes se serializan sobre el mismo
--    row lock y solo una de ellas obtiene la fila).
-- 2) si no se pudo reservar el slot -> excepción SLOT_NO_DISPONIBLE.
-- 3) crea el turno asociado con estado PENDIENTE_DE_LLEGADA.
-- 4) devuelve el turno creado.
-- ----------------------------------------------------------------------------

create or replace function reservar_turno(
  p_slot_id uuid,
  p_paciente_id uuid,
  p_tutor_solicitante_id uuid,
  p_canal_origen canal_origen,
  p_created_by_profile_id uuid default null,
  p_motivo_resumido text default null
)
returns turnos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot agenda_slots%rowtype;
  v_turno turnos%rowtype;
  v_codigo text;
  v_intentos int := 0;
begin
  update agenda_slots
  set estado = 'RESERVADO'
  where id = p_slot_id and estado = 'DISPONIBLE'
  returning * into v_slot;

  if not found then
    raise exception 'SLOT_NO_DISPONIBLE' using errcode = 'P0001';
  end if;

  loop
    v_codigo := 'JP2-' || lpad(floor(random() * 90000 + 10000)::text, 5, '0');
    begin
      insert into turnos (
        codigo, paciente_id, tutor_solicitante_id, servicio_id, profesional_id,
        slot_id, tipo_agenda, estado, canal_origen, created_by_profile_id, motivo_resumido
      )
      select v_codigo, p_paciente_id, p_tutor_solicitante_id, v_slot.servicio_id, v_slot.profesional_id,
             v_slot.id, s.tipo_agenda, 'PENDIENTE_DE_LLEGADA', p_canal_origen, p_created_by_profile_id, p_motivo_resumido
      from servicios s where s.id = v_slot.servicio_id
      returning * into v_turno;
      exit;
    exception when unique_violation then
      v_intentos := v_intentos + 1;
      if v_intentos > 5 then
        raise;
      end if;
    end;
  end loop;

  return v_turno;
end;
$$;

-- ----------------------------------------------------------------------------
-- cancelar_turno: cancela el turno y libera el slot. No borra el turno
-- (se conserva el historial).
-- ----------------------------------------------------------------------------

create or replace function cancelar_turno(
  p_turno_id uuid,
  p_motivo text default null
)
returns turnos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_turno turnos%rowtype;
begin
  update turnos
  set estado = 'CANCELADO',
      observaciones = coalesce(p_motivo, observaciones)
  where id = p_turno_id
    and estado not in ('CANCELADO', 'ATENDIDO')
  returning * into v_turno;

  if not found then
    raise exception 'TURNO_NO_CANCELABLE' using errcode = 'P0001';
  end if;

  update agenda_slots
  set estado = 'DISPONIBLE'
  where id = v_turno.slot_id;

  return v_turno;
end;
$$;

-- ----------------------------------------------------------------------------
-- Transiciones de estado controladas (evitan estados incoherentes)
-- ----------------------------------------------------------------------------

create or replace function checkin_turno(p_turno_id uuid)
returns turnos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_turno turnos%rowtype;
begin
  update turnos
  set estado = 'EN_ESPERA'
  where id = p_turno_id and estado = 'PENDIENTE_DE_LLEGADA'
  returning * into v_turno;

  if not found then
    raise exception 'TRANSICION_INVALIDA: el turno debe estar PENDIENTE_DE_LLEGADA para hacer check-in' using errcode = 'P0001';
  end if;

  return v_turno;
end;
$$;

create or replace function atender_turno(p_turno_id uuid)
returns turnos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_turno turnos%rowtype;
begin
  update turnos
  set estado = 'EN_CONSULTORIO'
  where id = p_turno_id and estado = 'EN_ESPERA'
  returning * into v_turno;

  if not found then
    raise exception 'TRANSICION_INVALIDA: el turno debe estar EN_ESPERA para iniciar la atención' using errcode = 'P0001';
  end if;

  return v_turno;
end;
$$;

create or replace function finalizar_turno(p_turno_id uuid)
returns turnos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_turno turnos%rowtype;
begin
  update turnos
  set estado = 'ATENDIDO'
  where id = p_turno_id and estado = 'EN_CONSULTORIO'
  returning * into v_turno;

  if not found then
    raise exception 'TRANSICION_INVALIDA: el turno debe estar EN_CONSULTORIO para finalizar la atención' using errcode = 'P0001';
  end if;

  return v_turno;
end;
$$;

create or replace function marcar_no_asistio(p_turno_id uuid)
returns turnos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_turno turnos%rowtype;
begin
  update turnos
  set estado = 'NO_ASISTIO'
  where id = p_turno_id and estado = 'PENDIENTE_DE_LLEGADA'
  returning * into v_turno;

  if not found then
    raise exception 'TRANSICION_INVALIDA: el turno debe estar PENDIENTE_DE_LLEGADA para marcar No Asistió' using errcode = 'P0001';
  end if;

  return v_turno;
end;
$$;

-- ----------------------------------------------------------------------------
-- candidatos_lista_espera: candidatos compatibles con un turno recién
-- cancelado (o con un slot dado). La asignación final es siempre manual.
-- ----------------------------------------------------------------------------

create or replace function candidatos_lista_espera(p_turno_id uuid)
returns setof lista_espera
language sql
stable
as $$
  select le.*
  from lista_espera le
  join turnos t on t.id = p_turno_id
  where le.estado = 'ACTIVO'
    and le.servicio_id = t.servicio_id
    and (le.profesional_preferido_id is null or le.profesional_preferido_id = t.profesional_id)
  order by le.fecha_ingreso asc;
$$;

-- ----------------------------------------------------------------------------
-- turnos_afectados_por_ausencia: turnos activos de un profesional en un rango
-- de fechas (usado por Administrativo al registrar una ausencia).
-- ----------------------------------------------------------------------------

create or replace function turnos_afectados_por_ausencia(
  p_profesional_id uuid,
  p_fecha_desde date,
  p_fecha_hasta date
)
returns setof turnos
language sql
stable
as $$
  select t.*
  from turnos t
  join agenda_slots s on s.id = t.slot_id
  where t.profesional_id = p_profesional_id
    and s.fecha between p_fecha_desde and p_fecha_hasta
    and t.estado not in ('CANCELADO', 'ATENDIDO', 'NO_ASISTIO')
  order by s.fecha, s.hora_inicio;
$$;
