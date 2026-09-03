# Hospital Pediátrico Juan Pablo II — Sistema Centralizado de Turnos

MVP de un sistema único de gestión de turnos para un hospital pediátrico:
Web, WhatsApp (simulado), Secretaría/Administrativo, Profesionales y Asistente
Social operan sobre **la misma base de datos** y **la misma agenda central**
en Supabase (Postgres + Auth + Realtime opcional).

## Stack

- React 19 + TypeScript + Vite + Tailwind
- Supabase (Postgres, RLS, funciones RPC transaccionales, Supabase Auth preparado)

## Requisitos previos

- Node.js 18+
- Una cuenta de [Supabase](https://supabase.com) (plan gratuito alcanza)
- Opcional: [Supabase CLI](https://supabase.com/docs/guides/cli) si querés correr Supabase local con Docker

## Supabase Setup

### 1. Crear el proyecto Supabase

Creá un proyecto nuevo en [supabase.com](https://supabase.com/dashboard). Anotá:

- **Project URL** (`https://<tu-proyecto>.supabase.co`)
- **anon public key** (Project Settings → API)

### 2. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Completá en `.env.local`:

```
VITE_SUPABASE_URL="https://TU-PROYECTO.supabase.co"
VITE_SUPABASE_ANON_KEY="TU_ANON_PUBLIC_KEY"
```

**Nunca** pongas la `service_role` key acá ni en ningún código que corra en el navegador.

### 3. Aplicar las migraciones

Las migraciones están en `supabase/migrations/` (schema, funciones RPC y RLS,
en ese orden). Dos formas de aplicarlas:

**Opción A — Supabase local (con Docker + Supabase CLI):**

```bash
supabase init        # si todavía no existe supabase/config.toml
supabase start
supabase db reset    # aplica migrations/ + seed.sql automáticamente
```

**Opción B — proyecto remoto (sin Docker):**

Copiá y pegá el contenido de cada archivo, en orden, en el **SQL Editor** del
dashboard de Supabase:

1. `supabase/migrations/0001_schema.sql`
2. `supabase/migrations/0002_functions.sql`
3. `supabase/migrations/0003_rls.sql`

O con la CLI apuntando a tu proyecto remoto:

```bash
supabase link --project-ref <tu-project-ref>
supabase db push
```

### 4. Ejecutar el seed de demostración

```bash
psql "<tu-connection-string>" -f supabase/seed.sql
```

(o pegá `supabase/seed.sql` en el SQL Editor). El seed es **idempotente en
fechas relativas**: genera agenda para los próximos ~30 días a partir de la
fecha en que lo corras, así que podés re-ejecutarlo cuando quieras "refrescar"
la demo (ver también "Cómo resetear datos demo" más abajo).

### 5. Iniciar la aplicación

```bash
npm install
npm run dev
```

Abrí `http://localhost:3000`. Si faltan las variables de entorno, la app lo
va a avisar explícitamente en pantalla (no falla en silencio).

### 6. Cómo resetear los datos de demo

El seed no borra nada por sí solo (es aditivo). Para dejar la base como recién
instalada:

```sql
truncate turnos, agenda_slots, lista_espera, demoras_profesionales,
  ausencias_profesionales, profesional_servicio, tutor_paciente,
  profesionales, tutores, pacientes, servicios restart identity cascade;
```

y volvé a correr `supabase/seed.sql`. El botón **"Reiniciar demo"** de la
barra superior de la app solo refresca los datos ya persistidos en Supabase
(vuelve a consultarlos); no vacía ni recrea la base — eso es intencional,
para no permitir que el frontend borre datos de producción con la anon key.

### 7. Cuentas / roles demo

El MVP navega por rol con el selector **"Modo demo"** de la barra superior
(Familiar, Administrativo, Profesional, Asistente Social, Administrador), sin
pedir login real — así no se rompe la demo del hackathon. El tutor activo
("Familiar") se toma de la tabla `tutores` sembrada por el seed (María
González, de Mercedes, con sus personas a cargo).

`src/services/auth.service.ts` deja preparado el camino a **Supabase Auth
real** (cuentas por tutor/profesional) para cuando haga falta login
verdadero; y `supabase/migrations/0003_rls.sql` documenta, comentadas, las
políticas RLS estrictas pensadas para producción (activarlas requiere que
cada rol tenga sesión real vinculada a `profiles.auth_user_id`).

## Comandos

```bash
npm run dev         # entorno de desarrollo
npm run build        # build de producción
npm run typecheck    # tsc --noEmit (alias: npm run lint)
npm run test          # tests unitarios (vitest)
```

Pruebas de las reglas críticas de reserva a nivel de base de datos (atomicidad,
transiciones de estado, constraint de edad pediátrica) están en
`supabase/tests/booking_rules.sql` — requieren una base migrada+seedeada
(local o remota); no corren dentro de `npm run test` porque necesitan Postgres.

## Arquitectura de datos

```
supabase/
  migrations/
    0001_schema.sql     tablas, enums, índices, constraints, triggers
    0002_functions.sql  RPC transaccionales (reservar_turno, cancelar_turno,
                         checkin_turno, atender_turno, finalizar_turno,
                         marcar_no_asistio, candidatos_lista_espera,
                         turnos_afectados_por_ausencia)
    0003_rls.sql         Row Level Security + políticas
    0004_tiempos_atencion.sql  columnas hora_checkin / hora_inicio_atencion /
                         hora_fin_atencion en turnos (para el tiempo
                         promedio de atención real de Métricas e Impacto)
  seed.sql               datos de demostración (ficticios)
  tests/booking_rules.sql pruebas SQL manuales de las reglas críticas

src/
  lib/supabase.ts        cliente Supabase (usa solo la anon key)
  types/database.ts       tipos de las filas de la base (mantenido a mano)
  services/                capa de servicios: cada archivo llama a Supabase
    tutors.service.ts
    patients.service.ts
    services.service.ts
    professionals.service.ts
    agenda.service.ts
    appointments.service.ts
    waitingList.service.ts
    absences.service.ts
    delays.service.ts
    auth.service.ts
    mappers.ts             conversión entre filas de Supabase y tipos de UI
  context/HospitalContext.tsx  el resto de los componentes siguen consumiendo
                                 este contexto (misma interfaz de siempre);
                                 puertas adentro, ahora llama a los services.
```

La reserva de un turno es **atómica**: `reservar_turno()` marca el slot como
`RESERVADO` con un `UPDATE ... WHERE estado = 'DISPONIBLE'` (atómico a nivel
de fila en Postgres) y solo si eso tuvo efecto crea el turno. Si dos personas
intentan el mismo horario al mismo tiempo, una gana y la otra recibe
`SLOT_NO_DISPONIBLE`, que el frontend traduce como *"Este horario acaba de
ser reservado. Elegí otra opción disponible."*

En los flujos de reserva Web y WhatsApp, la familia **no elige profesional**:
al confirmar un horario con cupo en más de un profesional del servicio, el
sistema asigna automáticamente al que tenga menos turnos activos en ese
servicio (`agenda.service.ts#pickBalancedSlot`), para repartir la agenda de
forma equitativa y no sobrecargar siempre al mismo médico. El panel
Administrativo y el de Asistente Social sí permiten elegir un profesional
puntual, porque ahí tiene sentido operativamente.

## Pendiente / fuera de alcance de esta iteración

- **Solicitudes multicanal (`inboundRequests`) y Urgencias 24h
  (`urgencies`)**: siguen en memoria local (no persisten en Supabase). No
  forman parte del modelo de datos pedido explícitamente en la consigna
  (turnos/agenda/lista de espera/tutores/pacientes/servicios/profesionales sí
  están completamente migrados). El acceso a la bandeja de solicitudes se
  sacó de la navegación del panel Administrativo (seguía siendo simulada);
  el componente (`MultichannelRequests.tsx`) queda en el código para la
  próxima iteración.
- **Supabase Auth real por tutor/profesional**: la capa está preparada
  (`auth.service.ts`, políticas RLS estrictas comentadas) pero no activada;
  hoy se navega por rol con el selector de modo demo.
- **Optimización de viajes** (Asistente Social): propone el día con más
  disponibilidad real agrupada, pero no reprograma turnos automáticamente —
  la reasignación final queda para un flujo manual de confirmación.
