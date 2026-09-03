import React, { useState, useMemo, useEffect } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { TipoAgenda, TipoPrestacion, Localidad, Appointment } from '../../types';
import { AvailableSlot, filterByPreferenciaHoraria, getSlotsDisponibles, maxBookingDate } from '../../services/agenda.service';
import { realProfesionalId } from '../../services/professionals.service';
import {
  User,
  Clock,
  Stethoscope,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  UserCheck,
  Building2,
  CalendarCheck,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Plus,
  Info,
  Layers,
  Phone,
  ShieldCheck,
  Check,
} from 'lucide-react';

export type WizardStep =
  | 'PACIENTE'
  | 'HORARIO'
  | 'SERVICIO'
  | 'PROFESIONAL'
  | 'DIA'
  | 'TURNO'
  | 'RESUMEN'
  | 'CONFIRMADO'
  | 'CONFIRMAR_LISTA_ESPERA'
  | 'EXITO_LISTA_ESPERA';

interface Props {
  onCancel: () => void;
  onCompleted: (appointmentCode: string) => void;
  onGoToWaitlist?: () => void;
  onOpenAddPersona?: () => void;
}

export const WebAppointmentWizard: React.FC<Props> = ({
  onCancel,
  onCompleted,
  onGoToWaitlist,
  onOpenAddPersona,
}) => {
  const {
    currentTutor,
    getPersonasACargo,
    doctors,
    specialties,
    bookAppointment,
    addToWaitlist,
    validatePediatricAge,
    calculateAge,
  } = useHospital();

  const personasACargo = getPersonasACargo(currentTutor?.id);

  // Wizard Navigation Step
  const [currentStep, setCurrentStep] = useState<WizardStep>('PACIENTE');

  // Selected State
  const [pacienteId, setPacienteId] = useState<string | null>(null);
  const [preferenciaHoraria, setPreferenciaHoraria] = useState<'manana' | 'tarde' | 'cualquiera' | null>(null);
  const [servicioId, setServicioId] = useState<string | null>(null);
  const [profesionalId, setProfesionalId] = useState<string | null>(null); // null means "Me da igual" or shared service
  const [isMeDaIgualProfesional, setIsMeDaIgualProfesional] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(null);
  const [horaSeleccionada, setHoraSeleccionada] = useState<string | null>(null);
  const [slotProfesionalNombre, setSlotProfesionalNombre] = useState<string | null>(null);
  const [slotConsultorio, setSlotConsultorio] = useState<string | null>(null);

  // Collision error state
  const [collisionError, setCollisionError] = useState<string | null>(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);
  const [waitlistSuccessInfo, setWaitlistSuccessInfo] = useState<{
    pacienteNombre: string;
    servicio: string;
    posicion: number;
  } | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [waitlistDiaDeseadoLabel, setWaitlistDiaDeseadoLabel] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Slots reales traídos de agenda_slots (Supabase) para el servicio/profesional elegido
  const [rawSlots, setRawSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  // Resolved Data Helpers
  const selectedPatientRel = useMemo(() => {
    return personasACargo.find((p) => (p.paciente?.id || p.id) === pacienteId);
  }, [personasACargo, pacienteId]);

  const selectedPatient = selectedPatientRel?.paciente || selectedPatientRel;

  const selectedServicio = useMemo(() => {
    return specialties.find((s) => s.id === servicioId);
  }, [specialties, servicioId]);

  const selectedDoctor = useMemo(() => {
    if (!profesionalId) return null;
    return doctors.find((d) => d.id === profesionalId);
  }, [doctors, profesionalId]);

  // Available doctors for the selected service
  const serviceDoctors = useMemo(() => {
    if (!selectedServicio) return [];
    return doctors.filter(
      (d) =>
        d.especialidad.toLowerCase() === selectedServicio.nombre.toLowerCase() && !d.ausente
    );
  }, [doctors, selectedServicio]);

  // ============================================================================
  // DISPONIBILIDAD REAL: consulta agenda_slots en Supabase (no hay horarios
  // hardcodeados). Límite de hasta 30 días de anticipación (agenda.service).
  // ============================================================================

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const monthNames = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  const shortDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const shortMonths = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(`${dateStr}T00:00:00`);
    const dow = d.getDay();
    return {
      label: `${dayNames[dow]} ${d.getDate()} de ${monthNames[d.getMonth()]}`,
      shortLabel: `${shortDays[dow]} ${d.getDate()} ${shortMonths[d.getMonth()]}`,
    };
  };

  // Trae los slots DISPONIBLE reales apenas se conoce el servicio y el
  // profesional preferido (o "me da igual").
  useEffect(() => {
    let cancelled = false;
    if (!selectedServicio) {
      setRawSlots([]);
      return;
    }

    setLoadingSlots(true);
    setSlotsError(null);

    const profesionalRealId =
      selectedServicio.tipoAgenda === 'PROFESIONAL' && profesionalId && !isMeDaIgualProfesional
        ? realProfesionalId(profesionalId)
        : undefined;

    getSlotsDisponibles({
      servicioId: selectedServicio.id,
      profesionalId: profesionalRealId,
      tipoAgenda: selectedServicio.tipoAgenda,
    })
      .then((slots) => {
        if (!cancelled) setRawSlots(slots);
      })
      .catch((err) => {
        if (!cancelled) setSlotsError(err?.message || 'No se pudo consultar la agenda. Intentá nuevamente.');
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedServicio, profesionalId, isMeDaIgualProfesional]);

  const slotsForPreferencia = useMemo(
    () => filterByPreferenciaHoraria(rawSlots, preferenciaHoraria || 'cualquiera'),
    [rawSlots, preferenciaHoraria]
  );

  // Días con al menos 1 slot disponible que cumple la preferencia horaria
  const eligibleDays = useMemo(() => {
    const byDate = new Map<string, AvailableSlot[]>();
    slotsForPreferencia.forEach((slot) => {
      const arr = byDate.get(slot.fecha) || [];
      arr.push(slot);
      byDate.set(slot.fecha, arr);
    });

    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, slots]) => {
        const { label, shortLabel } = formatDateLabel(date);
        return { date, label, shortLabel, availableSlotsCount: slots.length, slots };
      });
  }, [slotsForPreferencia]);

  // Todos los días hábiles dentro de la ventana de 30 días, tengan o no
  // disponibilidad real. Los que no tienen cupos se muestran igual (en
  // naranja) para poder sumarse directo a la lista de espera de ese día.
  const allCandidateDays = useMemo(() => {
    const byDate = new Map<string, (typeof eligibleDays)[number]>(eligibleDays.map((d) => [d.date, d]));
    const list: Array<{ date: string; label: string; shortLabel: string; availableSlotsCount: number }> = [];

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(`${maxBookingDate()}T00:00:00`);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      if (dow === 0 || dow === 6) continue; // sin fin de semana
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const existing = byDate.get(dateStr);
      if (existing) {
        list.push(existing);
      } else {
        const { label, shortLabel } = formatDateLabel(dateStr);
        list.push({ date: dateStr, label, shortLabel, availableSlotsCount: 0 });
      }
    }
    return list;
  }, [eligibleDays]);

  // Slots disponibles para el día seleccionado
  const availableSlotsForSelectedDate = useMemo(() => {
    if (!fechaSeleccionada) return [];
    return slotsForPreferencia
      .filter((s) => s.fecha === fechaSeleccionada)
      .sort((a, b) => a.hora.localeCompare(b.hora));
  }, [fechaSeleccionada, slotsForPreferencia]);

  const selectedDateLabel = useMemo(() => {
    if (!fechaSeleccionada) return '';
    return formatDateLabel(fechaSeleccionada).label;
  }, [fechaSeleccionada]);

  // ============================================================================
  // STEP STEP NAVIGATION & MODIFICATION RULES (INVALIDATING DOWNSTREAM CHOICES)
  // ============================================================================

  const handleSelectPaciente = (id: string, edad?: number) => {
    // Validate pediatric age
    const validation = validatePediatricAge(edad !== undefined ? edad : 8);
    if (!validation.valid) {
      alert(`El paciente no cumple el rango de atención pediátrica: ${validation.error}`);
      return;
    }

    setPacienteId(id);
    setCurrentStep('HORARIO');
  };

  const handleSelectPreferenciaHoraria = (pref: 'manana' | 'tarde' | 'cualquiera') => {
    setPreferenciaHoraria(pref);
    // Invalidate downstream day & slot choices
    setFechaSeleccionada(null);
    setHoraSeleccionada(null);
    setSlotProfesionalNombre(null);
    setCurrentStep('SERVICIO');
  };

  const handleSelectServicio = (id: string) => {
    setServicioId(id);
    // Invalidate downstream choices
    setProfesionalId(null);
    setIsMeDaIgualProfesional(false);
    setFechaSeleccionada(null);
    setHoraSeleccionada(null);
    setSlotProfesionalNombre(null);

    const s = specialties.find((spec) => spec.id === id);
    if (s?.tipoAgenda === 'SERVICIO') {
      // Shared agenda
      setProfesionalId(null);
      setIsMeDaIgualProfesional(true);
    }
    setCurrentStep('PROFESIONAL');
  };

  const handleSelectProfesional = (docId: string | null, meDaIgual: boolean = false) => {
    setProfesionalId(docId);
    setIsMeDaIgualProfesional(meDaIgual);
    // Invalidate downstream day & slot choices
    setFechaSeleccionada(null);
    setHoraSeleccionada(null);
    setSlotProfesionalNombre(null);
    setCurrentStep('DIA');
  };

  const handleSelectDia = (dateStr: string) => {
    setFechaSeleccionada(dateStr);
    setHoraSeleccionada(null);
    setSlotProfesionalNombre(null);
    setWaitlistDiaDeseadoLabel(null);
    setCurrentStep('TURNO');
  };

  // Día sin cupos: en vez de reservar, se anota directo en lista de espera.
  const handleSelectDiaSinDisponibilidad = (dateStr: string, dateLabel: string) => {
    setFechaSeleccionada(dateStr);
    setWaitlistDiaDeseadoLabel(dateLabel);
    setCurrentStep('CONFIRMAR_LISTA_ESPERA');
  };

  const handleSelectSlot = (slot: AvailableSlot) => {
    setHoraSeleccionada(slot.hora);
    setSlotProfesionalNombre(slot.profesional);
    setSlotConsultorio(slot.consultorio);
    setSelectedSlotId(slot.slotId);
    setCollisionError(null);
    setCurrentStep('RESUMEN');
  };

  // Back button handler
  const handleGoBack = () => {
    switch (currentStep) {
      case 'HORARIO':
        setCurrentStep('PACIENTE');
        break;
      case 'SERVICIO':
        setCurrentStep('HORARIO');
        break;
      case 'PROFESIONAL':
        setCurrentStep('SERVICIO');
        break;
      case 'DIA':
        setCurrentStep('PROFESIONAL');
        break;
      case 'TURNO':
        setCurrentStep('DIA');
        break;
      case 'RESUMEN':
        setCurrentStep('TURNO');
        break;
      case 'CONFIRMAR_LISTA_ESPERA':
        setCurrentStep('TURNO');
        break;
      default:
        onCancel();
        break;
    }
  };

  // Confirm appointment: la atomicidad la garantiza reservar_turno() en Supabase.
  const handleConfirmAppointment = async () => {
    if (!selectedPatient || !selectedServicio || !fechaSeleccionada || !horaSeleccionada || !selectedSlotId) {
      return;
    }

    setSubmitting(true);
    setCollisionError(null);
    try {
      const result = await bookAppointment({
        slotId: selectedSlotId,
        pacienteId: selectedPatient.id,
        tutorSolicitanteId: currentTutor?.id,
        origenCanal: 'web',
        motivoResumido: `Solicitud Web de Turno - ${selectedServicio.nombre}`,
      });

      if (result.success && result.appointment) {
        setConfirmedAppointment(result.appointment);
        setCurrentStep('CONFIRMADO');
      } else {
        setCollisionError(result.error || 'Este horario acaba de ser reservado. Elegí otra opción disponible.');
        setSelectedSlotId(null);
        setHoraSeleccionada(null);
        // refresca disponibilidad real para que el usuario vea otras opciones
        setCurrentStep('TURNO');
      }
    } catch (err: any) {
      setCollisionError(err?.message || 'No se pudo confirmar el turno. Por favor intentá nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm waitlist entry
  const handleConfirmWaitlist = async () => {
    if (!selectedPatient || !selectedServicio) return;

    setSubmitting(true);
    try {
      const entry = await addToWaitlist({
        pacienteId: selectedPatient.id,
        tutorId: currentTutor?.id,
        especialidad: selectedServicio.nombre,
        profesionalPreferidoId:
          selectedServicio.tipoAgenda === 'PROFESIONAL' && profesionalId && !isMeDaIgualProfesional
            ? realProfesionalId(profesionalId)
            : undefined,
        preferenciaHorario: preferenciaHoraria || 'cualquiera',
        localidad: selectedPatient.localidad || currentTutor?.localidad || 'Mercedes',
        origenCanal: 'web',
      });

      setWaitlistSuccessInfo({
        pacienteNombre: selectedPatient.nombre,
        servicio: selectedServicio.nombre,
        posicion: entry.posicion || 1,
      });
      setCurrentStep('EXITO_LISTA_ESPERA');
    } catch (err: any) {
      setCollisionError(err?.message || 'No se pudo registrar en la lista de espera. Intentá nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Step Number for progress indicator
  const getStepNumber = () => {
    switch (currentStep) {
      case 'PACIENTE':
        return 1;
      case 'HORARIO':
        return 2;
      case 'SERVICIO':
        return 3;
      case 'PROFESIONAL':
        return 4;
      case 'DIA':
        return 5;
      case 'TURNO':
        return 6;
      case 'RESUMEN':
        return 7;
      default:
        return 7;
    }
  };

  const stepsList = [
    { num: 1, label: 'Paciente' },
    { num: 2, label: 'Horario' },
    { num: 3, label: 'Servicio' },
    { num: 4, label: 'Profesional' },
    { num: 5, label: 'Día' },
    { num: 6, label: 'Turno' },
    { num: 7, label: 'Resumen' },
  ];

  const currentStepNum = getStepNumber();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header with Title and Cancel button */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold border border-teal-200/70">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">Solicitar nuevo turno</h2>
              <p className="text-xs text-stone-500">
                Reserva web paso a paso conectada a la agenda central del hospital
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 text-[11px] font-semibold border border-stone-200">
              Canal: Web Oficial
            </span>
            <button
              onClick={onCancel}
              className="text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition-colors text-xs font-semibold"
              title="Cancelar solicitud"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* PROGRESS INDICATOR (Item 2 of user specs) */}
        {currentStep !== 'CONFIRMADO' && currentStep !== 'EXITO_LISTA_ESPERA' && (
          <div className="space-y-3 pt-2 border-t border-stone-100">
            {/* Step navigation dots / chips */}
            <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1 text-xs">
              {stepsList.map((st) => {
                const isCurrent = st.num === currentStepNum;
                const isCompleted = st.num < currentStepNum;
                return (
                  <div
                    key={st.num}
                    className="flex items-center gap-1 shrink-0"
                  >
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                        isCurrent
                          ? 'bg-teal-700 text-white shadow-xs'
                          : isCompleted
                          ? 'bg-teal-50 text-teal-800 border border-teal-200/60'
                          : 'bg-stone-100 text-stone-400'
                      }`}
                    >
                      <span>{st.num}.</span>
                      <span>{st.label}</span>
                      {isCompleted && <Check className="w-3 h-3 text-teal-700" />}
                    </div>
                    {st.num < 7 && <span className="text-stone-300 mx-0.5">›</span>}
                  </div>
                );
              })}
            </div>

            {/* Visual Progress Line */}
            <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-teal-700 h-full transition-all duration-300 rounded-full"
                style={{ width: `${(currentStepNum / 7) * 100}%` }}
              />
            </div>

            {/* Back Button on every step except the first */}
            {currentStepNum > 1 && (
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleGoBack}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-xl hover:bg-stone-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>← Volver al paso anterior</span>
                </button>

                <span className="text-[11px] text-stone-400 font-medium">
                  Paso {currentStepNum} de 7
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* PASO 1 — PERSONA A CARGO */}
      {/* ==================================================================== */}
      {currentStep === 'PACIENTE' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-6">
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-stone-900">
              ¿Para quién necesitás el turno?
            </h3>
            <p className="text-xs sm:text-sm text-stone-500">
              Seleccioná una de las personas a tu cargo.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {personasACargo.map((rel) => {
              const p = rel.paciente || rel;
              const pId = p.id;
              const pNombre = p.nombre;
              const pEdad = p.edad !== undefined ? p.edad : 8;
              const pDni = p.dni;
              const pRelacion = rel.relacion || 'Persona a cargo';
              const pLocalidad = p.localidad || 'Mercedes';

              // Validation: greater than 1 month and up to 15 years inclusive
              const isEligible = validatePediatricAge(pEdad, p.edadMeses).valid;
              const isSelected = pacienteId === pId;

              return (
                <div
                  key={pId}
                  onClick={() => {
                    if (isEligible) {
                      handleSelectPaciente(pId, pEdad);
                    }
                  }}
                  className={`rounded-2xl p-5 border-2 text-left transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-teal-700 bg-teal-50/40 shadow-xs'
                      : isEligible
                      ? 'border-stone-200 hover:border-teal-600 bg-white hover:shadow-xs cursor-pointer'
                      : 'border-stone-200 bg-stone-50 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-stone-900 text-base">{pNombre}</h4>
                        <p className="text-xs font-medium text-teal-800">
                          {pEdad} años • {pRelacion}
                        </p>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-stone-100 font-semibold text-stone-600 border border-stone-200">
                        DNI {pDni}
                      </span>
                    </div>

                    <p className="text-xs text-stone-500 flex items-center gap-1">
                      <span>Localidad:</span>
                      <strong className="text-stone-700 font-semibold">{pLocalidad}</strong>
                    </p>

                    {!isEligible && (
                      <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                        <span>Fuera de rango pediátrico hospitalario (&gt;1 mes a 15 años).</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-2 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-xs text-stone-400 font-medium">
                      Rango pediátrico: 1m a 15a
                    </span>
                    <button
                      type="button"
                      disabled={!isEligible}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isEligible) handleSelectPaciente(pId, pEdad);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-teal-800 text-white'
                          : isEligible
                          ? 'bg-teal-700 text-white hover:bg-teal-800'
                          : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                      }`}
                    >
                      <span>Seleccionar</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add persona a cargo button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-stone-100">
            <p className="text-xs text-stone-500">
              ¿No figura la persona a cargo que necesitás? Podés registrarla con sus datos y DNI.
            </p>
            <button
              type="button"
              onClick={() => {
                if (onOpenAddPersona) {
                  onOpenAddPersona();
                } else {
                  alert('Podés agregar personas a cargo desde la pestaña "Personas a cargo" del portal.');
                }
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-stone-300 hover:border-teal-700 hover:bg-teal-50 text-stone-700 hover:text-teal-800 text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-teal-700" />
              <span>+ Agregar persona a cargo</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* PASO 2 — PREFERENCIA HORARIA */}
      {/* ==================================================================== */}
      {currentStep === 'HORARIO' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-6">
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-stone-900">
              ¿Qué horario preferís?
            </h3>
            <p className="text-xs sm:text-sm text-stone-500">
              Seleccioná tu franja de preferencia para {selectedPatient?.nombre || 'el paciente'}.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Mañana */}
            <button
              type="button"
              onClick={() => handleSelectPreferenciaHoraria('manana')}
              className={`p-5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between group ${
                preferenciaHoraria === 'manana'
                  ? 'border-teal-700 bg-teal-50/50 shadow-xs ring-2 ring-teal-700/20'
                  : 'border-stone-200 hover:border-teal-600 bg-white hover:shadow-xs'
              }`}
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold border border-amber-200">
                  <Clock className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-base text-stone-900 group-hover:text-teal-800">
                  Mañana
                </h4>
                <p className="text-xs text-stone-500">
                  Horarios anteriores a las 13:00 hs (08:30 a 12:45).
                </p>
              </div>

              <div className="pt-4 mt-3 border-t border-stone-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-teal-800">&lt; 13:00 hs</span>
                <span className="text-xs font-bold text-teal-700 group-hover:translate-x-0.5 transition-transform">
                  Elegir →
                </span>
              </div>
            </button>

            {/* Tarde */}
            <button
              type="button"
              onClick={() => handleSelectPreferenciaHoraria('tarde')}
              className={`p-5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between group ${
                preferenciaHoraria === 'tarde'
                  ? 'border-teal-700 bg-teal-50/50 shadow-xs ring-2 ring-teal-700/20'
                  : 'border-stone-200 hover:border-teal-600 bg-white hover:shadow-xs'
              }`}
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold border border-indigo-200">
                  <Clock className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-base text-stone-900 group-hover:text-teal-800">
                  Tarde
                </h4>
                <p className="text-xs text-stone-500">
                  Horarios desde las 13:00 hs (13:00 a 16:00).
                </p>
              </div>

              <div className="pt-4 mt-3 border-t border-stone-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-teal-800">≥ 13:00 hs</span>
                <span className="text-xs font-bold text-teal-700 group-hover:translate-x-0.5 transition-transform">
                  Elegir →
                </span>
              </div>
            </button>

            {/* Me da igual */}
            <button
              type="button"
              onClick={() => handleSelectPreferenciaHoraria('cualquiera')}
              className={`p-5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between group ${
                preferenciaHoraria === 'cualquiera'
                  ? 'border-teal-700 bg-teal-50/50 shadow-xs ring-2 ring-teal-700/20'
                  : 'border-stone-200 hover:border-teal-600 bg-white hover:shadow-xs'
              }`}
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold border border-emerald-200">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-base text-stone-900 group-hover:text-teal-800">
                  Me da igual
                </h4>
                <p className="text-xs text-stone-500">
                  Cualquier horario disponible (máxima cantidad de opciones).
                </p>
              </div>

              <div className="pt-4 mt-3 border-t border-stone-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-800">Todo el día</span>
                <span className="text-xs font-bold text-teal-700 group-hover:translate-x-0.5 transition-transform">
                  Elegir →
                </span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* PASO 3 — SERVICIO */}
      {/* ==================================================================== */}
      {currentStep === 'SERVICIO' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-6">
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-stone-900">
              ¿Qué servicio necesitás?
            </h3>
            <p className="text-xs sm:text-sm text-stone-500">
              Seleccioná una especialidad médica o servicio del hospital.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {specialties.map((spec) => {
              const isSelected = servicioId === spec.id;
              const isShared = spec.tipoAgenda === 'SERVICIO';

              return (
                <button
                  key={spec.id}
                  type="button"
                  onClick={() => handleSelectServicio(spec.id)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between group ${
                    isSelected
                      ? 'border-teal-700 bg-teal-50/50 shadow-xs ring-2 ring-teal-700/20'
                      : 'border-stone-200 hover:border-teal-600 bg-white hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-sm text-stone-900 group-hover:text-teal-800">
                        {spec.nombre}
                      </span>
                    </div>

                    <p className="text-xs text-stone-500 line-clamp-2">
                      {spec.descripcion || 'Atención pediátrica especializada.'}
                    </p>
                  </div>

                  <div className="pt-3 mt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                    <span
                      className={`px-2 py-0.5 rounded-md font-semibold ${
                        isShared
                          ? 'bg-amber-50 text-amber-800 border border-amber-200/60'
                          : 'bg-teal-50 text-teal-800 border border-teal-200/60'
                      }`}
                    >
                      {isShared ? 'Agenda Compartida' : 'Agenda por Profesional'}
                    </span>
                    <span className="font-bold text-teal-700">Elegir →</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* PASO 4 — PREFERENCIA DE PROFESIONAL */}
      {/* ==================================================================== */}
      {currentStep === 'PROFESIONAL' && selectedServicio && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-6">
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-stone-900">
              ¿Tenés preferencia por algún profesional?
            </h3>
            <p className="text-xs sm:text-sm text-stone-500">
              Servicio seleccionado: <strong className="text-stone-800 font-semibold">{selectedServicio.nombre}</strong>
            </p>
          </div>

          {/* If Service has Shared Agenda (tipoAgenda = SERVICIO) */}
          {selectedServicio.tipoAgenda === 'SERVICIO' ? (
            <div className="p-6 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Info className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-stone-900 text-sm">
                    Este servicio trabaja con agenda compartida.
                  </h4>
                  <p className="text-xs text-stone-600">
                    El profesional se asignará al momento de la atención en el hospital según el equipo de guardia o consultorios del día.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    handleSelectProfesional(null, true);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition-colors inline-flex items-center gap-1.5 shadow-xs"
                >
                  <span>Continuar a selección de día</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Professional Agenda: list ONLY doctors from this specialty + "Me da igual" */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {serviceDoctors.map((doc) => {
                  const isSelected = profesionalId === doc.id && !isMeDaIgualProfesional;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => handleSelectProfesional(doc.id, false)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer group ${
                        isSelected
                          ? 'border-teal-700 bg-teal-50/50 shadow-xs ring-2 ring-teal-700/20'
                          : 'border-stone-200 hover:border-teal-600 bg-white hover:shadow-xs'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-stone-900 group-hover:text-teal-800">
                            {doc.nombre}
                          </h4>
                        </div>
                        <p className="text-xs text-stone-500">
                          {doc.especialidad} • Consultorio {doc.consultorio}
                        </p>
                      </div>

                      <div className="pt-3 mt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-stone-400 font-medium">
                          {doc.diasAtencion}
                        </span>
                        <button
                          type="button"
                          className="px-3 py-1 rounded-lg bg-stone-100 group-hover:bg-teal-700 group-hover:text-white text-stone-700 text-xs font-bold transition-colors"
                        >
                          Seleccionar
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Card "Me da igual" */}
                <div
                  onClick={() => handleSelectProfesional(null, true)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer group ${
                    isMeDaIgualProfesional
                      ? 'border-teal-700 bg-teal-50/50 shadow-xs ring-2 ring-teal-700/20'
                      : 'border-stone-200 hover:border-teal-600 bg-white hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-stone-900 group-hover:text-teal-800">
                      Me da igual el profesional
                    </h4>
                    <p className="text-xs text-stone-500">
                      Cualquier profesional disponible del servicio de {selectedServicio.nombre}.
                    </p>
                  </div>

                  <div className="pt-3 mt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-teal-800 font-semibold">
                      Mayor disponibilidad de turnos
                    </span>
                    <button
                      type="button"
                      className="px-3 py-1 rounded-lg bg-stone-100 group-hover:bg-teal-700 group-hover:text-white text-stone-700 text-xs font-bold transition-colors"
                    >
                      Seleccionar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* PASO 5 — SELECCIÓN DEL DÍA */}
      {/* ==================================================================== */}
      {currentStep === 'DIA' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-stone-900">
                ¿Qué día te queda mejor?
              </h3>
              <p className="text-xs sm:text-sm text-stone-500">
                Los días en naranja no tienen cupos: podés anotarte directo en la lista de espera para ese día.
              </p>
            </div>

            {/* Quick selector: Primer día disponible */}
            {eligibleDays.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectDia(eligibleDays[0].date)}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold border border-teal-200/80 transition-colors inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                  <span>Primer día disponible</span>
                </button>
              </div>
            )}
          </div>

          {/* Loading / error / empty states (consulta real a agenda_slots) */}
          {loadingSlots ? (
            <div className="p-8 text-center text-stone-500 text-xs font-medium">Cargando disponibilidad…</div>
          ) : slotsError ? (
            <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold text-center">
              {slotsError}
            </div>
          ) : allCandidateDays.length === 0 ? (
            <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h4 className="font-bold text-stone-900 text-sm">
                  No encontramos disponibilidad con las opciones seleccionadas
                </h4>
                <p className="text-xs text-stone-500">
                  No hay cupos libres para {selectedServicio?.nombre} en el horario de {preferenciaHoraria} dentro de los próximos 30 días.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep('HORARIO')}
                  className="px-4 py-2 rounded-xl bg-white border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-50 transition-colors"
                >
                  Cambiar horario
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep('PROFESIONAL')}
                  className="px-4 py-2 rounded-xl bg-white border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-50 transition-colors"
                >
                  Cambiar profesional
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep('CONFIRMAR_LISTA_ESPERA')}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shadow-xs"
                >
                  Ingresar a lista de espera
                </button>
              </div>
            </div>
          ) : (
            /* Cards / Buttons de todos los días (disponibles y sin cupos) */
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {allCandidateDays.map((day) => {
                  const isSelected = fechaSeleccionada === day.date;
                  const tieneCupos = day.availableSlotsCount > 0;

                  if (!tieneCupos) {
                    return (
                      <button
                        key={day.date}
                        type="button"
                        onClick={() => handleSelectDiaSinDisponibilidad(day.date, day.label)}
                        className="p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between group border-amber-300 bg-amber-50/60 hover:bg-amber-100/70 hover:border-amber-400"
                      >
                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold text-amber-700 block uppercase tracking-wider">
                            Día {day.shortLabel.split(' ')[0]}
                          </span>
                          <h4 className="font-bold text-sm text-amber-900">
                            {day.shortLabel}
                          </h4>
                        </div>

                        <div className="pt-2 mt-2 border-t border-amber-200 flex items-center justify-between text-[11px]">
                          <span className="text-amber-800 font-bold">Agregar a lista de espera</span>
                        </div>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => handleSelectDia(day.date)}
                      className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between group ${
                        isSelected
                          ? 'border-teal-700 bg-teal-50/50 shadow-xs ring-2 ring-teal-700/20'
                          : 'border-stone-200 hover:border-teal-600 bg-white hover:shadow-xs'
                      }`}
                    >
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-stone-400 block uppercase tracking-wider">
                          Día {day.shortLabel.split(' ')[0]}
                        </span>
                        <h4 className="font-bold text-sm text-stone-900 group-hover:text-teal-800">
                          {day.shortLabel}
                        </h4>
                      </div>

                      <div className="pt-2 mt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                        <span className="text-teal-800 font-semibold">
                          {day.availableSlotsCount} {day.availableSlotsCount === 1 ? 'cupo' : 'cupos'}
                        </span>
                        <span className="text-stone-400 group-hover:text-teal-700">→</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-[11px] text-stone-500 flex items-center gap-2">
                <Info className="w-4 h-4 text-stone-400 shrink-0" />
                <span>
                  En verde/blanco: días con cupos reales para reservar. En naranja: sin cupos por ahora, pero podés sumarte a la lista de espera para ese día.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* PASO 6 — HORARIOS DISPONIBLES */}
      {/* ==================================================================== */}
      {currentStep === 'TURNO' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-6">
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-stone-900">
              Elegí un horario
            </h3>
            <p className="text-xs sm:text-sm text-stone-500">
              Disponibilidad para el <strong className="text-stone-800 font-semibold">{selectedDateLabel}</strong>
            </p>
          </div>

          {availableSlotsForSelectedDate.length === 0 ? (
            <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200 text-center space-y-4">
              <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto" />
              <div className="space-y-1">
                <h4 className="font-bold text-stone-900 text-sm">
                  No encontramos disponibilidad con las opciones seleccionadas
                </h4>
                <p className="text-xs text-stone-500">
                  Podés elegir otro día, modificar tus preferencias o ingresar a la lista de espera oficial.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep('DIA')}
                  className="px-4 py-2 rounded-xl bg-white border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-50 transition-colors"
                >
                  Elegir otro día
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep('HORARIO')}
                  className="px-4 py-2 rounded-xl bg-white border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-50 transition-colors"
                >
                  Cambiar horario
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep('PROFESIONAL')}
                  className="px-4 py-2 rounded-xl bg-white border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-50 transition-colors"
                >
                  Cambiar profesional
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep('CONFIRMAR_LISTA_ESPERA')}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shadow-xs"
                >
                  Ingresar a lista de espera
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {availableSlotsForSelectedDate.map((slot, idx) => {
                  const isSelected = horaSeleccionada === slot.hora && slotProfesionalNombre === slot.profesional;
                  return (
                    <div
                      key={`${slot.fecha}-${slot.hora}-${slot.profesional}-${idx}`}
                      onClick={() => handleSelectSlot(slot)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer group ${
                        isSelected
                          ? 'border-teal-700 bg-teal-50/50 shadow-xs ring-2 ring-teal-700/20'
                          : 'border-stone-200 hover:border-teal-600 bg-white hover:shadow-xs'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-base text-stone-900 group-hover:text-teal-800">
                            {slot.hora} hs
                          </span>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                            {parseInt(slot.hora.split(':')[0], 10) < 13 ? 'Mañana' : 'Tarde'}
                          </span>
                        </div>

                        {/* Professional display (item 11 & 12 of specs) */}
                        <p className="text-xs text-stone-600 font-medium line-clamp-1">
                          {slot.tipoAgenda === 'SERVICIO'
                            ? `${selectedServicio?.nombre} • Profesional a asignar`
                            : slot.profesional}
                        </p>
                        <p className="text-[11px] text-stone-400">
                          {slot.consultorio}
                        </p>
                      </div>

                      <div className="pt-3 mt-2 border-t border-stone-100 flex items-center justify-between">
                        <span className="text-[11px] text-teal-800 font-semibold">Disponible</span>
                        <button
                          type="button"
                          className="px-3 py-1 rounded-lg bg-teal-700 group-hover:bg-teal-800 text-white text-xs font-bold transition-colors"
                        >
                          Seleccionar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* PASO 7 — RESUMEN */}
      {/* ==================================================================== */}
      {currentStep === 'RESUMEN' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-6">
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-stone-900">
              Revisá tu turno
            </h3>
            <p className="text-xs sm:text-sm text-stone-500">
              Verificá los datos antes de confirmar la reserva en la agenda central del hospital.
            </p>
          </div>

          {collisionError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{collisionError}</span>
            </div>
          )}

          {/* MAIN SUMMARY CARD (Item 15 of specs) */}
          <div className="rounded-2xl border-2 border-stone-200 bg-stone-50/50 p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* PACIENTE */}
              <div className="bg-white p-3.5 rounded-xl border border-stone-200/70 space-y-1">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                  Paciente
                </span>
                <p className="font-bold text-sm text-stone-900">{selectedPatient?.nombre}</p>
                <p className="text-xs text-stone-500">
                  {selectedPatient?.edad} años • DNI {selectedPatient?.dni}
                </p>
              </div>

              {/* SERVICIO */}
              <div className="bg-white p-3.5 rounded-xl border border-stone-200/70 space-y-1">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                  Servicio
                </span>
                <p className="font-bold text-sm text-stone-900">{selectedServicio?.nombre}</p>
                <p className="text-xs text-stone-500">
                  {selectedServicio?.tipoAgenda === 'SERVICIO' ? 'Agenda Compartida' : 'Agenda por Profesional'}
                </p>
              </div>

              {/* PROFESIONAL */}
              <div className="bg-white p-3.5 rounded-xl border border-stone-200/70 space-y-1">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                  Profesional
                </span>
                <p className="font-bold text-sm text-stone-900">
                  {slotProfesionalNombre || selectedDoctor?.nombre || 'Se asignará al momento de la atención'}
                </p>
                <p className="text-xs text-stone-500">
                  {slotConsultorio || 'Consultorio hospitalario'}
                </p>
              </div>

              {/* FECHA Y HORA */}
              <div className="bg-white p-3.5 rounded-xl border border-stone-200/70 space-y-1">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                  Fecha y Horario
                </span>
                <p className="font-bold text-sm text-stone-900">{selectedDateLabel}</p>
                <p className="text-xs font-bold text-teal-800">{horaSeleccionada} hs</p>
              </div>

              {/* TUTOR RESPONSABLE */}
              <div className="bg-white p-3.5 rounded-xl border border-stone-200/70 space-y-1">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                  Tutor Responsable
                </span>
                <p className="font-bold text-sm text-stone-900">
                  {currentTutor?.nombre} {currentTutor?.apellido}
                </p>
                <p className="text-xs text-stone-500">
                  Tel: {currentTutor?.telefono} • {currentTutor?.localidad}
                </p>
              </div>

              {/* CANAL */}
              <div className="bg-white p-3.5 rounded-xl border border-stone-200/70 space-y-1">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                  Canal de Reserva
                </span>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200/70">
                    Web Oficial
                  </span>
                  <span className="text-xs text-stone-500">Estado inicial: Pendiente de llegada</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons (Item 15 & 16 of specs) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setCurrentStep('SERVICIO')}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-bold transition-colors"
              >
                Modificar datos
              </button>
            </div>

            <button
              type="button"
              onClick={handleConfirmAppointment}
              disabled={submitting}
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'Confirmando…' : 'Confirmar turno'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* CONFIRMACIÓN FINAL / TURNO CONFIRMADO */}
      {/* ==================================================================== */}
      {currentStep === 'CONFIRMADO' && confirmedAppointment && (
        <div className="bg-white rounded-3xl p-8 border border-stone-200/80 shadow-xs space-y-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-teal-50 text-teal-700 mx-auto flex items-center justify-center border border-teal-200">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <span className="px-3 py-1 rounded-full bg-teal-100/70 text-teal-800 font-bold text-xs">
              Reserva Web Exitosa
            </span>
            <h3 className="text-2xl font-bold text-stone-900">
              ¡Turno confirmado!
            </h3>
            <p className="text-xs sm:text-sm text-stone-500">
              El turno ya quedó registrado en la agenda central del hospital. Presentate 15 minutos antes en el Área de Admisión.
            </p>
          </div>

          {/* Ticket Card (Item 19 of specs) */}
          <div className="max-w-md mx-auto bg-stone-50 rounded-2xl p-5 border border-stone-200 text-left space-y-3">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                  Código de Turno
                </span>
                <span className="text-lg font-mono font-bold text-teal-800">
                  {confirmedAppointment.codigo}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-stone-200/70 text-stone-700 text-xs font-semibold">
                Pendiente de llegada
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-stone-400 block text-[11px]">Paciente</span>
                <strong className="text-stone-900 font-bold">{confirmedAppointment.pacienteNombre}</strong>
              </div>

              <div>
                <span className="text-stone-400 block text-[11px]">Servicio</span>
                <strong className="text-stone-900 font-bold">{confirmedAppointment.especialidad}</strong>
              </div>

              <div>
                <span className="text-stone-400 block text-[11px]">Profesional</span>
                <strong className="text-stone-900 font-bold">{confirmedAppointment.profesional}</strong>
              </div>

              <div>
                <span className="text-stone-400 block text-[11px]">Consultorio</span>
                <strong className="text-stone-900 font-bold">{confirmedAppointment.consultorio}</strong>
              </div>

              <div>
                <span className="text-stone-400 block text-[11px]">Fecha</span>
                <strong className="text-stone-900 font-bold">{selectedDateLabel}</strong>
              </div>

              <div>
                <span className="text-stone-400 block text-[11px]">Horario</span>
                <strong className="text-stone-900 font-bold">{confirmedAppointment.hora} hs</strong>
              </div>
            </div>
          </div>

          {/* Buttons (Item 19 of specs) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onCompleted(confirmedAppointment.codigo)}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition-colors shadow-xs inline-flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Ver mis turnos</span>
            </button>

            <button
              type="button"
              onClick={() => {
                // Reset wizard state to step 1
                setPacienteId(null);
                setPreferenciaHoraria(null);
                setServicioId(null);
                setProfesionalId(null);
                setIsMeDaIgualProfesional(false);
                setFechaSeleccionada(null);
                setHoraSeleccionada(null);
                setSlotProfesionalNombre(null);
                setConfirmedAppointment(null);
                setWaitlistDiaDeseadoLabel(null);
                setCurrentStep('PACIENTE');
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold text-xs transition-colors"
            >
              Solicitar otro turno
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-stone-500 hover:text-stone-800 font-semibold text-xs transition-colors"
            >
              Ir al inicio
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUBFLUJO: CONFIRMAR INGRESO A LISTA DE ESPERA */}
      {/* ==================================================================== */}
      {currentStep === 'CONFIRMAR_LISTA_ESPERA' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-6">
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-stone-900">
              ¿Querés ingresar a la lista de espera?
            </h3>
            <p className="text-xs sm:text-sm text-stone-500">
              Si se libera un turno compatible o se cancela una reserva, el hospital podrá contactarte de inmediato.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-stone-400 block text-[11px]">Paciente:</span>
                <strong className="text-stone-900 font-bold">{selectedPatient?.nombre} ({selectedPatient?.edad} años)</strong>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">Servicio:</span>
                <strong className="text-stone-900 font-bold">{selectedServicio?.nombre}</strong>
              </div>
              {waitlistDiaDeseadoLabel && (
                <div>
                  <span className="text-stone-400 block text-[11px]">Día deseado:</span>
                  <strong className="text-stone-900 font-bold">{waitlistDiaDeseadoLabel}</strong>
                </div>
              )}
              <div>
                <span className="text-stone-400 block text-[11px]">Preferencia:</span>
                <strong className="text-stone-900 font-bold capitalize">{preferenciaHoraria || 'Sin preferencia'}</strong>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">Profesional:</span>
                <strong className="text-stone-900 font-bold">
                  {selectedDoctor?.nombre || 'Sin preferencia'}
                </strong>
              </div>
            </div>
            {waitlistDiaDeseadoLabel && (
              <p className="text-[11px] text-amber-900">
                No hay cupos disponibles el {waitlistDiaDeseadoLabel.toLowerCase()}. Te vamos a avisar apenas se libere un turno compatible.
              </p>
            )}

            <p className="text-[11px] text-amber-900 pt-2 border-t border-amber-200/80">
              El hospital gestiona la lista de espera de manera transparente y por orden estricto de solicitud.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setWaitlistDiaDeseadoLabel(null);
                setCurrentStep('DIA');
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-bold transition-colors"
            >
              Volver
            </button>

            <button
              type="button"
              onClick={handleConfirmWaitlist}
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs font-bold transition-colors shadow-xs"
            >
              Confirmar ingreso a lista de espera
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUBFLUJO: ÉXITO LISTA DE ESPERA */}
      {/* ==================================================================== */}
      {currentStep === 'EXITO_LISTA_ESPERA' && waitlistSuccessInfo && (
        <div className="bg-white rounded-3xl p-8 border border-stone-200/80 shadow-xs space-y-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 mx-auto flex items-center justify-center border border-amber-200">
            <Clock className="w-7 h-7" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-xl font-bold text-stone-900">
              ¡Ingreso a lista de espera registrado!
            </h3>
            <p className="text-xs text-stone-500">
              {waitlistSuccessInfo.pacienteNombre} quedó inscripto en la lista de espera de {waitlistSuccessInfo.servicio}. Posición asignada: <strong>#{waitlistSuccessInfo.posicion}</strong>.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            {onGoToWaitlist && (
              <button
                type="button"
                onClick={onGoToWaitlist}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shadow-xs"
              >
                Ver lista de espera
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 font-semibold text-xs transition-colors"
            >
              Ir al inicio
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
