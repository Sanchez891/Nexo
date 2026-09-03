import React, { useState, useEffect, useRef } from 'react';
import { useHospital } from '../../context/HospitalContext';
import {
  Send,
  CheckCheck,
  X,
  Calendar,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Info,
  Maximize2,
  Minimize2,
  Clock,
  User,
  AlertTriangle,
  Play,
  ArrowLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { Appointment, Localidad, TipoAgenda, TipoPrestacion, UserRole } from '../../types';
import { AvailableSlot, filterByPreferenciaHoraria, getSlotsDisponibles, pickBalancedSlot } from '../../services/agenda.service';

type FlowStep =
  | 'MENU_PRINCIPAL'
  | 'PERSONA_A_CARGO'
  | 'PREFERENCIA_HORARIA'
  | 'SERVICIO'
  | 'SELECCION_DIA'
  | 'SELECCION_HORARIO'
  | 'RESUMEN'
  | 'CONFIRMADO'
  | 'SIN_DISPONIBILIDAD'
  | 'LISTA_ESPERA_CONFIRMACION'
  | 'LISTA_ESPERA_EXITO'
  | 'CONSULTAR_TURNOS'
  | 'CANCELAR_SELECCION'
  | 'CANCELAR_CONFIRMACION'
  | 'CANCELADO_EXITO'
  | 'REPROGRAMAR_SELECCION'
  | 'URGENCIA_INFO'
  | 'INTERNACION_INFO';

interface ButtonOption {
  id: string;
  label: string;
  sublabel?: string;
  badge?: string;
  action: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'outline';
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user' | 'system';
  text: string;
  timestamp: string;
  step?: FlowStep;
  buttons?: ButtonOption[];
  card?: {
    type: 'summary' | 'ticket' | 'cancel_preview' | 'waitlist' | 'appointments_list';
    data: any;
  };
}

interface BookingState {
  pacienteId?: string;
  pacienteNombre?: string;
  pacienteEdad?: number;
  preferenciaHoraria?: 'manana' | 'tarde' | 'cualquiera';
  servicioId?: string;
  servicioNombre?: string;
  tipoAgenda?: TipoAgenda;
  tipoPrestacion?: TipoPrestacion;
  profesionalPreferido?: string; // Doctor name or 'Me da igual' or undefined
  profesionalId?: string;
  fechaSeleccionada?: string; // YYYY-MM-DD
  fechaLabel?: string; // e.g. "Miércoles 9 de septiembre"
  horaSeleccionada?: string; // HH:MM
  profesionalFinal?: string;
  consultorio?: string;
  slotId?: string;
  appointmentToCancel?: Appointment;
  appointmentToReschedule?: Appointment;
  confirmedAppointment?: Appointment;
}

export const WhatsAppSimulator: React.FC = () => {
  const {
    isWhatsAppOpen,
    closeWhatsAppSimulator,
    currentTutor,
    getPersonasACargo,
    appointments,
    bookAppointment,
    cancelAppointment,
    addToWaitlist,
    setRole,
    specialties,
    validatePediatricAge,
    isDateWithin30Days,
  } = useHospital();

  const personasACargo = getPersonasACargo(currentTutor.id);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<FlowStep>('MENU_PRINCIPAL');

  // Multi-step booking state
  const [bookingState, setBookingState] = useState<BookingState>({});
  // Este chat encadena pasos vía setTimeout/handlers que se definen en el
  // render en que se los llama, así que si leyeran `bookingState` del closure
  // del componente podrían ver una versión vieja (previa a los últimos
  // setBookingState). Un ref siempre-actualizado evita ese problema —
  // reemplaza toda lectura de bookingStateRef.current.<campo> dentro de callbacks.
  const bookingStateRef = useRef<BookingState>({});
  useEffect(() => {
    bookingStateRef.current = bookingState;
  }, [bookingState]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Format current time HH:MM
  const getTimeString = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  // Scroll to bottom on updates
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // When WhatsApp modal opens, reset or initialize greeting
  useEffect(() => {
    if (isWhatsAppOpen) {
      initConversation();
    }
  }, [isWhatsAppOpen]);

  // Add a bot reply with optional typing delay
  const addBotMessage = (
    text: string,
    step: FlowStep,
    buttons?: ButtonOption[],
    card?: ChatMessage['card'],
    delay: number = 400
  ) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const msgId = `msg-bot-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const newMsg: ChatMessage = {
        id: msgId,
        sender: 'bot',
        text,
        timestamp: getTimeString(),
        step,
        buttons,
        card,
      };
      setMessages((prev) => [...prev, newMsg]);
      setActiveMessageId(msgId);
      setCurrentStep(step);
    }, delay);
  };

  // Add user bubble
  const addUserMessage = (text: string) => {
    const newMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: getTimeString(),
    };
    setMessages((prev) => [...prev, newMsg]);
    // Deactivate previous options
    setActiveMessageId(null);
  };

  // ============================================================================
  // STEP 0: INITIAL GREETING & MAIN MENU
  // ============================================================================
  const initConversation = () => {
    setBookingState({});
    setCurrentStep('MENU_PRINCIPAL');

    const tutorNombre = currentTutor?.nombre || 'María';

    const welcomeMsg: ChatMessage = {
      id: 'msg-sys-1',
      sender: 'system',
      text: '🔒 Mensajería oficial del Hospital Pediátrico Juan Pablo II. Conectado a la agenda central en tiempo real.',
      timestamp: getTimeString(),
    };

    const initialBotMsg: ChatMessage = {
      id: 'msg-bot-welcome',
      sender: 'bot',
      text: `Hola, ${tutorNombre}. Soy el asistente de turnos del Hospital Pediátrico Juan Pablo II.\n\n¿Qué necesitás hacer hoy?`,
      timestamp: getTimeString(),
      step: 'MENU_PRINCIPAL',
      buttons: [
        {
          id: 'btn-solicitar',
          label: 'Solicitar turno',
          badge: 'Paso a paso',
          variant: 'primary',
          action: () => handleStartSolicitud(),
        },
        {
          id: 'btn-consultar',
          label: 'Consultar turnos',
          variant: 'outline',
          action: () => handleStartConsulta(),
        },
        {
          id: 'btn-reprogramar',
          label: 'Reprogramar turno',
          variant: 'outline',
          action: () => handleStartReprogramar(),
        },
        {
          id: 'btn-cancelar',
          label: 'Cancelar turno',
          variant: 'danger',
          action: () => handleStartCancelar(),
        },
      ],
    };

    setMessages([welcomeMsg, initialBotMsg]);
    setActiveMessageId('msg-bot-welcome');
  };

  const showMainMenu = (precedingText?: string) => {
    const text = precedingText
      ? `${precedingText}\n\n¿Qué necesitás hacer?`
      : '¿Qué necesitás hacer?';

    addBotMessage(text, 'MENU_PRINCIPAL', [
      {
        id: 'btn-solicitar',
        label: 'Solicitar turno',
        variant: 'primary',
        action: () => handleStartSolicitud(),
      },
      {
        id: 'btn-consultar',
        label: 'Consultar turnos',
        variant: 'outline',
        action: () => handleStartConsulta(),
      },
      {
        id: 'btn-reprogramar',
        label: 'Reprogramar turno',
        variant: 'outline',
        action: () => handleStartReprogramar(),
      },
      {
        id: 'btn-cancelar',
        label: 'Cancelar turno',
        variant: 'danger',
        action: () => handleStartCancelar(),
      },
    ]);
  };

  // Cancelar gestión universal
  const handleCancelarGestion = () => {
    addUserMessage('Cancelar gestión');
    setBookingState({});
    addBotMessage('No se realizó ningún cambio en tus turnos.', 'MENU_PRINCIPAL', undefined, undefined, 300);
    setTimeout(() => {
      showMainMenu();
    }, 600);
  };

  // ============================================================================
  // SOLICITAR TURNO: STEP 1 - PERSONA A CARGO
  // ============================================================================
  const handleStartSolicitud = () => {
    addUserMessage('Solicitar turno');
    setBookingState({});

    // Build buttons for registered personas a cargo
    const buttons: ButtonOption[] = personasACargo.map((p) => ({
      id: `btn-paciente-${p.id}`,
      label: `${p.nombre} - ${p.edad} años`,
      sublabel: `${p.relacion} • DNI ${p.dni}`,
      action: () => handleSelectPersona(p.nombre, p.id, p.edad),
      variant: 'primary',
    }));

    buttons.push({
      id: 'btn-otra-persona',
      label: 'Otra persona a cargo',
      sublabel: 'Registrar nuevo menor',
      variant: 'outline',
      action: () => {
        addUserMessage('Otra persona a cargo');
        addBotMessage(
          'Para vincular a un nuevo menor a tu cargo, podés ingresar a tu portal familiar o presentar la partida de nacimiento en Admisión.',
          'PERSONA_A_CARGO',
          [
            {
              id: 'btn-volver-pacientes',
              label: 'Volver a elegir persona a cargo',
              action: () => handleStartSolicitud(),
            },
            {
              id: 'btn-volver-menu',
              label: 'Volver al menú principal',
              action: () => showMainMenu(),
            },
          ]
        );
      },
    });

    buttons.push({
      id: 'btn-cancelar-paso-1',
      label: 'Cancelar gestión',
      variant: 'danger',
      action: () => handleCancelarGestion(),
    });

    addBotMessage(
      'Consulté tus personas a cargo registradas. ¿Para quién necesitás el turno?',
      'PERSONA_A_CARGO',
      buttons
    );
  };

  const handleSelectPersona = (nombre: string, id: string, edad: number) => {
    addUserMessage(`${nombre} - ${edad} años`);

    // Validate pediatric age
    const ageCheck = validatePediatricAge(edad);
    if (!ageCheck.valid) {
      addBotMessage(
        ageCheck.error || 'El paciente no se encuentra dentro del rango etario permitido (mayor de 1 mes y hasta 15 años inclusive).',
        'PERSONA_A_CARGO',
        [
          {
            id: 'btn-reintentar-paciente',
            label: 'Elegir otra persona a cargo',
            action: () => handleStartSolicitud(),
          },
          {
            id: 'btn-menu-pediatrico',
            label: 'Volver al menú principal',
            action: () => showMainMenu(),
          },
        ]
      );
      return;
    }

    setBookingState((prev) => ({
      ...prev,
      pacienteNombre: nombre,
      pacienteId: id,
      pacienteEdad: edad,
    }));

    // Next step: PREFERENCIA HORARIA
    setTimeout(() => {
      askPreferenciaHoraria(nombre);
    }, 250);
  };

  // ============================================================================
  // SOLICITAR TURNO: STEP 2 - PREFERENCIA HORARIA
  // ============================================================================
  const askPreferenciaHoraria = (nombrePaciente: string) => {
    addBotMessage(
      `Perfecto. Vamos a gestionar el turno para ${nombrePaciente}.\n\n¿Tenés alguna preferencia de horario?`,
      'PREFERENCIA_HORARIA',
      [
        {
          id: 'btn-pref-manana',
          label: 'Mañana',
          sublabel: 'Antes de las 13:00 hs',
          variant: 'primary',
          action: () => handleSelectPreferenciaHoraria('manana', 'Mañana (antes de las 13:00 hs)'),
        },
        {
          id: 'btn-pref-tarde',
          label: 'Tarde',
          sublabel: 'Desde las 13:00 hs',
          variant: 'outline',
          action: () => handleSelectPreferenciaHoraria('tarde', 'Tarde (desde las 13:00 hs)'),
        },
        {
          id: 'btn-pref-igual',
          label: 'Me da igual',
          sublabel: 'Cualquier horario disponible',
          variant: 'outline',
          action: () => handleSelectPreferenciaHoraria('cualquiera', 'Me da igual'),
        },
        {
          id: 'btn-volver-p1',
          label: 'Volver',
          variant: 'outline',
          action: () => handleStartSolicitud(),
        },
        {
          id: 'btn-cancelar-p2',
          label: 'Cancelar gestión',
          variant: 'danger',
          action: () => handleCancelarGestion(),
        },
      ]
    );
  };

  const handleSelectPreferenciaHoraria = (pref: 'manana' | 'tarde' | 'cualquiera', label: string) => {
    addUserMessage(label);
    setBookingState((prev) => ({ ...prev, preferenciaHoraria: pref }));

    let confirmText = 'Perfecto, voy a priorizar los turnos disponibles por la mañana.';
    if (pref === 'tarde') {
      confirmText = 'Perfecto, voy a priorizar los turnos disponibles por la tarde.';
    } else if (pref === 'cualquiera') {
      confirmText = 'Perfecto, consideraré turnos disponibles en cualquier horario.';
    }

    // Still DO NOT show slots! Next step: SERVICIO
    setTimeout(() => {
      askServicio(confirmText);
    }, 250);
  };

  // ============================================================================
  // SOLICITAR TURNO: STEP 3 - SERVICIO
  // ============================================================================
  const askServicio = (prefixMsg?: string) => {
    const text = prefixMsg
      ? `${prefixMsg}\n\n¿Qué servicio necesitás?`
      : '¿Qué servicio necesitás?';

    // Specialties buttons
    const serviceButtons: ButtonOption[] = specialties.map((s) => ({
      id: `btn-serv-${s.id}`,
      label: s.nombre,
      sublabel: s.tipoAgenda === 'SERVICIO' ? 'Agenda compartida de servicio' : 'Agenda por profesional',
      variant: s.nombre.toLowerCase().includes('trauma') ? 'primary' : 'outline',
      action: () => handleSelectServicio(s.id, s.nombre, s.tipoAgenda, s.tipoPrestacion),
    }));

    serviceButtons.push({
      id: 'btn-volver-p2',
      label: 'Volver',
      variant: 'outline',
      action: () => {
        addUserMessage('Volver');
        askPreferenciaHoraria(bookingStateRef.current.pacienteNombre || 'el paciente');
      },
    });

    serviceButtons.push({
      id: 'btn-cancelar-p3',
      label: 'Cancelar gestión',
      variant: 'danger',
      action: () => handleCancelarGestion(),
    });

    addBotMessage(text, 'SERVICIO', serviceButtons);
  };

  const handleSelectServicio = (
    servicioId: string,
    servicioNombre: string,
    tipoAgenda: TipoAgenda,
    tipoPrestacion: TipoPrestacion
  ) => {
    addUserMessage(servicioNombre);

    setBookingState((prev) => ({
      ...prev,
      servicioId,
      servicioNombre,
      tipoAgenda,
      tipoPrestacion,
      // Reset any downstream choices when service changes
      profesionalPreferido: undefined,
      profesionalId: undefined,
      fechaSeleccionada: undefined,
      horaSeleccionada: undefined,
    }));

    // El profesional ya no se pregunta: se asigna automáticamente y de forma
    // equitativa entre los profesionales del servicio al elegir el horario.
    setTimeout(() => {
      addBotMessage(
        `Perfecto. Seleccionaste ${servicioNombre}.\n\nEl profesional se asigna automáticamente para repartir la agenda de forma equitativa.`,
        'SELECCION_DIA',
        undefined,
        undefined,
        200
      );
      askSeleccionDia(servicioNombre, tipoAgenda);
    }, 250);
  };

  // ============================================================================
  // SOLICITAR TURNO: STEP 5 - SELECCIÓN DEL DÍA
  // ============================================================================
  const dayNamesWA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const monthNamesWA = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  const formatDateLabelWA = (dateStr: string) => {
    const d = new Date(`${dateStr}T00:00:00`);
    const dow = d.getDay();
    return {
      label: `${dayNamesWA[dow]} ${d.getDate()} de ${monthNamesWA[d.getMonth()]}`,
      shortLabel: `${dayNamesWA[dow]} ${d.getDate()}`,
    };
  };

  type WaSlot = {
    fecha: string;
    dayLabel: string;
    hora: string;
    profesional: string;
    profesionalId?: string;
    slotId: string;
    consultorio: string;
    tipoAgenda: TipoAgenda;
  };

  // Consulta real a agenda_slots (Supabase) para el servicio/profesional del
  // booking en curso. Se cachea por servicio+profesional dentro del state.
  const slotsFetchCache = useRef<Map<string, AvailableSlot[]>>(new Map());

  const fetchRealSlots = async (
    servicioNombre: string,
    tipoAgenda: TipoAgenda = 'PROFESIONAL'
  ): Promise<WaSlot[]> => {
    const servicio = specialties.find((s) => s.nombre.toLowerCase() === servicioNombre.toLowerCase());
    if (!servicio) return [];

    const cacheKey = servicio.id;
    let raw = slotsFetchCache.current.get(cacheKey);
    if (!raw) {
      raw = await getSlotsDisponibles({ servicioId: servicio.id, tipoAgenda });
      slotsFetchCache.current.set(cacheKey, raw);
    }

    return raw.map((s) => ({
      fecha: s.fecha,
      dayLabel: formatDateLabelWA(s.fecha).label,
      hora: s.hora,
      profesional: s.profesional,
      profesionalId: s.profesionalId,
      slotId: s.slotId,
      consultorio: s.consultorio,
      tipoAgenda: s.tipoAgenda,
    }));
  };

  // Agrupa por día los slots reales, filtrando por preferencia horaria
  const groupSlotsByDay = (slots: WaSlot[], prefHoraria: 'manana' | 'tarde' | 'cualquiera') => {
    const filtered = filterByPreferenciaHoraria(slots as unknown as AvailableSlot[], prefHoraria) as unknown as WaSlot[];
    const byDate = new Map<string, WaSlot[]>();
    filtered.forEach((s) => {
      const arr = byDate.get(s.fecha) || [];
      arr.push(s);
      byDate.set(s.fecha, arr);
    });
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, daySlots]) => ({
        date,
        label: daySlots[0].dayLabel,
        shortLabel: formatDateLabelWA(date).shortLabel,
        availableSlotsCount: daySlots.length,
        slots: daySlots.sort((a, b) => a.hora.localeCompare(b.hora)),
      }));
  };

  const askSeleccionDia = async (servicioNombre: string, tipoAgenda: TipoAgenda = 'PROFESIONAL') => {
    const prefHoraria = bookingStateRef.current.preferenciaHoraria || 'manana';
    const realSlots = await fetchRealSlots(servicioNombre, tipoAgenda);
    const eligibleDays = groupSlotsByDay(realSlots, prefHoraria);

    if (eligibleDays.length === 0) {
      // NO AVAILABILITY FOUND
      addBotMessage(
        `No encontré turnos disponibles para ${servicioNombre} con esas preferencias en los próximos 30 días.`,
        'SIN_DISPONIBILIDAD',
        [
          {
            id: 'btn-no-disp-wl',
            label: 'Ingresar a lista de espera',
            sublabel: 'Te avisaremos apenas se libere un turno',
            variant: 'warning',
            action: () => handlePromptWaitlist(),
          },
          {
            id: 'btn-no-disp-cambiar-horario',
            label: 'Cambiar preferencia horaria',
            variant: 'outline',
            action: () => {
              addUserMessage('Cambiar horario');
              askPreferenciaHoraria(bookingStateRef.current.pacienteNombre || 'el paciente');
            },
          },
          {
            id: 'btn-no-disp-volver',
            label: 'Volver a servicios',
            variant: 'outline',
            action: () => {
              addUserMessage('Volver');
              askServicio();
            },
          },
          {
            id: 'btn-no-disp-cancelar',
            label: 'Cancelar gestión',
            variant: 'danger',
            action: () => handleCancelarGestion(),
          },
        ]
      );
      return;
    }

    // We have eligible days! Show them as clean chips
    const dayButtons: ButtonOption[] = eligibleDays.slice(0, 4).map((d) => ({
      id: `btn-dia-${d.date}`,
      label: d.shortLabel,
      sublabel: `${d.availableSlotsCount} horarios disponibles`,
      variant: d.date === eligibleDays[0].date ? 'primary' : 'outline',
      action: () => handleSelectDia(d.date, d.label, d.shortLabel),
    }));

    // Primer día disponible
    dayButtons.push({
      id: 'btn-dia-primer-disponible',
      label: 'Primer día disponible',
      sublabel: `${eligibleDays[0].shortLabel}`,
      variant: 'outline',
      action: () => handleSelectDia(eligibleDays[0].date, eligibleDays[0].label, eligibleDays[0].shortLabel),
    });

    // Me da igual el día
    dayButtons.push({
      id: 'btn-dia-igual',
      label: 'Me da igual el día',
      variant: 'outline',
      action: () => handleSelectDia(eligibleDays[0].date, eligibleDays[0].label, eligibleDays[0].shortLabel),
    });

    dayButtons.push({
      id: 'btn-volver-p4',
      label: 'Volver a servicios',
      variant: 'outline',
      action: () => {
        addUserMessage('Volver');
        askServicio();
      },
    });

    dayButtons.push({
      id: 'btn-cancelar-p5',
      label: 'Cancelar gestión',
      variant: 'danger',
      action: () => handleCancelarGestion(),
    });

    addBotMessage('¿Qué día te queda mejor?', 'SELECCION_DIA', dayButtons);
  };

  const handleSelectDia = (dateStr: string, dateLabel: string, shortLabel: string) => {
    addUserMessage(shortLabel);

    setBookingState((prev) => ({
      ...prev,
      fechaSeleccionada: dateStr,
      fechaLabel: dateLabel,
      horaSeleccionada: undefined,
    }));

    // Step 6: HORARIOS DISPONIBLES (NOW AND ONLY NOW SHOW THE HOURS)
    setTimeout(() => {
      presentAvailableSlotsForDay(dateStr, dateLabel, shortLabel);
    }, 250);
  };

  // ============================================================================
  // SOLICITAR TURNO: STEP 6 - HORARIOS DISPONIBLES
  // ============================================================================
  const presentAvailableSlotsForDay = async (
    dateStr: string,
    dateLabel: string,
    shortLabel: string,
    showAll: boolean = false
  ) => {
    const servicioNombre = bookingStateRef.current.servicioNombre || '';
    const prefHoraria = bookingStateRef.current.preferenciaHoraria || 'manana';
    const tipoAgenda = bookingStateRef.current.tipoAgenda || 'PROFESIONAL';

    const realSlots = await fetchRealSlots(servicioNombre, tipoAgenda);
    const filtered = filterByPreferenciaHoraria(realSlots as unknown as AvailableSlot[], prefHoraria) as unknown as WaSlot[];
    const slotsDelDia = filtered.filter((s) => s.fecha === dateStr).sort((a, b) => a.hora.localeCompare(b.hora));

    if (slotsDelDia.length === 0) {
      addBotMessage(
        `No encontré horarios disponibles para el ${shortLabel.toLowerCase()} con esas preferencias.`,
        'SIN_DISPONIBILIDAD',
        [
          {
            id: 'btn-elegir-otro-dia',
            label: 'Elegir otro día',
            variant: 'primary',
            action: () => {
              addUserMessage('Elegir otro día');
              askSeleccionDia(servicioNombre, tipoAgenda);
            },
          },
          {
            id: 'btn-no-disp-wl-2',
            label: 'Ingresar a lista de espera',
            variant: 'warning',
            action: () => handlePromptWaitlist(),
          },
          {
            id: 'btn-cancelar-p6-empty',
            label: 'Cancelar gestión',
            variant: 'danger',
            action: () => handleCancelarGestion(),
          },
        ]
      );
      return;
    }

    // Horarios únicos (el profesional queda oculto: se asigna automáticamente
    // y de forma equitativa recién al elegir el horario).
    const horasUnicas: string[] = [];
    for (const s of slotsDelDia) {
      if (!horasUnicas.includes(s.hora)) horasUnicas.push(s.hora);
    }

    const visibleHoras = showAll ? horasUnicas : horasUnicas.slice(0, 3);

    const slotButtons: ButtonOption[] = visibleHoras.map((hora, idx) => ({
      id: `btn-hora-${hora}`,
      label: `${hora} hs`,
      sublabel: 'Profesional asignado automáticamente',
      variant: idx === 0 ? 'primary' : 'outline',
      action: () => handleSelectHora(hora),
    }));

    if (!showAll && horasUnicas.length > 3) {
      slotButtons.push({
        id: 'btn-ver-mas-horarios',
        label: `Ver más horarios (+${horasUnicas.length - 3})`,
        variant: 'outline',
        action: () => {
          addUserMessage('Ver más horarios');
          presentAvailableSlotsForDay(dateStr, dateLabel, shortLabel, true);
        },
      });
    }

    slotButtons.push({
      id: 'btn-elegir-otro-dia-btn',
      label: 'Elegir otro día',
      variant: 'outline',
      action: () => {
        addUserMessage('Elegir otro día');
        askSeleccionDia(servicioNombre, tipoAgenda);
      },
    });

    slotButtons.push({
      id: 'btn-cancelar-p6',
      label: 'Cancelar gestión',
      variant: 'danger',
      action: () => handleCancelarGestion(),
    });

    let prefLabel = 'por la mañana';
    if (prefHoraria === 'tarde') prefLabel = 'por la tarde';
    if (prefHoraria === 'cualquiera') prefLabel = 'para esa fecha';

    addBotMessage(
      `Para el ${shortLabel.toLowerCase()} encontré estos horarios disponibles ${prefLabel}:`,
      'SELECCION_HORARIO',
      slotButtons
    );
  };

  // El profesional ya no lo elige la familia: si hay más de uno con cupo en
  // el mismo horario, se asigna automáticamente al que tenga menos turnos
  // activos (reparto equitativo, evita sobrecargar a uno solo).
  const handleSelectHora = async (hora: string) => {
    const servicioNombre = bookingStateRef.current.servicioNombre || '';
    const tipoAgenda = bookingStateRef.current.tipoAgenda || 'PROFESIONAL';
    const fecha = bookingStateRef.current.fechaSeleccionada;
    const servicio = specialties.find((s) => s.nombre.toLowerCase() === servicioNombre.toLowerCase());
    if (!fecha || !servicio) return;

    const realSlots = await fetchRealSlots(servicioNombre, tipoAgenda);
    const candidates = realSlots.filter((s) => s.fecha === fecha && s.hora === hora);
    if (candidates.length === 0) return;

    const winner = await pickBalancedSlot(servicio.id, candidates as unknown as AvailableSlot[]);
    handleSelectSlot(winner as unknown as WaSlot);
  };

  const handleSelectSlot = (slot: WaSlot) => {
    addUserMessage(`${slot.hora} hs - ${slot.profesional}`);

    setBookingState((prev) => ({
      ...prev,
      fechaSeleccionada: slot.fecha,
      fechaLabel: slot.dayLabel,
      horaSeleccionada: slot.hora,
      profesionalFinal: slot.profesional,
      profesionalId: slot.profesionalId,
      consultorio: slot.consultorio,
      slotId: slot.slotId,
    }));

    // Step 7: RESUMEN ANTES DE CONFIRMAR (DO NOT CREATE YET)
    setTimeout(() => {
      presentResumenTurno({
        pacienteNombre: bookingStateRef.current.pacienteNombre || 'Sofía Gómez',
        servicioNombre: bookingStateRef.current.servicioNombre || 'Traumatología',
        profesional: slot.profesional,
        fechaLabel: slot.dayLabel,
        fecha: slot.fecha,
        hora: slot.hora,
        tutor: `${currentTutor.nombre} ${currentTutor.apellido}`,
      });
    }, 250);
  };

  // ============================================================================
  // SOLICITAR TURNO: STEP 7 - RESUMEN DEL TURNO
  // ============================================================================
  const presentResumenTurno = (summaryData: {
    pacienteNombre: string;
    servicioNombre: string;
    profesional: string;
    fechaLabel: string;
    fecha: string;
    hora: string;
    tutor: string;
  }) => {
    addBotMessage(
      'Revisemos el turno antes de confirmarlo:',
      'RESUMEN',
      [
        {
          id: 'btn-confirmar-turno-final',
          label: 'Confirmar turno',
          variant: 'primary',
          badge: 'Confirmar reserva',
          action: () => handleFinalConfirmBooking(),
        },
        {
          id: 'btn-elegir-otro-horario',
          label: 'Elegir otro horario',
          variant: 'outline',
          action: () => {
            addUserMessage('Elegir otro horario');
            if (!bookingStateRef.current.fechaSeleccionada) return;
            const shortLabel = bookingStateRef.current.fechaLabel?.split(' de ')[0] || bookingStateRef.current.fechaSeleccionada;
            presentAvailableSlotsForDay(bookingStateRef.current.fechaSeleccionada, bookingStateRef.current.fechaLabel || bookingStateRef.current.fechaSeleccionada, shortLabel);
          },
        },
        {
          id: 'btn-modificar-datos',
          label: 'Modificar datos',
          variant: 'outline',
          action: () => {
            addUserMessage('Modificar datos');
            askPreferenciaHoraria(bookingStateRef.current.pacienteNombre || 'el paciente');
          },
        },
        {
          id: 'btn-cancelar-gestion-resumen',
          label: 'Cancelar gestión',
          variant: 'danger',
          action: () => handleCancelarGestion(),
        },
      ],
      {
        type: 'summary',
        data: summaryData,
      }
    );
  };

  // ============================================================================
  // SOLICITAR TURNO: STEP 8 - VALIDACIÓN FINAL & CONFIRMACIÓN EN AGENDA CENTRAL
  // ============================================================================
  const handleFinalConfirmBooking = async () => {
    addUserMessage('Confirmar turno');

    const fecha = bookingStateRef.current.fechaSeleccionada || '';
    const pacienteId = bookingStateRef.current.pacienteId;
    const slotId = bookingStateRef.current.slotId;

    if (!pacienteId || !slotId) {
      addBotMessage('Faltan datos para confirmar el turno. Volvamos a empezar la solicitud.', 'MENU_PRINCIPAL', [
        { id: 'btn-error-reintentar-datos', label: 'Reintentar solicitud', action: () => handleStartSolicitud() },
      ]);
      return;
    }

    // Reserva atómica real vía reservar_turno() en Supabase — misma función
    // que usa el portal Web. Si el slot ya fue tomado, el error llega acá.
    const result = await bookAppointment({
      slotId,
      pacienteId,
      tutorSolicitanteId: currentTutor.id,
      origenCanal: 'whatsapp',
      motivoResumido: 'Atención pediátrica solicitada mediante asistente de WhatsApp',
    });

    if (!result.success || !result.appointment) {
      addBotMessage(
        `Hubo un inconveniente al registrar el turno: ${result.error || 'Verifique los datos.'}`,
        'MENU_PRINCIPAL',
        [
          {
            id: 'btn-error-reintentar',
            label: 'Reintentar solicitud',
            action: () => handleStartSolicitud(),
          },
        ]
      );
      return;
    }

    const apt = result.appointment;
    setBookingState((prev) => ({ ...prev, confirmedAppointment: apt }));

    // 3. Confirmation card & Success response
    addBotMessage(
      `¡Listo, ${currentTutor.nombre}! El turno quedó confirmado en el sistema central del hospital.`,
      'CONFIRMADO',
      [
        {
          id: 'btn-ver-en-agenda-admin',
          label: 'Ver en Agenda Administrativa',
          badge: 'Demostración Jurado',
          variant: 'primary',
          action: () => {
            // Jump directly to Secretario/Administrativo agenda to show jury the new appointment!
            setRole('administrativo');
            closeWhatsAppSimulator();
          },
        },
        {
          id: 'btn-ver-mis-turnos-post',
          label: 'Ver mis turnos',
          variant: 'outline',
          action: () => handleStartConsulta(),
        },
        {
          id: 'btn-gestionar-otro-turno',
          label: 'Gestionar otro turno',
          variant: 'outline',
          action: () => handleStartSolicitud(),
        },
        {
          id: 'btn-finalizar-chat',
          label: 'Finalizar',
          variant: 'outline',
          action: () => {
            addUserMessage('Finalizar');
            addBotMessage(
              '¡Muchas gracias! Si necesitás algo más, escribime cuando quieras. Que tengas un buen día.',
              'MENU_PRINCIPAL',
              [
                {
                  id: 'btn-nuevo-chat',
                  label: 'Iniciar nueva consulta',
                  action: () => initConversation(),
                },
              ]
            );
          },
        },
      ],
      {
        type: 'ticket',
        data: {
          paciente: apt.pacienteNombre,
          servicio: apt.especialidad,
          profesional: apt.profesional,
          fechaLabel: bookingStateRef.current.fechaLabel || `${apt.fecha}`,
          fecha: apt.fecha,
          hora: apt.hora,
          codigo: apt.codigo,
          estado: 'Pendiente de llegada',
          origen: 'WhatsApp',
          consultorio: apt.consultorio,
        },
      }
    );
  };

  // ============================================================================
  // LISTA DE ESPERA FLOW
  // ============================================================================
  const handlePromptWaitlist = () => {
    addUserMessage('Ingresar a lista de espera');
    const paciente = bookingStateRef.current.pacienteNombre || 'Sofía Gómez';
    const servicio = bookingStateRef.current.servicioNombre || 'Traumatología';

    addBotMessage(
      `Puedo registrar a ${paciente} en la lista de espera de ${servicio}. Si se libera un turno compatible, podremos avisarte automáticamente para asignarlo.`,
      'LISTA_ESPERA_CONFIRMACION',
      [
        {
          id: 'btn-confirmar-lista-espera',
          label: 'Ingresar a lista de espera',
          variant: 'warning',
          action: () => handleConfirmWaitlist(),
        },
        {
          id: 'btn-volver-wl',
          label: 'Volver',
          variant: 'outline',
          action: () => {
            addUserMessage('Volver');
            askPreferenciaHoraria(paciente);
          },
        },
        {
          id: 'btn-cancelar-wl',
          label: 'Cancelar gestión',
          variant: 'danger',
          action: () => handleCancelarGestion(),
        },
      ]
    );
  };

  const handleConfirmWaitlist = async () => {
    addUserMessage('Confirmar ingreso a lista de espera');
    const paciente = bookingStateRef.current.pacienteNombre || 'el paciente';
    const servicio = bookingStateRef.current.servicioNombre || 'Traumatología';
    const prefHoraria = bookingStateRef.current.preferenciaHoraria || 'manana';

    if (!bookingStateRef.current.pacienteId) {
      addBotMessage('No pude identificar al paciente para anotarlo en la lista de espera. Empecemos de nuevo.', 'MENU_PRINCIPAL', [
        { id: 'btn-error-wl-reintentar', label: 'Reintentar solicitud', action: () => handleStartSolicitud() },
      ]);
      return;
    }

    const entry = await addToWaitlist({
      pacienteId: bookingStateRef.current.pacienteId,
      tutorId: currentTutor.id,
      especialidad: servicio,
      preferenciaHorario: prefHoraria,
      localidad: currentTutor.localidad,
      origenCanal: 'whatsapp',
    });

    addBotMessage(
      `Listo. ${paciente} quedó registrada en la lista de espera de ${servicio}.\n\nPosición estimada: #${entry.posicion}. La inscripción ya se encuentra visible en la bandeja de Lista de Espera Administrativa.`,
      'LISTA_ESPERA_EXITO',
      [
        {
          id: 'btn-ver-wl-admin',
          label: 'Ver en Panel Administrativo',
          variant: 'primary',
          action: () => {
            setRole('administrativo');
            closeWhatsAppSimulator();
          },
        },
        {
          id: 'btn-ver-turnos-wl',
          label: 'Ver mis turnos',
          variant: 'outline',
          action: () => handleStartConsulta(),
        },
        {
          id: 'btn-menu-wl',
          label: 'Volver al menú principal',
          variant: 'outline',
          action: () => showMainMenu(),
        },
      ],
      {
        type: 'waitlist',
        data: {
          paciente,
          servicio,
          posicion: entry.posicion,
          preferenciaHorario: prefHoraria,
          origen: 'WhatsApp',
        },
      }
    );
  };

  // ============================================================================
  // CONSULTAR TURNOS FLOW
  // ============================================================================
  const handleStartConsulta = (pacienteFiltro?: string) => {
    if (!pacienteFiltro) {
      addUserMessage('Consultar turnos');
    }

    const active = appointments.filter(
      (a) =>
        a.estado !== 'CANCELADO' &&
        (a.tutorSolicitanteId === currentTutor.id ||
          a.pacienteNombre.toLowerCase().includes('sofía') ||
          a.pacienteNombre.toLowerCase().includes('lucas') ||
          a.pacienteNombre.toLowerCase().includes('martín'))
    );

    let filtered = active;
    if (pacienteFiltro) {
      filtered = active.filter((a) =>
        a.pacienteNombre.toLowerCase().includes(pacienteFiltro.toLowerCase())
      );
    }

    if (filtered.length === 0) {
      addBotMessage(
        pacienteFiltro
          ? `No encontré turnos activos programados para ${pacienteFiltro}.`
          : 'Actualmente no tenés turnos activos programados en el sistema central.',
        'CONSULTAR_TURNOS',
        [
          {
            id: 'btn-pedir-turno-desde-consulta',
            label: 'Solicitar un turno nuevo',
            variant: 'primary',
            action: () => handleStartSolicitud(),
          },
          {
            id: 'btn-volver-menu-consulta-vacia',
            label: 'Volver al menú principal',
            variant: 'outline',
            action: () => showMainMenu(),
          },
        ]
      );
      return;
    }

    addBotMessage(
      `Tenés ${filtered.length} turno(s) activo(s) en la agenda del Hospital:`,
      'CONSULTAR_TURNOS',
      [
        {
          id: 'btn-nuevo-turno-desde-lista',
          label: 'Solicitar otro turno',
          variant: 'primary',
          action: () => handleStartSolicitud(),
        },
        {
          id: 'btn-cancelar-desde-lista',
          label: 'Cancelar un turno',
          variant: 'danger',
          action: () => handleStartCancelar(),
        },
        {
          id: 'btn-menu-desde-lista',
          label: 'Volver al menú',
          variant: 'outline',
          action: () => showMainMenu(),
        },
      ],
      {
        type: 'appointments_list',
        data: { appointments: filtered },
      }
    );
  };

  // ============================================================================
  // CANCELAR TURNO FLOW
  // ============================================================================
  const handleStartCancelar = () => {
    addUserMessage('Cancelar turno');

    const active = appointments.filter(
      (a) =>
        a.estado !== 'CANCELADO' &&
        (a.tutorSolicitanteId === currentTutor.id ||
          a.pacienteNombre.toLowerCase().includes('sofía') ||
          a.pacienteNombre.toLowerCase().includes('lucas') ||
          a.pacienteNombre.toLowerCase().includes('martín'))
    );

    if (active.length === 0) {
      addBotMessage(
        'No tenés turnos activos para cancelar en este momento.',
        'MENU_PRINCIPAL',
        [
          {
            id: 'btn-volver-menu-sin-canc',
            label: 'Volver al menú principal',
            action: () => showMainMenu(),
          },
        ]
      );
      return;
    }

    const cancelButtons: ButtonOption[] = active.map((a) => ({
      id: `btn-cancelar-apt-${a.id}`,
      label: `${a.pacienteNombre} • ${a.especialidad}`,
      sublabel: `${a.fecha} a las ${a.hora} hs • ${a.profesional}`,
      variant: 'danger',
      action: () => handlePromptConfirmCancel(a),
    }));

    cancelButtons.push({
      id: 'btn-volver-cancel-menu',
      label: 'Volver al menú',
      variant: 'outline',
      action: () => showMainMenu(),
    });

    addBotMessage('¿Qué turno necesitás cancelar?', 'CANCELAR_SELECCION', cancelButtons);
  };

  const handlePromptConfirmCancel = (apt: Appointment) => {
    addUserMessage(`Cancelar turno de ${apt.pacienteNombre} (${apt.especialidad})`);
    setBookingState((prev) => ({ ...prev, appointmentToCancel: apt }));

    addBotMessage(
      `¿Confirmás que querés cancelar este turno?\n\n• Paciente: ${apt.pacienteNombre}\n• Servicio: ${apt.especialidad}\n• Profesional: ${apt.profesional}\n• Fecha: ${apt.fecha} a las ${apt.hora} hs\n• Código: ${apt.codigo}`,
      'CANCELAR_CONFIRMACION',
      [
        {
          id: 'btn-confirm-yes-cancel',
          label: 'Sí, cancelar turno',
          variant: 'danger',
          action: () => handleExecuteCancellation(apt),
        },
        {
          id: 'btn-confirm-no-cancel',
          label: 'No, mantener turno',
          variant: 'outline',
          action: () => {
            addUserMessage('No, mantener turno');
            addBotMessage('El turno se mantiene sin cambios.', 'MENU_PRINCIPAL', undefined, undefined, 250);
            setTimeout(() => showMainMenu(), 500);
          },
        },
      ]
    );
  };

  const handleExecuteCancellation = async (apt: Appointment) => {
    addUserMessage('Sí, cancelar');

    // Operación real: cancelar_turno() en Supabase libera el slot y dispara
    // la búsqueda de candidatos compatibles en lista de espera.
    await cancelAppointment(apt.id, 'Cancelado desde WhatsApp por el tutor responsable');

    addBotMessage(
      `El turno de ${apt.pacienteNombre} fue cancelado correctamente.\n\nEl horario (${apt.fecha} a las ${apt.hora} hs) ha sido liberado en la agenda central y el sistema ya notificó a la lista de espera de ${apt.especialidad}.`,
      'CANCELADO_EXITO',
      [
        {
          id: 'btn-ver-en-agenda-canc',
          label: 'Ver en Agenda Administrativa',
          badge: 'Cupo liberado',
          variant: 'primary',
          action: () => {
            setRole('administrativo');
            closeWhatsAppSimulator();
          },
        },
        {
          id: 'btn-gestionar-nuevo-post-canc',
          label: 'Gestionar otro turno',
          variant: 'outline',
          action: () => handleStartSolicitud(),
        },
        {
          id: 'btn-menu-post-canc',
          label: 'Volver al menú principal',
          variant: 'outline',
          action: () => showMainMenu(),
        },
      ]
    );
  };

  // ============================================================================
  // REPROGRAMAR TURNO FLOW
  // ============================================================================
  const handleStartReprogramar = () => {
    addUserMessage('Reprogramar turno');

    const active = appointments.filter(
      (a) =>
        a.estado !== 'CANCELADO' &&
        (a.tutorSolicitanteId === currentTutor.id ||
          a.pacienteNombre.toLowerCase().includes('sofía') ||
          a.pacienteNombre.toLowerCase().includes('lucas') ||
          a.pacienteNombre.toLowerCase().includes('martín'))
    );

    if (active.length === 0) {
      addBotMessage(
        'No tenés turnos activos para reprogramar.',
        'MENU_PRINCIPAL',
        [
          {
            id: 'btn-volver-reprog-vacio',
            label: 'Volver al menú principal',
            action: () => showMainMenu(),
          },
        ]
      );
      return;
    }

    const buttons: ButtonOption[] = active.map((a) => ({
      id: `btn-reprog-${a.id}`,
      label: `${a.pacienteNombre} • ${a.especialidad}`,
      sublabel: `${a.fecha} a las ${a.hora} hs`,
      variant: 'primary',
      action: async () => {
        addUserMessage(`Reprogramar ${a.pacienteNombre} (${a.especialidad})`);
        // Cancela el turno anterior (libera el slot) y arranca una nueva
        // solicitud guiada para el mismo paciente/servicio.
        await cancelAppointment(a.id, 'Reprogramación solicitada vía WhatsApp');
        setBookingState({
          pacienteNombre: a.pacienteNombre,
          pacienteId: a.pacienteId,
          pacienteEdad: a.pacienteEdad,
          servicioNombre: a.especialidad,
          tipoAgenda: a.tipoAgenda,
          tipoPrestacion: a.tipoPrestacion,
        });
        addBotMessage(
          `Vamos a buscar un nuevo turno para ${a.pacienteNombre} en ${a.especialidad}. El turno anterior fue cancelado para liberar el cupo.`,
          'PREFERENCIA_HORARIA',
          undefined,
          undefined,
          300
        );
        setTimeout(() => {
          askPreferenciaHoraria(a.pacienteNombre);
        }, 600);
      },
    }));

    buttons.push({
      id: 'btn-volver-reprog-menu',
      label: 'Volver al menú',
      variant: 'outline',
      action: () => showMainMenu(),
    });

    addBotMessage('¿Qué turno querés reprogramar?', 'REPROGRAMAR_SELECCION', buttons);
  };

  // ============================================================================
  // URGENCIAS & INTERNACIONES
  // ============================================================================
  const showUrgenciaResponse = () => {
    addBotMessage(
      '🚨 Las urgencias pediátricas se atienden las 24 horas y no requieren turno.\n\nPor favor, concurrí de forma inmediata al servicio de Guardia y Emergencias del Hospital Pediátrico Juan Pablo II (Av. Artigas 1435, Corrientes Capital).\n\nPara consultas médicas programadas que no revistan urgencia, podés continuar con la gestión de turnos.',
      'URGENCIA_INFO',
      [
        {
          id: 'btn-urg-continuar-prog',
          label: 'Continuar con turno programado',
          variant: 'primary',
          action: () => handleStartSolicitud(),
        },
        {
          id: 'btn-urg-volver-menu',
          label: 'Volver al menú principal',
          variant: 'outline',
          action: () => showMainMenu(),
        },
      ]
    );
  };

  const showInternacionResponse = () => {
    addBotMessage(
      'ℹ️ Las internaciones se gestionan por un circuito diferente al sistema de turnos ambulatorios.\n\nPor favor comunicate telefónicamente con la oficina de Admisión y Gestión de Camas del hospital al (0379) 442-1234 o concurrí personalmente con la orden médica correspondiente.',
      'INTERNACION_INFO',
      [
        {
          id: 'btn-int-volver-menu',
          label: 'Volver al menú principal',
          variant: 'outline',
          action: () => showMainMenu(),
        },
      ]
    );
  };

  // ============================================================================
  // NATURAL LANGUAGE USER INPUT PROCESSOR
  // ============================================================================
  const handleProcessUserMessage = (text: string) => {
    const lower = text.toLowerCase().trim();

    // 1. Urgencia detector
    if (
      lower.includes('urgencia') ||
      lower.includes('emergencia') ||
      lower.includes('guardia') ||
      lower.includes('urgente') ||
      lower.includes('grave')
    ) {
      showUrgenciaResponse();
      return;
    }

    // 2. Internación detector
    if (lower.includes('internacion') || lower.includes('internación') || lower.includes('cama')) {
      showInternacionResponse();
      return;
    }

    // 3. Cancelar detector
    if (
      lower.includes('cancelar') ||
      lower.includes('no vamos a poder ir') ||
      lower.includes('no puedo ir') ||
      lower.includes('anular')
    ) {
      handleStartCancelar();
      return;
    }

    // 4. Reprogramar detector
    if (lower.includes('reprogramar') || lower.includes('cambiar turno') || lower.includes('cambiar el turno')) {
      handleStartReprogramar();
      return;
    }

    // 5. Consultar detector
    if (
      lower.includes('consultar') ||
      lower.includes('mis turnos') ||
      lower.includes('cuando tiene turno') ||
      lower.includes('cuándo tiene turno') ||
      lower.includes('que turnos tengo') ||
      lower.includes('qué turnos tengo')
    ) {
      if (lower.includes('lucas')) {
        handleStartConsulta('Lucas');
      } else if (lower.includes('sofia') || lower.includes('sofía')) {
        handleStartConsulta('Sofía');
      } else if (lower.includes('martin') || lower.includes('martín')) {
        handleStartConsulta('Martín');
      } else {
        handleStartConsulta();
      }
      return;
    }

    // 6. Context-aware step matching
    if (currentStep === 'PERSONA_A_CARGO') {
      const match = personasACargo.find((rel) => {
        const p = rel.paciente || rel;
        const primerNombre = (p.nombre || '').toLowerCase().split(' ')[0];
        return primerNombre && lower.includes(primerNombre);
      });
      if (match) {
        const p = match.paciente || match;
        handleSelectPersona(p.nombre, p.id, p.edad);
        return;
      }
    }

    if (currentStep === 'PREFERENCIA_HORARIA') {
      if (lower.includes('mañana') || lower.includes('temprano') || lower.includes('manana')) {
        handleSelectPreferenciaHoraria('manana', 'Mañana (antes de las 13:00 hs)');
        return;
      }
      if (lower.includes('tarde') || lower.includes('despues de las') || lower.includes('después')) {
        handleSelectPreferenciaHoraria('tarde', 'Tarde (desde las 13:00 hs)');
        return;
      }
      if (lower.includes('igual') || lower.includes('cualquiera') || lower.includes('ninguna')) {
        handleSelectPreferenciaHoraria('cualquiera', 'Me da igual');
        return;
      }
    }

    if (currentStep === 'SERVICIO') {
      for (const s of specialties) {
        if (lower.includes(s.nombre.toLowerCase())) {
          handleSelectServicio(s.id, s.nombre, s.tipoAgenda, s.tipoPrestacion);
          return;
        }
      }
      if (lower.includes('trauma')) {
        const s = specialties.find((sp) => sp.nombre.toLowerCase().includes('trauma'));
        if (s) {
          handleSelectServicio(s.id, s.nombre, s.tipoAgenda, s.tipoPrestacion);
          return;
        }
      }
      if (lower.includes('cardio')) {
        const s = specialties.find((sp) => sp.nombre.toLowerCase().includes('cardio'));
        if (s) {
          handleSelectServicio(s.id, s.nombre, s.tipoAgenda, s.tipoPrestacion);
          return;
        }
      }
      if (lower.includes('neuro')) {
        const s = specialties.find((sp) => sp.nombre.toLowerCase().includes('neuro'));
        if (s) {
          handleSelectServicio(s.id, s.nombre, s.tipoAgenda, s.tipoPrestacion);
          return;
        }
      }
    }

    if (currentStep === 'SELECCION_DIA') {
      (async () => {
        const servicioNombre = bookingStateRef.current.servicioNombre || '';
        const tipoAgenda = bookingStateRef.current.tipoAgenda || 'PROFESIONAL';
        const prefHoraria = bookingStateRef.current.preferenciaHoraria || 'manana';
        const realSlots = await fetchRealSlots(servicioNombre, tipoAgenda);
        const eligibleDays = groupSlotsByDay(realSlots, prefHoraria);
        if (eligibleDays.length === 0) return;

        const byWeekday = eligibleDays.find((d) => d.label.toLowerCase().includes(lower.trim()));
        const chosen = byWeekday || (lower.includes('primer') || lower.includes('igual') ? eligibleDays[0] : undefined);
        if (chosen) {
          handleSelectDia(chosen.date, chosen.label, chosen.shortLabel);
        }
      })();
      return;
    }

    if (currentStep === 'SELECCION_HORARIO') {
      (async () => {
        const fecha = bookingStateRef.current.fechaSeleccionada;
        if (!fecha) return;
        const horaMatch = ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17']
          .flatMap((h) => [`${h}:00`, `${h}:15`, `${h}:30`, `${h}:45`])
          .find((h) => lower.includes(h));
        if (horaMatch) {
          await handleSelectHora(horaMatch);
        }
      })();
      return;
    }

    if (currentStep === 'RESUMEN') {
      if (lower.includes('confirmar') || lower.includes('si') || lower.includes('sí') || lower.includes('dale')) {
        handleFinalConfirmBooking();
        return;
      }
    }

    // Default: start solicitation or offer menu
    if (lower.includes('turno') || lower.includes('hola') || lower.includes('buenas')) {
      handleStartSolicitud();
      return;
    }

    // Fallback response with clean menu
    addBotMessage(
      'Podés elegir una de las opciones rápidas en pantalla o escribir lo que necesitás (por ejemplo: "Solicitar turno", "Consultar mis turnos" o "Cancelar turno").',
      'MENU_PRINCIPAL',
      [
        {
          id: 'btn-fb-solicitar',
          label: 'Solicitar turno',
          variant: 'primary',
          action: () => handleStartSolicitud(),
        },
        {
          id: 'btn-fb-consultar',
          label: 'Consultar turnos',
          variant: 'outline',
          action: () => handleStartConsulta(),
        },
        {
          id: 'btn-fb-cancelar',
          label: 'Cancelar turno',
          variant: 'danger',
          action: () => handleStartCancelar(),
        },
      ]
    );
  };

  const handleSendMessage = () => {
    const text = inputVal.trim();
    if (!text) return;

    addUserMessage(text);
    setInputVal('');
    handleProcessUserMessage(text);
  };

  // ============================================================================
  // ONE-CLICK DEMO RUNNER (FOR JURY PRESENTATION)
  // ============================================================================
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Recorre el flujo guiado con datos 100% reales (persona a cargo, servicio
  // y disponibilidad real de agenda_slots) — no hay fecha/hora/profesional
  // hardcodeados. Elegimos "Sofía" y "Traumatología" cuando existen en los
  // datos reales; si no, usamos la primera persona/servicio disponible.
  const runCanonicalDemoWalkthrough = async () => {
    initConversation();
    await sleep(600);

    handleStartSolicitud();
    await sleep(800);

    const sofia = personasACargo.find((p) => (p.paciente?.nombre || p.nombre || '').toLowerCase().includes('sofía') || (p.paciente?.nombre || p.nombre || '').toLowerCase().includes('sofia'));
    const persona = sofia || personasACargo[0];
    if (!persona) {
      addBotMessage('No hay personas a cargo cargadas para este tutor todavía.', 'MENU_PRINCIPAL', []);
      return;
    }
    const p = persona.paciente || persona;
    handleSelectPersona(p.nombre, p.id, p.edad);
    await sleep(800);

    handleSelectPreferenciaHoraria('manana', 'Mañana (antes de las 13:00 hs)');
    await sleep(800);

    const trauma = specialties.find((sp) => sp.nombre.toLowerCase().includes('trauma'));
    const servicio = trauma || specialties[0];
    if (!servicio) {
      addBotMessage('No hay servicios cargados en el sistema todavía.', 'MENU_PRINCIPAL', []);
      return;
    }
    handleSelectServicio(servicio.id, servicio.nombre, servicio.tipoAgenda, servicio.tipoPrestacion);
    await sleep(800);

    // Disponibilidad real: primer día hábil con cupos y su primer horario.
    // El profesional se asigna automáticamente (reparto equitativo).
    const realSlots = await fetchRealSlots(servicio.nombre, servicio.tipoAgenda);
    const eligibleDays = groupSlotsByDay(realSlots, 'manana');
    if (eligibleDays.length === 0) {
      addBotMessage(`No hay disponibilidad real cargada para ${servicio.nombre} en este momento (revisá el seed de Supabase).`, 'MENU_PRINCIPAL', []);
      return;
    }

    const firstDay = eligibleDays[0];
    handleSelectDia(firstDay.date, firstDay.label, firstDay.shortLabel);
    await sleep(800);

    await handleSelectHora(firstDay.slots[0].hora);
  };

  if (!isWhatsAppOpen) return null;

  return (
    <div
      id="whatsapp-simulator-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="whatsapp-simulator-container"
        className={`flex flex-col bg-[#efeae2] shadow-2xl overflow-hidden border border-stone-300 transition-all duration-300 ${
          isMaximized
            ? 'w-full h-full rounded-none'
            : 'w-full max-w-[480px] h-[92vh] max-h-[780px] rounded-2xl'
        }`}
      >
        {/* TOP SYSTEM BAR & JURY SHORTCUTS */}
        <div className="bg-[#054c44] text-white px-3 py-1.5 flex items-center justify-between text-xs border-b border-[#043e37]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-emerald-100">Conectado a agenda central</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              id="btn-run-canonical-demo"
              onClick={runCanonicalDemoWalkthrough}
              title="Ejecuta la demo canónica de punta a punta (Sofía • Traumatología • 10:30 hs)"
              className="px-2 py-0.5 rounded bg-emerald-700/80 hover:bg-emerald-600 text-[11px] text-white flex items-center gap-1 transition-colors font-medium cursor-pointer"
            >
              <Play className="w-3 h-3 text-emerald-300 fill-emerald-300" />
              Demo: Sofía • Trauma
            </button>
            <button
              id="btn-switch-agenda-direct"
              onClick={() => {
                setRole('administrativo');
                closeWhatsAppSimulator();
              }}
              title="Cambiar al rol Secretario y abrir la agenda administrativa"
              className="px-2 py-0.5 rounded bg-stone-800/80 hover:bg-stone-700 text-[11px] text-stone-200 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3 h-3" />
              Ver en Agenda
            </button>
          </div>
        </div>

        {/* WHATSAPP MAIN HEADER */}
        <div className="bg-[#075e54] text-white px-3.5 py-2.5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <button
              id="btn-whatsapp-header-back"
              onClick={() => {
                if (currentStep !== 'MENU_PRINCIPAL') {
                  initConversation();
                } else {
                  closeWhatsAppSimulator();
                }
              }}
              className="p-1 -ml-1 text-teal-100 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              title="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Hospital Avatar */}
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-teal-800 border border-teal-600 flex items-center justify-center font-bold text-white shadow-inner">
                <span className="text-sm font-semibold">JP2</span>
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#075e54]" />
            </div>

            {/* Contact Title & Subtitle */}
            <div className="flex flex-col">
              <h3 className="font-semibold text-sm leading-tight text-white flex items-center gap-1.5">
                Asistente de Turnos
              </h3>
              <p className="text-[11px] text-teal-100 leading-tight">
                Hospital Pediátrico Juan Pablo II • <span className="text-emerald-300 font-medium">En línea</span>
              </p>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-1 text-teal-100">
            <button
              id="btn-whatsapp-reset"
              onClick={initConversation}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
              title="Reiniciar conversación"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              id="btn-whatsapp-maximize"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors hidden sm:block"
              title={isMaximized ? 'Restaurar' : 'Maximizar'}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              id="btn-whatsapp-close"
              onClick={closeWhatsAppSimulator}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
              title="Cerrar simulador"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TUTOR IDENTIFICATION STRIP */}
        <div className="bg-[#e1ded7] text-stone-700 px-3 py-1.5 text-xs flex items-center justify-between border-b border-stone-300/80">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-stone-600" />
            <span>
              Tutor: <strong className="text-stone-900">{currentTutor.nombre} {currentTutor.apellido}</strong> (DNI {currentTutor.dni})
            </span>
          </div>
          <span className="text-stone-500 font-medium">{currentTutor.localidad}</span>
        </div>

        {/* CHAT MESSAGES CANVAS */}
        <div
          id="whatsapp-messages-viewport"
          className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 relative select-text"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.3) 0%, rgba(239,234,226,1) 100%)',
          }}
        >
          {messages.map((msg) => {
            const isBot = msg.sender === 'bot';
            const isSystem = msg.sender === 'system';
            const isUser = msg.sender === 'user';
            const isActiveMessage = msg.id === activeMessageId;

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-1">
                  <div className="bg-[#ffeecd] text-stone-700 border border-[#e8dcb9] text-[11px] px-3 py-1.5 rounded-lg shadow-2xs max-w-[90%] text-center leading-relaxed font-medium">
                    {msg.text}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
              >
                {/* Message Bubble */}
                <div
                  className={`max-w-[86%] sm:max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-xs relative leading-relaxed ${
                    isUser
                      ? 'bg-[#d9fdd3] text-stone-900 rounded-tr-none'
                      : 'bg-white text-stone-900 rounded-tl-none border border-stone-200/60'
                  }`}
                >
                  <p className="whitespace-pre-line text-[13.5px]">{msg.text}</p>

                  {/* Summary Card Embedded in Message */}
                  {msg.card?.type === 'summary' && (
                    <div className="mt-2.5 pt-2 border-t border-stone-200 bg-stone-50/80 rounded-md p-2.5 text-xs text-stone-800 space-y-1 font-mono">
                      <div className="text-[11px] font-bold text-teal-800 uppercase tracking-wider pb-1 border-b border-stone-200 flex items-center justify-between font-sans">
                        <span>Resumen del Turno</span>
                        <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded">Canal: WhatsApp</span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="text-stone-500">PACIENTE:</span>
                        <span className="font-semibold text-stone-900">{msg.card.data.pacienteNombre}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">SERVICIO:</span>
                        <span className="font-semibold text-stone-900">{msg.card.data.servicioNombre}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">PROFESIONAL:</span>
                        <span className="font-semibold text-stone-900">{msg.card.data.profesional}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">FECHA:</span>
                        <span className="font-semibold text-stone-900">{msg.card.data.fechaLabel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">HORA:</span>
                        <span className="font-bold text-emerald-700 text-[13px]">{msg.card.data.hora} hs</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">TUTOR:</span>
                        <span className="font-semibold text-stone-900">{msg.card.data.tutor}</span>
                      </div>
                    </div>
                  )}

                  {/* Confirmed Ticket Card Embedded in Message */}
                  {msg.card?.type === 'ticket' && (
                    <div className="mt-2.5 pt-2.5 border-t border-emerald-200 bg-emerald-50/80 rounded-lg p-2.5 text-xs text-stone-800 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-800 text-sm pb-1 border-b border-emerald-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>TURNO CONFIRMADO</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 text-[12px]">
                        <div>
                          <span className="text-stone-500 block text-[10px]">PACIENTE</span>
                          <span className="font-semibold text-stone-900">{msg.card.data.paciente}</span>
                        </div>
                        <div>
                          <span className="text-stone-500 block text-[10px]">CÓDIGO DE TURNO</span>
                          <span className="font-mono font-bold text-teal-800 bg-teal-100 px-1.5 py-0.5 rounded text-[11px]">
                            {msg.card.data.codigo}
                          </span>
                        </div>
                        <div>
                          <span className="text-stone-500 block text-[10px]">SERVICIO</span>
                          <span className="font-medium text-stone-800">{msg.card.data.servicio}</span>
                        </div>
                        <div>
                          <span className="text-stone-500 block text-[10px]">PROFESIONAL</span>
                          <span className="font-medium text-stone-800">{msg.card.data.profesional}</span>
                        </div>
                        <div>
                          <span className="text-stone-500 block text-[10px]">FECHA Y HORA</span>
                          <span className="font-bold text-stone-900">
                            {msg.card.data.fechaLabel} • {msg.card.data.hora} hs
                          </span>
                        </div>
                        <div>
                          <span className="text-stone-500 block text-[10px]">ESTADO</span>
                          <span className="font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded text-[10.5px]">
                            {msg.card.data.estado}
                          </span>
                        </div>
                      </div>
                      <div className="pt-1 text-[11px] text-stone-600 border-t border-emerald-200/60 flex items-center justify-between">
                        <span>Origen: <strong>{msg.card.data.origen}</strong></span>
                        <span>Consultorio: <strong>{msg.card.data.consultorio || '14'}</strong></span>
                      </div>
                    </div>
                  )}

                  {/* Waitlist Card */}
                  {msg.card?.type === 'waitlist' && (
                    <div className="mt-2.5 pt-2 border-t border-amber-200 bg-amber-50 rounded-lg p-2.5 text-xs text-amber-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900">
                        <Clock className="w-4 h-4 text-amber-700" />
                        <span>REGISTRADO EN LISTA DE ESPERA</span>
                      </div>
                      <p className="text-[11.5px] text-amber-800">
                        Paciente: <strong>{msg.card.data.paciente}</strong> en <strong>{msg.card.data.servicio}</strong>.
                      </p>
                      <p className="text-[11px] text-amber-700">
                        Posición: <strong>#{msg.card.data.posicion}</strong> • Canal: <strong>{msg.card.data.origen}</strong>
                      </p>
                    </div>
                  )}

                  {/* Appointments List Card */}
                  {msg.card?.type === 'appointments_list' && (
                    <div className="mt-2.5 pt-2 border-t border-stone-200 space-y-2">
                      {msg.card.data.appointments.map((apt: Appointment, idx: number) => (
                        <div
                          key={apt.id}
                          className="bg-stone-50 border border-stone-200 rounded p-2 text-xs space-y-0.5"
                        >
                          <div className="flex items-center justify-between font-bold text-stone-900">
                            <span>{apt.pacienteNombre} ({apt.pacienteEdad} años)</span>
                            <span className="text-teal-700 bg-teal-50 px-1 py-0.5 rounded text-[10px] font-mono">
                              {apt.codigo}
                            </span>
                          </div>
                          <div className="text-stone-700">
                            • {apt.especialidad} — {apt.profesional}
                          </div>
                          <div className="text-stone-600 flex items-center justify-between pt-0.5">
                            <span>📅 {apt.fecha} a las <strong>{apt.hora} hs</strong></span>
                            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1 rounded">
                              {apt.estado}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Timestamp & Read Receipt */}
                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-stone-500 select-none">
                    <span>{msg.timestamp}</span>
                    {isUser && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
                  </div>
                </div>

                {/* Interactive Action Buttons Attached to Message */}
                {msg.buttons && msg.buttons.length > 0 && (
                  <div className="w-full max-w-[86%] sm:max-w-[80%] flex flex-col gap-1.5 pt-1">
                    {msg.buttons.map((btn) => {
                      const isDisabled = !isActiveMessage;

                      let styleClass =
                        'bg-white hover:bg-stone-50 text-teal-800 border-stone-300 font-medium shadow-2xs';
                      if (btn.variant === 'primary') {
                        styleClass =
                          'bg-teal-700 hover:bg-teal-800 text-white border-teal-700 font-semibold shadow-xs';
                      } else if (btn.variant === 'danger') {
                        styleClass =
                          'bg-white hover:bg-red-50 text-red-700 border-red-200 hover:border-red-300';
                      } else if (btn.variant === 'warning') {
                        styleClass =
                          'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 font-medium';
                      }

                      if (isDisabled) {
                        styleClass =
                          'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed opacity-60';
                      }

                      return (
                        <button
                          key={btn.id}
                          id={btn.id}
                          disabled={isDisabled}
                          onClick={() => {
                            if (!isDisabled) {
                              btn.action();
                            }
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg border text-xs sm:text-[13px] flex items-center justify-between transition-all ${styleClass}`}
                        >
                          <div className="flex flex-col pr-2">
                            <span className="leading-snug">{btn.label}</span>
                            {btn.sublabel && (
                              <span
                                className={`text-[10.5px] leading-tight ${
                                  btn.variant === 'primary' ? 'text-teal-100' : 'text-stone-500'
                                }`}
                              >
                                {btn.sublabel}
                              </span>
                            )}
                          </div>
                          {btn.badge ? (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                                btn.variant === 'primary'
                                  ? 'bg-teal-800 text-teal-100'
                                  : 'bg-stone-200 text-stone-700'
                              }`}
                            >
                              {btn.badge}
                            </span>
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg px-3 py-2 w-20 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-stone-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 rounded-full bg-stone-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 rounded-full bg-stone-400 animate-bounce" />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* BOTTOM INPUT BAR */}
        <div className="bg-[#f0f2f5] px-3 py-2.5 border-t border-stone-300 flex items-center gap-2">
          <input
            ref={inputRef}
            id="whatsapp-user-input"
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
            placeholder="Escribí un mensaje..."
            className="flex-1 bg-white text-stone-900 px-3.5 py-2 rounded-full text-xs sm:text-sm border border-stone-300 focus:outline-none focus:ring-1 focus:ring-teal-600 shadow-inner"
          />

          <button
            id="btn-whatsapp-send-message"
            onClick={handleSendMessage}
            disabled={!inputVal.trim()}
            className={`p-2.5 rounded-full text-white transition-all ${
              inputVal.trim()
                ? 'bg-[#00a884] hover:bg-[#008f6f] cursor-pointer shadow-md'
                : 'bg-stone-300 text-stone-400 cursor-not-allowed'
            }`}
            title="Enviar mensaje"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
