import React, { useState, useEffect } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { RequestChannel, Localidad, TipoAgenda } from '../../types';
import {
  Phone,
  MessageSquare,
  Globe,
  Users,
  AlertTriangle,
  CheckCircle2,
  Search,
  Building2,
  Stethoscope,
  Compass,
} from 'lucide-react';
import { PatientSearchResult, searchPacientes } from '../../services/patients.service';
import { AvailableSlot, getSlotsDisponibles } from '../../services/agenda.service';
import { realProfesionalId } from '../../services/professionals.service';

interface Props {
  onClose: () => void;
  prefill?: {
    especialidad?: string;
    tipoAgenda?: TipoAgenda;
    requestId?: string;
    motivo?: string;
    origenCanal?: RequestChannel;
  };
}

export const NewManualAppointmentModal: React.FC<Props> = ({ onClose, prefill }) => {
  const {
    doctors,
    specialties,
    tutors,
    bookAppointment,
    processInboundRequest,
    advanceDemoStep,
  } = useHospital();

  const [canal, setCanal] = useState<RequestChannel>(prefill?.origenCanal || 'telefono');

  // Búsqueda real de paciente (no arrays locales)
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<PatientSearchResult[]>([]);
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);

  const [selectedTutorId, setSelectedTutorId] = useState<string>('');

  const [especialidad, setEspecialidad] = useState(prefill?.especialidad || specialties[0]?.nombre || '');
  const [tipoAgenda, setTipoAgenda] = useState<TipoAgenda>(prefill?.tipoAgenda || specialties[0]?.tipoAgenda || 'SERVICIO');
  const [profesionalFiltro, setProfesionalFiltro] = useState<string>('');
  const [motivo, setMotivo] = useState(prefill?.motivo || 'Solicitud de turno programada');

  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const availableDoctors = doctors.filter((d) => d.especialidad === especialidad && !d.ausente);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      setSearchingPatient(true);
      searchPacientes(searchTerm)
        .then(setSearchResults)
        .finally(() => setSearchingPatient(false));
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const handleSpecialtyChange = (specName: string) => {
    setEspecialidad(specName);
    const specObj = specialties.find((s) => s.nombre === specName);
    setTipoAgenda(specObj?.tipoAgenda || 'PROFESIONAL');
    setProfesionalFiltro('');
    setSelectedSlotId(null);
  };

  // Disponibilidad real: se recalcula cuando cambia el servicio o el profesional filtrado
  useEffect(() => {
    const servicio = specialties.find((s) => s.nombre === especialidad);
    if (!servicio) return;

    setLoadingSlots(true);
    setSelectedSlotId(null);
    getSlotsDisponibles({
      servicioId: servicio.id,
      profesionalId: profesionalFiltro ? realProfesionalId(profesionalFiltro) : undefined,
      tipoAgenda: servicio.tipoAgenda,
    })
      .then(setAvailableSlots)
      .finally(() => setLoadingSlots(false));
  }, [especialidad, profesionalFiltro, specialties]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedPatient) {
      setErrorMessage('Buscá y seleccioná un paciente registrado (por DNI o nombre) antes de continuar.');
      return;
    }
    if (!selectedSlotId) {
      setErrorMessage('Elegí un horario disponible de la agenda real.');
      return;
    }

    setSubmitting(true);
    try {
      const tutorObj = tutors.find((t) => t.id === selectedTutorId);
      const res = await bookAppointment({
        slotId: selectedSlotId,
        pacienteId: selectedPatient.id,
        tutorSolicitanteId: tutorObj?.id,
        origenCanal: canal,
        motivoResumido: motivo,
      });

      if (res.success && res.appointment) {
        setBookingSuccess(res.appointment.codigo);
        if (prefill?.requestId) {
          processInboundRequest(prefill.requestId);
        }
        advanceDemoStep();
        setTimeout(() => onClose(), 1200);
      } else {
        setErrorMessage(res.error || 'No se pudo reservar el turno.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-stone-50 px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800 bg-stone-200/80 px-2 py-0.5 rounded-md">
              Mesa de Entrada / Operador
            </span>
            <h3 className="text-base font-black text-stone-900 mt-1">
              Asignar Turno Pediátrico Centralizado
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-200/60 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {bookingSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <div>
                <span className="font-bold block">¡Turno asignado e impactado en la agenda centralizada!</span>
                <span className="text-[11px]">Código de turno: {bookingSuccess}</span>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
              <span className="font-bold">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Channel Selection */}
            <div>
              <label className="text-[11px] font-bold text-stone-600 uppercase block mb-1.5">
                Canal de Recepción
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { key: 'telefono', label: 'Teléfono', icon: <Phone className="w-3.5 h-3.5" /> },
                  { key: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare className="w-3.5 h-3.5" /> },
                  { key: 'presencial', label: 'Ventanilla', icon: <Users className="w-3.5 h-3.5" /> },
                  { key: 'asistente_social', label: 'A. Social', icon: <Compass className="w-3.5 h-3.5" /> },
                  { key: 'web', label: 'Web', icon: <Globe className="w-3.5 h-3.5" /> },
                ].map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCanal(c.key as RequestChannel)}
                    className={`py-2 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-1 border transition-all ${
                      canal === c.key
                        ? 'bg-teal-700 text-white border-teal-800 shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {c.icon}
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Patient Search & Selection (real, contra Supabase) */}
            <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 space-y-2.5">
              <label className="text-[11px] font-bold text-stone-700 uppercase block">
                Paciente Pediátrico (buscar por DNI o nombre)
              </label>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-stone-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setSelectedPatient(null);
                  }}
                  placeholder="Buscar por DNI o nombre del niño/a..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-700 focus:outline-hidden"
                />
              </div>

              {selectedPatient ? (
                <div className="p-2.5 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-stone-900 block">{selectedPatient.nombre}</span>
                    <span className="text-[11px] text-stone-500">
                      DNI {selectedPatient.dni} • {selectedPatient.edad} años • {selectedPatient.localidad}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPatient(null);
                      setSearchTerm('');
                    }}
                    className="text-[11px] text-rose-700 font-bold hover:underline"
                  >
                    Cambiar
                  </button>
                </div>
              ) : searchTerm.trim() ? (
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {searchingPatient ? (
                    <p className="text-stone-400 py-2">Buscando…</p>
                  ) : searchResults.length === 0 ? (
                    <p className="text-stone-400 py-2">
                      Sin resultados. Si el paciente no existe, registralo primero desde el Directorio de Pacientes.
                    </p>
                  ) : (
                    searchResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPatient(p);
                          if (p.tutorResponsable) {
                            const t = tutors.find((tu) => `${tu.nombre} ${tu.apellido}` === p.tutorResponsable);
                            if (t) setSelectedTutorId(t.id);
                          }
                        }}
                        className="w-full text-left p-2 bg-white border border-stone-200 rounded-lg hover:bg-teal-50 hover:border-teal-300 transition-colors"
                      >
                        <span className="font-bold text-stone-900 block">{p.nombre}</span>
                        <span className="text-[11px] text-stone-500">
                          DNI {p.dni} • {p.edad} años • Tutor: {p.tutorResponsable || 'sin vincular'}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>

            {/* Tutor Responsable Selection */}
            <div className="bg-teal-50/50 p-3.5 rounded-2xl border border-teal-200/80 space-y-2.5">
              <label className="text-[11px] font-extrabold text-teal-900 uppercase block">
                Tutor / Adulto Responsable (opcional)
              </label>
              <select
                value={selectedTutorId}
                onChange={(e) => setSelectedTutorId(e.target.value)}
                className="w-full p-2 bg-white border border-stone-200 rounded-lg text-xs font-semibold"
              >
                <option value="">Sin tutor asignado</option>
                {tutors.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} {t.apellido} (DNI {t.dni})
                  </option>
                ))}
              </select>
            </div>

            {/* Agenda Type Toggle: Servicio vs Profesional */}
            <div>
              <label className="text-[11px] font-bold text-stone-600 uppercase block mb-1">
                Tipo de Agenda Hospitalaria
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div className={`py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 ${
                  tipoAgenda === 'SERVICIO' ? 'bg-teal-700 text-white border-teal-800' : 'bg-stone-50 text-stone-400 border-stone-200'
                }`}>
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Por Servicio (Cola común)</span>
                </div>
                <div className={`py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 ${
                  tipoAgenda === 'PROFESIONAL' ? 'bg-teal-700 text-white border-teal-800' : 'bg-stone-50 text-stone-400 border-stone-200'
                }`}>
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>Por Profesional (Nominal)</span>
                </div>
              </div>
              <p className="text-[11px] text-stone-400 mt-1">El tipo de agenda lo define el servicio elegido abajo.</p>
            </div>

            {/* Specialty & Doctor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-stone-600 uppercase block mb-1">
                  Especialidad / Servicio
                </label>
                <select
                  value={especialidad}
                  onChange={(e) => handleSpecialtyChange(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
                >
                  {specialties.map((s) => (
                    <option key={s.id} value={s.nombre}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {tipoAgenda === 'PROFESIONAL' ? (
                <div>
                  <label className="text-[11px] font-bold text-stone-600 uppercase block mb-1">
                    Profesional (opcional)
                  </label>
                  <select
                    value={profesionalFiltro}
                    onChange={(e) => setProfesionalFiltro(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
                  >
                    <option value="">Cualquier profesional disponible</option>
                    {availableDoctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 text-xs text-stone-600 flex items-center">
                  <span className="font-semibold text-teal-800">
                    Asignación automática: el profesional se define al momento de la atención.
                  </span>
                </div>
              )}
            </div>

            {/* Real slot picker */}
            <div>
              <label className="text-[11px] font-bold text-stone-600 uppercase block mb-1">
                Horario disponible (agenda real, hasta 30 días)
              </label>
              {loadingSlots ? (
                <p className="text-stone-500 py-2">Cargando disponibilidad…</p>
              ) : availableSlots.length === 0 ? (
                <p className="text-rose-700 py-2 font-semibold">No hay horarios disponibles para esta selección.</p>
              ) : (
                <select
                  value={selectedSlotId || ''}
                  onChange={(e) => setSelectedSlotId(e.target.value || null)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
                >
                  <option value="">Seleccionar horario…</option>
                  {availableSlots.map((s) => (
                    <option key={s.slotId} value={s.slotId}>
                      {s.fecha} {s.hora} hs — {s.profesional}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="text-[11px] font-bold text-stone-600 uppercase block mb-1">
                Motivo / Síntesis de consulta
              </label>
              <input
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Control de crecimiento y desarrollo..."
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 text-xs font-semibold text-stone-600 bg-stone-100 rounded-xl hover:bg-stone-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedPatient || !selectedSlotId}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-teal-700 rounded-xl hover:bg-teal-800 shadow-xs transition-colors disabled:opacity-60"
              >
                {submitting ? 'Reservando…' : 'Confirmar e impactar agenda'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
