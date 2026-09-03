# Nexo — Product Brief

**Sistema centralizado de gestión de turnos para el Hospital Pediátrico Juan Pablo II (Corrientes, Argentina)**

---

## 1. El problema

El Hospital Pediátrico Juan Pablo II atiende a pacientes de 1 mes a 15 años de toda la provincia de Corrientes, incluyendo un porcentaje alto de familias del interior (Mercedes, Goya, Curuzú Cuatiá, Paso de los Libres, Bella Vista, entre otras). Antes de Nexo, la gestión de turnos estaba fragmentada:

- Cada canal (ventanilla, teléfono, WhatsApp informal, asistente social) gestionaba turnos por su cuenta, sin una agenda única.
- Las familias del interior podían terminar viajando varias veces por prestaciones que se podrían coordinar en un solo día.
- No había manera centralizada de saber, en tiempo real, qué turnos estaban pendientes, quién estaba en sala de espera, o qué pacientes en lista de espera podían ocupar un cupo recién liberado.
- La reserva de turnos no tenía protección real contra dobles reservas del mismo horario.

## 2. La solución

**Un solo sistema, una sola agenda, cualquier canal.** Nexo centraliza en una única base de datos (Supabase/Postgres) todos los turnos del hospital, sin importar por dónde entraron: Portal Web, WhatsApp, Teléfono, Ventanilla presencial o Asistente Social. Todos los roles del hospital —familias, secretaría, profesionales, asistente social y dirección— ven y operan sobre la misma información en tiempo real.

```
        WEB · WHATSAPP · TELÉFONO · PRESENCIAL · ASISTENTE SOCIAL
                              │
                              ▼
                    MISMA BASE DE DATOS
                              │
                              ▼
                    MISMA AGENDA CENTRAL
```

## 3. Usuarios y roles

| Rol | Quién es | Qué necesita |
|---|---|---|
| **Familiar / Tutor** | Padre, madre o adulto responsable de un paciente pediátrico | Sacar, ver, cancelar o reprogramar turnos de sus personas a cargo, sin llamar por teléfono |
| **Administrativo (Secretaría)** | Personal de mesa de entrada | Ver toda la agenda del día, hacer check-in, asignar turnos manuales, gestionar lista de espera, reportar demoras/ausencias |
| **Profesional (Médico)** | Médicos y especialistas | Ver su cola de pacientes en espera, iniciar y finalizar atenciones, avisar demoras |
| **Asistente Social** | Equipo de servicio social del hospital | Gestionar pacientes del interior, coordinar turnos múltiples en un mismo viaje |
| **Administrador / Dirección** | Gestión hospitalaria | Configurar especialidades y plantel profesional |

## 4. Funcionalidades por rol

### 4.1 Portal Familiar (Web)
- **Reserva guiada por botones** (sin texto libre, 6 pasos): Persona a cargo → Preferencia horaria → Servicio → Día → Horario → Resumen → Confirmar. El profesional **ya no lo elige la familia**: se asigna automáticamente al confirmar el horario (ver "Asignación equitativa" en Reglas de negocio).
- Disponibilidad **real**, consultada en vivo contra la agenda (no hay horarios inventados): solo se muestran combinaciones de fecha/hora que existen como cupo disponible, dentro de una ventana de **hasta 30 días** de anticipación.
- El paso de selección de día muestra **todos** los días hábiles de la ventana de 30 días: los que tienen cupos reales se eligen normalmente; los que no tienen disponibilidad aparecen en naranja con la opción **"Agregar a lista de espera"**, que anota directo a la persona a cargo en la lista de espera del servicio.
- Gestión de **personas a cargo**: alta de nuevos pacientes con validación automática del rango etario pediátrico (mayor de 1 mes, hasta 15 años inclusive).
- Ver, cancelar y reprogramar turnos propios (la reprogramación también usa disponibilidad real).
- Alta en **lista de espera** cuando no hay cupos, y notificación cuando el sistema detecta compatibilidad tras una cancelación.

### 4.2 Simulador de WhatsApp
- Reproduce el mismo flujo guiado del portal Web dentro de una interfaz de chat estilo WhatsApp, pensado para demostración y pruebas. Tampoco pregunta por profesional: mismo criterio de asignación automática equitativa que la Web.
- Usa **exactamente la misma lógica de reserva** que la Web (misma función transaccional) — un turno creado por WhatsApp aparece de inmediato en la Agenda Administrativa con `canal_origen = WHATSAPP`.
- Soporta además cancelación, reprogramación, consulta de turnos propios y alta en lista de espera desde el chat.
- Incluye una demo de un clic para mostrar el flujo de punta a punta usando datos reales de la base (sin datos hardcodeados).

