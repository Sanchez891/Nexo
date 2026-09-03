-- ============================================================================
-- Seed de demostración — Hospital Pediátrico Juan Pablo II
--
-- Datos 100% ficticios, pensados para reproducir el escenario obligatorio:
--   María González -> Sofía Gómez -> Mañana -> Traumatología -> "me da igual
--   profesional" -> elegir fecha -> elegir horario ~10:30 -> Confirmar
--   -> aparece en Administración como Pendiente de llegada, Origen WEB.
--
-- También deja un servicio (Odontología) con la agenda de los próximos días
-- agotada, para poder demostrar el flujo de Lista de Espera.
--
-- Las fechas de los slots se generan de forma RELATIVA a la fecha en la que
-- se corre este seed (CURRENT_DATE), para que la demo funcione siempre,
-- no solo en una fecha fija.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- SERVICIOS
-- ----------------------------------------------------------------------------

insert into servicios (id, nombre, descripcion, tipo_agenda, activo) values
  ('00000000-0000-0000-0000-000000000101', 'Traumatología', 'Tratamiento de lesiones óseas, articulares y ortopedia pediátrica', 'PROFESIONAL', true),
  ('00000000-0000-0000-0000-000000000102', 'Cardiología', 'Evaluación cardiovascular integral en niños y adolescentes', 'PROFESIONAL', true),
  ('00000000-0000-0000-0000-000000000103', 'Neurología', 'Diagnóstico y tratamiento de trastornos neurológicos infantiles', 'PROFESIONAL', true),
  ('00000000-0000-0000-0000-000000000104', 'Odontología', 'Odontopediatría, profilaxis, obturaciones y prevención', 'SERVICIO', true),
  ('00000000-0000-0000-0000-000000000105', 'Laboratorio', 'Extracciones, hemogramas, bioquímicos y análisis clínicos', 'SERVICIO', true),
  ('00000000-0000-0000-0000-000000000106', 'Diagnóstico por imágenes', 'Radiografías pediátricas, ecografías y ecocardiogramas', 'SERVICIO', true),
  ('00000000-0000-0000-0000-000000000107', 'Pediatría', 'Controles periódicos de salud, vacunas y chequeos integrales', 'SERVICIO', true),
  ('00000000-0000-0000-0000-000000000108', 'Nutrición', 'Planes nutricionales, celiaquía y seguimiento de crecimiento', 'PROFESIONAL', true);

-- ----------------------------------------------------------------------------
-- PROFESIONALES
-- ----------------------------------------------------------------------------

insert into profesionales (id, nombre, apellido, matricula, activo) values
  ('00000000-0000-0000-0000-000000000201', 'Martín', 'Fernández', 'MP-3311', true),
  ('00000000-0000-0000-0000-000000000202', 'Laura', 'Gómez', 'MP-3298', true),
  ('00000000-0000-0000-0000-000000000203', 'Carolina', 'Benítez', 'MP-4021', true),
  ('00000000-0000-0000-0000-000000000204', 'Nicolás', 'Romero', 'MP-2887', true),
  ('00000000-0000-0000-0000-000000000205', 'Ana', 'Ruiz', 'MP-2790', true),
  ('00000000-0000-0000-0000-000000000206', 'Carlos', 'Ramírez', 'MP-3550', true);

insert into profesional_servicio (profesional_id, servicio_id, activo) values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', true), -- Fernández - Traumato
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000101', true), -- Gómez - Traumato
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000102', true), -- Benítez - Cardio
  ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000103', true), -- Romero - Neuro
  ('00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000103', true), -- Ruiz - Neuro
  ('00000000-0000-0000-0000-000000000206', '00000000-0000-0000-0000-000000000108', true); -- Ramírez - Nutrición

-- ----------------------------------------------------------------------------
-- TUTORES
-- ----------------------------------------------------------------------------

insert into tutores (id, dni, nombre, apellido, telefono, email, localidad, domicilio) values
  ('00000000-0000-0000-0000-000000000301', '32345678', 'María', 'González', '+54 3794 451299', 'maria.gonzalez@demo.hospital', 'Mercedes', 'San Martín 450, Mercedes'),
  ('00000000-0000-0000-0000-000000000302', '31112554', 'Carlos', 'Gómez', '+54 3794 451290', 'carlos.gomez@demo.hospital', 'Mercedes', 'San Martín 450, Mercedes'),
  ('00000000-0000-0000-0000-000000000303', '29881002', 'Claudio', 'López', '+54 3777 112233', 'claudio.lopez@demo.hospital', 'Goya', null);

-- ----------------------------------------------------------------------------
-- PACIENTES
-- ----------------------------------------------------------------------------

insert into pacientes (id, nombre, apellido, dni, fecha_nacimiento, localidad, activo) values
  ('00000000-0000-0000-0000-000000000401', 'Lucas', 'Gómez', '55123456', (current_date - interval '8 years')::date, 'Mercedes', true),
  ('00000000-0000-0000-0000-000000000402', 'Sofía', 'Gómez', '52784112', (current_date - interval '12 years')::date, 'Mercedes', true),
  ('00000000-0000-0000-0000-000000000403', 'Martín', 'Pérez', '56992341', (current_date - interval '6 years')::date, 'Mercedes', true),
  ('00000000-0000-0000-0000-000000000404', 'Martín', 'López', '52981332', (current_date - interval '12 years')::date, 'Goya', true);

