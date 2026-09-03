import React, { createContext, useContext, useState, useEffect } from 'react';
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
import {
  INITIAL_APPOINTMENTS,
  INITIAL_WAITLIST,
  INITIAL_INBOUND_REQUESTS,
  INITIAL_PATIENTS,
  INITIAL_DOCTORS,
  INITIAL_SPECIALTIES,
  INITIAL_URGENCIES,
  INITIAL_TUTORS,
  INITIAL_RELACIONES,
} from '../data/initialData';

export interface BookingResult {
  success: boolean;
  appointment?: Appointment;
  error?: string;
  suggestedSlots?: string[];
}

export interface ReleasedSlotAlert {
  appointmentId: string;
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

  // Tutors and Personas a Cargo
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
  }) => { success: boolean; patient?: Patient; error?: string };
  getPersonasACargo: (tutorId?: string) => Array<Patient & {
    paciente: Patient;
    relacion: TipoRelacionTutor;
    tipoRelacion: TipoRelacionTutor;
    esPrincipal: boolean;
    responsablePrincipal: boolean;
    autorizado: boolean;
    autorizadoAGestionarTurnos: boolean;
  }>;
  getTutoresDePaciente: (pacienteId: string) => Array<Tutor & { relacion: TipoRelacionTutor; responsablePrincipal: boolean; autorizado: boolean }>;
  calculateAge: (fechaNacimientoStr: string) => { years: number; months: number; totalMonths: number };

  // Real-time / demo notifications
  releasedSlotAlert: ReleasedSlotAlert | null;
  dismissReleasedSlotAlert: () => void;
  patientSlotOffer: { especialidad: string; fecha: string; hora: string } | null;
  dismissPatientSlotOffer: () => void;
  acceptPatientSlotOffer: () => void;

  // WhatsApp Simulator
  isWhatsAppOpen: boolean;
  setIsWhatsAppOpen: (open: boolean) => void;
  openWhatsAppSimulator: () => void;
  closeWhatsAppSimulator: () => void;

  // Demo flow tracking
  currentDemoStep: number;
  setCurrentDemoStep: (step: number) => void;
  advanceDemoStep: () => void;

  // Validation utilities
  validatePediatricAge: (edad: number, meses?: number) => { valid: boolean; error?: string };
  isDateWithin30Days: (fechaStr: string) => { valid: boolean; error?: string };

  // Core business operations
  bookAppointment: (data: {
    pacienteId?: string;
    pacienteNombre: string;
    pacienteDni?: string;
    pacienteEdad?: number;
    pacienteLocalidad: Localidad;
    tutorSolicitanteId?: string;
    tutorSolicitanteNombre?: string;
    tutorSolicitanteRelacion?: string;
    tutorSolicitanteTelefono?: string;
    tipoPrestacion?: TipoPrestacion;
    tipoAgenda?: TipoAgenda;
    especialidad: string;
    profesional?: string;
    fecha: string;
    hora: string;
    origenCanal: RequestChannel;
    tieneDerivacion?: boolean;
    tipoConsulta?: 'Primera consulta' | 'Control' | 'Estudio' | 'Laboratorio' | 'Odontología';
    motivoResumido?: string;
    optimizadoViaje?: boolean;
  }) => BookingResult;

  cancelAppointment: (appointmentId: string, motivo?: string) => void;
  rescheduleAppointment: (appointmentId: string, nuevaFecha: string, nuevaHora: string) => boolean;
  updateAppointmentStatus: (appointmentId: string, status: AppointmentStatus) => void;
  assignWaitlistCandidate: (
    waitlistId: string,
    appointmentId?: string,
    customSlot?: { fecha: string; hora: string; doctor: string }
  ) => void;
  addToWaitlist: (data: {
    pacienteId?: string;
    pacienteNombre: string;
    dni: string;
    edad: number;
    especialidad: string;
    tipoPrestacion?: TipoPrestacion;
    localidad: Localidad;
    preferenciaHorario: 'cualquiera' | 'manana' | 'tarde';
    prioridad: 'alta' | 'normal';
    telefono: string;
    motivo?: string;
    tutorResponsableId?: string;
    tutorResponsableNombre?: string;
    tutorResponsableTelefono?: string;
    tutorResponsableRelacion?: string;
    origenCanal?: RequestChannel;
  }) => WaitlistEntry;
  removeFromWaitlist: (waitlistId: string) => void;
  processInboundRequest: (requestId: string, appointmentData?: Partial<Appointment>) => void;

  // Urgencies (24h sin turno)
  registerUrgency: (data: Omit<UrgencyEntry, 'id' | 'fechaHora' | 'estado'>) => UrgencyEntry;

  // Doctor Delay & Absence
  reportDoctorDelay: (doctorId: string, minutes: number) => void;
  clearDoctorDelay: (doctorId: string) => void;
  reportDoctorAbsence: (doctorId: string, motivo: string) => void;
  clearDoctorAbsence: (doctorId: string) => void;
  reassignDoctorAppointment: (
    appointmentId: string,
    newDoctorName: string,
    newDoctorId?: string,
    newFecha?: string,
    newHora?: string
  ) => boolean;

  // Trip Optimization (Asistente Social / Interior)
  optimizePatientVisits: (pacienteNombreOrId: string) => TripOptimizationResult;

  // Patients
  registerPatient: (patientData: Omit<Patient, 'id'>) => { success: boolean; patient?: Patient; error?: string };

  // Admin configurations
  addSpecialty: (specialty: Specialty) => void;
  updateSpecialty: (specialty: Specialty) => void;
  addDoctor: (doctor: Doctor) => void;
  updateDoctor: (doctor: Doctor) => void;

  // Reset
  resetDemoData: () => void;
}

