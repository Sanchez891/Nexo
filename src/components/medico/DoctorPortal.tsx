import React, { useState } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { Appointment, AppointmentStatus, TipoAgenda } from '../../types';
import {
  Stethoscope,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  UserX,
  MapPin,
  Calendar,
  Building2,
  Hourglass,
  ArrowRight,
  ShieldCheck,
  Phone,
} from 'lucide-react';

export const DoctorPortal: React.FC = () => {
  const {
    appointments,
    doctors,
    updateAppointmentStatus,
    reportDoctorDelay,
    clearDoctorDelay,
    advanceDemoStep,
  } = useHospital();

  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [activePatientApt, setActivePatientApt] = useState<Appointment | null>(null);
  const [showDelayPicker, setShowDelayPicker] = useState(false);

  const currentDoctor = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];

  if (!currentDoctor) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 text-center text-stone-500 text-sm">
        No hay profesionales cargados en el sistema todavía.
      </div>
    );
  }

  const isServiceAgenda = currentDoctor.tipoAgenda === 'SERVICIO';

  // Turnos del día de hoy (fecha real, no simulada)
  const todayDate = new Date().toISOString().slice(0, 10);

  const relevantAppointments = appointments.filter((a) => {
    if (a.fecha !== todayDate || a.estado === 'CANCELADO') return false;
    if (isServiceAgenda) {
      return a.especialidad.toLowerCase() === currentDoctor.especialidad.toLowerCase();
    } else {
      return a.profesional.toLowerCase() === currentDoctor.nombre.toLowerCase();
    }
  });

  const waitingPatients = relevantAppointments.filter((a) => a.estado === 'EN_ESPERA');
  const inConsultationPatient = relevantAppointments.find((a) => a.estado === 'EN_CONSULTORIO');
  const attendedPatients = relevantAppointments.filter((a) => a.estado === 'ATENDIDO');

  // Handle calling the next patient from queue (SCENE 3)
  const handleCallNextPatient = async (apt: Appointment) => {
    await updateAppointmentStatus(apt.id, 'EN_CONSULTORIO');
    setActivePatientApt({ ...apt, estado: 'EN_CONSULTORIO' });
    advanceDemoStep();
  };

  // Handle completing consultation (SCENE 3)
  const handleFinishConsultation = async (aptId: string) => {
    await updateAppointmentStatus(aptId, 'ATENDIDO');
    if (activePatientApt?.id === aptId) {
      setActivePatientApt(null);
    }
    advanceDemoStep();
  };

  const handleMarkNoShow = async (aptId: string) => {
    await updateAppointmentStatus(aptId, 'NO_ASISTIO');
    if (activePatientApt?.id === aptId) {
      setActivePatientApt(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Top Header with Doctor Selector */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-800 text-white flex items-center justify-center font-bold shadow-xs">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                  {isServiceAgenda ? 'Agenda por Servicio Pediátrico' : 'Agenda Médica Nominal'}
                </span>
                <span className="text-xs text-stone-500 font-medium">Consultorio {currentDoctor.consultorio}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 mt-0.5">
                {currentDoctor.nombre}
              </h1>
              <p className="text-xs text-stone-600 font-medium">
                {currentDoctor.especialidad} • Hospital Pediátrico Juan Pablo II
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* Doctor Switcher for testing different scenarios */}
            <div className="text-right">
              <label className="text-[10px] uppercase font-bold text-stone-400 block mb-0.5">
                Simular profesional:
              </label>
              <select
                value={selectedDoctorId}
                onChange={(e) => {
                  setSelectedDoctorId(e.target.value);
                  setActivePatientApt(null);
                }}
                className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-bold text-stone-800"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre} ({d.tipoAgenda === 'SERVICIO' ? 'Servicio' : 'Nominal'} - {d.especialidad})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Doctor Delay Control Bar (Requirement 14) */}
        <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Hourglass className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="text-xs text-stone-700 font-medium">
              Estado de demora:{' '}
              {(currentDoctor.demoraMinutos || 0) > 0 ? (
                <strong className="text-amber-900 font-bold">
                  {currentDoctor.demoraMinutos} minutos reportados a sala y familias
                </strong>
              ) : (
                <span className="text-emerald-800 font-bold">Atendiendo a horario sin demora</span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {(currentDoctor.demoraMinutos || 0) > 0 ? (
              <button
                onClick={() => clearDoctorDelay(currentDoctor.id)}
                className="px-3 py-1 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg text-xs font-semibold transition-colors"
              >
                Restablecer a horario normal
              </button>
            ) : (
              <button
                onClick={() => setShowDelayPicker(!showDelayPicker)}
                className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
              >
                <Hourglass className="w-3.5 h-3.5" />
                <span>+ Reportar demora de consultorio</span>
              </button>
            )}
          </div>
        </div>

        {/* Delay Quick Selector */}
        {showDelayPicker && (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2 animate-fade-in">
            <span className="text-xs font-bold text-amber-900 block">
              Seleccionar tiempo estimado de demora para avisar a las familias:
            </span>
            <div className="flex gap-2">
              {[15, 30, 45, 60].map((min) => (
                <button
                  key={min}
                  onClick={() => {
                    reportDoctorDelay(currentDoctor.id, min);
                    setShowDelayPicker(false);
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  {min} minutos
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Indicators Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
            <span className="text-[10px] font-bold uppercase text-stone-400 block">Total del Día</span>
            <span className="text-xl font-extrabold text-stone-900">{relevantAppointments.length}</span>
          </div>
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
            <span className="text-[10px] font-bold uppercase text-amber-800 block">En Espera (Sala)</span>
            <span className="text-xl font-extrabold text-amber-900">{waitingPatients.length}</span>
          </div>
          <div className="bg-teal-50 p-3 rounded-xl border border-teal-200">
            <span className="text-[10px] font-bold uppercase text-teal-800 block">En Consultorio</span>
            <span className="text-xl font-extrabold text-teal-900">{inConsultationPatient ? 1 : 0}</span>
          </div>
          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
            <span className="text-[10px] font-bold uppercase text-emerald-800 block">Atendidos</span>
            <span className="text-xl font-extrabold text-emerald-900">{attendedPatients.length}</span>
          </div>
        </div>
      </div>

      {/* ACTIVE PATIENT IN CONSULTATION (SCENE 3) */}
      {inConsultationPatient && (
        <div className="bg-teal-50/90 border-2 border-teal-600 rounded-3xl p-5 shadow-xs space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-teal-600 animate-ping"></span>
              <span className="text-xs font-extrabold uppercase tracking-wider text-teal-950">
                Atención Activa en Consultorio {currentDoctor.consultorio}
              </span>
            </div>
            <span className="text-xs font-bold text-teal-800 bg-white px-2.5 py-1 rounded-md border border-teal-200">
              Turno: {inConsultationPatient.hora} hs
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-stone-900">
                  {inConsultationPatient.pacienteNombre}
                </h3>
                <span className="text-xs text-stone-500 font-medium">
                  ({inConsultationPatient.pacienteEdad} años)
                </span>
                <span className="text-xs text-teal-800 font-bold bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                  {inConsultationPatient.pacienteLocalidad}
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-1">
                Motivo: <span className="font-bold text-stone-900">{inConsultationPatient.motivoResumido || 'Consulta pediátrica programada'}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleFinishConsultation(inConsultationPatient.id)}
                className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Finalizar atención</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WAITING PATIENTS QUEUE (SCENE 3) */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="bg-stone-50 px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-700" />
            <h3 className="font-bold text-sm text-stone-900">
              {isServiceAgenda
                ? `Pacientes en Espera del Servicio (${currentDoctor.especialidad})`
                : `Pacientes en Sala de Espera (${currentDoctor.nombre})`}
            </h3>
          </div>
          <span className="text-xs font-bold text-stone-500 bg-white px-2.5 py-1 rounded-md border border-stone-200">
            {waitingPatients.length} en espera
          </span>
        </div>

        {waitingPatients.length === 0 ? (
          <div className="p-8 text-center text-stone-400 text-xs">
            No hay pacientes esperando en sala en este momento.
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {waitingPatients.map((apt) => (
              <div
                key={apt.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/60 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-stone-900 bg-stone-100 px-2 py-0.5 rounded-md">
                      {apt.hora} hs
                    </span>
                    <span className="font-bold text-sm text-stone-900">{apt.pacienteNombre}</span>
                    <span className="text-xs text-stone-500">({apt.pacienteEdad} años)</span>
                    <span className="text-[11px] text-teal-800 font-bold bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                      {apt.pacienteLocalidad}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1 italic">
                    “{apt.motivoResumido || 'Consulta pediátrica programada'}”
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={() => handleCallNextPatient(apt)}
                    className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Llamar a consultorio</span>
                  </button>

                  <button
                    onClick={() => handleMarkNoShow(apt.id)}
                    className="px-2.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl text-xs font-semibold transition-colors"
                  >
                    No asistió
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ALL APPOINTMENTS OF THE DAY LIST */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <span className="font-bold text-sm text-stone-900">
            Todos los turnos de la jornada ({todayDate})
          </span>
          <span className="text-xs text-stone-500">
            {relevantAppointments.length} turnos programados
          </span>
        </div>

        <div className="divide-y divide-stone-100">
          {relevantAppointments.map((apt) => (
            <div key={apt.id} className="p-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="font-black text-stone-900 bg-stone-100 px-2 py-1 rounded-md">
                  {apt.hora} hs
                </span>
                <div>
                  <span className="font-bold text-stone-900 text-sm block">{apt.pacienteNombre}</span>
                  <span className="text-stone-500 text-[11px]">
                    {apt.pacienteLocalidad} • {apt.tipoConsulta || 'Consulta médica'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`font-bold text-[10px] uppercase px-2.5 py-1 rounded-full border ${
                    apt.estado === 'ATENDIDO'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : apt.estado === 'EN_CONSULTORIO'
                      ? 'bg-teal-50 text-teal-800 border-teal-200 animate-pulse'
                      : apt.estado === 'EN_ESPERA'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-stone-100 text-stone-600 border-stone-200'
                  }`}
                >
                  {apt.estado}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