insert into tutor_paciente (tutor_id, paciente_id, tipo_relacion, responsable_principal, autorizado_gestionar_turnos) values
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000401', 'MADRE', true, true),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000401', 'PADRE', false, true),
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000402', 'MADRE', true, true),
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000403', 'TIA', true, true),
  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000404', 'PADRE', true, true);

-- ----------------------------------------------------------------------------
-- AGENDA_SLOTS: próximos 30 días, solo días hábiles (lunes a viernes).
-- Mañana: 08:30 a 12:30 cada 45'. Tarde: 14:00 a 17:00 cada 45'.
-- ----------------------------------------------------------------------------

do $$
declare
  v_day date;
  v_hour time;
  v_servicio record;
  v_profesional record;
  v_slot_id uuid;
  v_dias_generados int := 0;
  v_offset int := 1;
begin
  -- Agenda POR PROFESIONAL: Traumatología, Cardiología, Neurología, Nutrición
  for v_profesional in
    select ps.servicio_id, ps.profesional_id
    from profesional_servicio ps
    join servicios s on s.id = ps.servicio_id
    where s.tipo_agenda = 'PROFESIONAL'
  loop
    v_offset := 1;
    v_dias_generados := 0;
    while v_dias_generados < 18 and v_offset <= 30 loop
      v_day := current_date + v_offset;
      if extract(isodow from v_day) between 1 and 5 then
        v_dias_generados := v_dias_generados + 1;
        foreach v_hour in array array['08:30','09:15','10:00','10:45','11:30','12:15','14:00','14:45','15:30']::time[]
        loop
          insert into agenda_slots (servicio_id, profesional_id, fecha, hora_inicio, hora_fin, estado)
          values (v_profesional.servicio_id, v_profesional.profesional_id, v_day, v_hour, v_hour + interval '30 minutes', 'DISPONIBLE');
        end loop;
      end if;
      v_offset := v_offset + 1;
    end loop;
  end loop;

  -- Agenda POR SERVICIO: Odontología, Laboratorio, Diagnóstico por imágenes, Pediatría
  for v_servicio in select id from servicios where tipo_agenda = 'SERVICIO'
  loop
    v_offset := 1;
    v_dias_generados := 0;
    while v_dias_generados < 18 and v_offset <= 30 loop
      v_day := current_date + v_offset;
      if extract(isodow from v_day) between 1 and 5 then
        v_dias_generados := v_dias_generados + 1;
        foreach v_hour in array array['08:00','08:30','09:00','09:30','10:00','10:30','11:00','13:00','13:30','14:00']::time[]
        loop
          insert into agenda_slots (servicio_id, profesional_id, fecha, hora_inicio, hora_fin, estado)
          values (v_servicio.id, null, v_day, v_hour, v_hour + interval '20 minutes', 'DISPONIBLE');
        end loop;
      end if;
      v_offset := v_offset + 1;
    end loop;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Ocupar ~20% de los slots de los próximos 10 días con turnos ficticios,
-- usando la función transaccional real (misma vía que usa el frontend).
-- ----------------------------------------------------------------------------

do $$
declare
  v_slot record;
  v_paciente_ids uuid[] := array[
    '00000000-0000-0000-0000-000000000401',
    '00000000-0000-0000-0000-000000000402',
    '00000000-0000-0000-0000-000000000403',
    '00000000-0000-0000-0000-000000000404'
  ];
  v_tutor_ids uuid[] := array[
    '00000000-0000-0000-0000-000000000301',
    '00000000-0000-0000-0000-000000000301',
    '00000000-0000-0000-0000-000000000301',
    '00000000-0000-0000-0000-000000000303'
  ];
  v_idx int;
begin
  for v_slot in
    select id from agenda_slots
    where fecha <= current_date + 10
      and estado = 'DISPONIBLE'
      and random() < 0.22
  loop
    v_idx := 1 + floor(random() * 4)::int;
    perform reservar_turno(
      v_slot.id,
      v_paciente_ids[v_idx],
      v_tutor_ids[v_idx],
      (array['WEB','WHATSAPP','TELEFONO','PRESENCIAL']::canal_origen[])[1 + floor(random() * 4)::int],
      null,
      'Consulta programada (seed demo)'
    );
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Agotar deliberadamente la agenda de Odontología en los próximos 5 días
-- hábiles para poder demostrar el escenario de Lista de Espera.
-- ----------------------------------------------------------------------------

do $$
declare
  v_slot record;
begin
  for v_slot in
    select id from agenda_slots
    where servicio_id = '00000000-0000-0000-0000-000000000104'
      and fecha <= current_date + 7
      and estado = 'DISPONIBLE'
  loop
    update agenda_slots set estado = 'BLOQUEADO' where id = v_slot.id;
  end loop;
end $$;

insert into lista_espera (paciente_id, tutor_id, servicio_id, preferencia_horaria, localidad, estado, canal_origen)
values (
  '00000000-0000-0000-0000-000000000401',
  '00000000-0000-0000-0000-000000000301',
  '00000000-0000-0000-0000-000000000104',
  'MANANA',
  'Mercedes',
  'ACTIVO',
  'WEB'
);

-- ----------------------------------------------------------------------------
-- Demora informativa de ejemplo (Dra. Carolina Benítez, hoy, 30 minutos)
-- ----------------------------------------------------------------------------

insert into demoras_profesionales (profesional_id, fecha, minutos_demora, activo)
values ('00000000-0000-0000-0000-000000000203', current_date, 30, true);

commit;
