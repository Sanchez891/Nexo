import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  UserRole,
  Appointment,
  WaitlistEntry,
  InboundRequest,
  Patient,
  Doctor,
  Specialty,
  AppointmentStatus,
  RequestChannel,
  Localidad,
  TipoAgenda,
  TipoPrestacion,
  UrgencyEntry,
  Tutor,
  RelacionTutorPaciente,
  TipoRelacionTutor,
} from '../types';
import { INITIAL_INBOUND_REQUESTS, INITIAL_URGENCIES } from '../data/initialData';
import * as tutorsService from '../services/tutors.service';
import * as patientsService from '../services/patients.service';
import * as servicesService from '../services/services.service';
import * as professionalsService from '../services/professionals.service';
import * as appointmentsService from '../services/appointments.service';
import * as waitingListService from '../services/waitingList.service';
import * as absencesService from '../services/absences.service';
import * as delaysService from '../services/delays.service';
import { PersonaACargo } from '../services/patients.service';
import { realProfesionalId } from '../services/professionals.service';
import { findSlotExacto, getSlotsDisponibles } from '../services/agenda.service';
import { relacionToUi } from '../services/mappers';
import { supabase } from '../lib/supabase';

export interface BookingResult {
  success: boolean;
  appointment?: Appointment;
  error?: string;
  suggestedSlots?: string[];
}

export interface ReleasedSlotAlert {
  appointmentId: string;
  slotId: string;
  especialidad: string;
  fecha: string;
  hora: string;
  profesional: string;
  matchingCandidates: WaitlistEntry[];
}

export interface TripOptimizationResult {
  originalTrips: number;
  optimizedTrips: number;
  avoidedTrips: number;
  proposedDate: string;
  affectedAppointments: Appointment[];
}

interface HospitalContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  appointments: Appointment[];
  waitlist: WaitlistEntry[];
  inboundRequests: InboundRequest[];
  patients: Patient[];
  doctors: Doctor[];
  specialties: Specialty[];
  urgencies: UrgencyEntry[];

  loading: boolean;
  dataError: string | null;
  refreshAll: () => Promise<void>;

  tutors: Tutor[];
  currentTutor: Tutor;
  setCurrentTutor: (tutor: Tutor) => void;
  relaciones: RelacionTutorPaciente[];
  addPersonaACargo: (data: {
    nombre: string;
    apellido?: string;
    dni: string;
    fechaNacimiento: string;
    localidad: Localidad;
    relacion: TipoRelacionTutor;
    sexo?: 'M' | 'F' | 'Otro';
    antecedentes?: string;
    telefono?: string;
    tutorId?: string;
  }) => Promise<{ success: boolean; patient?: Patient; error?: string }>;
  getPersonasACargo: (tutorId?: string) => PersonaACargo[];
  calculateAge: (fechaNacimientoStr: string) => { years: number; months: number; totalMonths: number };

  releasedSlotAlert: ReleasedSlotAlert | null;
  dismissReleasedSlotAlert: () => void;
  patientSlotOffer: { especialidad: string; fecha: string; hora: string } | null;
  dismissPatientSlotOffer: () => void;
  acceptPatientSlotOffer: () => void;

  isWhatsAppOpen: boolean;
  setIsWhatsAppOpen: (open: boolean) => void;
  openWhatsAppSimulator: () => void;
  closeWhatsAppSimulator: () => void;

  currentDemoStep: number;
  setCurrentDemoStep: (step: number) => void;
  advanceDemoStep: () => void;

  validatePediatricAge: (edad: number, meses?: number) => { valid: boolean; error?: string };
  isDateWithin30Days: (fechaStr: string) => { valid: boolean; error?: string };

  bookAppointment: (data: {
    slotId: string;
    pacienteId: string;
    tutorSolicitanteId?: string;
    origenCanal: RequestChannel;
    motivoResumido?: string;
  }) => Promise<BookingResult>;

  cancelAppointment: (appointmentId: string, motivo?: string) => Promise<void>;
  rescheduleAppointment: (appointmentId: string, nuevaFecha: string, nuevaHora: string) => Promise<boolean>;
  updateAppointmentStatus: (appointmentId: string, status: AppointmentStatus) => Promise<void>;
  assignWaitlistCandidate: (waitlistId: string, slotId: string) => Promise<BookingResult>;
  addToWaitlist: (data: {
    pacienteId: string;
    tutorId?: string;
    especialidad: string;
    profesionalPreferidoId?: string;
    preferenciaHorario: 'cualquiera' | 'manana' | 'tarde';
    localidad: Localidad;
    origenCanal?: RequestChannel;
  }) => Promise<WaitlistEntry>;
  removeFromWaitlist: (waitlistId: string) => Promise<void>;
  getCandidatosCompatibles: (appointmentId: string) => Promise<WaitlistEntry[]>;
  processInboundRequest: (requestId: string, appointmentData?: Partial<Appointment>) => void;

  registerUrgency: (data: Omit<UrgencyEntry, 'id' | 'fechaHora' | 'estado'>) => UrgencyEntry;

  reportDoctorDelay: (doctorId: string, minutes: 15 | 30 | 45 | 60) => Promise<void>;
  clearDoctorDelay: (doctorId: string) => Promise<void>;
  reportDoctorAbsence: (doctorId: string, motivo: string) => Promise<void>;
  clearDoctorAbsence: (doctorId: string) => Promise<void>;
  reassignDoctorAppointment: (appointmentId: string, newDoctorName: string, newDoctorId?: string) => Promise<boolean>;

  optimizePatientVisits: (pacienteId: string) => Promise<TripOptimizationResult>;

  registerPatient: (data: {
    nombre: string;
    dni: string;
    edad: number;
    localidad: Localidad;
  }) => Promise<{ success: boolean; patient?: Patient; error?: string }>;

  addSpecialty: (specialty: { nombre: string; descripcion?: string; tipoAgenda: TipoAgenda }) => Promise<void>;
  updateSpecialty: (specialty: Specialty) => Promise<void>;
  addProfessional: (data: { nombre: string; apellido: string; matricula?: string; servicioIds: string[] }) => Promise<void>;

  resetDemoData: () => Promise<void>;
}