const STORAGE_KEY = 'hosp_juan_pablo_ii_state_v4';

const HospitalContext = createContext<HospitalContextType | undefined>(undefined);

export const HospitalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>('familiar');
  const [currentDemoStep, setCurrentDemoStep] = useState<number>(1);
  const [releasedSlotAlert, setReleasedSlotAlert] = useState<ReleasedSlotAlert | null>(null);
  const [patientSlotOffer, setPatientSlotOffer] = useState<{ especialidad: string; fecha: string; hora: string } | null>(null);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const openWhatsAppSimulator = () => setIsWhatsAppOpen(true);
  const closeWhatsAppSimulator = () => setIsWhatsAppOpen(false);

  const [tutors, setTutors] = useState<Tutor[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_tutors`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_TUTORS;
  });

  const [currentTutorState, setCurrentTutorState] = useState<Tutor>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_current_tutor`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) return parsed;
      }
    } catch (e) {}
    return INITIAL_TUTORS[0];
  });

  const currentTutor: Tutor =
    currentTutorState && currentTutorState.id
      ? currentTutorState
      : (tutors && tutors[0]) || INITIAL_TUTORS[0];

  const setCurrentTutor = (tutor: Tutor) => {
    setCurrentTutorState(tutor);
    try {
      localStorage.setItem(`${STORAGE_KEY}_current_tutor`, JSON.stringify(tutor));
    } catch (e) {
      console.error(e);
    }
  };

  const [relaciones, setRelaciones] = useState<RelacionTutorPaciente[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_relaciones`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_RELACIONES;
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_appointments`);
    return saved ? JSON.parse(saved) : INITIAL_APPOINTMENTS;
  });

  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_waitlist`);
    return saved ? JSON.parse(saved) : INITIAL_WAITLIST;
  });

  const [inboundRequests, setInboundRequests] = useState<InboundRequest[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_requests`);
    return saved ? JSON.parse(saved) : INITIAL_INBOUND_REQUESTS;
  });

  const [patients, setPatients] = useState<Patient[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_patients`);
    return saved ? JSON.parse(saved) : INITIAL_PATIENTS;
  });

  const [doctors, setDoctors] = useState<Doctor[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_doctors`);
    return saved ? JSON.parse(saved) : INITIAL_DOCTORS;
  });

  const [specialties, setSpecialties] = useState<Specialty[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_specialties`);
    return saved ? JSON.parse(saved) : INITIAL_SPECIALTIES;
  });

  const [urgencies, setUrgencies] = useState<UrgencyEntry[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_urgencies`);
    return saved ? JSON.parse(saved) : INITIAL_URGENCIES;
  });

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_tutors`, JSON.stringify(tutors));
      localStorage.setItem(`${STORAGE_KEY}_relaciones`, JSON.stringify(relaciones));
      localStorage.setItem(`${STORAGE_KEY}_appointments`, JSON.stringify(appointments));
      localStorage.setItem(`${STORAGE_KEY}_waitlist`, JSON.stringify(waitlist));
      localStorage.setItem(`${STORAGE_KEY}_requests`, JSON.stringify(inboundRequests));
      localStorage.setItem(`${STORAGE_KEY}_patients`, JSON.stringify(patients));
      localStorage.setItem(`${STORAGE_KEY}_doctors`, JSON.stringify(doctors));
      localStorage.setItem(`${STORAGE_KEY}_specialties`, JSON.stringify(specialties));
      localStorage.setItem(`${STORAGE_KEY}_urgencies`, JSON.stringify(urgencies));
    } catch (e) {
      console.error('Failed to sync to localStorage', e);
    }
  }, [tutors, relaciones, appointments, waitlist, inboundRequests, patients, doctors, specialties, urgencies]);

  const advanceDemoStep = () => {
    setCurrentDemoStep((prev) => Math.min(prev + 1, 6));
  };

  const dismissReleasedSlotAlert = () => setReleasedSlotAlert(null);
  const dismissPatientSlotOffer = () => setPatientSlotOffer(null);

  const acceptPatientSlotOffer = () => {
    if (!patientSlotOffer) return;
    const newApt: Appointment = {
      id: `apt-offer-${Date.now()}`,
      codigo: `JP2-${Math.floor(10000 + Math.random() * 90000)}`,
      pacienteId: 'p1',
      pacienteNombre: 'Lucas Gómez',
      pacienteEdad: 8,
      pacienteLocalidad: 'Mercedes',
      tutorSolicitanteId: 'tut-maria',
      tutorSolicitanteNombre: 'María González',
      tutorSolicitanteRelacion: 'Madre',
      tutorSolicitanteTelefono: '+54 3794 451299',
      tipoPrestacion: 'consulta_medica',
      tipoAgenda: 'PROFESIONAL',
      especialidad: patientSlotOffer.especialidad,
      profesional: 'Dr. Juan Pérez',
      consultorio: '12',
      fecha: patientSlotOffer.fecha,
      hora: patientSlotOffer.hora,
      estado: 'PENDIENTE_DE_LLEGADA',
      origenCanal: 'web',
      tieneDerivacion: true,
      tipoConsulta: 'Primera consulta',
      motivoResumido: 'Turno aceptado desde lista de espera',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setAppointments((prev) => [newApt, ...prev]);
    setWaitlist((prev) =>
      prev.filter((w) => !(w.pacienteNombre === 'Lucas Gómez' && w.especialidad === patientSlotOffer.especialidad))
    );
    setPatientSlotOffer(null);
  };

  // Helper: calculate precise age in years and months based on reference date (Sept 2026)
  const calculateAge = (fechaNacimientoStr: string): { years: number; months: number; totalMonths: number } => {
    if (!fechaNacimientoStr) return { years: 0, months: 0, totalMonths: 0 };
    const birth = new Date(fechaNacimientoStr);
    const base = new Date('2026-09-09');
    let years = base.getFullYear() - birth.getFullYear();
    let months = base.getMonth() - birth.getMonth();
    if (base.getDate() < birth.getDate()) {
      months--;
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    const totalMonths = Math.max(0, years * 12 + months);
    return { years: Math.max(0, years), months: Math.max(0, months), totalMonths };
  };

  // Get personas a cargo for a given tutor
  const getPersonasACargo = (tutorId?: string) => {
    const effectiveTutorId = tutorId || currentTutor.id;
    const userRels = (relaciones || []).filter((r) => r.tutorId === effectiveTutorId);

    if (userRels.length === 0) {
      const fallbackPatient = (patients || []).find((pat) => pat.id === 'p1') || INITIAL_PATIENTS[0];
      return [
        {
          ...fallbackPatient,
          paciente: fallbackPatient,
          relacion: 'Madre' as TipoRelacionTutor,
          tipoRelacion: 'Madre' as TipoRelacionTutor,
          esPrincipal: true,
          responsablePrincipal: true,
          autorizado: true,
          autorizadoAGestionarTurnos: true,
        },
      ];
    }

    return userRels.map((r) => {
      const p = (patients || []).find((pat) => pat.id === r.pacienteId) ||
        INITIAL_PATIENTS.find((pat) => pat.id === r.pacienteId) || {
          id: r.pacienteId || `p-${r.id}`,
          dni: '55.123.456',
          nombre: 'Lucas Gómez',
          fechaNacimiento: '2018-05-10',
          edad: 8,
          localidad: 'Mercedes' as Localidad,
          telefono: '+54 3794 451299',
          tutor: 'María González',
          tutorId: effectiveTutorId,
          relacionConTutor: r.tipoRelacion || 'Madre',
        };

      return {
        ...p,
        paciente: p,
        relacion: r.tipoRelacion || 'Madre',
        tipoRelacion: r.tipoRelacion || 'Madre',
        esPrincipal: r.responsablePrincipal ?? true,
        responsablePrincipal: r.responsablePrincipal ?? true,
        autorizado: r.autorizadoAGestionarTurnos ?? true,
        autorizadoAGestionarTurnos: r.autorizadoAGestionarTurnos ?? true,
      };
    });
  };

  // Get all tutors associated with a given patient
  const getTutoresDePaciente = (pacienteId: string) => {
    const patRels = relaciones.filter((r) => r.pacienteId === pacienteId);
    return patRels.map((r) => {
      const tut = tutors.find((t) => t.id === r.tutorId);
      return {
        ...(tut || {
          id: r.tutorId,
          nombre: 'Tutor',
          apellido: '',
          dni: '',
          telefono: '',
          email: '',
          localidad: 'Mercedes' as Localidad,
        }),
        relacion: r.tipoRelacion,
        responsablePrincipal: r.responsablePrincipal,
        autorizado: r.autorizadoAGestionarTurnos,
      };
    });
  };

  // Add persona a cargo (under pediatric criteria: >1 month and <= 15 years)
  const addPersonaACargo = (data: {
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
  }): { success: boolean; patient?: Patient; error?: string } => {
    const ageCalc = calculateAge(data.fechaNacimiento);
    if (ageCalc.totalMonths <= 1) {
      return {
        success: false,
        error: 'El paciente no se encuentra dentro del rango etario de atención de este hospital. La atención pediátrica ambulatoria programada es para mayores de 1 mes de vida.',
      };
    }
    if (ageCalc.years >= 16) {
      return {
        success: false,
        error: 'El paciente no se encuentra dentro del rango etario de atención de este hospital. La atención comprende hasta los 15 años inclusive.',
      };
    }

    const targetTutor = tutors.find((t) => t.id === (data.tutorId || currentTutor.id)) || currentTutor;
    const fullName = data.apellido ? `${data.nombre} ${data.apellido}` : data.nombre;
    const newPatientId = `p-${Date.now()}`;

    const newPatient: Patient = {
      id: newPatientId,
      dni: data.dni,
      nombre: fullName,
      apellido: data.apellido,
      fechaNacimiento: data.fechaNacimiento,
      edad: ageCalc.years,
      edadMeses: ageCalc.months,
      sexo: data.sexo || 'M',
      localidad: data.localidad,
      telefono: data.telefono || targetTutor.telefono,
      tutor: `${targetTutor.nombre} ${targetTutor.apellido}`,
      tutorId: targetTutor.id,
      relacionConTutor: data.relacion,
      distanciaKm: data.localidad === 'Corrientes Capital' ? 0 : 245,
      antecedentes: data.antecedentes || '',
    };

    const newRel: RelacionTutorPaciente = {
      id: `rel-${Date.now()}`,
      tutorId: targetTutor.id,
      pacienteId: newPatientId,
      tipoRelacion: data.relacion,
      responsablePrincipal: true,
      autorizadoAGestionarTurnos: true,
    };

    setPatients((prev) => [newPatient, ...prev]);
    setRelaciones((prev) => [...prev, newRel]);

    return { success: true, patient: newPatient };
  };

  // Age validation: Patients must be > 1 month of age and <= 15 years old
  const validatePediatricAge = (edad: number, meses?: number): { valid: boolean; error?: string } => {
    if (meses !== undefined && meses <= 1 && edad === 0) {
      return {
        valid: false,
        error: 'El paciente no se encuentra dentro del rango etario de atención de este hospital. La atención pediátrica ambulatoria programada es para mayores de 1 mes de vida.',
      };
    }
    if (edad < 0.08) {
      return {
        valid: false,
        error: 'El paciente no se encuentra dentro del rango etario de atención de este hospital. La atención es a partir de 1 mes de vida.',
      };
    }
    if (edad >= 16) {
      return {
        valid: false,
        error: 'El paciente no se encuentra dentro del rango etario de atención de este hospital.',
      };
    }
    return { valid: true };
  };

  // Date limit: up to 30 days ahead from baseline
  const isDateWithin30Days = (fechaStr: string): { valid: boolean; error?: string } => {
    const baseDate = new Date('2026-09-09');
    const targetDate = new Date(fechaStr);
    const diffTime = targetDate.getTime() - baseDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { valid: false, error: 'No se pueden seleccionar fechas pasadas.' };
    }
    if (diffDays > 30) {
      return {
        valid: false,
        error: 'Los turnos disponibles se habilitan con hasta 30 días de anticipación.',
      };
    }
    return { valid: true };
  };

  // Patient Registration with Age Validation
  const registerPatient = (patientData: Omit<Patient, 'id'>): { success: boolean; patient?: Patient; error?: string } => {
    const ageCheck = validatePediatricAge(patientData.edad, patientData.edadMeses);
    if (!ageCheck.valid) {
      return { success: false, error: ageCheck.error };
    }

    const newPatient: Patient = {
      id: `p-${Date.now()}`,
      ...patientData,
    };
    setPatients((prev) => [newPatient, ...prev]);
    return { success: true, patient: newPatient };
  };

  // Booking with collision check, age validation, and agenda type
  const bookAppointment = (data: {
    pacienteId?: string;
    pacienteNombre: string;
    pacienteDni?: string;
    pacienteEdad?: number;
    pacienteLocalidad: Localidad;
    tutorSolicitanteId?: string;
    tutorSolicitanteNombre?: string;
    tutorSolicitanteRelacion?: string;
    tutorSolicitanteTelefono?: string;
    tipoPrestacion?: TipoPrestacion;
    tipoAgenda?: TipoAgenda;
    especialidad: string;
    profesional?: string;
    fecha: string;
    hora: string;
    origenCanal: RequestChannel;
    tieneDerivacion?: boolean;
    tipoConsulta?: 'Primera consulta' | 'Control' | 'Estudio' | 'Laboratorio' | 'Odontología';
    motivoResumido?: string;
    optimizadoViaje?: boolean;
  }): BookingResult => {
    // 1. Age validation
    const age = data.pacienteEdad !== undefined ? data.pacienteEdad : 8;
    const ageCheck = validatePediatricAge(age);
    if (!ageCheck.valid) {
      return {
        success: false,
        error: ageCheck.error,
      };
    }

    // 2. Date 30 days check
    const dateCheck = isDateWithin30Days(data.fecha);
    if (!dateCheck.valid) {
      return {
        success: false,
        error: dateCheck.error,
      };
    }

    // 3. Determine Agenda Type
    const spec = specialties.find((s) => s.nombre.toLowerCase() === data.especialidad.toLowerCase());
    const tipoAgenda: TipoAgenda = data.tipoAgenda || spec?.tipoAgenda || 'PROFESIONAL';
    const tipoPrestacion: TipoPrestacion = data.tipoPrestacion || spec?.tipoPrestacion || 'consulta_medica';

    // Doctor determination
    let profesionalName = data.profesional;
    let doctorId: string | undefined;
    let consultorio = '12';

    if (tipoAgenda === 'SERVICIO') {
      if (!profesionalName || profesionalName.toLowerCase().includes('asignar')) {
        profesionalName = 'Se asignará al momento de la atención';
      }
      consultorio = spec?.consultoriosHabilitados[0] || '1';
    } else {
      if (!profesionalName || profesionalName.toLowerCase().includes('asignar')) {
        const availableDoc = doctors.find((d) => d.especialidad.toLowerCase() === data.especialidad.toLowerCase() && !d.ausente);
        profesionalName = availableDoc ? availableDoc.nombre : 'Dr. Juan Pérez';
        doctorId = availableDoc?.id;
        consultorio = availableDoc?.consultorio || '12';
      } else {
        const doc = doctors.find((d) => d.nombre.toLowerCase() === profesionalName?.toLowerCase());
        doctorId = doc?.id;
        consultorio = doc?.consultorio || '12';
      }
    }

    // 4. Anti-duplication check:
    const activeAppointments = appointments.filter((a) => a.estado !== 'CANCELADO');

    if (tipoAgenda === 'PROFESIONAL' && profesionalName !== 'Se asignará al momento de la atención') {
      const occupied = activeAppointments.find(
        (a) =>
          a.fecha === data.fecha &&
          a.hora === data.hora &&
          a.profesional.toLowerCase() === profesionalName!.toLowerCase()
      );

      if (occupied) {
        const candidateHours = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30'];
        const suggestedSlots = candidateHours.filter((h) => {
          return !activeAppointments.some(
            (a) =>
              a.fecha === data.fecha &&
              a.hora === h &&
              a.profesional.toLowerCase() === profesionalName!.toLowerCase()
          );
        }).slice(0, 3);

        return {
          success: false,
          error: `Este horario (${data.hora} hs) ya se encuentra asignado para ${profesionalName}.`,
          suggestedSlots: suggestedSlots.length > 0 ? suggestedSlots : ['11:00', '11:30', '12:00'],
        };
      }
    } else {
      // Service agenda collision check (max 3 per slot for service)
      const countInSlot = activeAppointments.filter(
        (a) => a.fecha === data.fecha && a.hora === data.hora && a.especialidad.toLowerCase() === data.especialidad.toLowerCase()
      ).length;

      if (countInSlot >= 3) {
        return {
          success: false,
          error: `La capacidad para ${data.especialidad} en el horario de las ${data.hora} hs está completa.`,
          suggestedSlots: ['11:00', '11:30', '12:00'],
        };
      }
    }

    // Find or register patient
    let patient = data.pacienteId ? patients.find((p) => p.id === data.pacienteId) : undefined;
    if (!patient) {
      patient = patients.find((p) => p.nombre.toLowerCase() === data.pacienteNombre.toLowerCase());
    }
    if (!patient && data.pacienteDni) {
      patient = patients.find((p) => p.dni.replace(/\D/g, '') === data.pacienteDni?.replace(/\D/g, ''));
    }

    const patientId = data.pacienteId || patient?.id || `p-new-${Date.now()}`;
    const tutorId = data.tutorSolicitanteId || currentTutor.id;
    const tutorObj = tutors.find((t) => t.id === tutorId) || currentTutor;
    const tutorNombre = data.tutorSolicitanteNombre || `${tutorObj.nombre} ${tutorObj.apellido}`;
    const tutorRelacion = data.tutorSolicitanteRelacion || patient?.relacionConTutor || 'Tutor responsable';
    const tutorTelefono = data.tutorSolicitanteTelefono || tutorObj.telefono;

    if (!patient) {
      const estimatedBirthYear = 2026 - Math.floor(age);
      const newPatient: Patient = {
        id: patientId,
        dni: data.pacienteDni || `${Math.floor(50000000 + Math.random() * 10000000)}`,
        nombre: data.pacienteNombre,
        fechaNacimiento: `${estimatedBirthYear}-01-01`,
        edad: age,
        localidad: data.pacienteLocalidad,
        telefono: tutorTelefono,
        tutor: tutorNombre,
        tutorId: tutorId,
        relacionConTutor: tutorRelacion,
      };
      setPatients((prev) => [...prev, newPatient]);
    }

    const newAppointment: Appointment = {
      id: `apt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      codigo: `JP2-${Math.floor(10000 + Math.random() * 90000)}`,
      pacienteId: patientId,
      pacienteNombre: data.pacienteNombre,
      pacienteEdad: age,
      pacienteLocalidad: data.pacienteLocalidad,
      tutorSolicitanteId: tutorId,
      tutorSolicitanteNombre: tutorNombre,
      tutorSolicitanteRelacion: tutorRelacion,
      tutorSolicitanteTelefono: tutorTelefono,
      tipoPrestacion,
      tipoAgenda,
      especialidad: data.especialidad,
      profesional: profesionalName,
      profesionalId: doctorId,
      consultorio,
      fecha: data.fecha,
      hora: data.hora,
      estado: 'PENDIENTE_DE_LLEGADA',
      origenCanal: data.origenCanal,
      tieneDerivacion: data.tieneDerivacion !== undefined ? data.tieneDerivacion : true,
      tipoConsulta: data.tipoConsulta || 'Primera consulta',
      motivoResumido: data.motivoResumido || 'Atención pediátrica programada',
      optimizadoViaje: data.optimizadoViaje || false,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setAppointments((prev) => [newAppointment, ...prev]);

    // Clean waitlist if candidate is already waiting for this specialty
    setWaitlist((prev) =>
      prev.filter(
        (w) =>
          !(
            w.pacienteNombre.toLowerCase() === data.pacienteNombre.toLowerCase() &&
            w.especialidad.toLowerCase() === data.especialidad.toLowerCase()
          )
      )
    );

    return {
      success: true,
      appointment: newAppointment,
    };
  };

  // Cancel appointment and alert waitlist candidates
  const cancelAppointment = (appointmentId: string, motivo?: string) => {
    let cancelledApt: Appointment | undefined;

    setAppointments((prev) =>
      prev.map((a) => {
        if (a.id === appointmentId) {
          cancelledApt = { ...a, estado: 'CANCELADO', observaciones: motivo || 'Cancelado' };
          return cancelledApt;
        }
        return a;
      })
    );

    if (cancelledApt) {
      const compatibleCandidates = waitlist.filter(
        (w) => w.especialidad.toLowerCase() === cancelledApt!.especialidad.toLowerCase() && w.estado === 'esperando'
      );

      if (compatibleCandidates.length > 0) {
        setReleasedSlotAlert({
          appointmentId: cancelledApt.id,
          especialidad: cancelledApt.especialidad,
          fecha: cancelledApt.fecha,
          hora: cancelledApt.hora,
          profesional: cancelledApt.profesional,
          matchingCandidates: compatibleCandidates,
        });
      }
    }
  };

  const rescheduleAppointment = (appointmentId: string, nuevaFecha: string, nuevaHora: string): boolean => {
    const apt = appointments.find((a) => a.id === appointmentId);
    if (!apt) return false;

    const dateCheck = isDateWithin30Days(nuevaFecha);
    if (!dateCheck.valid) return false;

    const occupied = appointments.find(
      (a) =>
        a.id !== appointmentId &&
        a.fecha === nuevaFecha &&
        a.hora === nuevaHora &&
        a.profesional.toLowerCase() === apt.profesional.toLowerCase() &&
        a.estado !== 'CANCELADO'
    );

    if (occupied) return false;

    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? { ...a, fecha: nuevaFecha, hora: nuevaHora, estado: 'PENDIENTE_DE_LLEGADA' } : a))
    );
    return true;
  };

  const updateAppointmentStatus = (appointmentId: string, status: AppointmentStatus) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? { ...a, estado: status } : a))
    );
  };

  // Assign Waitlist Candidate with manual confirmation
  const assignWaitlistCandidate = (
    waitlistId: string,
    appointmentId?: string,
    customSlot?: { fecha: string; hora: string; doctor: string }
  ) => {
    const candidate = waitlist.find((w) => w.id === waitlistId);
    if (!candidate) return;

    let targetDate = customSlot?.fecha || '2026-09-09';
    let targetTime = customSlot?.hora || '10:30';
    let targetDoctor = customSlot?.doctor || 'Dr. Juan Pérez';

    if (appointmentId) {
      const apt = appointments.find((a) => a.id === appointmentId);
      if (apt) {
        targetDate = apt.fecha;
        targetTime = apt.hora;
        targetDoctor = apt.profesional;
      }
    } else if (releasedSlotAlert) {
      targetDate = releasedSlotAlert.fecha;
      targetTime = releasedSlotAlert.hora;
      targetDoctor = releasedSlotAlert.profesional;
    }

    const spec = specialties.find((s) => s.nombre.toLowerCase() === candidate.especialidad.toLowerCase());

    const newApt: Appointment = {
      id: `apt-wl-${Date.now()}`,
      codigo: `JP2-${Math.floor(10000 + Math.random() * 90000)}`,
      pacienteId: candidate.pacienteId,
      pacienteNombre: candidate.pacienteNombre,
      pacienteEdad: candidate.edad || 8,
      pacienteLocalidad: candidate.localidad,
      tutorSolicitanteId: candidate.tutorResponsableId || currentTutor.id,
      tutorSolicitanteNombre: candidate.tutorResponsableNombre || `${currentTutor.nombre} ${currentTutor.apellido}`,
      tutorSolicitanteRelacion: candidate.tutorResponsableRelacion || 'Tutor responsable',
      tutorSolicitanteTelefono: candidate.tutorResponsableTelefono || candidate.telefono,
      tipoPrestacion: candidate.tipoPrestacion || 'consulta_medica',
      tipoAgenda: spec?.tipoAgenda || 'PROFESIONAL',
      especialidad: candidate.especialidad,
      profesional: targetDoctor,
      consultorio: '12',
      fecha: targetDate,
      hora: targetTime,
      estado: 'PENDIENTE_DE_LLEGADA',
      origenCanal: 'telefono',
      tieneDerivacion: true,
      tipoConsulta: 'Primera consulta',
      motivoResumido: 'Reasignado desde lista de espera priorizada',
      createdAt: new Date().toISOString().split('T')[0],
    };

    setAppointments((prev) => [newApt, ...prev]);
    setWaitlist((prev) => prev.filter((w) => w.id !== waitlistId));
    setReleasedSlotAlert(null);
  };

  const addToWaitlist = (data: {
    pacienteId?: string;
    pacienteNombre: string;
    dni: string;
    edad: number;
    especialidad: string;
    tipoPrestacion?: TipoPrestacion;
    localidad: Localidad;
    preferenciaHorario: 'cualquiera' | 'manana' | 'tarde';
    prioridad: 'alta' | 'normal';
    telefono: string;
    motivo?: string;
    tutorResponsableId?: string;
    tutorResponsableNombre?: string;
    tutorResponsableTelefono?: string;
    tutorResponsableRelacion?: string;
    origenCanal?: RequestChannel;
  }): WaitlistEntry => {
    const existingCount = waitlist.filter((w) => w.especialidad === data.especialidad).length;
    const pat = data.pacienteId ? patients.find((p) => p.id === data.pacienteId) : undefined;
    const targetTutorId = data.tutorResponsableId || currentTutor.id;
    const targetTutor = tutors.find((t) => t.id === targetTutorId) || currentTutor;

    const newEntry: WaitlistEntry = {
      id: `wl-${Date.now()}`,
      pacienteId: data.pacienteId || `p-${Date.now()}`,
      pacienteNombre: data.pacienteNombre,
      dni: data.dni,
      edad: data.edad,
      especialidad: data.especialidad,
      tipoPrestacion: data.tipoPrestacion || 'consulta_medica',
      localidad: data.localidad,
      fechaSolicitud: '09/09/2026',
      preferenciaHorario: data.preferenciaHorario,
      prioridad: data.prioridad,
      telefono: data.telefono || targetTutor.telefono,
      estado: 'esperando',
      posicion: existingCount + 1,
      motivo: data.motivo || 'Espera de turno por falta de disponibilidad',
      tutorResponsableId: targetTutorId,
      tutorResponsableNombre: data.tutorResponsableNombre || `${targetTutor.nombre} ${targetTutor.apellido}`,
      tutorResponsableTelefono: data.tutorResponsableTelefono || targetTutor.telefono,
      tutorResponsableRelacion: data.tutorResponsableRelacion || pat?.relacionConTutor || 'Tutor responsable',
      origenCanal: data.origenCanal || 'web',
    };

    setWaitlist((prev) => [newEntry, ...prev]);
    return newEntry;
  };

  const removeFromWaitlist = (waitlistId: string) => {
    setWaitlist((prev) => prev.filter((w) => w.id !== waitlistId));
  };

  const processInboundRequest = (requestId: string, appointmentData?: Partial<Appointment>) => {
    const req = inboundRequests.find((r) => r.id === requestId);
    if (!req) return;

    if (appointmentData) {
      const bookRes = bookAppointment({
        pacienteNombre: appointmentData.pacienteNombre || req.interpretacion.pacienteNombre,
        pacienteLocalidad: appointmentData.pacienteLocalidad || req.interpretacion.localidad,
        especialidad: appointmentData.especialidad || req.interpretacion.especialidad,
        tipoAgenda: appointmentData.tipoAgenda || req.interpretacion.tipoAgenda,
        tipoPrestacion: appointmentData.tipoPrestacion || req.interpretacion.tipoPrestacion,
        profesional: appointmentData.profesional || 'Dr. Juan Pérez',
        fecha: appointmentData.fecha || '2026-09-09',
        hora: appointmentData.hora || '11:30',
        origenCanal: req.canal,
        tieneDerivacion: true,
        tipoConsulta: (appointmentData.tipoConsulta as any) || (req.interpretacion.tipoConsulta as any) || 'Primera consulta',
        motivoResumido: req.mensajeOriginal,
      });

      if (bookRes.success) {
        setInboundRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, estado: 'asignado' } : r))
        );
      }
    } else {
      setInboundRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, estado: 'asignado' } : r))
      );
    }
  };

  // Register Urgency (24h sin turno)
  const registerUrgency = (data: Omit<UrgencyEntry, 'id' | 'fechaHora' | 'estado'>): UrgencyEntry => {
    const newUrgency: UrgencyEntry = {
      id: `urg-${Date.now()}`,
      ...data,
      fechaHora: '09/09/2026 ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs',
      estado: 'en_atencion_urgencia',
    };
    setUrgencies((prev) => [newUrgency, ...prev]);
    return newUrgency;
  };

  // Doctor Delay
  const reportDoctorDelay = (doctorId: string, minutes: number) => {
    setDoctors((prev) =>
      prev.map((d) => (d.id === doctorId ? { ...d, demoraMinutos: minutes } : d))
    );
  };

  const clearDoctorDelay = (doctorId: string) => {
    setDoctors((prev) =>
      prev.map((d) => (d.id === doctorId ? { ...d, demoraMinutos: 0 } : d))
    );
  };

  // Doctor Absence
  const reportDoctorAbsence = (doctorId: string, motivo: string) => {
    setDoctors((prev) =>
      prev.map((d) => (d.id === doctorId ? { ...d, ausente: true, motivoAusencia: motivo } : d))
    );
  };

  const clearDoctorAbsence = (doctorId: string) => {
    setDoctors((prev) =>
      prev.map((d) => (d.id === doctorId ? { ...d, ausente: false, motivoAusencia: undefined } : d))
    );
  };

  // Reassign affected appointment due to absence
  const reassignDoctorAppointment = (
    appointmentId: string,
    newDoctorName: string,
    newDoctorId?: string,
    newFecha?: string,
    newHora?: string
  ): boolean => {
    setAppointments((prev) =>
      prev.map((a) => {
        if (a.id === appointmentId) {
          return {
            ...a,
            profesional: newDoctorName,
            profesionalId: newDoctorId || a.profesionalId,
            fecha: newFecha || a.fecha,
            hora: newHora || a.hora,
            estado: 'PENDIENTE_DE_LLEGADA',
            observaciones: `Reubicado por ausencia de profesional previo`,
          };
        }
        return a;
      })
    );
    return true;
  };

  // Trip Optimization for interior patients
  const optimizePatientVisits = (pacienteNombreOrId: string): TripOptimizationResult => {
    const targetApts = appointments.filter(
      (a) =>
        (a.pacienteId === pacienteNombreOrId || a.pacienteNombre.toLowerCase() === pacienteNombreOrId.toLowerCase()) &&
        a.estado !== 'CANCELADO'
    );

    const proposedDate = '2026-09-16'; // Consolidated single day (Wednesday)

    // Proposed schedule sequence
    const scheduleSequence = [
      { hora: '08:30', tipo: 'laboratorio' },
      { hora: '10:30', tipo: 'consulta_medica' },
      { hora: '13:00', tipo: 'consulta_medica' },
    ];

    const updated = targetApts.map((a, idx) => {
      const slot = scheduleSequence[idx % scheduleSequence.length];
      return {
        ...a,
        fecha: proposedDate,
        hora: slot.hora,
        optimizadoViaje: true,
        observaciones: 'Visita optimizada: Múltiples prestaciones en un solo viaje.',
      };
    });

    setAppointments((prev) =>
      prev.map((a) => {
        const matchingUpdated = updated.find((u) => u.id === a.id);
        return matchingUpdated || a;
      })
    );

    return {
      originalTrips: targetApts.length > 0 ? targetApts.length : 3,
      optimizedTrips: 1,
      avoidedTrips: targetApts.length > 1 ? targetApts.length - 1 : 2,
      proposedDate,
      affectedAppointments: updated,
    };
  };

  const addSpecialty = (specialty: Specialty) => {
    setSpecialties((prev) => [...prev, specialty]);
  };

  const updateSpecialty = (specialty: Specialty) => {
    setSpecialties((prev) => prev.map((s) => (s.id === specialty.id ? specialty : s)));
  };

  const addDoctor = (doctor: Doctor) => {
    setDoctors((prev) => [...prev, doctor]);
  };

  const updateDoctor = (doctor: Doctor) => {
    setDoctors((prev) => prev.map((d) => (d.id === doctor.id ? doctor : d)));
  };

  const resetDemoData = () => {
    localStorage.removeItem(`${STORAGE_KEY}_tutors`);
    localStorage.removeItem(`${STORAGE_KEY}_current_tutor`);
    localStorage.removeItem(`${STORAGE_KEY}_relaciones`);
    localStorage.removeItem(`${STORAGE_KEY}_appointments`);
    localStorage.removeItem(`${STORAGE_KEY}_waitlist`);
    localStorage.removeItem(`${STORAGE_KEY}_requests`);
    localStorage.removeItem(`${STORAGE_KEY}_patients`);
    localStorage.removeItem(`${STORAGE_KEY}_doctors`);
    localStorage.removeItem(`${STORAGE_KEY}_specialties`);
    localStorage.removeItem(`${STORAGE_KEY}_urgencies`);

    setTutors(INITIAL_TUTORS);
    setCurrentTutorState(INITIAL_TUTORS[0]);
    setRelaciones(INITIAL_RELACIONES);
    setAppointments(INITIAL_APPOINTMENTS);
    setWaitlist(INITIAL_WAITLIST);
    setInboundRequests(INITIAL_INBOUND_REQUESTS);
    setPatients(INITIAL_PATIENTS);
    setDoctors(INITIAL_DOCTORS);
    setSpecialties(INITIAL_SPECIALTIES);
    setUrgencies(INITIAL_URGENCIES);
    setReleasedSlotAlert(null);
    setPatientSlotOffer(null);
    setCurrentDemoStep(1);
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
        tutors,
        currentTutor,
        setCurrentTutor,
        relaciones,
        addPersonaACargo,
        getPersonasACargo,
        getTutoresDePaciente,
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
        addDoctor,
        updateDoctor,
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
