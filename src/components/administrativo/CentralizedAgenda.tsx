import React, { useState } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { Appointment, AppointmentStatus, TipoAgenda } from '../../types';
import {
  Calendar,
  Clock,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  RotateCcw,
  XCircle,
  User,
  Users,
  MapPin,
  Sparkles,
  Phone,
  MessageSquare,
  Globe,
  Compass,
  Hourglass,
  UserCheck,
  Stethoscope,
  Building2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { NewManualAppointmentModal } from './NewManualAppointmentModal';

export const CentralizedAgenda: React.FC = () => {
  const {
    appointments,
    specialties,
    doctors,
    cancelAppointment,
    rescheduleAppointment,
    updateAppointmentStatus,
    releasedSlotAlert,
    dismissReleasedSlotAlert,
    assignWaitlistCandidate,
    advanceDemoStep,
  } = useHospital();

  // Mode: Por servicio vs Por profesional (Requirements 9 & 10)
  const [agendaMode, setAgendaMode] = useState<TipoAgenda>('SERVICIO');
  const [selectedFecha, setSelectedFecha] = useState(new Date().toISOString().slice(0, 10));
  const [selectedEspecialidad, setSelectedEspecialidad] = useState('Todas');
  const [selectedProfesional, setSelectedProfesional] = useState('Todos');
  const [selectedEstado, setSelectedEstado] = useState('Todos');

  const [showNewModal, setShowNewModal] = useState(false);
  const [newModalPrefill, setNewModalPrefill] = useState<any>(null);
  const [activeAppointmentDetail, setActiveAppointmentDetail] = useState<Appointment | null>(null);
  const [rescheduleModalApt, setRescheduleModalApt] = useState<Appointment | null>(null);
  const [newRescheduleTime, setNewRescheduleTime] = useState('11:30');

  // Filter logic based on agendaMode
  const filteredAppointments = appointments.filter((a) => {
    if (a.fecha !== selectedFecha) return false;

    if (agendaMode === 'SERVICIO') {
      if (selectedEspecialidad !== 'Todas' && a.especialidad !== selectedEspecialidad) return false;
    } else {
      if (selectedProfesional !== 'Todos' && a.profesional !== selectedProfesional) return false;
    }

    if (selectedEstado !== 'Todos' && a.estado !== selectedEstado) return false;
    return true;
  });

  // Current selected doctor info (for delay & absence warnings)
  const currentDocObj = doctors.find((d) => d.nombre === selectedProfesional);

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'PENDIENTE_DE_LLEGADA':
        return 'bg-stone-100 text-stone-700 border-stone-300 font-medium';
      case 'EN_ESPERA':
        return 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
      case 'EN_CONSULTORIO':
        return 'bg-teal-100 text-teal-900 border-teal-300 font-bold animate-pulse';
      case 'ATENDIDO':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';
      case 'CANCELADO':
        return 'bg-rose-100 text-rose-800 border-rose-300 line-through';
      case 'NO_ASISTIO':
        return 'bg-stone-200 text-stone-600 border-stone-400';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-300';
    }
  };

  const getStatusLabel = (status: AppointmentStatus) => {
    switch (status) {
      case 'PENDIENTE_DE_LLEGADA':
        return 'Pendiente de llegada';
      case 'EN_ESPERA':
        return 'En espera en sala';
      case 'EN_CONSULTORIO':
        return 'En consultorio';
      case 'ATENDIDO':
        return 'Atendido';
      case 'CANCELADO':
        return 'Cancelado';
      case 'NO_ASISTIO':
        return 'No asistió';
      default:
        return status;
    }
  };

  const getChannelIcon = (canal?: string) => {
    switch (canal) {
      case 'whatsapp':
        return <MessageSquare className="w-3.5 h-3.5 text-emerald-600" title="Canal: WhatsApp" />;
      case 'telefono':
        return <Phone className="w-3.5 h-3.5 text-teal-700" title="Canal: Telefónico" />;
      case 'presencial':
        return <Users className="w-3.5 h-3.5 text-amber-700" title="Canal: Presencial / Ventanilla" />;
      case 'web':
        return <Globe className="w-3.5 h-3.5 text-teal-800" title="Canal: Portal Web" />;
      case 'asistente_social':
        return <Compass className="w-3.5 h-3.5 text-teal-700" title="Canal: Asistente Social" />;
      default:
        return <Globe className="w-3.5 h-3.5 text-stone-400" />;
    }
  };

  const handleOpenAssignFreeSlot = () => {
    setNewModalPrefill({
      tipoAgenda: agendaMode,
      especialidad: selectedEspecialidad !== 'Todas' ? selectedEspecialidad : undefined,
    });
    setShowNewModal(true);
  };

  return (
    <div className="space-y-5">
      {/* Alert banner when a slot was cancelled and matching candidates exist in waitlist (Scene 4) */}
      {releasedSlotAlert && (
        <div className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-4.5 shadow-2xs space-y-3 animate-fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-700 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-md">
                  Liberación Automática de Turno • Lista de Espera Inteligente
                </span>
                <h4 className="text-sm font-bold text-stone-900 mt-0.5">
                  Se liberó un turno en {releasedSlotAlert.especialidad} ({releasedSlotAlert.fecha} a las {releasedSlotAlert.hora} hs)
                </h4>
                <p className="text-xs text-stone-600">
                  Hay <strong>{releasedSlotAlert.matchingCandidates.length} pacientes compatibles</strong> esperando. Asigná el turno inmediatamente con un clic:
                </p>
              </div>
            </div>
            <button
              onClick={dismissReleasedSlotAlert}
              className="text-stone-400 hover:text-stone-600 text-xs p-1"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            {releasedSlotAlert.matchingCandidates.map((c) => (
              <div
                key={c.id}
                className="bg-white p-3 rounded-xl border border-amber-200 text-xs flex items-center justify-between shadow-2xs"
              >
                <div>
                  <span className="font-bold text-stone-900 block">{c.pacienteNombre} ({c.edad} años)</span>
                  <span className="text-[11px] text-stone-500">{c.localidad} • Tel: {c.telefono}</span>
                </div>
                <button
                  onClick={async () => {
                    if (!releasedSlotAlert) return;
                    await assignWaitlistCandidate(c.id, releasedSlotAlert.slotId);
                    advanceDemoStep();
                  }}
                  className="px-2.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg text-[11px] shadow-2xs transition-colors shrink-0"
                >
                  Asignar turno
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Toggle: Por Servicio vs Por Profesional (Requirements 9 & 10) */}
      <div className="bg-white p-4.5 rounded-2xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md bg-stone-100 text-stone-800 border border-stone-200">
              Tipo de Agenda Activa: {agendaMode === 'SERVICIO' ? 'POR SERVICIO' : 'POR PROFESIONAL'}
            </span>
          </div>
          <h2 className="text-lg font-black text-stone-900 mt-1">
            {agendaMode === 'SERVICIO'
              ? 'Agenda por Servicio (Cola Única del Servicio Pediátrico)'
              : 'Agenda por Profesional (Agenda Nominal del Médico)'}
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            {agendaMode === 'SERVICIO'
              ? 'Los turnos se asignan a la especialidad/servicio. El profesional se define al atender o por orden de llegada.'
              : 'Los turnos se programan con un profesional específico y consultorio fijo.'}
          </p>
        </div>

        {/* The Toggle Buttons */}
        <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 self-start sm:self-auto shrink-0">
          <button
            onClick={() => setAgendaMode('SERVICIO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              agendaMode === 'SERVICIO'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Por Servicio</span>
          </button>
          <button
            onClick={() => setAgendaMode('PROFESIONAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              agendaMode === 'PROFESIONAL'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Por Profesional</span>
          </button>
        </div>
      </div>

      {/* Doctor Delay or Absence Banners if in Por Profesional mode */}
      {agendaMode === 'PROFESIONAL' && currentDocObj && (
        <>
          {(currentDocObj.demoraMinutos || 0) > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <Hourglass className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  <strong>Aviso de demora:</strong> {currentDocObj.nombre} presenta una demora aproximada de{' '}
                  <strong>{currentDocObj.demoraMinutos} minutos</strong>.
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold bg-amber-200/80 px-2 py-0.5 rounded-md">
                Notificado a familias
              </span>
            </div>
          )}

          {currentDocObj.ausente && (
            <div className="bg-rose-50 border border-rose-300 rounded-xl p-3 flex items-center justify-between text-xs text-rose-900">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                <span>
                  <strong>Profesional ausente:</strong> {currentDocObj.nombre} ({currentDocObj.motivoAusencia || 'Licencia médica'}). Turnos requieren reubicación.
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold bg-rose-200 text-rose-950 px-2 py-0.5 rounded-md">
                Ausente
              </span>
            </div>
          )}
        </>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
            Fecha de agenda
          </label>
          <input
            type="date"
            value={selectedFecha}
            onChange={(e) => setSelectedFecha(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800"
          />
        </div>

        {agendaMode === 'SERVICIO' ? (
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
              Servicio / Especialidad
            </label>
            <select
              value={selectedEspecialidad}
              onChange={(e) => setSelectedEspecialidad(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800"
            >
              <option value="Todas">Todos los servicios</option>
              {specialties.map((s) => (
                <option key={s.id} value={s.nombre}>
                  {s.nombre} ({s.tipoAgenda === 'SERVICIO' ? 'Servicio' : 'Profesional'})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
              Profesional médico
            </label>
            <select
              value={selectedProfesional}
              onChange={(e) => setSelectedProfesional(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800"
            >
              <option value="Todos">Todos los médicos</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.nombre}>
                  {d.nombre} ({d.especialidad}) {d.ausente ? '• AUSENTE' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
            Estado de atención
          </label>
          <select
            value={selectedEstado}
            onChange={(e) => setSelectedEstado(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-medium text-stone-800"
          >
            <option value="Todos">Todos los estados</option>
            <option value="PENDIENTE_DE_LLEGADA">Pendiente de llegada</option>
            <option value="EN_ESPERA">En espera en sala</option>
            <option value="EN_CONSULTORIO">En consultorio</option>
            <option value="ATENDIDO">Atendido</option>
            <option value="CANCELADO">Cancelado</option>
            <option value="NO_ASISTIO">No asistió</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={() => {
              setNewModalPrefill(null);
              setShowNewModal(true);
            }}
            className="w-full py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs shadow-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Asignar turno</span>
          </button>
        </div>
      </div>

      {/* Appointments List / Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-700" />
            <span className="font-bold text-sm text-stone-900">
              Turnos ({filteredAppointments.length})
            </span>
          </div>
          <span className="text-xs text-stone-500 font-medium">
            Fecha seleccionada: {selectedFecha}
          </span>
        </div>

        {filteredAppointments.length === 0 ? (
          <div className="p-12 text-center text-stone-400 text-xs space-y-2">
            <p>No hay turnos registrados con los filtros seleccionados.</p>
            <button
              onClick={() => handleOpenAssignFreeSlot()}
              className="text-teal-700 font-bold hover:underline"
            >
              + Asignar nuevo turno en este horario
            </button>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredAppointments.map((apt) => {
              return (
                <div
                  key={apt.id}
                  className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-stone-50/70 transition-colors"
                >
                  {/* Left Column: Hour & Patient */}
                  <div className="flex items-start gap-3">
                    <div className="w-16 text-center py-2 bg-stone-100 rounded-xl border border-stone-200 shrink-0">
                      <span className="text-xs font-black text-stone-900 block">{apt.hora}</span>
                      <span className="text-[10px] text-stone-500 font-bold">hs</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-stone-900 text-sm">{apt.pacienteNombre}</span>
                        <span className="text-xs text-stone-500 font-medium">
                          ({apt.pacienteEdad} años)
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                          <MapPin className="w-3 h-3 text-teal-700" />
                          {apt.pacienteLocalidad}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(apt.estado)}`}>
                          {getStatusLabel(apt.estado)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-stone-600 flex-wrap">
                        <span className="font-bold text-teal-900">{apt.especialidad}</span>
                        <span>•</span>
                        <span className="text-stone-500 font-medium">
                          {apt.tipoAgenda === 'SERVICIO' ? (
                            <span className="text-teal-800 font-bold">
                              Cola del Servicio {apt.profesional && apt.profesional !== 'Se asignará al momento de la atención' ? `(${apt.profesional})` : '• Médico de guardia/servicio'}
                            </span>
                          ) : (
                            <span>{apt.profesional}</span>
                          )}
                        </span>
                        <span>•</span>
                        <span>Cons. {apt.consultorio}</span>
                        <span>•</span>
                        <div className="inline-flex items-center gap-1 text-stone-500">
                          {getChannelIcon(apt.origenCanal)}
                          <span className="text-[11px] capitalize">{apt.origenCanal}</span>
                        </div>
                      </div>

                      {apt.motivoResumido && (
                        <p className="text-xs text-stone-500 italic">
                          “{apt.motivoResumido}”
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Dynamic Status Actions according to pediatric flow */}
                  <div className="flex items-center gap-2 self-start lg:self-center flex-wrap">
                    {/* SCENE 2: PENDIENTE_DE_LLEGADA -> Registrar llegada -> EN_ESPERA */}
                    {apt.estado === 'PENDIENTE_DE_LLEGADA' && (
                      <button
                        onClick={async () => {
                          await updateAppointmentStatus(apt.id, 'EN_ESPERA');
                          advanceDemoStep();
                        }}
                        className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                        title="Registrar que la familia ya se presentó en ventanilla"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Registrar llegada</span>
                      </button>
                    )}

                    {/* SCENE 3: EN_ESPERA -> Llamar / En consultorio -> EN_CONSULTORIO */}
                    {apt.estado === 'EN_ESPERA' && (
                      <button
                        onClick={async () => {
                          await updateAppointmentStatus(apt.id, 'EN_CONSULTORIO');
                          advanceDemoStep();
                        }}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Llamar a consultorio</span>
                      </button>
                    )}

                    {/* EN_CONSULTORIO -> Finalizar atención -> ATENDIDO */}
                    {apt.estado === 'EN_CONSULTORIO' && (
                      <button
                        onClick={() => updateAppointmentStatus(apt.id, 'ATENDIDO')}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Finalizar atención</span>
                      </button>
                    )}

                    {/* Secondary Actions (No asistió, Cancelar, Reprogramar) */}
                    {apt.estado !== 'CANCELADO' && apt.estado !== 'ATENDIDO' && (
                      <>
                        <button
                          onClick={() => updateAppointmentStatus(apt.id, 'NO_ASISTIO')}
                          className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold border border-stone-200 transition-colors"
                          title="Marcar como no asistió"
                        >
                          No asistió
                        </button>

                        <button
                          onClick={async () => {
                            await cancelAppointment(apt.id, 'Cancelado desde la agenda centralizada');
                            advanceDemoStep();
                          }}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-xl text-xs font-semibold border border-rose-200 transition-colors"
                          title="Cancelar turno y liberar horario"
                        >
                          Cancelar
                        </button>

                        <button
                          onClick={() => setRescheduleModalApt(apt)}
                          className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold border border-stone-200 transition-colors"
                          title="Reprogramar fecha u hora"
                        >
                          Reprogramar
                        </button>
                      </>
                    )}

                    {/* Detail button */}
                    <button
                      onClick={() => setActiveAppointmentDetail(apt)}
                      className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
                      title="Ver detalle del turno"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Booking Modal */}
      {showNewModal && (
        <NewManualAppointmentModal
          prefill={newModalPrefill}
          onClose={() => setShowNewModal(false)}
        />
      )}

      {/* Reschedule Modal */}
      {rescheduleModalApt && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200">
            <h3 className="text-base font-bold text-stone-900 mb-1">
              Reprogramar Turno
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Paciente: {rescheduleModalApt.pacienteNombre} • {rescheduleModalApt.especialidad}
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-stone-600 block uppercase mb-1">
                  Nuevo Horario
                </label>
                <select
                  value={newRescheduleTime}
                  onChange={(e) => setNewRescheduleTime(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50"
                >
                  <option value="09:00">09:00 hs</option>
                  <option value="09:30">09:30 hs</option>
                  <option value="10:00">10:00 hs</option>
                  <option value="10:30">10:30 hs</option>
                  <option value="11:00">11:00 hs</option>
                  <option value="11:30">11:30 hs</option>
                  <option value="12:00">12:00 hs</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRescheduleModalApt(null)}
                  className="flex-1 py-2 text-xs font-semibold text-stone-600 bg-stone-100 rounded-xl hover:bg-stone-200"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await rescheduleAppointment(rescheduleModalApt.id, rescheduleModalApt.fecha, newRescheduleTime);
                    if (!ok) {
                      alert('No hay un turno disponible exactamente en ese horario para reprogramar. Probá otro horario.');
                      return;
                    }
                    setRescheduleModalApt(null);
                  }}
                  className="flex-1 py-2 text-xs font-bold text-white bg-teal-700 rounded-xl hover:bg-teal-800 shadow-xs"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Detail Modal */}
      {activeAppointmentDetail && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                  Comprobante de Turno
                </span>
                <h3 className="text-base font-bold text-stone-900 mt-1">
                  {activeAppointmentDetail.codigo}
                </h3>
              </div>
              <button
                onClick={() => setActiveAppointmentDetail(null)}
                className="text-stone-400 hover:text-stone-700 text-xs p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-stone-100">
                <span className="text-stone-500">Paciente:</span>
                <span className="font-bold text-stone-900">
                  {activeAppointmentDetail.pacienteNombre} ({activeAppointmentDetail.pacienteEdad} años)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100">
                <span className="text-stone-500">Origen / Localidad:</span>
                <span className="font-bold text-stone-900">{activeAppointmentDetail.pacienteLocalidad}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100">
                <span className="text-stone-500">Especialidad:</span>
                <span className="font-bold text-stone-900">{activeAppointmentDetail.especialidad}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100">
                <span className="text-stone-500">Tipo de Agenda:</span>
                <span className="font-bold text-stone-900">
                  {activeAppointmentDetail.tipoAgenda === 'SERVICIO' ? 'Por Servicio' : 'Por Profesional'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100">
                <span className="text-stone-500">Profesional:</span>
                <span className="font-bold text-stone-900">{activeAppointmentDetail.profesional}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100">
                <span className="text-stone-500">Consultorio:</span>
                <span className="font-bold text-stone-900">{activeAppointmentDetail.consultorio}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100">
                <span className="text-stone-500">Fecha y Hora:</span>
                <span className="font-bold text-stone-900">
                  {activeAppointmentDetail.fecha} a las {activeAppointmentDetail.hora} hs
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100">
                <span className="text-stone-500">Canal de Solicitud:</span>
                <span className="font-bold text-stone-900 capitalize">{activeAppointmentDetail.origenCanal}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-stone-500">Estado:</span>
                <span className={`font-bold px-2 py-0.5 rounded-md ${getStatusBadge(activeAppointmentDetail.estado)}`}>
                  {getStatusLabel(activeAppointmentDetail.estado)}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setActiveAppointmentDetail(null)}
                className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
