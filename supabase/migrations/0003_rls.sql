-- ============================================================================
-- Row Level Security — Hospital Pediátrico Juan Pablo II
--
-- IMPORTANTE (modo demo del hackathon):
-- El frontend actual selecciona el rol (Tutor / Administrativo / Profesional /
-- Asistente Social) desde un selector de "Modo demo" y NO todavía inicia
-- sesión real de cada tutor/profesional individual contra Supabase Auth.
-- Por eso, hoy no existe un auth.uid() confiable que permita filtrar
-- "solo mis pacientes" / "solo mi agenda" a nivel de base de datos.
--
-- Para no romper la demo, las políticas de las tablas con datos de pacientes
-- se dejan permisivas para los roles anon/authenticated (documentado acá,
-- NO se usa la service_role key en el navegador en ningún caso). Debajo de
-- cada bloque permisivo se documentan, comentadas, las políticas estrictas
-- pensadas para producción una vez que cada rol inicie sesión real con
-- Supabase Auth y cada fila (profiles/tutores/profesionales) quede
-- vinculada a auth_user_id = auth.uid().
-- ============================================================================

alter table profiles enable row level security;
alter table tutores enable row level security;
alter table pacientes enable row level security;
alter table tutor_paciente enable row level security;
alter table servicios enable row level security;
alter table profesionales enable row level security;
alter table profesional_servicio enable row level security;
alter table agenda_slots enable row level security;
alter table turnos enable row level security;
alter table lista_espera enable row level security;
alter table ausencias_profesionales enable row level security;
alter table demoras_profesionales enable row level security;

-- ----------------------------------------------------------------------------
-- Datos de referencia / operativos sin PII de pacientes: lectura pública.
-- ----------------------------------------------------------------------------

create policy "servicios_select_publico" on servicios
  for select using (true);

create policy "profesionales_select_publico" on profesionales
  for select using (true);

create policy "profesional_servicio_select_publico" on profesional_servicio
  for select using (true);

create policy "agenda_slots_select_publico" on agenda_slots
  for select using (true);

create policy "demoras_profesionales_select_publico" on demoras_profesionales
  for select using (true);

create policy "ausencias_profesionales_select_publico" on ausencias_profesionales
  for select using (true);

-- Escritura de configuración/agenda: reservada a roles operativos del
-- hospital (administrativo/asistente_social/admin/profesional). En modo demo
-- (sin login real) se habilita para anon/authenticated; en producción debe
-- restringirse a profiles.rol correspondiente vía auth.uid().
create policy "servicios_write_demo" on servicios
  for all using (true) with check (true);

create policy "profesionales_write_demo" on profesionales
  for all using (true) with check (true);

create policy "profesional_servicio_write_demo" on profesional_servicio
  for all using (true) with check (true);

create policy "agenda_slots_write_demo" on agenda_slots
  for all using (true) with check (true);

create policy "ausencias_profesionales_write_demo" on ausencias_profesionales
  for all using (true) with check (true);

create policy "demoras_profesionales_write_demo" on demoras_profesionales
  for all using (true) with check (true);

-- ----------------------------------------------------------------------------
-- Tablas con PII de pacientes / familias: acceso demo documentado.
--
-- Política de PRODUCCIÓN prevista (activar cuando exista login real):
--
--   -- profiles: cada usuario ve/edita solo su propia fila
--   create policy "profiles_self" on profiles for select
--     using (auth_user_id = auth.uid());
--
--   -- tutores: un tutor ve solo su propio registro
--   create policy "tutores_self" on tutores for select
--     using (profile_id in (select id from profiles where auth_user_id = auth.uid()));
--
--   -- pacientes: un tutor ve solo las personas a cargo vinculadas por
--   -- tutor_paciente; administrativo/asistente_social/admin ven todo.
--   create policy "pacientes_tutor" on pacientes for select
--     using (
--       id in (
--         select tp.paciente_id from tutor_paciente tp
--         join tutores t on t.id = tp.tutor_id
--         join profiles p on p.id = t.profile_id
--         where p.auth_user_id = auth.uid()
--       )
--       or exists (
--         select 1 from profiles p
--         where p.auth_user_id = auth.uid()
--           and p.rol in ('ADMINISTRATIVO', 'ASISTENTE_SOCIAL', 'ADMIN')
--       )
--     );
--
--   -- turnos: tutor ve los suyos; profesional ve los de sus servicios;
--   -- administrativo/asistente_social/admin ven todo.
--   create policy "turnos_scope" on turnos for select
--     using (
--       tutor_solicitante_id in (
--         select t.id from tutores t join profiles p on p.id = t.profile_id
--         where p.auth_user_id = auth.uid()
--       )
--       or profesional_id in (
--         select pr.id from profesionales pr join profiles p on p.id = pr.profile_id
--         where p.auth_user_id = auth.uid()
--       )
--       or exists (
--         select 1 from profiles p
--         where p.auth_user_id = auth.uid()
--           and p.rol in ('ADMINISTRATIVO', 'ASISTENTE_SOCIAL', 'ADMIN')
--       )
--     );
--
-- Mientras tanto (modo demo, sin Supabase Auth wireado por rol), se habilita
-- acceso de lectura/escritura para anon/authenticated en estas tablas. Nunca
-- se usa la service_role key desde el navegador.
-- ----------------------------------------------------------------------------

create policy "profiles_demo_all" on profiles for all using (true) with check (true);
create policy "tutores_demo_all" on tutores for all using (true) with check (true);
create policy "pacientes_demo_all" on pacientes for all using (true) with check (true);
create policy "tutor_paciente_demo_all" on tutor_paciente for all using (true) with check (true);
create policy "turnos_demo_all" on turnos for all using (true) with check (true);
create policy "lista_espera_demo_all" on lista_espera for all using (true) with check (true);

-- ----------------------------------------------------------------------------
-- Permisos de ejecución de las funciones RPC (RLS no aplica a funciones
-- SECURITY DEFINER en sí, pero se deja explícito qué roles pueden invocarlas).
-- ----------------------------------------------------------------------------

grant execute on function reservar_turno(uuid, uuid, uuid, canal_origen, uuid, text) to anon, authenticated;
grant execute on function cancelar_turno(uuid, text) to anon, authenticated;
grant execute on function checkin_turno(uuid) to anon, authenticated;
grant execute on function atender_turno(uuid) to anon, authenticated;
grant execute on function finalizar_turno(uuid) to anon, authenticated;
grant execute on function marcar_no_asistio(uuid) to anon, authenticated;
grant execute on function candidatos_lista_espera(uuid) to anon, authenticated;
grant execute on function turnos_afectados_por_ausencia(uuid, date, date) to anon, authenticated;
