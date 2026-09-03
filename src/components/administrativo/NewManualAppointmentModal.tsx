import React, { useState } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { RequestChannel, Localidad, TipoAgenda, TipoPrestacion } from '../../types';
import {
  X,
  User,
  Phone,
  MessageSquare,
  Globe,
  Users,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  Search,
  Building2,
  Stethoscope,
  Compass,
} from 'lucide-react';

interface Props {
  onClose: () => void;
  prefill?: {
    pacienteNombre?: string;
    pacienteDni?: string;
    pacienteEdad?: number;
    especialidad?: string;
    tipoAgenda?: TipoAgenda;
    profesional?: string;
    fecha?: string;
    hora?: string;
    origenCanal?: RequestChannel;
    localidad?: Localidad;
    motivo?: string;
    requestId?: string;
  };
}

export const NewManualAppointmentModal: React.FC<Props> = ({ onClose, prefill }) => {
  const {
    patients,
    doctors,
    specialties,
    tutors,
    relaciones,
    bookAppointment,
    validatePediatricAge,
    isDateWithin30Days,
    processInboundRequest,
    advanceDemoStep,
  } = useHospital();

  const [canal, setCanal] = useState<RequestChannel>(prefill?.origenCanal || 'telefono');
  const [searchTerm, setSearchTerm] = useState(prefill?.pacienteDni || prefill?.pacienteNombre || '');
  const [selectedPatient, setSelectedPatient] = useState<{
    id?: string;
    nombre: string;
    dni: string;
    edad: number;
    localidad: Localidad;
    telefono: string;
    tutorId?: string;
  }>({
    id: 'p1',
    nombre: prefill?.pacienteNombre || 'Lucas Gómez',
    dni: prefill?.pacienteDni || '55.123.456',
    edad: prefill?.pacienteEdad !== undefined ? prefill.pacienteEdad : 8,
    localidad: prefill?.localidad || 'Mercedes',
    telefono: '+54 3773 451299',
    tutorId: 't1',
  });

  // Tutor selection
  const [selectedTutorId, setSelectedTutorId] = useState<string>('t1');
  const [tutorRelacion, setTutorRelacion] = useState<string>('Madre');

  const [especialidad, setEspecialidad] = useState(prefill?.especialidad || 'Neurología Pediátrica');
  const [tipoAgenda, setTipoAgenda] = useState<TipoAgenda>(prefill?.tipoAgenda || 'SERVICIO');
  const [profesional, setProfesional] = useState(
    prefill?.profesional || 'Se asignará al momento de la atención'
  );
  const [fecha, setFecha] = useState(prefill?.fecha || '2026-09-09');
  const [hora, setHora] = useState(prefill?.hora || '10:30');
  const [tieneDerivacion, setTieneDerivacion] = useState(true);
  const [motivo, setMotivo] = useState(prefill?.motivo || 'Solicitud de turno programada');

  // Error & Duplication Validation State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [suggestedSlots, setSuggestedSlots] = useState<string[]>([]);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  // Available doctors for chosen specialty
  const availableDoctors = doctors.filter((d) => d.especialidad === especialidad && !d.ausente);

  // Handle specialty change to auto-set default tipoAgenda
  const handleSpecialtyChange = (specName: string) => {
    setEspecialidad(specName);
    const specObj = specialties.find((s) => s.nombre === specName);
    const newAgenda = specObj?.tipoAgenda || 'PROFESIONAL';
    setTipoAgenda(newAgenda);
    if (newAgenda === 'SERVICIO') {
      setProfesional('Se asignará al momento de la atención');
    } else {
      const doc = doctors.find((d) => d.especialidad === specName && !d.ausente);
      setProfesional(doc ? doc.nombre : 'Dr. Juan Pérez');
    }
  };

  const handleSearchPatient = (query: string) => {
    setSearchTerm(query);
    const clean = query.replace(/\D/g, '');
    const found = patients.find(
      (p) =>
        (clean.length > 3 && p.dni.replace(/\D/g, '').includes(clean)) ||
        p.nombre.toLowerCase().includes(query.toLowerCase())
    );

    if (found) {
      setSelectedPatient({
        id: found.id,
        nombre: found.nombre,
        dni: found.dni,
        edad: found.edad,
        localidad: found.localidad,
        telefono: found.telefono,
        tutorId: found.tutorId,
      });

      if (found.tutorId) {
        setSelectedTutorId(found.tutorId);
      }
      if (found.relacionConTutor) {
        setTutorRelacion(found.relacionConTutor);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuggestedSlots([]);

    // 1. Pediatric Age Check (Rule 1)
    const ageCheck = validatePediatricAge(selectedPatient.edad);
    if (!ageCheck.valid) {
      setErrorMessage(ageCheck.error || 'El paciente no se encuentra dentro del rango etario de atención de este hospital.');
      return;
    }

    // 2. 30 Days Check (Rule 4)
    const dateCheck = isDateWithin30Days(fecha);
    if (!dateCheck.valid) {
      setErrorMessage(dateCheck.error || 'Los turnos disponibles se habilitan con hasta 30 días de anticipación.');
      return;
    }

    const tutorObj = tutors.find((t) => t.id === selectedTutorId) || tutors[0];

    const res = bookAppointment({
      pacienteId: selectedPatient.id,
      pacienteNombre: selectedPatient.nombre,
      pacienteDni: selectedPatient.dni,
      pacienteEdad: selectedPatient.edad,
      pacienteLocalidad: selectedPatient.localidad,
      tutorSolicitanteId: tutorObj ? tutorObj.id : undefined,
      tutorSolicitanteNombre: tutorObj ? `${tutorObj.nombre} ${tutorObj.apellido}` : undefined,
      tutorSolicitanteRelacion: tutorRelacion,
      tutorSolicitanteTelefono: tutorObj ? tutorObj.telefono : selectedPatient.telefono,
      especialidad,
      tipoAgenda,
      profesional: tipoAgenda === 'SERVICIO' ? 'Se asignará al momento de la atención' : profesional,
      fecha,
      hora,
      origenCanal: canal,
      tieneDerivacion,
      motivoResumido: motivo,
      tipoConsulta: 'Primera consulta',
    });

    if (res.success && res.appointment) {
      setBookingSuccess(res.appointment.codigo);
      if (prefill?.requestId) {
        processInboundRequest(prefill.requestId);
      }
      advanceDemoStep();
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setErrorMessage(res.error || 'No se pudo reservar el turno.');
      if (res.suggestedSlots && res.suggestedSlots.length > 0) {
        setSuggestedSlots(res.suggestedSlots);
      }
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
          {/* Success message */}
          {bookingSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <div>
                <span className="font-bold block">¡Turno asignado e impactado en la agenda centralizada!</span>
                <span className="text-[11px]">Código de turno: {bookingSuccess}</span>
              </div>
            </div>
          )}

          {/* Error message */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                <span className="font-bold">{errorMessage}</span>
              </div>
              {suggestedSlots.length > 0 && (
                <div>
                  <span className="text-[11px] text-stone-600 block mb-1">
                    Horarios alternativos disponibles para el mismo día:
                  </span>
                  <div className="flex gap-2">
                    {suggestedSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => {
                          setHora(slot);
                          setErrorMessage(null);
                        }}
                        className="px-2.5 py-1 bg-white border border-teal-300 text-teal-900 font-bold rounded-md hover:bg-teal-50"
                      >
                        {slot} hs
                      </button>
                    ))}
                  </div>
                </div>
              )}
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

            {/* Patient Search & Selection */}
            <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 space-y-2.5">
              <label className="text-[11px] font-bold text-stone-700 uppercase block">
                Datos del Paciente Pediátrico (1 mes a 15 años)
              </label>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-stone-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearchPatient(e.target.value)}
                  placeholder="Buscar por DNI o nombre del niño..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-700 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-[10px] text-stone-500 font-bold block mb-0.5">Nombre</label>
                  <input
                    type="text"
                    required
                    value={selectedPatient.nombre}
                    onChange={(e) => setSelectedPatient({ ...selectedPatient, nombre: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-200 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-stone-500 font-bold block mb-0.5">Edad (Años)</label>
                  <input
                    type="number"
                    min="0.1"
                    max="15"
                    step="0.1"
                    required
                    value={selectedPatient.edad}
                    onChange={(e) => setSelectedPatient({ ...selectedPatient, edad: parseFloat(e.target.value) })}
                    className="w-full p-2 bg-white border border-stone-200 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-stone-500 font-bold block mb-0.5">DNI</label>
                  <input
                    type="text"
                    value={selectedPatient.dni}
                    onChange={(e) => setSelectedPatient({ ...selectedPatient, dni: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-stone-500 font-bold block mb-0.5">Localidad</label>
                  <select
                    value={selectedPatient.localidad}
                    onChange={(e) => setSelectedPatient({ ...selectedPatient, localidad: e.target.value as Localidad })}
                    className="w-full p-2 bg-white border border-stone-200 rounded-lg text-xs font-bold"
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
            </div>

            {/* Tutor Responsable Selection */}
            <div className="bg-teal-50/50 p-3.5 rounded-2xl border border-teal-200/80 space-y-2.5">
              <label className="text-[11px] font-extrabold text-teal-900 uppercase block">
                Tutor / Adulto Responsable a Cargo
              </label>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-stone-500 font-bold block mb-0.5">Tutor Registrado</label>
                  <select
                    value={selectedTutorId}
                    onChange={(e) => setSelectedTutorId(e.target.value)}
                    className="w-full p-2 bg-white border border-stone-200 rounded-lg text-xs font-semibold"
                  >
                    {tutors.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre} {t.apellido} (DNI {t.dni})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-stone-500 font-bold block mb-0.5">Vínculo con el Paciente</label>
                  <select
                    value={tutorRelacion}
                    onChange={(e) => setTutorRelacion(e.target.value)}
                    className="w-full p-2 bg-white border border-stone-200 rounded-lg text-xs font-semibold"
                  >
                    <option value="Madre">Madre</option>
                    <option value="Padre">Padre</option>
                    <option value="Tutor Legal">Tutor Legal</option>
                    <option value="Abuela">Abuela</option>
                    <option value="Abuelo">Abuelo</option>
                    <option value="Familiar Responsable">Familiar Responsable</option>
                    <option value="Adulto Autorizado">Adulto Autorizado</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Agenda Type Toggle: Servicio vs Profesional */}
            <div>
              <label className="text-[11px] font-bold text-stone-600 uppercase block mb-1">
                Tipo de Agenda Hospitalaria
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTipoAgenda('SERVICIO');
                    setProfesional('Se asignará al momento de la atención');
                  }}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    tipoAgenda === 'SERVICIO'
                      ? 'bg-teal-700 text-white border-teal-800 shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Por Servicio (Cola común)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTipoAgenda('PROFESIONAL');
                    const doc = availableDoctors[0];
                    setProfesional(doc ? doc.nombre : 'Dr. Juan Pérez');
                  }}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    tipoAgenda === 'PROFESIONAL'
                      ? 'bg-teal-700 text-white border-teal-800 shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>Por Profesional (Nominal)</span>
                </button>
              </div>
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
                    Profesional
                  </label>
                  <select
                    value={profesional}
                    onChange={(e) => setProfesional(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
                  >
                    {availableDoctors.map((d) => (
                      <option key={d.id} value={d.nombre}>
                        {d.nombre} (Cons. {d.consultorio})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 text-xs text-stone-600 flex items-center">
                  <span className="font-semibold text-teal-800">
                    Asignación automática: El médico de guardia o servicio atenderá según orden de llegada.
                  </span>
                </div>
              )}
            </div>

            {/* Date & Hour */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-stone-600 uppercase block mb-1">
                  Fecha (hasta 30 días)
                </label>
                <input
                  type="date"
                  required
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-600 uppercase block mb-1">Hora</label>
                <select
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
                >
                  <option value="08:00">08:00 hs</option>
                  <option value="08:30">08:30 hs</option>
                  <option value="09:00">09:00 hs</option>
                  <option value="09:30">09:30 hs</option>
                  <option value="10:00">10:00 hs</option>
                  <option value="10:30">10:30 hs</option>
                  <option value="11:00">11:00 hs</option>
                  <option value="11:30">11:30 hs</option>
                  <option value="12:00">12:00 hs</option>
                </select>
              </div>
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
                className="flex-1 py-2.5 text-xs font-bold text-white bg-teal-700 rounded-xl hover:bg-teal-800 shadow-xs transition-colors"
              >
                Confirmar e impactar agenda
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
