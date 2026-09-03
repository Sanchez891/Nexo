import React, { useState } from 'react';
import { useHospital } from '../../context/HospitalContext';
import {
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Bell,
  Check,
  X,
  UserCheck,
  ChevronRight,
  Send,
  Users,
} from 'lucide-react';

export const FamiliarWaitlist: React.FC = () => {
  const {
    waitlist,
    addToWaitlist,
    removeFromWaitlist,
    patientSlotOffer,
    acceptPatientSlotOffer,
    dismissPatientSlotOffer,
    currentTutor,
    getPersonasACargo,
  } = useHospital();

  const personasACargo = getPersonasACargo(currentTutor?.id);
  const firstPersona = personasACargo[0]?.paciente || personasACargo[0];
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(firstPersona?.id || 'p1');
  const [selectedSpecialty, setSelectedSpecialty] = useState('Cardiología Pediátrica');
  const [preferenciaHorario, setPreferenciaHorario] = useState<'cualquiera' | 'manana' | 'tarde'>('cualquiera');
  const [localNotification, setLocalNotification] = useState<{
    especialidad: string;
    fecha: string;
    hora: string;
  } | null>(null);

  const selectedRel = personasACargo.find((r) => (r.paciente?.id || r.id) === selectedPersonaId);
  const selectedPersona = selectedRel?.paciente || selectedRel;

  // Check if any of the tutor's personas a cargo are in waitlist
  const tutorWaitlistEntries = waitlist.filter((w) => {
    if (currentTutor?.id && w.tutorSolicitanteId === currentTutor.id) return true;
    return personasACargo.some((rel) => {
      const p = rel.paciente || rel;
      return p?.id === w.pacienteId || (p?.nombre && p.nombre.toLowerCase() === w.pacienteNombre.toLowerCase());
    });
  });

  const handleJoinWaitlist = () => {
    if (!selectedPersona) return;
    const tutorId = currentTutor?.id || 'tut-maria';
    const tutorNombre = currentTutor ? `${currentTutor.nombre} ${currentTutor.apellido}` : 'María González';
    const tutorTelefono = currentTutor?.telefono || '+54 3794 451299';
    const tutorRel = selectedRel?.tipoRelacion || selectedRel?.relacion || 'Tutor responsable';

    addToWaitlist({
      pacienteId: selectedPersona.id,
      pacienteNombre: selectedPersona.nombre,
      dni: selectedPersona.dni,
      especialidad: selectedSpecialty,
      localidad: selectedPersona.localidad,
      preferenciaHorario,
      prioridad: 'normal',
      telefono: tutorTelefono,
      tutorSolicitanteId: tutorId,
      tutorSolicitanteNombre: tutorNombre,
      tutorSolicitanteRelacion: tutorRel,
      tutorSolicitanteTelefono: tutorTelefono,
    });
  };

  const handleSimulateSlotRelease = () => {
    setLocalNotification({
      especialidad: selectedSpecialty,
      fecha: 'Mañana (Jueves 10 Sep)',
      hora: '11:30 hs',
    });
  };

  const handleAcceptSlot = () => {
    acceptPatientSlotOffer();
    setLocalNotification(null);
  };

  return (
    <div className="space-y-6">
      {/* Simulation Banner for Demo */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-amber-900">
          <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>Herramienta de Demo:</strong> Podés simular en cualquier momento la liberación de un sobreturno.
          </span>
        </div>
        <button
          onClick={handleSimulateSlotRelease}
          className="text-xs bg-amber-700 hover:bg-amber-800 text-white font-bold px-3 py-1.5 rounded-lg transition-colors shadow-2xs shrink-0"
        >
          Simular turno liberado
        </button>
      </div>

      {/* Simulated Notification: ¡Se liberó un turno! */}
      {(localNotification || patientSlotOffer) && (
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-teal-900 text-white rounded-2xl p-5 shadow-lg border border-emerald-500/30 animate-bounce-short">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0 mt-0.5">
                <Bell className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-md">
                  Notificación en tiempo real
                </span>
                <h3 className="text-lg font-bold mt-1">¡Se liberó un turno!</h3>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Una vacante coincide con tu solicitud en lista de espera para tu persona a cargo.
                </p>

                <div className="bg-white/10 rounded-xl p-3 my-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-emerald-200">Especialidad:</span>
                    <span className="font-bold">
                      {localNotification?.especialidad || patientSlotOffer?.especialidad || 'Cardiología Pediátrica'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-200">Fecha y Hora:</span>
                    <span className="font-bold">
                      {localNotification?.fecha || patientSlotOffer?.fecha || 'Mañana'} • {localNotification?.hora || patientSlotOffer?.hora || '11:30 hs'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-200">Profesional:</span>
                    <span className="font-medium">Dr. Juan Pérez • Cons. 12</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleAcceptSlot}
                    className="px-4 py-2 bg-white text-teal-900 font-bold rounded-xl text-xs hover:bg-stone-100 transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Aceptar turno</span>
                  </button>
                  <button
                    onClick={() => {
                      setLocalNotification(null);
                      dismissPatientSlotOffer();
                    }}
                    className="px-3 py-2 bg-white/15 hover:bg-white/25 text-white font-medium rounded-xl text-xs transition-colors"
                  >
                    No puedo asistir
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setLocalNotification(null);
                dismissPatientSlotOffer();
              }}
              className="text-white/60 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Waitlist Status or Form */}
      {tutorWaitlistEntries.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-stone-900">Solicitudes activas en lista de espera</h3>
            <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
              {tutorWaitlistEntries.length} en seguimiento
            </span>
          </div>

          <div className="space-y-3">
            {tutorWaitlistEntries.map((entry) => (
              <div key={entry.id} className="bg-white rounded-2xl p-5 border border-stone-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-stone-100 text-teal-800 flex items-center justify-center font-bold border border-stone-200">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                        Persona a cargo: {entry.pacienteNombre}
                      </span>
                      <h4 className="text-base font-bold text-stone-900">{entry.especialidad}</h4>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    #{entry.posicion} en la fila
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-stone-50 p-3 rounded-xl text-xs border border-stone-100">
                  <div>
                    <span className="text-stone-400 block text-[10px]">Tutor Responsable:</span>
                    <span className="font-semibold text-stone-800">{entry.tutorSolicitanteNombre || `${currentTutor.nombre} ${currentTutor.apellido}`}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px]">Preferencia de horario:</span>
                    <span className="font-semibold text-stone-800 capitalize">
                      {entry.preferenciaHorario === 'cualquiera' ? 'Cualquier horario' : entry.preferenciaHorario}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px]">Origen:</span>
                    <span className="font-semibold text-stone-800">{entry.localidad}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1 text-xs">
                  <span className="text-stone-400 text-[11px]">Solicitado: {entry.fechaSolicitud}</span>
                  <button
                    onClick={() => removeFromWaitlist(entry.id)}
                    className="text-xs text-rose-700 hover:text-rose-800 font-medium hover:underline"
                  >
                    Dar de baja de la lista
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Actualmente no hay disponibilidad inmediata</h3>
              <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
                Si la agenda de la especialidad está completa, sumate a la lista de espera inteligente. El sistema te asignará automáticamente cuando alguien cancele o reprograme.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {/* Persona a cargo Selector */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-teal-700" />
                Seleccionar Persona a Cargo
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {personasACargo.map((rel) => {
                  const p = rel.paciente || rel;
                  const pId = p.id || rel.id;
                  const pNombre = p.nombre || rel.nombre;
                  const pEdad = p.edad !== undefined ? p.edad : rel.edad;
                  const pDni = p.dni || rel.dni;
                  const pRel = rel.tipoRelacion || rel.relacion;
                  const isSelected = selectedPersonaId === pId;
                  return (
                    <button
                      key={pId}
                      type="button"
                      onClick={() => setSelectedPersonaId(pId)}
                      className={`p-3 rounded-xl text-left border transition-all ${
                        isSelected
                          ? 'bg-teal-50/90 border-teal-600 ring-2 ring-teal-600/20 text-teal-950'
                          : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{pNombre}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-stone-200 text-stone-600">
                          {pRel}
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-500 block mt-0.5">
                        {pEdad} años • DNI {pDni}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Especialidad requerida
              </label>
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm font-medium text-stone-800"
              >
                <option value="Cardiología Pediátrica">Cardiología Pediátrica</option>
                <option value="Neurología">Neurología Infantil</option>
                <option value="Traumatología">Traumatología</option>
                <option value="Nutrición">Nutrición</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Preferencia de horario
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'cualquiera', label: 'Cualquier horario' },
                  { key: 'manana', label: 'Solo mañana' },
                  { key: 'tarde', label: 'Solo tarde' },
                ].map((pref) => (
                  <button
                    key={pref.key}
                    type="button"
                    onClick={() => setPreferenciaHorario(pref.key as any)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all text-center ${
                      preferenciaHorario === pref.key
                        ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {pref.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleJoinWaitlist}
              className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs shadow-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Sumarme a lista de espera para {selectedPersona?.nombre || 'la persona a cargo'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
