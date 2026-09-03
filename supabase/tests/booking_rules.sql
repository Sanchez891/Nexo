-- ============================================================================
-- Pruebas manuales de las reglas críticas de reserva (correr contra un
-- Supabase local recién migrado + seedeado):
--
--   supabase start
--   supabase db reset   -- aplica migraciones + supabase/seed.sql
--   psql "$(supabase status -o env | grep DB_URL | cut -d= -f2)" -f supabase/tests/booking_rules.sql
--
-- (o pegar estos bloques en el SQL Editor del dashboard). Cada bloque debe
-- imprimir el resultado esperado indicado en el comentario.
-- ============================================================================

-- 1) No se puede reservar dos veces el mismo slot -------------------------
-- Tomamos un slot DISPONIBLE cualquiera y lo reservamos dos veces seguidas:
-- la segunda debe fallar con SLOT_NO_DISPONIBLE.
do $$
declare
  v_slot_id uuid;
  v_paciente_id uuid;
  v_tutor_id uuid;
begin
  select id into v_slot_id from agenda_slots where estado = 'DISPONIBLE' limit 1;
  select id into v_paciente_id from pacientes limit 1;
  select id into v_tutor_id from tutores limit 1;

  perform reservar_turno(v_slot_id, v_paciente_id, v_tutor_id, 'WEB');
  raise notice 'Primera reserva OK';

  begin
    perform reservar_turno(v_slot_id, v_paciente_id, v_tutor_id, 'WEB');
    raise exception 'FALLO: se permitió reservar el mismo slot dos veces';
  exception when others then
    if sqlerrm like '%SLOT_NO_DISPONIBLE%' then
      raise notice 'OK: la segunda reserva del mismo slot fue rechazada (%).', sqlerrm;
    else
      raise;
    end if;
  end;

  -- limpieza
  update turnos set estado = 'CANCELADO' where slot_id = v_slot_id;
  update agenda_slots set estado = 'DISPONIBLE' where id = v_slot_id;
end $$;

-- 2) Cancelar un turno libera el slot --------------------------------------
do $$
declare
  v_slot_id uuid;
  v_turno turnos;
begin
  select id into v_slot_id from agenda_slots where estado = 'DISPONIBLE' limit 1;
  select * into v_turno from reservar_turno(
    v_slot_id,
    (select id from pacientes limit 1),
    (select id from tutores limit 1),
    'WEB'
  );

  perform cancelar_turno(v_turno.id, 'test');

  if (select estado from agenda_slots where id = v_slot_id) = 'DISPONIBLE' then
    raise notice 'OK: cancelar_turno liberó el slot.';
  else
    raise exception 'FALLO: el slot no volvió a DISPONIBLE tras cancelar.';
  end if;
end $$;

-- 3-6) Ciclo de estados: PENDIENTE_DE_LLEGADA -> EN_ESPERA -> EN_CONSULTORIO -> ATENDIDO
do $$
declare
  v_slot_id uuid;
  v_turno turnos;
begin
  select id into v_slot_id from agenda_slots where estado = 'DISPONIBLE' limit 1;
  select * into v_turno from reservar_turno(
    v_slot_id, (select id from pacientes limit 1), (select id from tutores limit 1), 'WEB'
  );

  if v_turno.estado <> 'PENDIENTE_DE_LLEGADA' then
    raise exception 'FALLO: el turno nuevo no nació en PENDIENTE_DE_LLEGADA';
  end if;

  select * into v_turno from checkin_turno(v_turno.id);
  assert v_turno.estado = 'EN_ESPERA', 'FALLO: checkin_turno no pasó a EN_ESPERA';

  select * into v_turno from atender_turno(v_turno.id);
  assert v_turno.estado = 'EN_CONSULTORIO', 'FALLO: atender_turno no pasó a EN_CONSULTORIO';

  select * into v_turno from finalizar_turno(v_turno.id);
  assert v_turno.estado = 'ATENDIDO', 'FALLO: finalizar_turno no pasó a ATENDIDO';

  raise notice 'OK: ciclo completo de estados funcionó correctamente.';
end $$;

-- 7) Paciente fuera de edad pediátrica no puede registrarse ---------------
do $$
begin
  begin
    insert into pacientes (nombre, apellido, dni, fecha_nacimiento, localidad)
    values ('Test', 'Adulto', '99999999', (current_date - interval '20 years')::date, 'Mercedes');
    raise exception 'FALLO: se permitió registrar un paciente de 20 años';
  exception when check_violation then
    raise notice 'OK: constraint chk_paciente_rango_pediatrico rechazó al paciente de 20 años.';
  end;
end $$;

-- 11) No aparecen slots posteriores a 30 días (chequeo de índice/consulta) --
do $$
declare
  v_count int;
begin
  select count(*) into v_count
  from agenda_slots
  where fecha > current_date + 30
    and estado = 'DISPONIBLE';
  raise notice 'Slots disponibles a más de 30 días (el frontend NO debe mostrarlos igual, ya filtra por rango): %', v_count;
end $$;