const HospitalContext = createContext<HospitalContextType | undefined>(undefined);

const DEMO_UI_STORAGE_KEY = 'hosp_jp2_demo_ui_v1';

export const HospitalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>('familiar');
  const [currentDemoStep, setCurrentDemoStep] = useState<number>(1);
  const [releasedSlotAlert, setReleasedSlotAlert] = useState<ReleasedSlotAlert | null>(null);
  const [patientSlotOffer, setPatientSlotOffer] = useState<{ especialidad: string; fecha: string; hora: string } | null>(null);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const openWhatsAppSimulator = () => setIsWhatsAppOpen(true);
  const closeWhatsAppSimulator = () => setIsWhatsAppOpen(false);

  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [currentTutorState, setCurrentTutorState] = useState<Tutor | null>(null);
  const [relaciones, setRelaciones] = useState<RelacionTutorPaciente[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [personasACargoCache, setPersonasACargoCache] = useState<Record<string, PersonaACargo[]>>({});

  // No cubiertos aún por Supabase en este MVP (ver README > Pendientes):
  // solicitudes multicanal simuladas y urgencias 24hs siguen en memoria local.
  const [inboundRequests, setInboundRequests] = useState<InboundRequest[]>(INITIAL_INBOUND_REQUESTS);
  const [urgencies, setUrgencies] = useState<UrgencyEntry[]>(INITIAL_URGENCIES);

  const currentTutor: Tutor = currentTutorState || tutors[0] || {
    id: '',
    nombre: '',
    apellido: '',
    dni: '',
    telefono: '',
    email: '',
    localidad: 'Mercedes',
  };

  const setCurrentTutor = (tutor: Tutor) => {
    setCurrentTutorState(tutor);
    try {
      localStorage.setItem(`${DEMO_UI_STORAGE_KEY}_current_tutor_id`, tutor.id);
    } catch (e) {
      /* preferencia de UI, no crítica */
    }
  };

  const loadRelaciones = useCallback(async () => {
    const { data, error } = await supabase.from('tutor_paciente').select('*');
    if (error) throw error;
    setRelaciones(
      (data || []).map((r) => ({
        id: r.id,
        tutorId: r.tutor_id,
        pacienteId: r.paciente_id,
        tipoRelacion: relacionToUi(r.tipo_relacion),
        responsablePrincipal: r.responsable_principal,
        autorizadoAGestionarTurnos: r.autorizado_gestionar_turnos,
      }))
    );
  }, []);

  const refreshAppointments = useCallback(async () => {
    const rows = await appointmentsService.getTurnos();
    setAppointments(rows);
  }, []);

  const refreshWaitlist = useCallback(async () => {
    const rows = await waitingListService.getListaEspera();
    setWaitlist(rows);
  }, []);

  const refreshDoctors = useCallback(async () => {
    const rows = await professionalsService.getProfesionales();
    setDoctors(rows);
  }, []);

  const refreshPatients = useCallback(async () => {
    const { data, error } = await supabase.from('pacientes').select('*').order('nombre');
    if (error) throw error;
    setPatients((data || []).map((row) => patientsService.mapPaciente(row)));
  }, []);

  const refreshPersonasACargo = useCallback(async (tutorId: string) => {
    if (!tutorId) return;
    try {
      const list = await patientsService.getPersonasACargo(tutorId);
      setPersonasACargoCache((prev) => ({ ...prev, [tutorId]: list }));
    } catch (e) {
      console.error('No se pudieron cargar las personas a cargo', e);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setDataError(null);
    try {
      const [tutorsList, specs, docs] = await Promise.all([
        tutorsService.getTutores(),
        servicesService.getServiciosActivos(),
        professionalsService.getProfesionales(),
      ]);
      setTutors(tutorsList);
      setSpecialties(specs);
      setDoctors(docs);

      let savedTutorId: string | null = null;
      try {
        savedTutorId = localStorage.getItem(`${DEMO_UI_STORAGE_KEY}_current_tutor_id`);
      } catch (e) {
        /* noop */
      }
      const initialTutor = tutorsList.find((t) => t.id === savedTutorId) || tutorsList[0] || null;
      setCurrentTutorState(initialTutor);

      await Promise.all([refreshAppointments(), refreshWaitlist(), refreshPatients(), loadRelaciones()]);

      if (initialTutor) {
        await refreshPersonasACargo(initialTutor.id);
      }
    } catch (e: any) {
      console.error('Error cargando datos desde Supabase', e);
      setDataError(
        e?.message ||
          'No se pudo consultar la base de datos. Verificá tu conexión y las variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.'
      );
    } finally {
      setLoading(false);
    }
  }, [refreshAppointments, refreshWaitlist, refreshPatients, refreshPersonasACargo, loadRelaciones]);

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentTutorState?.id) {
      refreshPersonasACargo(currentTutorState.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTutorState?.id]);

  const advanceDemoStep = () => {
    setCurrentDemoStep((prev) => Math.min(prev + 1, 6));
  };

  const dismissReleasedSlotAlert = () => setReleasedSlotAlert(null);
  const dismissPatientSlotOffer = () => setPatientSlotOffer(null);
  const acceptPatientSlotOffer = () => setPatientSlotOffer(null);

  const calculateAge = (fechaNacimientoStr: string): { years: number; months: number; totalMonths: number } => {
    if (!fechaNacimientoStr) return { years: 0, months: 0, totalMonths: 0 };
    const birth = new Date(fechaNacimientoStr);
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    if (today.getDate() < birth.getDate()) months--;
    if (months < 0) {
      years--;
      months += 12;
    }
    const totalMonths = Math.max(0, years * 12 + months);
    return { years: Math.max(0, years), months: Math.max(0, months), totalMonths };
  };

  const getPersonasACargo = (tutorId?: string): PersonaACargo[] => {
    const effectiveId = tutorId || currentTutor.id;
    return personasACargoCache[effectiveId] || [];
  };

  const addPersonaACargo: HospitalContextType['addPersonaACargo'] = async (data) => {
    const result = await patientsService.addPersonaACargo({
      nombre: data.nombre,
      apellido: data.apellido,
      dni: data.dni,
      fechaNacimiento: data.fechaNacimiento,
      localidad: data.localidad,
      relacion: data.relacion,
      tutorId: data.tutorId || currentTutor.id,
    });
    if (result.success) {
      await Promise.all([refreshPersonasACargo(data.tutorId || currentTutor.id), refreshPatients(), loadRelaciones()]);
    }
    return result;
  };

  const validatePediatricAge = patientsService.validatePediatricAge;

  const isDateWithin30Days = (fechaStr: string): { valid: boolean; error?: string } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(fechaStr);
    const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { valid: false, error: 'No se pueden seleccionar fechas pasadas.' };
    if (diffDays > 30) {
      return { valid: false, error: 'Los turnos disponibles se habilitan con hasta 30 días de anticipación.' };
    }
    return { valid: true };
  };

  const bookAppointment: HospitalContextType['bookAppointment'] = async (data) => {
    const result = await appointmentsService.reservarTurno({
      slotId: data.slotId,
      pacienteId: data.pacienteId,
      tutorSolicitanteId: data.tutorSolicitanteId,
      canalOrigen: data.origenCanal,
      motivoResumido: data.motivoResumido,
    });
    if (result.success) {
      await Promise.all([refreshAppointments(), refreshWaitlist()]);
    }
    return result;
  };

  const cancelAppointment = async (appointmentId: string, motivo?: string) => {
    const cancelled = await appointmentsService.cancelarTurno(appointmentId, motivo);
    const candidates = await waitingListService.getCandidatosCompatibles(appointmentId);
    if (candidates.length > 0 && cancelled.slotId) {
      setReleasedSlotAlert({
        appointmentId: cancelled.id,
        slotId: cancelled.slotId,
        especialidad: cancelled.especialidad,
        fecha: cancelled.fecha,
        hora: cancelled.hora,
        profesional: cancelled.profesional,
        matchingCandidates: candidates,
      });
    }
    await refreshAppointments();
  };

  const rescheduleAppointment = async (appointmentId: string, nuevaFecha: string, nuevaHora: string): Promise<boolean> => {
    const apt = appointments.find((a) => a.id === appointmentId);
    if (!apt) return false;

    const servicio = specialties.find((s) => s.nombre === apt.especialidad);
    if (!servicio) return false;

    
    const profesionalRealId = apt.profesionalId ? realProfesionalId(apt.profesionalId) : undefined;
    const nuevoSlotId = await findSlotExacto({
      servicioId: servicio.id,
      profesionalId: profesionalRealId,
      fecha: nuevaFecha,
      hora: nuevaHora,
    });
    if (!nuevoSlotId) return false;

    const result = await appointmentsService.reservarTurno({
      slotId: nuevoSlotId,
      pacienteId: apt.pacienteId,
      tutorSolicitanteId: apt.tutorSolicitanteId,
      canalOrigen: apt.origenCanal,
      motivoResumido: apt.motivoResumido,
    });
    if (!result.success) return false;

    await appointmentsService.cancelarTurno(appointmentId, 'Reprogramado a nuevo horario');
    await refreshAppointments();
    return true;
  };

  const updateAppointmentStatus = async (appointmentId: string, status: AppointmentStatus) => {
    switch (status) {
      case 'EN_ESPERA':
        await appointmentsService.checkinTurno(appointmentId);
        break;
      case 'EN_CONSULTORIO':
        await appointmentsService.atenderTurno(appointmentId);
        break;
      case 'ATENDIDO':
        await appointmentsService.finalizarTurno(appointmentId);
        break;
      case 'NO_ASISTIO':
        await appointmentsService.marcarNoAsistio(appointmentId);
        break;
      case 'CANCELADO':
        await cancelAppointment(appointmentId);
        return;
      default:
        break;
    }
    await refreshAppointments();
  };

  const assignWaitlistCandidate = async (waitlistId: string, slotId: string): Promise<BookingResult> => {
    const entry = waitlist.find((w) => w.id === waitlistId);
    if (!entry) return { success: false, error: 'No se encontró el registro en lista de espera.' };

    const result = await appointmentsService.reservarTurno({
      slotId,
      pacienteId: entry.pacienteId,
      tutorSolicitanteId: entry.tutorResponsableId,
      canalOrigen: 'telefono',
      motivoResumido: 'Reasignado desde lista de espera priorizada',
    });

    if (result.success) {
      await waitingListService.marcarAsignado(waitlistId);
      setReleasedSlotAlert(null);
      await Promise.all([refreshAppointments(), refreshWaitlist()]);
    }
    return result;
  };

  const addToWaitlist: HospitalContextType['addToWaitlist'] = async (data) => {
    const servicio = specialties.find((s) => s.nombre.toLowerCase() === data.especialidad.toLowerCase());
    if (!servicio) throw new Error(`No se encontró el servicio ${data.especialidad}`);

    const entry = await waitingListService.addToWaitlist({
      pacienteId: data.pacienteId,
      tutorId: data.tutorId || currentTutor.id,
      servicioId: servicio.id,
      profesionalPreferidoId: data.profesionalPreferidoId,
      preferenciaHorario: data.preferenciaHorario,
      localidad: data.localidad,
      origenCanal: data.origenCanal || 'web',
    });
    await refreshWaitlist();
    return entry;
  };

  const removeFromWaitlist = async (waitlistId: string) => {
    await waitingListService.removeFromWaitlist(waitlistId);
    await refreshWaitlist();
  };

  const getCandidatosCompatibles = async (appointmentId: string) => {
    return waitingListService.getCandidatosCompatibles(appointmentId);
  };

  const processInboundRequest = (requestId: string) => {
    setInboundRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, estado: 'asignado' } : r)));
  };

  const registerUrgency = (data: Omit<UrgencyEntry, 'id' | 'fechaHora' | 'estado'>): UrgencyEntry => {
    const newUrgency: UrgencyEntry = {
      id: `urg-${Date.now()}`,
      ...data,
      fechaHora: new Date().toLocaleString('es-AR'),
      estado: 'en_atencion_urgencia',
    };
    setUrgencies((prev) => [newUrgency, ...prev]);
    return newUrgency;
  };

  const reportDoctorDelay = async (doctorId: string, minutes: 15 | 30 | 45 | 60) => {
    await delaysService.reportarDemora(realProfesionalId(doctorId), minutes);
    await refreshDoctors();
  };

  const clearDoctorDelay = async (doctorId: string) => {
    await delaysService.clearDemora(realProfesionalId(doctorId));
    await refreshDoctors();
  };

  const reportDoctorAbsence = async (doctorId: string, motivo: string) => {
    const today = new Date().toISOString().slice(0, 10);
    await absencesService.reportarAusencia({
      profesionalId: realProfesionalId(doctorId),
      fechaDesde: today,
      fechaHasta: today,
      motivo,
    });
    await refreshDoctors();
  };

  const clearDoctorAbsence = async (doctorId: string) => {
    await absencesService.clearAusencia(realProfesionalId(doctorId));
    await refreshDoctors();
  };

  const reassignDoctorAppointment = async (
    appointmentId: string,
    _newDoctorName: string,
    newDoctorId?: string
  ): Promise<boolean> => {
    if (!newDoctorId) return false;
    const apt = appointments.find((a) => a.id === appointmentId);
    if (!apt) return false;
    const servicio = specialties.find((s) => s.nombre === apt.especialidad);
    if (!servicio) return false;

    
    const nuevoSlotId = await findSlotExacto({
      servicioId: servicio.id,
      profesionalId: realProfesionalId(newDoctorId),
      fecha: apt.fecha,
      hora: apt.hora,
    });
    if (!nuevoSlotId) return false;

    const result = await appointmentsService.reservarTurno({
      slotId: nuevoSlotId,
      pacienteId: apt.pacienteId,
      tutorSolicitanteId: apt.tutorSolicitanteId,
      canalOrigen: apt.origenCanal,
      motivoResumido: `Reubicado por ausencia de ${apt.profesional}`,
    });
    if (!result.success) return false;

    await appointmentsService.cancelarTurno(appointmentId, `Reubicado a otro profesional por ausencia`);
    await refreshAppointments();
    return true;
  };

  // Optimización de viajes: agrupa, dentro de los próximos 30 días, el mayor
  // número posible de servicios pendientes del paciente en un mismo día
  // usando disponibilidad REAL de agenda_slots. Es una propuesta: la
  // asignación final la confirma un administrativo/asistente social.
  const optimizePatientVisits = async (pacienteId: string): Promise<TripOptimizationResult> => {
    const targetApts = appointments.filter(
      (a) => a.pacienteId === pacienteId && a.estado !== 'CANCELADO' && a.estado !== 'ATENDIDO'
    );

    if (targetApts.length === 0) {
      return { originalTrips: 0, optimizedTrips: 0, avoidedTrips: 0, proposedDate: '', affectedAppointments: [] };
    }

    const servicioIds: string[] = Array.from(
      new Set(
        targetApts
          .map((a) => specialties.find((s) => s.nombre === a.especialidad)?.id)
          .filter((id): id is string => Boolean(id))
      )
    );

    
    const disponibilidadPorServicio = await Promise.all(
      servicioIds.map(async (servicioId: string) => {
        const servicio = specialties.find((s) => s.id === servicioId)!;
        const slots = await getSlotsDisponibles({
          servicioId: servicioId,
          tipoAgenda: servicio.tipoAgenda,
        });
        return { servicioId, fechas: new Set(slots.map((s) => s.fecha)) };
      })
    );

    const fechaCounts = new Map<string, number>();
    disponibilidadPorServicio.forEach(({ fechas }) => {
      fechas.forEach((f) => fechaCounts.set(f, (fechaCounts.get(f) || 0) + 1));
    });

    let bestDate = '';
    let bestCount = 0;
    fechaCounts.forEach((count, fecha) => {
      if (count > bestCount) {
        bestCount = count;
        bestDate = fecha;
      }
    });

    return {
      originalTrips: targetApts.length,
      optimizedTrips: bestCount > 0 ? 1 : targetApts.length,
      avoidedTrips: bestCount > 1 ? targetApts.length - 1 : 0,
      proposedDate: bestDate,
      affectedAppointments: targetApts,
    };
  };

  const registerPatient: HospitalContextType['registerPatient'] = async (data) => {
    const result = await patientsService.registerPacienteStandalone(data);
    if (result.success) {
      await refreshPatients();
    }
    return result;
  };

  const addSpecialty = async (specialty: { nombre: string; descripcion?: string; tipoAgenda: TipoAgenda }) => {
    await servicesService.addServicio(specialty);
    const specs = await servicesService.getServiciosActivos();
    setSpecialties(specs);
  };

  const updateSpecialty = async (specialty: Specialty) => {
    await servicesService.updateServicio(specialty.id, { nombre: specialty.nombre, descripcion: specialty.descripcion });
    const specs = await servicesService.getServiciosActivos();
    setSpecialties(specs);
  };

  const addProfessional: HospitalContextType['addProfessional'] = async (data) => {
    await professionalsService.createProfesional(data);
    await refreshDoctors();
  };

  const resetDemoData = async () => {
    setCurrentDemoStep(1);
    setReleasedSlotAlert(null);
    setPatientSlotOffer(null);
    await refreshAll();
  };

  return (
    <HospitalContext.Provider
      value={{
        role,
        setRole,
        appointments,
        waitlist,
        inboundRequests,
        patients,
        doctors,
        specialties,
        urgencies,
        loading,
        dataError,
        refreshAll,
        tutors,
        currentTutor,
        setCurrentTutor,
        relaciones,
        addPersonaACargo,
        getPersonasACargo,
        calculateAge,
        releasedSlotAlert,
        dismissReleasedSlotAlert,
        patientSlotOffer,
        dismissPatientSlotOffer,
        acceptPatientSlotOffer,
        isWhatsAppOpen,
        setIsWhatsAppOpen,
        openWhatsAppSimulator,
        closeWhatsAppSimulator,
        currentDemoStep,
        setCurrentDemoStep,
        advanceDemoStep,
        validatePediatricAge,
        isDateWithin30Days,
        bookAppointment,
        cancelAppointment,
        rescheduleAppointment,
        updateAppointmentStatus,
        assignWaitlistCandidate,
        addToWaitlist,
        removeFromWaitlist,
        getCandidatosCompatibles,
        processInboundRequest,
        registerUrgency,
        reportDoctorDelay,
        clearDoctorDelay,
        reportDoctorAbsence,
        clearDoctorAbsence,
        reassignDoctorAppointment,
        optimizePatientVisits,
        registerPatient,
        addSpecialty,
        updateSpecialty,
        addProfessional,
        resetDemoData,
      }}
    >
      {children}
    </HospitalContext.Provider>
  );
};

export const useHospital = () => {
  const context = useContext(HospitalContext);
  if (!context) {
    throw new Error('useHospital must be used within a HospitalProvider');
  }
  return context;
};
