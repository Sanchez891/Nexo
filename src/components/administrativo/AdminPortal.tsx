import React, { useState } from 'react';
import { useHospital } from '../../context/HospitalContext';
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Users,
  Clock,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  AlertTriangle,
  Siren,
  Sparkles,
  UserX,
  Hourglass,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { CentralizedAgenda } from './CentralizedAgenda';
import { WaitlistManagement } from './WaitlistManagement';
import { ReportsView } from './ReportsView';
import { PatientsDirectory } from './PatientsDirectory';
import { NewManualAppointmentModal } from './NewManualAppointmentModal';
import { Localidad } from '../../types';

type AdminView = 'inicio' | 'agenda' | 'urgencias' | 'turnos' | 'pacientes' | 'lista-espera' | 'reportes';

export const AdminPortal: React.FC = () => {
  const {
    appointments,
    waitlist,
    doctors,
    urgencies,
    registerUrgency,
    reportDoctorDelay,
    clearDoctorDelay,
    reportDoctorAbsence,
    clearDoctorAbsence,
    reassignDoctorAppointment,
  } = useHospital();

  const [activeView, setActiveView] = useState<AdminView>('agenda');
  const [showManualModal, setShowManualModal] = useState(false);
  const [showUrgencyModal, setShowUrgencyModal] = useState(false);
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);

  // Absence modal state
  const [selectedDoctorAbsence, setSelectedDoctorAbsence] = useState('');
  const [absenceReason, setAbsenceReason] = useState('Licencia médica imprevista');
  const [reassignSuccess, setReassignSuccess] = useState<string | null>(null);

  // Delay modal state
  const [selectedDoctorDelay, setSelectedDoctorDelay] = useState('');
  const [delayMinutes, setDelayMinutes] = useState(30);

  React.useEffect(() => {
    if (!selectedDoctorAbsence && doctors[0]) setSelectedDoctorAbsence(doctors[0].id);
    if (!selectedDoctorDelay && doctors[0]) setSelectedDoctorDelay(doctors[0].id);
  }, [doctors]);

  // Urgency form state
  const [urgencyForm, setUrgencyForm] = useState({
    pacienteNombre: '',
    dni: '',
    pacienteEdad: 4,
    localidad: 'Corrientes Capital' as Localidad,
    tutor: '',
    telefono: '',
    motivoUrgencia: '',
    triage: 'amarillo' as 'rojo' | 'amarillo' | 'verde',
  });

  // REAL STATUS INDICATORS (Requirement 17)
  const hoyStr = new Date().toISOString().slice(0, 10);
  const aptsHoy = appointments.filter((a) => a.fecha === hoyStr);
  const turnosHoyCount = aptsHoy.length;
  const enEsperaCount = aptsHoy.filter((a) => a.estado === 'EN_ESPERA').length;
  const enConsultorioCount = aptsHoy.filter((a) => a.estado === 'EN_CONSULTORIO').length;
  const atendidosCount = aptsHoy.filter((a) => a.estado === 'ATENDIDO').length;
  const canceladosCount = appointments.filter((a) => a.estado === 'CANCELADO').length;
  const listaEsperaCount = waitlist.filter((w) => w.estado === 'esperando').length;

  // Doctors with delay
  const doctorsWithDelay = doctors.filter((d) => (d.demoraMinutos || 0) > 0);
  const absentDoctors = doctors.filter((d) => d.ausente);

  // Affected appointments for absent doctor
  const absentDoc = doctors.find((d) => d.id === selectedDoctorAbsence);
  const affectedAppointments = appointments.filter(
    (a) => a.profesional.toLowerCase() === absentDoc?.nombre.toLowerCase() && a.estado !== 'CANCELADO'
  );

  const sidebarLinks: { key: AdminView; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'inicio', label: 'Centro de Operaciones', icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: 'agenda', label: 'Agenda Centralizada', icon: <Calendar className="w-4 h-4" /> },
    { key: 'urgencias', label: 'Urgencias (24h)', icon: <Siren className="w-4 h-4 text-rose-600" />, badge: urgencies.length },
    { key: 'turnos', label: 'Todos los turnos', icon: <CalendarDays className="w-4 h-4" />, badge: appointments.length },
    { key: 'pacientes', label: 'Directorio Pacientes', icon: <Users className="w-4 h-4" /> },
    { key: 'lista-espera', label: 'Lista de Espera', icon: <Clock className="w-4 h-4" />, badge: listaEsperaCount },
    { key: 'reportes', label: 'Métricas e Impacto', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  const handleRegisterUrgencySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerUrgency({
      ...urgencyForm,
    });
    setShowUrgencyModal(false);
    setUrgencyForm({
      pacienteNombre: '',
      dni: '',
      pacienteEdad: 4,
      localidad: 'Corrientes Capital',
      tutor: '',
      telefono: '',
      motivoUrgencia: '',
      triage: 'amarillo',
    });
    setActiveView('urgencias');
  };

  const handleSaveDelay = async () => {
    await reportDoctorDelay(selectedDoctorDelay, delayMinutes);
    setShowDelayModal(false);
  };

  const handleSaveAbsence = async () => {
    await reportDoctorAbsence(selectedDoctorAbsence, absenceReason);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
      {/* Top Header with Indicators */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-2xs mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-stone-100 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-stone-100 text-teal-900 border border-stone-200">
                Panel Secretario / Administrativo
              </span>
              <span className="text-xs text-stone-500 font-medium">Hospital Pediátrico Juan Pablo II</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 mt-1">
              Centro de Gestión de Turnos y Operaciones
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {/* Urgencia 24h action button */}
            <button
              onClick={() => setShowUrgencyModal(true)}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold rounded-xl text-xs shadow-2xs flex items-center gap-1.5 transition-colors"
              title="Registrar ingreso directo por guardia de urgencias sin turno"
            >
              <Siren className="w-4 h-4 text-rose-600" />
              <span>+ Registrar urgencia (24h)</span>
            </button>

            {/* Delays & Absence triggers */}
            <button
              onClick={() => setShowDelayModal(true)}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
            >
              <Hourglass className="w-3.5 h-3.5 text-amber-700" />
              <span>Reportar demora</span>
            </button>

            <button
              onClick={() => setShowAbsenceModal(true)}
              className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
            >
              <UserX className="w-3.5 h-3.5 text-stone-600" />
              <span>Reportar ausencia</span>
            </button>

            <button
              onClick={() => setShowManualModal(true)}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo turno manual</span>
            </button>
          </div>
        </div>

        {/* 6 Real Indicators required by Section 17 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex items-center justify-between">
            <div>
              <span className="text-stone-400 block text-[10px] font-bold uppercase">Turnos Hoy</span>
              <span className="text-xl font-extrabold text-stone-900">{turnosHoyCount}</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 border border-stone-200 flex items-center justify-center font-bold">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex items-center justify-between">
            <div>
              <span className="text-stone-400 block text-[10px] font-bold uppercase">En Espera</span>
              <span className="text-xl font-extrabold text-amber-800">{enEsperaCount}</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex items-center justify-between">
            <div>
              <span className="text-stone-400 block text-[10px] font-bold uppercase">En Consultorio</span>
              <span className="text-xl font-extrabold text-teal-800">{enConsultorioCount}</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex items-center justify-between">
            <div>
              <span className="text-stone-400 block text-[10px] font-bold uppercase">Atendidos</span>
              <span className="text-xl font-extrabold text-emerald-800">{atendidosCount}</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex items-center justify-between">
            <div>
              <span className="text-stone-400 block text-[10px] font-bold uppercase">Cancelaciones</span>
              <span className="text-xl font-extrabold text-rose-700">{canceladosCount}</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center font-bold">
              <XCircle className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex items-center justify-between">
            <div>
              <span className="text-stone-400 block text-[10px] font-bold uppercase">Lista de Espera</span>
              <span className="text-xl font-extrabold text-stone-800">{listaEsperaCount}</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-stone-200/80 text-stone-700 border border-stone-300 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* SECTION: Situaciones que requieren atención (Operations Center required by Rule 17) */}
        <div className="mt-4 pt-4 border-t border-stone-100">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Situaciones operativas que requieren atención inmediata</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Situation 1: Delays (real) */}
            {doctorsWithDelay.length === 0 ? (
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs text-stone-500">
                Sin demoras reportadas hoy.
              </div>
            ) : (
              doctorsWithDelay.slice(0, 1).map((d) => (
                <div key={d.id} className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-amber-900">
                    <span>{d.nombre}</span>
                    <span className="bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-md text-[10px]">
                      Demora: {d.demoraMinutos} min
                    </span>
                  </div>
                  <p className="text-stone-600 text-[11px] leading-tight">
                    {d.especialidad} • Notificado en sala y portal familiar.
                  </p>
                  <button
                    onClick={() => setShowDelayModal(true)}
                    className="text-[11px] font-bold text-amber-900 hover:underline pt-1 inline-flex items-center gap-1"
                  >
                    <span>Ajustar aviso de demora</span> →
                  </button>
                </div>
              ))
            )}

            {/* Situation 2: Lista de espera con candidatos (real) */}
            <div className="bg-teal-50/80 p-3 rounded-xl border border-teal-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-bold text-teal-950">
                <span>Lista de espera activa</span>
                <span className="bg-teal-200/80 text-teal-950 px-2 py-0.5 rounded-md text-[10px]">
                  {listaEsperaCount} en espera
                </span>
              </div>
              <p className="text-stone-600 text-[11px] leading-tight">
                Al cancelar un turno, el sistema busca automáticamente candidatos compatibles.
              </p>
              <button
                onClick={() => setActiveView('lista-espera')}
                className="text-[11px] font-bold text-teal-800 hover:underline pt-1 inline-flex items-center gap-1"
              >
                <span>Ver lista de espera</span> →
              </button>
            </div>

            {/* Situation 3: Turnos en espera de sala hoy (real) */}
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-bold text-stone-900">
                <span>Sala de espera hoy</span>
                <span className="bg-stone-200 text-stone-800 px-2 py-0.5 rounded-md text-[10px]">
                  {enEsperaCount} pacientes
                </span>
              </div>
              <p className="text-stone-600 text-[11px] leading-tight">
                Pacientes con check-in registrado esperando ser llamados a consultorio.
              </p>
              <button
                onClick={() => setActiveView('agenda')}
                className="text-[11px] font-bold text-stone-700 hover:underline pt-1 inline-flex items-center gap-1"
              >
                <span>Ver agenda centralizada</span> →
              </button>
            </div>

            {/* Situation 4: Absences (real) */}
            {absentDoctors.length === 0 ? (
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs text-stone-500">
                Sin ausencias reportadas hoy.
              </div>
            ) : (
              absentDoctors.slice(0, 1).map((d) => (
                <div key={d.id} className="bg-rose-50/70 p-3 rounded-xl border border-rose-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-rose-900">
                    <span>{d.nombre} (Ausente)</span>
                    <span className="bg-rose-200/80 text-rose-950 px-2 py-0.5 rounded-md text-[10px]">
                      {d.motivoAusencia || 'Licencia médica'}
                    </span>
                  </div>
                  <p className="text-stone-600 text-[11px] leading-tight">
                    {d.especialidad} • Reubicá manualmente los turnos afectados.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedDoctorAbsence(d.id);
                      setShowAbsenceModal(true);
                    }}
                    className="text-[11px] font-bold text-rose-800 hover:underline pt-1 inline-flex items-center gap-1"
                  >
                    <span>Reubicar turnos afectados</span> →
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Layout: Left Sidebar + Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sidebar */}
        <aside className="lg:col-span-3 bg-white rounded-2xl p-3 border border-stone-200 shadow-2xs space-y-1 sticky top-24">
          <div className="px-3 py-2 text-[10px] font-bold uppercase text-stone-400 tracking-wider">
            Navegación del Centro
          </div>
          {sidebarLinks.map((link) => {
            const isActive = activeView === link.key;
            return (
              <button
                key={link.key}
                onClick={() => setActiveView(link.key)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  isActive
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={isActive ? 'text-white' : 'text-stone-500'}>
                    {link.icon}
                  </span>
                  <span>{link.label}</span>
                </div>
                {link.badge !== undefined && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-white/25 text-white' : 'bg-stone-100 text-stone-600 border border-stone-200'
                    }`}
                  >
                    {link.badge}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Content View */}
        <main className="lg:col-span-9 space-y-6">
          {activeView === 'inicio' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-800 text-white p-6 rounded-2xl shadow-xs">
                <h2 className="text-xl font-bold">Centro de Control de Turnos Pediátricos</h2>
                <p className="text-xs text-teal-100 mt-1 max-w-xl leading-relaxed">
                  Sistema centralizado de alta disponibilidad para el Hospital Pediátrico Juan Pablo II.
                  Todos los canales (Web, WhatsApp, Teléfono, Presencial y Asistente Social) concluyen en una única agenda integrada.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveView('agenda')}
                    className="px-4 py-2 bg-white text-teal-900 font-bold text-xs rounded-xl hover:bg-stone-100 transition-colors shadow-xs"
                  >
                    Abrir Agenda Centralizada
                  </button>
                  <button
                    onClick={() => setActiveView('urgencias')}
                    className="px-4 py-2 bg-rose-600/90 text-white font-bold text-xs rounded-xl hover:bg-rose-700 transition-colors"
                  >
                    Atención de Urgencias (24h)
                  </button>
                </div>
              </div>

              {/* Quick Agenda Preview */}
              <CentralizedAgenda />
            </div>
          )}

          {activeView === 'agenda' && <CentralizedAgenda />}

          {/* URGENCIAS 24H VIEW (Requirement 2) */}
          {activeView === 'urgencias' && (
            <div className="space-y-4">
              <div className="bg-rose-50/80 border-2 border-rose-300 rounded-2xl p-5 shadow-2xs space-y-2">
                <div className="flex items-center gap-2">
                  <Siren className="w-5 h-5 text-rose-700" />
                  <h3 className="font-bold text-base text-rose-950">
                    Módulo de Urgencias Pediátricas (Guardia 24 Horas)
                  </h3>
                </div>
                <p className="text-xs text-rose-900 leading-relaxed max-w-3xl">
                  <strong>Regla hospitalaria fundamental:</strong> “Las urgencias se atienden las 24 horas y NO requieren turno previo”.
                  Este módulo registra ingresos inmediatos por guardia sin mezclarlos con la agenda programada ambulatoria.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setShowUrgencyModal(true)}
                    className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Registrar nuevo ingreso por urgencia</span>
                  </button>
                </div>
              </div>

              {/* Urgencies List */}
              <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-2xs space-y-4">
                <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                  <h4 className="font-bold text-sm text-stone-900">
                    Ingresos por Guardia de Urgencias (Hoy - {urgencies.length} pacientes)
                  </h4>
                  <span className="text-[11px] text-stone-500 font-medium">Atención continua sin turno</span>
                </div>

                <div className="divide-y divide-stone-100">
                  {urgencies.map((u) => {
                    const triageBg =
                      u.triage === 'rojo'
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : u.triage === 'amarillo'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-300';

                    return (
                      <div key={u.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-stone-900">{u.pacienteNombre}</span>
                            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${triageBg}`}>
                              Triage {u.triage}
                            </span>
                            <span className="text-xs text-stone-500 font-medium">
                              {u.pacienteEdad} años • DNI {u.dni}
                            </span>
                          </div>
                          <p className="text-xs text-stone-700 mt-1 font-medium">
                            Motivo de guardia: <span className="font-bold text-stone-900">{u.motivoUrgencia}</span>
                          </p>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            Localidad: {u.localidad} • Tutor: {u.tutor} • Tel: {u.telefono}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-xs font-bold text-rose-700 block">{u.fechaHora}</span>
                            <span className="text-[11px] text-stone-500">Guardia Central</span>
                          </div>
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 border border-stone-200">
                            En atención
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeView === 'turnos' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
                <div>
                  <h3 className="font-bold text-base text-stone-900">Listado General de Turnos del Sistema</h3>
                  <p className="text-xs text-stone-500">Integración de todos los canales (Web, WhatsApp, Teléfono, Presencial, Asistente Social)</p>
                </div>
                <span className="text-xs text-stone-500 font-bold bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-200">
                  Total: {appointments.length} registros
                </span>
              </div>
              <CentralizedAgenda />
            </div>
          )}

          {activeView === 'pacientes' && <PatientsDirectory />}

          {activeView === 'lista-espera' && <WaitlistManagement />}


          {activeView === 'reportes' && <ReportsView />}
        </main>
      </div>

      {/* Manual Appointment Modal */}
      {showManualModal && (
        <NewManualAppointmentModal onClose={() => setShowManualModal(false)} />
      )}

      {/* Registrar Urgencia Modal (Requirement 2) */}
      {showUrgencyModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center gap-2 mb-2">
              <Siren className="w-5 h-5 text-rose-600" />
              <h3 className="text-base font-bold text-stone-900">
                Registrar Ingreso por Guardia de Urgencias
              </h3>
            </div>
            <p className="text-xs text-rose-800 bg-rose-50 p-2.5 rounded-xl border border-rose-200 mb-4 leading-relaxed font-medium">
              “Las urgencias se atienden las 24 horas y NO requieren turno”. Registrá la llegada para triage y atención médica inmediata.
            </p>

            <form onSubmit={handleRegisterUrgencySubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-stone-600 block uppercase mb-1">
                  Nombre completo del paciente
                </label>
                <input
                  type="text"
                  required
                  value={urgencyForm.pacienteNombre}
                  onChange={(e) => setUrgencyForm({ ...urgencyForm, pacienteNombre: e.target.value })}
                  placeholder="Ej: Tobías Navarro"
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-stone-600 block uppercase mb-1">DNI</label>
                  <input
                    type="text"
                    required
                    value={urgencyForm.dni}
                    onChange={(e) => setUrgencyForm({ ...urgencyForm, dni: e.target.value })}
                    placeholder="57.990.221"
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-stone-600 block uppercase mb-1">Edad</label>
                  <input
                    type="number"
                    min="0.1"
                    max="15"
                    step="0.1"
                    required
                    value={urgencyForm.pacienteEdad}
                    onChange={(e) => setUrgencyForm({ ...urgencyForm, pacienteEdad: parseFloat(e.target.value) })}
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-stone-600 block uppercase mb-1">Triage inicial</label>
                  <select
                    value={urgencyForm.triage}
                    onChange={(e) => setUrgencyForm({ ...urgencyForm, triage: e.target.value as any })}
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50 font-bold"
                  >
                    <option value="rojo">Rojo (Emergencia inmediata)</option>
                    <option value="amarillo">Amarillo (Urgencia no crítica)</option>
                    <option value="verde">Verde (Consulta de guardia)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-stone-600 block uppercase mb-1">Localidad</label>
                  <select
                    value={urgencyForm.localidad}
                    onChange={(e) => setUrgencyForm({ ...urgencyForm, localidad: e.target.value as Localidad })}
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50"
                  >
                    <option value="Corrientes Capital">Corrientes Capital</option>
                    <option value="Goya">Goya</option>
                    <option value="Mercedes">Mercedes</option>
                    <option value="Paso de los Libres">Paso de los Libres</option>
                    <option value="Curuzú Cuatiá">Curuzú Cuatiá</option>
                    <option value="Bella Vista">Bella Vista</option>
                    <option value="Ituzaingó">Ituzaingó</option>
                    <option value="Santo Tomé">Santo Tomé</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-600 block uppercase mb-1">
                  Motivo de la urgencia / Signos clínicos
                </label>
                <textarea
                  rows={2}
                  required
                  value={urgencyForm.motivoUrgencia}
                  onChange={(e) => setUrgencyForm({ ...urgencyForm, motivoUrgencia: e.target.value })}
                  placeholder="Ej: Dificultad respiratoria aguda, traumatismo, fiebre alta sostenida..."
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-stone-600 block uppercase mb-1">Tutor</label>
                  <input
                    type="text"
                    required
                    value={urgencyForm.tutor}
                    onChange={(e) => setUrgencyForm({ ...urgencyForm, tutor: e.target.value })}
                    placeholder="Madre / Padre"
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-stone-600 block uppercase mb-1">Teléfono</label>
                  <input
                    type="text"
                    required
                    value={urgencyForm.telefono}
                    onChange={(e) => setUrgencyForm({ ...urgencyForm, telefono: e.target.value })}
                    placeholder="+54 3794..."
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowUrgencyModal(false)}
                  className="flex-1 py-2 text-xs font-semibold text-stone-600 bg-stone-100 rounded-xl hover:bg-stone-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-rose-700 rounded-xl hover:bg-rose-800 transition-colors shadow-xs"
                >
                  Registrar ingreso de urgencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delay Modal (Requirement 14) */}
      {showDelayModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center gap-2 mb-2">
              <Hourglass className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-bold text-stone-900">
                Reportar Demora de Profesional
              </h3>
            </div>
            <p className="text-xs text-stone-500 mb-4">
              Notifica a los pacientes con turnos programados y actualiza la sala de espera.
            </p>

            <div className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-stone-600 block uppercase mb-1">Profesional</label>
                <select
                  value={selectedDoctorDelay}
                  onChange={(e) => setSelectedDoctorDelay(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50 font-bold"
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre} ({d.especialidad})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-600 block uppercase mb-1">
                  Demora estimada (minutos)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 45, 60].map((min) => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => setDelayMinutes(min)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        delayMinutes === min
                          ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {min} min
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <span className="font-bold block">Mensaje a los pacientes:</span>
                <p className="text-[11px] text-amber-800">
                  “Tu profesional presenta una demora aproximada de {delayMinutes} minutos.”
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    clearDoctorDelay(selectedDoctorDelay);
                    setShowDelayModal(false);
                  }}
                  className="py-2 px-3 text-xs font-semibold text-rose-700 bg-rose-50 rounded-xl hover:bg-rose-100 border border-rose-200"
                >
                  Quitar demora
                </button>
                <button
                  type="button"
                  onClick={() => setShowDelayModal(false)}
                  className="flex-1 py-2 text-xs font-semibold text-stone-600 bg-stone-100 rounded-xl hover:bg-stone-200"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveDelay}
                  className="flex-1 py-2 text-xs font-bold text-white bg-amber-700 rounded-xl hover:bg-amber-800 shadow-xs"
                >
                  Guardar demora
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Absence & Reassignment Modal (Requirement 13 & Scene 5) */}
      {showAbsenceModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-1">
              <UserX className="w-5 h-5 text-rose-600" />
              <h3 className="text-base font-bold text-stone-900">
                Gestión de Ausencia de Profesional y Reubicación de Turnos
              </h3>
            </div>
            <p className="text-xs text-stone-500 mb-4">
              Reporta la ausencia imprevista y reasigna los turnos a otros médicos disponibles del servicio.
            </p>

            {reassignSuccess && (
              <div className="p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{reassignSuccess}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-stone-600 block uppercase mb-1">
                    Profesional Ausente
                  </label>
                  <select
                    value={selectedDoctorAbsence}
                    onChange={(e) => setSelectedDoctorAbsence(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50 font-bold"
                  >
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre} ({d.especialidad}) {d.ausente ? '• YA AUSENTE' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-stone-600 block uppercase mb-1">Motivo</label>
                  <input
                    type="text"
                    value={absenceReason}
                    onChange={(e) => setAbsenceReason(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50"
                  />
                </div>
              </div>

              {/* Affected appointments count */}
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-xs text-rose-900 flex items-center justify-between">
                <div>
                  <span className="font-bold">
                    Este profesional tiene {affectedAppointments.length} pacientes programados:
                  </span>
                  <p className="text-[11px] text-rose-800">
                    {affectedAppointments.length} turnos afectados por la ausencia.
                  </p>
                </div>
                {!absentDoc?.ausente && (
                  <button
                    onClick={handleSaveAbsence}
                    className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold"
                  >
                    Confirmar ausencia
                  </button>
                )}
              </div>

              {/* Reassignment Proposals */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-stone-800 uppercase block">
                  Propuestas de reubicación rápida:
                </span>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {affectedAppointments.map((apt) => {
                    // Find compatible doctor in the same specialty
                    const alternativeDoc = doctors.find(
                      (d) => d.especialidad === apt.especialidad && d.id !== selectedDoctorAbsence && !d.ausente
                    ) || doctors[0];

                    return (
                      <div
                        key={apt.id}
                        className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="font-bold text-stone-900">
                            {apt.pacienteNombre} ({apt.pacienteEdad} años - {apt.pacienteLocalidad})
                          </div>
                          <div className="text-[11px] text-stone-500">
                            Horario actual: {apt.fecha} a las {apt.hora} hs
                          </div>
                          <div className="text-[11px] font-bold text-teal-800 mt-0.5">
                            Alternativa sugerida: {alternativeDoc.nombre} (Consultorio {alternativeDoc.consultorio})
                          </div>
                        </div>

                        <button
                          onClick={async () => {
                            const ok = await reassignDoctorAppointment(apt.id, alternativeDoc.nombre, alternativeDoc.id);
                            setReassignSuccess(
                              ok
                                ? `Turno de ${apt.pacienteNombre} reubicado exitosamente con ${alternativeDoc.nombre}.`
                                : `${alternativeDoc.nombre} no tiene un horario libre exactamente a las ${apt.hora} hs. Reprogramalo manualmente desde la agenda.`
                            );
                            setTimeout(() => setReassignSuccess(null), 3500);
                          }}
                          className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold shrink-0 self-start sm:self-auto"
                        >
                          Reubicar
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  onClick={() => setShowAbsenceModal(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