### 4.3 Panel Administrativo (Secretaría)
- **Agenda centralizada**, filtrable por Servicio o por Profesional, por fecha y por estado.
- Ciclo de vida completo del turno con un clic: `Pendiente de llegada → Registrar llegada (En espera) → Llamar a consultorio (En consultorio) → Finalizar atención (Atendido)`, más `No asistió` y `Cancelar`.
- Alta manual de turnos (para pedidos telefónicos o de ventanilla), buscando al paciente real en la base y eligiendo un horario real disponible.
- **Directorio de pacientes** con búsqueda por DNI/nombre/apellido contra el backend (no descarga todo el padrón), mostrando tutor responsable y próximos turnos.
- **Lista de espera inteligente**: al cancelar un turno, el sistema busca automáticamente candidatos compatibles (mismo servicio, profesional preferido, antigüedad en la lista) y permite asignar el cupo liberado con un clic — la decisión final siempre es humana.
- Reporte de **demoras** (15/30/45/60 min) y **ausencias** de profesionales, con reubicación asistida de los turnos afectados a otro profesional del mismo servicio cuando hay un horario libre equivalente.
- **Centro de operaciones** con las situaciones que requieren atención inmediata (demoras, lista de espera activa, sala de espera del día, ausencias); cada tarjeta explica qué hace ese módulo detrás de un ícono de información, para no saturar la vista.
- Panel de métricas (turnos, tiempo promedio de atención real, ausentismo, cancelaciones, demanda por especialidad, distribución por canal) calculado en vivo sobre los datos reales — el tiempo de atención se mide desde que el profesional inicia la consulta hasta que la finaliza.

### 4.4 Portal del Profesional
- Cola de pacientes en espera de su servicio o de su agenda nominal.
- Atender / Finalizar atención con un clic (actualiza el estado del turno en tiempo real para todo el sistema).
- Reportar su propia demora para que se refleje automáticamente en el portal familiar y en la agenda administrativa.
- Alcance **estrictamente administrativo**: no incluye historia clínica, diagnósticos ni datos médicos sensibles.

### 4.5 Portal de Asistente Social
- Directorio de pacientes del interior, con registro de nuevos pacientes.
- Reserva de turnos en representación de la familia, sobre disponibilidad real.
- **Optimización de viajes**: cuando un paciente tiene varias prestaciones pendientes, el sistema busca —sobre la disponibilidad real de agenda— el día con mayor concentración de horarios posibles para agrupar varias consultas en un solo viaje, mostrando viajes originales vs. optimizados vs. evitados. La asignación final siempre requiere confirmación humana.

### 4.6 Administración General
- Alta de nuevas **especialidades/servicios** (con su tipo de agenda: por servicio o por profesional).
- Alta de nuevos **profesionales** y vinculación a uno o más servicios.

## 5. Reglas de negocio clave

- **Rango pediátrico**: el hospital atiende exclusivamente pacientes mayores de 1 mes y hasta 15 años inclusive. Se valida tanto en la aplicación como con una restricción real en la base de datos.
- **Ventana de reserva**: los turnos programados se ofrecen con un máximo de 30 días de anticipación.
- **Reserva atómica, sin dobles turnos**: la confirmación de un turno es una operación transaccional en la base de datos — si dos personas intentan el mismo horario al mismo tiempo, solo una lo consigue; la otra recibe al instante el aviso de que ese horario ya no está disponible.
- **Cancelar libera el cupo** automáticamente y dispara la búsqueda de candidatos en lista de espera; nunca se borra el turno, se conserva como historial.
- **Transiciones de estado controladas**: un turno no puede saltar de estado de forma inconsistente (por ejemplo, no se puede "atender" un turno que nunca hizo check-in).
- **Agenda por Servicio vs. por Profesional**: algunos servicios (ej. Odontología, Laboratorio) trabajan con una cola compartida donde el profesional se asigna al momento de la atención; otros (ej. Cardiología, Traumatología) tienen agenda nominal por médico.
- **Asignación equitativa de profesional (Web y WhatsApp)**: la familia no elige médico. Cuando hay más de un profesional con cupo en el mismo horario, el sistema asigna al que tenga menos turnos activos en ese servicio, para repartir la carga y evitar que uno solo concentre la demanda. En Administrativo y Asistente Social sí se puede elegir un profesional puntual.

## 6. Arquitectura (resumen técnico)

- **Frontend**: React 19 + TypeScript + Vite + Tailwind, desplegado en Vercel.
- **Backend**: Supabase (Postgres + Row Level Security + funciones RPC transaccionales), sin backend intermedio propio.
- **Capa de datos**: una función RPC (`reservar_turno`) concentra la lógica atómica de reserva; funciones equivalentes cubren cancelación, check-in, atención, finalización y no-show. El frontend nunca calcula disponibilidad "a mano": siempre consulta `agenda_slots` real.
- **Una sola fuente de verdad**: los cinco canales/roles leen y escriben sobre las mismas tablas — no existen datos simulados ni copias locales para la información de negocio (pacientes, turnos, agenda, lista de espera, profesionales, servicios).

## 7. Estado actual y pendientes

**Funcionando de punta a punta:** alta y gestión de tutores/pacientes, servicios, profesionales, agenda real, reserva atómica de turnos (Web y WhatsApp), ciclo completo de atención, lista de espera con detección de candidatos, demoras y ausencias con reubicación asistida, búsqueda administrativa, reportes en vivo, optimización de viajes, alta de especialidades y profesionales desde el panel de administración.

**Pendiente / fuera de alcance de esta etapa:**
- Autenticación real por tutor/profesional (hoy se navega por rol con un selector de "modo demo"; la capa de Supabase Auth está preparada pero no activada).
- La bandeja de "solicitudes multicanal" (mensajes informales antes de interpretarse) y el módulo de Urgencias 24hs siguen en memoria local, no persistidas en Supabase; el acceso a la bandeja se sacó de la navegación del panel Administrativo.
- No hay una interfaz para cargar la agenda (horarios) de un profesional recién creado — hoy eso se hace por SQL directo.

---

*Documento generado a partir del estado real del código y la base de datos del proyecto — no incluye funcionalidades planificadas que todavía no existen.*
