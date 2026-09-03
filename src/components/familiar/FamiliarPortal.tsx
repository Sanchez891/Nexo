import React, { useState, useEffect } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { Appointment, AppointmentStatus, TipoRelacionTutor, Localidad } from '../../types';
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  PlusCircle,
  RotateCcw,
  XCircle,
  CheckCircle2,
  CalendarDays,
  UserCheck,
  Building2,
  AlertTriangle,
  FileCheck,
  ChevronRight,
  Sparkles,
  Hourglass,
  Users,
  User,
  ShieldCheck,
  Heart,
  Phone,
  Mail,
  Plus,
  ArrowLeftRight,
  X,
  MessageSquare,
} from 'lucide-react';
import { WebAppointmentWizard } from './WebAppointmentWizard';
import { FamiliarWaitlist } from './FamiliarWaitlist';
import { AvailableSlot, getSlotsDisponibles } from '../../services/agenda.service';
import { realProfesionalId } from '../../services/professionals.service';

export const FamiliarPortal: React.FC = () => {
  const {
    appointments,
    doctors,
    specialties,
    cancelAppointment,
    rescheduleAppointment,
    tutors,
    currentTutor,
    setCurrentTutor,
    getPersonasACargo,
    addPersonaACargo,
    calculateAge,
    validatePediatricAge,
    openWhatsAppSimulator,
  } = useHospital();

  const [activeTab, setActiveTab] = useState<'inicio' | 'personas-a-cargo' | 'nuevo-turno' | 'mis-turnos' | 'lista-espera'>('inicio');
  const [selectedPersonaFilter, setSelectedPersonaFilter] = useState<string>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showAddPersonaModal, setShowAddPersonaModal] = useState(false);
  const [rescheduleSlots, setRescheduleSlots] = useState<AvailableSlot[]>([]);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState<AvailableSlot | null>(null);

  useEffect(() => {
    if (!showRescheduleModal || !selectedAppointment) return;
    const servicio = specialties.find((s) => s.nombre === selectedAppointment.especialidad);
    if (!servicio) return;

    setLoadingRescheduleSlots(true);
    setSelectedRescheduleSlot(null);
    getSlotsDisponibles({
      servicioId: servicio.id,
      profesionalId: selectedAppointment.profesionalId ? realProfesionalId(selectedAppointment.profesionalId) : undefined,
      tipoAgenda: servicio.tipoAgenda,
    })
      .then(setRescheduleSlots)
      .finally(() => setLoadingRescheduleSlots(false));
  }, [showRescheduleModal, selectedAppointment, specialties]);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  // New Persona a Cargo Form State
  const [newPersonaNombre, setNewPersonaNombre] = useState('');
  const [newPersonaApellido, setNewPersonaApellido] = useState('');
  const [newPersonaDni, setNewPersonaDni] = useState('');
  const [newPersonaFechaNac, setNewPersonaFechaNac] = useState('2020-04-15');
  const [newPersonaLocalidad, setNewPersonaLocalidad] = useState<Localidad>(currentTutor?.localidad || 'Mercedes');
  const [newPersonaRelacion, setNewPersonaRelacion] = useState<TipoRelacionTutor>('Madre');
  const [newPersonaAutorizado, setNewPersonaAutorizado] = useState(true);
  const [newPersonaError, setNewPersonaError] = useState<string | null>(null);

  // Personas a cargo of current tutor
  const personasACargo = getPersonasACargo(currentTutor?.id);
  const personaIds = new Set(personasACargo.map((p) => p.paciente?.id || p.id));
  const personaNombres = new Set(
    personasACargo.map((p) => (p.paciente?.nombre || p.nombre || '').toLowerCase())
  );

  // Filter appointments for this tutor's personas a cargo
  const tutorAppointments = appointments.filter((a) => {
    if (currentTutor?.id && a.tutorSolicitanteId === currentTutor.id) return true;
    if (a.pacienteId && personaIds.has(a.pacienteId)) return true;
    if (personaNombres.has(a.pacienteNombre.toLowerCase())) return true;
    return false;
  });

  const activeTutorAppointments = tutorAppointments.filter((a) => a.estado !== 'CANCELADO');

  // Filter by selected persona if not 'all'
  const filteredAppointments = selectedPersonaFilter === 'all'
    ? activeTutorAppointments
    : activeTutorAppointments.filter((a) => {
        const p = personasACargo.find((item) => (item.paciente?.id || item.id) === selectedPersonaFilter);
        const pName = (p?.paciente?.nombre || p?.nombre || '').toLowerCase();
        return a.pacienteId === selectedPersonaFilter || (pName && a.pacienteNombre.toLowerCase() === pName);
      });

  // Find the primary featured upcoming appointment
  const proximoTurno = activeTutorAppointments.find((a) => a.estado === 'PENDIENTE_DE_LLEGADA' || a.estado === 'EN_ESPERA') || activeTutorAppointments[0];

  const assignedDoc = doctors.find((d) => d.nombre === proximoTurno?.profesional);
  const docDelay = assignedDoc?.demoraMinutos || 0;
  const docAbsent = assignedDoc?.ausente || false;

  const getStatusDisplay = (estado: AppointmentStatus) => {
    switch (estado) {
      case 'PENDIENTE_DE_LLEGADA':
        return { label: 'Programado', style: 'bg-stone-100 text-stone-700 border-stone-200' };
      case 'EN_ESPERA':
        return { label: 'En sala de espera', style: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'EN_CONSULTORIO':
        return { label: 'En atención médica', style: 'bg-teal-50 text-teal-800 border-teal-200 animate-pulse' };
      case 'ATENDIDO':
        return { label: 'Atendido', style: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'CANCELADO':
        return { label: 'Cancelado', style: 'bg-rose-50 text-rose-800 border-rose-200' };
      case 'NO_ASISTIO':
        return { label: 'No asistió', style: 'bg-stone-200 text-stone-600 border-stone-300' };
      default:
        return { label: estado, style: 'bg-stone-100 text-stone-700 border-stone-200' };
    }
  };

  const getRelacionLabel = (rel: TipoRelacionTutor | string) => {
    switch (rel) {
      case 'madre': return 'Madre';
      case 'padre': return 'Padre';
      case 'tutor_legal': return 'Tutor/a Legal';
      case 'abuela': return 'Abuela';
      case 'abuelo': return 'Abuelo';
      case 'familiar_responsable': return 'Familiar Responsable';
      case 'otro_autorizado': return 'Adulto Autorizado';
      default: return rel || 'Tutor Responsable';
    }
  };

  const handleOpenDetail = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setShowDetailModal(true);
  };

  const handleOpenReschedule = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setRescheduleError(null);
    setShowRescheduleModal(true);
  };

  const handleOpenCancel = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setShowCancelModal(true);
  };

  const executeReschedule = async () => {
    if (!selectedAppointment || !selectedRescheduleSlot) return;
    const ok = await rescheduleAppointment(selectedAppointment.id, selectedRescheduleSlot.fecha, selectedRescheduleSlot.hora);
    if (ok) {
      setShowRescheduleModal(false);
    } else {
      setRescheduleError('Este horario no está disponible. Seleccioná otra alternativa.');
    }
  };

  const executeCancel = async () => {
    if (!selectedAppointment) return;
    await cancelAppointment(selectedAppointment.id, 'Cancelado por el tutor responsable desde el portal web');
    setShowCancelModal(false);
  };

  const handleAddPersonaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewPersonaError(null);

    if (!newPersonaNombre.trim() || !newPersonaApellido.trim()) {
      setNewPersonaError('Por favor ingresá nombre y apellido.');
      return;
    }
    if (!newPersonaDni.trim()) {
      setNewPersonaError('Por favor ingresá el DNI de la persona a cargo.');
      return;
    }

    const res = await addPersonaACargo({
      nombre: newPersonaNombre.trim(),
      apellido: newPersonaApellido.trim(),
      dni: newPersonaDni.trim(),
      fechaNacimiento: newPersonaFechaNac,
      localidad: newPersonaLocalidad,
      relacion: newPersonaRelacion,
      tutorId: currentTutor.id,
    });

    if (res.success) {
      setNewPersonaNombre('');
      setNewPersonaApellido('');
      setNewPersonaDni('');
      setShowAddPersonaModal(false);
    } else {
      setNewPersonaError(res.error || 'Error al registrar persona a cargo.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Tutor Account & Profile Card */}
      <div className="bg-gradient-to-br from-teal-800 via-teal-900 to-stone-900 rounded-3xl p-6 sm:p-8 text-white shadow-sm relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-teal-100 backdrop-blur-xs border border-white/10">
              <Building2 className="w-3.5 h-3.5" />
              <span>Hospital Pediátrico Juan Pablo II</span>
            </div>

            {/* Demo Tutor Switcher */}
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 backdrop-blur-xs text-xs">
              <span className="text-teal-200 text-[11px] font-semibold hidden sm:inline">Cuenta Tutor:</span>
              <select
                value={currentTutor.id}
                onChange={(e) => {
                  const t = tutors.find((tut) => tut.id === e.target.value);
                  if (t) {
                    setCurrentTutor(t);
                    setSelectedPersonaFilter('all');
                  }
                }}
                aria-label="Seleccionar cuenta de tutor para la demo"
                className="bg-teal-950/80 text-white font-bold text-xs rounded-lg px-2.5 py-1 border border-teal-600/50 focus:outline-none focus:ring-1 focus:ring-teal-400 cursor-pointer"
              >
                {tutors.map((t) => (
                  <option key={t.id} value={t.id} className="bg-stone-900 text-white">
                    {t.nombre} {t.apellido} ({t.localidad})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-teal-700/80 border border-teal-500/40 flex items-center justify-center font-bold text-sm text-teal-100">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-300">
                  Tutor/a Responsable
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {currentTutor.nombre} {currentTutor.apellido}
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-stone-300 font-medium">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                DNI: <strong>{currentTutor.dni}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-teal-400" />
                {currentTutor.localidad}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-teal-400" />
                {currentTutor.telefono}
              </span>
            </div>
          </div>

          {/* Quick bar: Personas a cargo indicator */}
          <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-teal-200 font-semibold">Personas a cargo:</span>
              <div className="flex flex-wrap gap-1.5">
                {personasACargo.map((rel) => {
                  const pId = rel.paciente?.id || rel.id;
                  const pNombre = rel.paciente?.nombre || rel.nombre;
                  const pEdad = rel.paciente?.edad !== undefined ? rel.paciente.edad : rel.edad;
                  const pRel = rel.tipoRelacion || rel.relacion;
                  return (
                    <span
                      key={pId}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white border border-white/15"
                    >
                      <Heart className="w-3 h-3 text-rose-300 fill-rose-300/40" />
                      {pNombre} ({pEdad} años • {getRelacionLabel(pRel)})
                    </span>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setShowAddPersonaModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar persona a cargo</span>
            </button>
          </div>
        </div>

        {/* Decorative background shape */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Familiar Tabs / Subnav */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-3 gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('inicio')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'inicio'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            Inicio
          </button>
          <button
            onClick={() => setActiveTab('personas-a-cargo')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'personas-a-cargo'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Personas a cargo ({personasACargo.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('nuevo-turno')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'nuevo-turno'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Solicitar nuevo turno</span>
          </button>
          <button
            onClick={() => setActiveTab('mis-turnos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'mis-turnos'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            Mis turnos ({activeTutorAppointments.length})
          </button>
          <button
            onClick={() => setActiveTab('lista-espera')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'lista-espera'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            Lista de espera
          </button>
        </div>

        <button
          onClick={openWhatsAppSimulator}
          className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs flex items-center gap-1.5 shrink-0 border border-emerald-500"
          title="Abrir Simulador de WhatsApp Bot"
        >
          <MessageSquare className="w-3.5 h-3.5 text-emerald-100" />
          <span>Simular WhatsApp</span>
          <span className="w-2 h-2 rounded-full bg-emerald-200 animate-pulse"></span>
        </button>
      </div>

      {/* TAB CONTENT: INICIO */}
      {activeTab === 'inicio' && (
        <div className="space-y-6">
          {/* Card: PRÓXIMO TURNO */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold tracking-wider text-stone-500 uppercase flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-teal-700" />
                Próximo Turno de tus Personas a Cargo
              </span>
              {proximoTurno && (
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusDisplay(proximoTurno.estado).style}`}>
                  {getStatusDisplay(proximoTurno.estado).label}
                </span>
              )}
            </div>

            {/* Doctor Delay or Absence Warning */}
            {proximoTurno && (
              <>
                {docDelay > 0 && (
                  <div className="mb-3 p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-center justify-between text-xs text-amber-950 shadow-xs animate-fade-in">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shrink-0">
                        <Hourglass className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-200/90 text-amber-950 px-2 py-0.5 rounded-md">
                          Aviso de Demora en Consultorio
                        </span>
                        <p className="text-xs font-semibold text-stone-800 mt-1">
                          Tu profesional (<strong>{assignedDoc?.nombre}</strong>) presenta una demora estimada de{' '}
                          <strong className="text-amber-900">{docDelay} minutos</strong>. Te avisamos para que no tengas que apurarte innecesariamente.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {docAbsent && (
                  <div className="mb-3 p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-center justify-between text-xs text-rose-950 shadow-xs animate-fade-in">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shrink-0">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider bg-rose-200 text-rose-950 px-2 py-0.5 rounded-md">
                          Profesional con Licencia Imprevista
                        </span>
                        <p className="text-xs font-semibold text-stone-800 mt-1">
                          El profesional <strong>{assignedDoc?.nombre}</strong> no podrá atender en la fecha programada. El equipo del hospital te contactará prioritariamente para reasignar tu turno.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {proximoTurno ? (
              <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs hover:shadow-sm transition-shadow relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl sm:text-2xl font-extrabold text-stone-900">
                          {proximoTurno.especialidad}
                        </h3>
                        {proximoTurno.optimizadoViaje && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200">
                            🌿 Viaje Optimizado
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-600 font-medium mt-0.5">
                        Persona a cargo: <strong className="text-stone-900">{proximoTurno.pacienteNombre}</strong> ({proximoTurno.pacienteEdad} años • {proximoTurno.pacienteLocalidad})
                      </p>
                      <p className="text-[11px] text-teal-800 font-semibold">
                        Tutor Solicitante: {proximoTurno.tutorSolicitanteNombre || `${currentTutor.nombre} ${currentTutor.apellido}`} ({proximoTurno.tutorSolicitanteRelacion || 'Tutor Responsable'})
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-700">
                      <div className="flex items-center gap-2 bg-stone-50 p-2.5 rounded-xl border border-stone-200/80">
                        <CalendarDays className="w-4 h-4 text-teal-700 shrink-0" />
                        <div>
                          <span className="text-stone-400 block text-[10px]">Fecha</span>
                          <span className="font-bold text-stone-900">
                            {proximoTurno.fecha}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 bg-stone-50 p-2.5 rounded-xl border border-stone-200/80">
                        <Clock className="w-4 h-4 text-teal-700 shrink-0" />
                        <div>
                          <span className="text-stone-400 block text-[10px]">Horario</span>
                          <span className="font-bold text-stone-900">{proximoTurno.hora} hs</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 bg-stone-50 p-2.5 rounded-xl border border-stone-200/80">
                        <UserCheck className="w-4 h-4 text-teal-700 shrink-0" />
                        <div>
                          <span className="text-stone-400 block text-[10px]">Profesional / Consultorio</span>
                          <span className="font-bold text-stone-900">
                            {proximoTurno.profesional} • Cons. {proximoTurno.consultorio}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 bg-stone-50 p-2.5 rounded-xl border border-stone-200/80">
                        <FileText className="w-4 h-4 text-teal-700 shrink-0" />
                        <div>
                          <span className="text-stone-400 block text-[10px]">Código de Comprobante</span>
                          <span className="font-bold text-teal-900 font-mono">{proximoTurno.codigo}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions for upcoming appointment */}
                  <div className="flex flex-col gap-2 shrink-0 sm:w-44">
                    <button
                      onClick={() => handleOpenDetail(proximoTurno)}
                      className="w-full py-2.5 rounded-xl text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white transition-all shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <FileCheck className="w-4 h-4" />
                      <span>Ver Comprobante</span>
                    </button>
                    <button
                      onClick={() => handleOpenReschedule(proximoTurno)}
                      className="w-full py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors border border-stone-200 flex items-center justify-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reprogramar</span>
                    </button>
                    <button
                      onClick={() => handleOpenCancel(proximoTurno)}
                      className="w-full py-1.5 text-xs text-rose-600 hover:text-rose-700 font-medium transition-colors"
                    >
                      Cancelar cita
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center space-y-3">
                <Calendar className="w-10 h-10 text-stone-300 mx-auto" />
                <h3 className="font-bold text-base text-stone-800">No tenés turnos programados próximos</h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Podés solicitar un nuevo turno para cualquiera de tus personas a cargo de forma sencilla.
                </p>
                <button
                  onClick={() => setActiveTab('nuevo-turno')}
                  className="px-5 py-2.5 rounded-xl bg-teal-700 text-white text-xs font-bold hover:bg-teal-800 transition-colors inline-flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Solicitar un turno</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => setActiveTab('personas-a-cargo')}
              className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-teal-600 hover:shadow-xs transition-all text-left flex items-start justify-between group"
            >
              <div className="space-y-1">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold border border-teal-200/60">
                  <Users className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm text-stone-900 group-hover:text-teal-800 transition-colors">
                  Personas a cargo
                </h4>
                <p className="text-xs text-stone-500">Administrá fichas, edades pediátricas y vinculaciones.</p>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-teal-700 transition-colors shrink-0 mt-1" />
            </button>

            <button
              onClick={() => setActiveTab('nuevo-turno')}
              className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-teal-600 hover:shadow-xs transition-all text-left flex items-start justify-between group"
            >
              <div className="space-y-1">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold border border-teal-200/60">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm text-stone-900 group-hover:text-teal-800 transition-colors">
                  Solicitar nuevo turno
                </h4>
                <p className="text-xs text-stone-500">Flujo guiado paso a paso con disponibilidad en tiempo real.</p>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-teal-700 transition-colors shrink-0 mt-1" />
            </button>

            <button
              onClick={() => setActiveTab('lista-espera')}
              className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-amber-500 hover:shadow-xs transition-all text-left flex items-start justify-between group"
            >
              <div className="space-y-1">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold border border-amber-200">
                  <Clock className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm text-stone-900 group-hover:text-amber-800 transition-colors">
                  Lista de espera
                </h4>
                <p className="text-xs text-stone-500">Turnos liberados avisados de inmediato a tu celular.</p>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-amber-700 transition-colors shrink-0 mt-1" />
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT: PERSONAS A CARGO */}
      {activeTab === 'personas-a-cargo' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-stone-200">
            <div>
              <h3 className="font-bold text-base text-stone-900">Personas a cargo de {currentTutor.nombre} {currentTutor.apellido}</h3>
              <p className="text-xs text-stone-500">
                Los turnos se solicitan en representación de la persona a cargo. Rango de atención: &gt; 1 mes hasta 15 años inclusive.
              </p>
            </div>
            <button
              onClick={() => setShowAddPersonaModal(true)}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar nueva persona a cargo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {personasACargo.map((rel) => {
              const paciente = rel.paciente || rel;
              const pId = paciente.id || rel.id;
              const pNombre = paciente.nombre || rel.nombre;
              const pEdad = paciente.edad !== undefined ? paciente.edad : rel.edad;
              const pDni = paciente.dni || rel.dni;
              const pLocalidad = paciente.localidad || rel.localidad;
              const pFechaNac = paciente.fechaNacimiento || rel.fechaNacimiento;
              const tipoRelacion = rel.tipoRelacion || rel.relacion;
              const responsablePrincipal = rel.responsablePrincipal ?? rel.esPrincipal ?? true;
              const autorizadoAGestionarTurnos = rel.autorizadoAGestionarTurnos ?? rel.autorizado ?? true;

              const pacAppointments = activeTutorAppointments.filter(
                (a) => a.pacienteId === pId || a.pacienteNombre.toLowerCase() === pNombre.toLowerCase()
              );

              return (
                <div
                  key={pId}
                  className="bg-white rounded-2xl p-5 border border-stone-200 shadow-2xs hover:border-teal-300 transition-all space-y-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center font-bold text-base">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-base text-stone-900">{pNombre}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200">
                            {getRelacionLabel(tipoRelacion)}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 font-medium">
                          {pEdad} años • Nacimiento: {pFechaNac || '2018-09-01'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <div>
                      <span className="text-[10px] text-stone-400 block font-medium">DNI</span>
                      <span className="font-bold text-stone-800 font-mono">{pDni}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block font-medium">Localidad</span>
                      <span className="font-bold text-stone-800 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-teal-700" />
                        {pLocalidad}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block font-medium">Gestión de Turnos</span>
                      <span className="font-semibold text-emerald-700">
                        {autorizadoAGestionarTurnos ? '✓ Autorizado' : 'Sin permiso'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block font-medium">Turnos Activos</span>
                      <span className="font-bold text-teal-900">
                        {pacAppointments.length} citas
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        setSelectedPersonaFilter(pId);
                        setActiveTab('mis-turnos');
                      }}
                      className="flex-1 py-2 text-xs font-bold rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 transition-colors"
                    >
                      Ver turnos ({pacAppointments.length})
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('nuevo-turno');
                      }}
                      className="flex-1 py-2 text-xs font-bold rounded-xl bg-teal-700 hover:bg-teal-800 text-white shadow-xs transition-colors flex items-center justify-center gap-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Solicitar turno</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT: NUEVO TURNO (WIZARD DETERMINÍSTICO PASO A PASO) */}
      {activeTab === 'nuevo-turno' && (
        <WebAppointmentWizard
          onCancel={() => setActiveTab('inicio')}
          onCompleted={() => setActiveTab('mis-turnos')}
          onGoToWaitlist={() => setActiveTab('lista-espera')}
          onOpenAddPersona={() => setShowAddPersonaModal(true)}
        />
      )}

      {/* TAB CONTENT: MIS TURNOS */}
      {activeTab === 'mis-turnos' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-600">Filtrar por persona a cargo:</span>
              <select
                value={selectedPersonaFilter}
                onChange={(e) => setSelectedPersonaFilter(e.target.value)}
                className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-bold text-stone-800 focus:ring-2 focus:ring-teal-700 focus:outline-none"
              >
                <option value="all">Todas las personas a cargo ({activeTutorAppointments.length})</option>
                {personasACargo.map((rel) => {
                  const pId = rel.paciente?.id || rel.id;
                  const pNombre = rel.paciente?.nombre || rel.nombre;
                  const pEdad = rel.paciente?.edad !== undefined ? rel.paciente.edad : rel.edad;
                  return (
                    <option key={pId} value={pId}>
                      {pNombre} ({pEdad} años)
                    </option>
                  );
                })}
              </select>
            </div>

            <button
              onClick={() => setActiveTab('nuevo-turno')}
              className="text-xs font-bold text-teal-800 hover:text-teal-900 flex items-center gap-1 self-end sm:self-auto"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Solicitar otro turno</span>
            </button>
          </div>

          <div className="space-y-3">
            {filteredAppointments.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-stone-200 text-center text-xs text-stone-500">
                No hay turnos registrados para el filtro seleccionado.
              </div>
            ) : (
              filteredAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="bg-white rounded-2xl p-4.5 border border-stone-200 shadow-2xs hover:border-stone-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 text-sm">{apt.especialidad}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getStatusDisplay(apt.estado).style}`}>
                          {getStatusDisplay(apt.estado).label}
                        </span>
                        {apt.optimizadoViaje && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            Coordinado
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-600">
                        Persona a cargo: <strong className="text-stone-900">{apt.pacienteNombre}</strong> ({apt.pacienteEdad} años)
                      </p>
                      <p className="text-xs text-stone-500">
                        {apt.profesional} • Consultorio {apt.consultorio} • {apt.fecha} a las {apt.hora} hs
                      </p>
                      {apt.motivoResumido && (
                        <p className="text-[11px] text-stone-400 italic">"{apt.motivoResumido}"</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => handleOpenDetail(apt)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors border border-stone-200"
                      >
                        Comprobante
                      </button>
                      <button
                        onClick={() => handleOpenReschedule(apt)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors border border-stone-200"
                      >
                        Reprogramar
                      </button>
                      <button
                        onClick={() => handleOpenCancel(apt)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-700 hover:bg-rose-50 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: LISTA DE ESPERA */}
      {activeTab === 'lista-espera' && <FamiliarWaitlist />}

      {/* MODAL: VER DETALLE / COMPROBANTE CON TUTOR RESPONSABLE */}
      {showDetailModal && selectedAppointment && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">Comprobante de Turno</span>
                <h3 className="font-bold text-lg text-stone-900">{selectedAppointment.especialidad}</h3>
              </div>
              <span className="text-xs font-mono font-bold text-teal-900 bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200">
                {selectedAppointment.codigo}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="bg-teal-50/50 p-3 rounded-xl border border-teal-100 space-y-1 mb-2">
                <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">
                  Tutor Responsable Solicitante
                </span>
                <div className="flex justify-between">
                  <span className="text-stone-500">Nombre del Tutor:</span>
                  <span className="font-bold text-stone-800">
                    {selectedAppointment.tutorSolicitanteNombre || `${currentTutor.nombre} ${currentTutor.apellido}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Relación con paciente:</span>
                  <span className="font-bold text-teal-900">
                    {selectedAppointment.tutorSolicitanteRelacion || 'Tutor Responsable'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Teléfono registrado:</span>
                  <span className="font-mono text-stone-700">
                    {selectedAppointment.tutorSolicitanteTelefono || currentTutor.telefono}
                  </span>
                </div>
              </div>

              <div className="flex justify-between py-1 border-b border-stone-100">
                <span className="text-stone-500">Persona a cargo (Paciente):</span>
                <span className="font-bold text-stone-800">
                  {selectedAppointment.pacienteNombre} ({selectedAppointment.pacienteEdad} años)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100">
                <span className="text-stone-500">Localidad de origen:</span>
                <span className="font-semibold text-stone-800">{selectedAppointment.pacienteLocalidad}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100">
                <span className="text-stone-500">Fecha y Hora:</span>
                <span className="font-bold text-stone-900">{selectedAppointment.fecha} • {selectedAppointment.hora} hs</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100">
                <span className="text-stone-500">Profesional:</span>
                <span className="font-semibold text-stone-800">{selectedAppointment.profesional}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100">
                <span className="text-stone-500">Consultorio:</span>
                <span className="font-semibold text-stone-800">Consultorio {selectedAppointment.consultorio}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100">
                <span className="text-stone-500">Derivación médica:</span>
                <span className="font-medium text-stone-800">{selectedAppointment.tieneDerivacion ? 'Sí, adjuntada' : 'No'}</span>
              </div>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-800">
              📌 <strong>Indicación para viajar:</strong> Al venir desde {selectedAppointment.pacienteLocalidad}, recordá traer DNI de la persona a cargo, DNI del tutor responsable presente, carnet de vacunación y comprobante de este turno.
            </div>

            <button
              onClick={() => setShowDetailModal(false)}
              className="w-full py-2.5 bg-stone-900 text-white font-bold rounded-xl text-xs hover:bg-stone-800 transition-colors shadow-xs"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* MODAL: REPROGRAMAR */}
      {showRescheduleModal && selectedAppointment && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-stone-200 space-y-4">
            <h3 className="font-bold text-base text-stone-900">Reprogramar turno de {selectedAppointment.especialidad}</h3>
            <p className="text-xs text-stone-500">
              Elegí una nueva fecha y horario disponible con el {selectedAppointment.profesional}:
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Nuevo horario disponible</label>
                {loadingRescheduleSlots ? (
                  <p className="text-stone-500 py-2">Cargando disponibilidad real…</p>
                ) : rescheduleSlots.length === 0 ? (
                  <p className="text-rose-700 py-2 font-semibold">No hay horarios disponibles para reprogramar este turno.</p>
                ) : (
                  <select
                    value={selectedRescheduleSlot ? `${selectedRescheduleSlot.fecha}|${selectedRescheduleSlot.hora}` : ''}
                    onChange={(e) => {
                      const found = rescheduleSlots.find((s) => `${s.fecha}|${s.hora}` === e.target.value);
                      setSelectedRescheduleSlot(found || null);
                    }}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800"
                  >
                    <option value="">Seleccionar…</option>
                    {rescheduleSlots.map((s) => (
                      <option key={`${s.slotId}`} value={`${s.fecha}|${s.hora}`}>
                        {s.fecha} • {s.hora} hs — {s.profesional}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {rescheduleError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                  {rescheduleError}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200"
              >
                Cancelar
              </button>
              <button
                onClick={executeReschedule}
                disabled={!selectedRescheduleSlot}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white shadow-xs"
              >
                Confirmar cambio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CANCELAR */}
      {showCancelModal && selectedAppointment && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-xl border border-stone-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-stone-900">¿Estás seguro de cancelar este turno?</h3>
            <p className="text-xs text-stone-500">
              Liberarás la cita de <strong>{selectedAppointment.especialidad}</strong> del {selectedAppointment.fecha} a las {selectedAppointment.hora} hs para {selectedAppointment.pacienteNombre}. Esta vacante se ofrecerá inmediatamente a familias en lista de espera.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200"
              >
                No cancelar
              </button>
              <button
                onClick={executeCancel}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AGREGAR PERSONA A CARGO (REGLA 1 MES - 15 AÑOS) */}
      {showAddPersonaModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md">
                  Vínculo Familiar / Responsable
                </span>
                <h3 className="font-extrabold text-lg text-stone-900 mt-1">Registrar Persona a Cargo</h3>
              </div>
              <button
                onClick={() => setShowAddPersonaModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPersonaSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Mateo"
                    value={newPersonaNombre}
                    onChange={(e) => setNewPersonaNombre(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Apellido</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Gómez"
                    value={newPersonaApellido}
                    onChange={(e) => setNewPersonaApellido(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">DNI</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 58.912.441"
                    value={newPersonaDni}
                    onChange={(e) => setNewPersonaDni(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-mono focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Fecha de Nacimiento</label>
                  <input
                    type="date"
                    required
                    value={newPersonaFechaNac}
                    onChange={(e) => setNewPersonaFechaNac(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>

              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-900">
                👶 <strong>Validación Pediátrica:</strong> Edad calculada: <strong>{calculateAge(newPersonaFechaNac).formatted}</strong>. Solo se aceptan pacientes mayores de 1 mes de vida y hasta 15 años inclusive.
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Relación con el Tutor</label>
                  <select
                    value={newPersonaRelacion}
                    onChange={(e) => setNewPersonaRelacion(e.target.value as TipoRelacionTutor)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-medium"
                  >
                    <option value="madre">Madre</option>
                    <option value="padre">Padre</option>
                    <option value="tutor_legal">Tutor Legal</option>
                    <option value="abuela">Abuela</option>
                    <option value="abuelo">Abuelo</option>
                    <option value="familiar_responsable">Familiar Responsable</option>
                    <option value="otro_autorizado">Otro Adulto Autorizado</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Localidad de Origen</label>
                  <select
                    value={newPersonaLocalidad}
                    onChange={(e) => setNewPersonaLocalidad(e.target.value as Localidad)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-medium"
                  >
                    <option value="Mercedes">Mercedes</option>
                    <option value="Corrientes Capital">Corrientes Capital</option>
                    <option value="Goya">Goya</option>
                    <option value="Curuzú Cuatiá">Curuzú Cuatiá</option>
                    <option value="Paso de los Libres">Paso de los Libres</option>
                    <option value="Bella Vista">Bella Vista</option>
                    <option value="Otra">Otra localidad</option>
                  </select>
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPersonaAutorizado}
                    onChange={(e) => setNewPersonaAutorizado(e.target.checked)}
                    className="rounded text-teal-700 focus:ring-teal-700"
                  />
                  <span className="text-stone-700 font-medium text-xs">
                    Autorizado a solicitar y gestionar turnos hospitalarios
                  </span>
                </label>
              </div>

              {newPersonaError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{newPersonaError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddPersonaModal(false)}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl font-bold text-white bg-teal-700 hover:bg-teal-800 transition-all shadow-xs"
                >
                  Guardar Persona a Cargo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
