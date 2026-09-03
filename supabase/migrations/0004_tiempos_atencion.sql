-- ============================================================================
-- Tiempos reales de atención — Hospital Pediátrico Juan Pablo II
--
-- turnos.updated_at se pisa en cada cambio de estado, así que no alcanza
-- para calcular cuánto duró la atención. Se agregan columnas puntuales que
-- las funciones de transición van completando, y así se puede calcular un
-- "tiempo promedio de atención" real (EN_CONSULTORIO -> ATENDIDO).
-- ============================================================================

alter table turnos
  add column if not exists hora_checkin timestamptz,
  add column if not exists hora_inicio_atencion timestamptz,
  add column if not exists hora_fin_atencion timestamptz;

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
  set estado = 'EN_ESPERA',
      hora_checkin = now()
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
  set estado = 'EN_CONSULTORIO',
      hora_inicio_atencion = now()
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
  set estado = 'ATENDIDO',
      hora_fin_atencion = now()
  where id = p_turno_id and estado = 'EN_CONSULTORIO'
  returning * into v_turno;

  if not found then
    raise exception 'TRANSICION_INVALIDA: el turno debe estar EN_CONSULTORIO para finalizar la atención' using errcode = 'P0001';
  end if;

  return v_turno;
end;
$$;
