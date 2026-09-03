import React, { useState } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { Localidad } from '../../types';
import {
  Sparkles,
  Bot,
  Calendar,
  Clock,
  MapPin,
  FileCheck,
  CheckCircle2,
  CalendarPlus,
  AlertCircle,
  ArrowRight,
  TrendingDown,
  RotateCcw,
} from 'lucide-react';

interface Props {
  onCancel: () => void;
  onCompleted: (appointmentCode: string) => void;
}

export const NaturalLanguageBooking: React.FC<Props> = ({ onCancel, onCompleted }) => {
  const { bookAppointment, validatePediatricAge, advanceDemoStep, currentTutor, getPersonasACargo } = useHospital();

  const personasACargo = getPersonasACargo(currentTutor?.id);
  const defaultPersona = personasACargo[0]?.paciente || personasACargo[0];

  const [promptInput, setPromptInput] = useState('Necesito un turno con cardiología para Lucas Gómez (persona a cargo) la semana que viene.');
  const [stage, setStage] = useState<'prompt' | 'interpreted' | 'slot-selection' | 'confirmed'>('prompt');
  const [isProcessing, setIsProcessing] = useState(false);

  // Selected persona a cargo
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(defaultPersona?.id || 'p1');

  // Extracted/configured attributes
  const [especialidad, setEspecialidad] = useState('Cardiología Pediátrica');
  const [tipoConsulta, setTipoConsulta] = useState<'Primera consulta' | 'Control'>('Primera consulta');
  const [pacienteNombre, setPacienteNombre] = useState(defaultPersona?.nombre || 'Lucas Gómez');
  const [pacienteEdad, setPacienteEdad] = useState<number>(defaultPersona?.edad !== undefined ? defaultPersona.edad : 8);
  const [localidad, setLocalidad] = useState<Localidad>(currentTutor?.localidad || 'Mercedes');
  const [tieneDerivacion, setTieneDerivacion] = useState(true);
  const [isOptimized, setIsOptimized] = useState(false);

  // Update patient details when selectedPersonaId changes
  const handleSelectPersona = (personaId: string) => {
    setSelectedPersonaId(personaId);
    const found = personasACargo.find((rel) => (rel.paciente?.id || rel.id) === personaId);
    const target = found?.paciente || found;
    if (target) {
      setPacienteNombre(target.nombre);
      if (target.edad !== undefined) setPacienteEdad(target.edad);
      if (target.localidad) setLocalidad(target.localidad);
    }
  };

  // Slot chosen
  const [selectedSlot, setSelectedSlot] = useState<{
    fecha: string;
    hora: string;
    profesional: string;
    displayDate: string;
  }>({
    fecha: '2026-09-09',
    hora: '10:30',
    profesional: 'Dr. Juan Pérez',
    displayDate: 'MIÉRCOLES 9 SEP • 10:30 hs',
  });

  const [bookingCode, setBookingCode] = useState('');
  const [bookingError, setBookingError] = useState<string | null>(null);

  const availableSlots = [
    {
      fecha: '2026-09-08',
      hora: '09:30',
      profesional: 'Dr. Juan Pérez',
      dayLabel: 'MARTES 8 SEP',
      timeLabel: '09:30 hs',
    },
    {
      fecha: '2026-09-09',
      hora: '10:30',
      profesional: 'Dr. Juan Pérez',
      dayLabel: 'MIÉRCOLES 9 SEP',
      timeLabel: '10:30 hs',
      recommended: true,
    },
    {
      fecha: '2026-09-10',
      hora: '08:15',
      profesional: 'Dra. Laura Gómez',
      dayLabel: 'JUEVES 10 SEP',
      timeLabel: '08:15 hs',
    },
  ];

  const handleInterpret = () => {
    setIsProcessing(true);
    setTimeout(() => {
      // Analyze input keywords
      const lower = promptInput.toLowerCase();
      if (lower.includes('cardio')) {
        setEspecialidad('Cardiología Pediátrica');
      } else if (lower.includes('trauma')) {
        setEspecialidad('Traumatología');
      } else if (lower.includes('neuro')) {
        setEspecialidad('Neurología');
      } else if (lower.includes('nutri')) {
        setEspecialidad('Nutrición');
      }

      if (lower.includes('control')) {
        setTipoConsulta('Control');
      } else {
        setTipoConsulta('Primera consulta');
      }

      setIsProcessing(false);
      setStage('interpreted');
    }, 600);
  };

  const handleConfirm = () => {
    setBookingError(null);

    const ageCheck = validatePediatricAge(pacienteEdad);
    if (!ageCheck.valid) {
      setBookingError(ageCheck.error || 'El paciente no se encuentra dentro del rango etario de atención de este hospital.');
      return;
    }

    const selectedRel = personasACargo.find((rel) => rel.paciente.id === selectedPersonaId);
    const selectedPat = selectedRel?.paciente;

    const res = bookAppointment({
      pacienteId: selectedPat?.id || selectedPersonaId,
      pacienteNombre: selectedPat?.nombre || pacienteNombre,
      pacienteDni: selectedPat?.dni,
      pacienteEdad,
      pacienteLocalidad: localidad,
      tutorSolicitanteId: currentTutor.id,
      tutorSolicitanteNombre: `${currentTutor.nombre} ${currentTutor.apellido}`,
      tutorSolicitanteRelacion: selectedRel ? selectedRel.tipoRelacion : 'Tutor responsable',
      tutorSolicitanteTelefono: currentTutor.telefono,
      especialidad,
      profesional: selectedSlot.profesional,
      fecha: selectedSlot.fecha,
      hora: selectedSlot.hora,
      origenCanal: 'web',
      tieneDerivacion,
      tipoConsulta,
      motivoResumido: promptInput,
      optimizadoViaje: isOptimized,
    });

    if (res.success && res.appointment) {
      setBookingCode(res.appointment.codigo);
      setStage('confirmed');
      advanceDemoStep(); // Advance demo step 1 -> step 2
    } else {
      setBookingError(res.error || 'No se pudo reservar el turno en este horario.');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-stone-200 overflow-hidden">
      {/* Wizard Header */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-800 px-6 py-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
            <Bot className="w-5 h-5 text-teal-100" />
          </div>
          <div>
            <h3 className="font-bold text-base">Asistente Inteligente de Turnos</h3>
            <p className="text-xs text-teal-100">Hospital Pediátrico Juan Pablo II</p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
        >
          Cerrar
        </button>
      </div>

      <div className="p-6">
        {/* Stage 1: Prompt Input */}
        {stage === 'prompt' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-stone-900 mb-1">¿Qué necesitás?</h2>
              <p className="text-sm text-stone-500">
                Contanos con tus palabras qué turno necesitás. Nuestro sistema interpreta tu pedido automáticamente.
              </p>
            </div>

            <div>
              <label htmlFor="booking-prompt-input" className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                Tu solicitud
              </label>
              <textarea
                id="booking-prompt-input"
                rows={3}
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Ej: Necesito un turno con cardiología para Lucas (persona a cargo) la semana que viene."
                className="w-full p-4 rounded-xl border border-stone-200 focus:ring-2 focus:ring-teal-700 focus:border-teal-700 text-stone-800 text-sm placeholder:text-stone-400 shadow-inner"
              />
            </div>

            {/* Suggestions */}
            <div>
              <span className="text-xs font-medium text-stone-400 block mb-2">
                O elegí un ejemplo rápido para probar:
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  'Necesito un turno con cardiología para Lucas (persona a cargo) la semana que viene.',
                  'Turno para control de nutrición para Lucas, venimos de Mercedes.',
                  'Consulta con traumatología pediátrica por dolor en pie.',
                ].map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => setPromptInput(sug)}
                    className="text-xs bg-stone-100 hover:bg-teal-50 hover:text-teal-900 text-stone-700 px-3 py-1.5 rounded-lg border border-stone-200 transition-colors text-left"
                  >
                    "{sug}"
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition-colors border border-stone-200"
              >
                Volver
              </button>
              <button
                onClick={handleInterpret}
                disabled={!promptInput.trim() || isProcessing}
                className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-xs flex items-center gap-2 transition-all"
              >
                {isProcessing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                    <span>Interpretando con IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Continuar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Stage 2 & 3: Interpreted Result + Interior Travel Optimization + Slot Selection */}
        {(stage === 'interpreted' || stage === 'slot-selection') && (
          <div className="space-y-6">
            {/* Interpretation Card */}
            <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-4.5">
              <div className="flex items-center gap-2 text-teal-900 font-bold text-sm mb-3">
                <CheckCircle2 className="w-4 h-4 text-teal-700" />
                <span>Entendimos tu solicitud</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-3 rounded-xl border border-teal-100 shadow-2xs">
                  <span className="text-stone-400 block text-[11px] font-medium">Especialidad:</span>
                  <span className="font-bold text-stone-800 text-sm">{especialidad}</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-teal-100 shadow-2xs">
                  <span className="text-stone-400 block text-[11px] font-medium">Tipo:</span>
                  <span className="font-bold text-stone-800 text-sm">{tipoConsulta}</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-teal-100 shadow-2xs">
                  <span className="text-stone-400 block text-[11px] font-medium">Paciente:</span>
                  <span className="font-bold text-stone-800 text-sm">{pacienteNombre} (8 años)</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-teal-100 shadow-2xs">
                  <span className="text-stone-400 block text-[11px] font-medium">Preferencia:</span>
                  <span className="font-bold text-stone-800 text-sm">Próxima semana</span>
                </div>
              </div>
            </div>

            {/* Questions for missing data */}
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Verificá la persona a cargo y datos de la cita:
              </h4>

              {/* Persona a Cargo Selector */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                  ¿Para qué persona a cargo es este turno?
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
                        onClick={() => handleSelectPersona(pId)}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Localidad Selector */}
                <div>
                  <label htmlFor="localidad-select" className="block text-xs font-semibold text-stone-700 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-700" />
                    ¿Desde qué localidad viajás?
                  </label>
                  <select
                    id="localidad-select"
                    value={localidad}
                    onChange={(e) => setLocalidad(e.target.value as Localidad)}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm font-medium text-stone-800 focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="Mercedes">Mercedes (Interior)</option>
                    <option value="Corrientes Capital">Corrientes Capital</option>
                    <option value="Goya">Goya (Interior)</option>
                    <option value="Curuzú Cuatiá">Curuzú Cuatiá (Interior)</option>
                    <option value="Paso de los Libres">Paso de los Libres (Interior)</option>
                    <option value="Bella Vista">Bella Vista (Interior)</option>
                    <option value="Otra">Otra localidad</option>
                  </select>
                </div>

                {/* Derivación Médica */}
                <div>
                  <span className="block text-xs font-semibold text-stone-700 mb-1.5 flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-teal-700" />
                    ¿Tenés derivación médica?
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTieneDerivacion(true)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        tieneDerivacion
                          ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      Sí, tengo derivación
                    </button>
                    <button
                      type="button"
                      onClick={() => setTieneDerivacion(false)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        !tieneDerivacion
                          ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      No tengo
                    </button>
                  </div>
                </div>
              </div>

              {/* DIFERENCIAL PARA FAMILIAS DEL INTERIOR */}
              {localidad !== 'Corrientes Capital' && (
                <div className="mt-4 bg-gradient-to-r from-amber-500/10 via-stone-50 to-teal-500/10 border border-amber-300/90 rounded-2xl p-4.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-700 text-white">
                          Diferencial para el Interior
                        </span>
                        <h4 className="font-bold text-stone-900 text-sm">
                          Sabemos que tenés que viajar desde {localidad}
                        </h4>
                      </div>
                      <p className="text-xs text-stone-600 leading-relaxed">
                        Podemos intentar organizar tus consultas para reducir la cantidad de viajes a la Capital provincial.
                      </p>
                    </div>

                    <button
                      onClick={() => setIsOptimized(!isOptimized)}
                      className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                        isOptimized
                          ? 'bg-teal-700 text-white ring-2 ring-teal-300'
                          : 'bg-amber-700 hover:bg-amber-800 text-white'
                      }`}
                    >
                      <TrendingDown className="w-4 h-4" />
                      <span>{isOptimized ? 'Viajes optimizados' : 'Optimizar mis visitas'}</span>
                    </button>
                  </div>

                  {/* Optimization Simulation Reveal */}
                  {isOptimized && (
                    <div className="mt-3.5 pt-3.5 border-t border-amber-200/80 bg-white/90 p-3.5 rounded-xl border border-amber-100">
                      <div className="flex items-center gap-2 text-teal-800 font-bold text-xs mb-2">
                        <Sparkles className="w-4 h-4 text-teal-700" />
                        <span>Encontramos una mejor combinación para {pacienteNombre}</span>
                      </div>
                      <p className="text-xs text-stone-700 font-medium mb-3">
                        Detectamos que también requiere control de <strong>Nutrición</strong>. Podés realizar ambas consultas en un mismo viaje:
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-950">
                          <span className="block text-[10px] text-teal-700 font-bold uppercase">10:30 hs</span>
                          <span className="font-bold">Cardiología Pediátrica</span>
                          <span className="block text-[11px] text-teal-800">Dr. Juan Pérez • Cons. 12</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-stone-100 border border-stone-200 text-stone-900">
                          <span className="block text-[10px] text-stone-600 font-bold uppercase">12:30 hs</span>
                          <span className="font-bold">Nutrición</span>
                          <span className="block text-[11px] text-stone-700">Dr. Carlos Ramírez • Cons. 3</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs bg-stone-100 px-3 py-1.5 rounded-lg font-semibold text-stone-700 border border-stone-200">
                        <span className="text-rose-700 line-through">Viajes sin optimización: 2 viajes</span>
                        <span className="text-teal-800 font-bold bg-teal-100/70 px-2 py-0.5 rounded-md border border-teal-200/50">
                          Viajes con optimización: 1 solo viaje ✨
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Available Slots */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-700" />
                  Buscando los mejores turnos para vos en {especialidad}…
                </h4>
                <span className="text-xs text-stone-400 font-medium">3 opciones disponibles</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {availableSlots.map((slot, index) => {
                  const isSelected =
                    selectedSlot.fecha === slot.fecha && selectedSlot.hora === slot.hora;
                  return (
                    <div
                      key={index}
                      onClick={() =>
                        setSelectedSlot({
                          fecha: slot.fecha,
                          hora: slot.hora,
                          profesional: slot.profesional,
                          displayDate: `${slot.dayLabel} • ${slot.timeLabel}`,
                        })
                      }
                      className={`cursor-pointer p-4 rounded-xl border transition-all text-center relative ${
                        isSelected
                          ? 'border-teal-700 bg-teal-50/50 ring-2 ring-teal-200 shadow-xs'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      {slot.recommended && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-teal-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs">
                          Recomendado
                        </span>
                      )}
                      <span className="block text-xs font-bold text-stone-700">{slot.dayLabel}</span>
                      <span className="block text-xl font-extrabold text-teal-800 my-1">{slot.timeLabel}</span>
                      <span className="block text-xs text-stone-500 font-medium">{slot.profesional}</span>
                      <button
                        type="button"
                        className={`mt-3 w-full py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          isSelected
                            ? 'bg-teal-700 text-white'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        }`}
                      >
                        {isSelected ? 'Seleccionado' : 'Elegir turno'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Confirmation Summary */}
            <div className="bg-stone-900 text-white rounded-2xl p-5 border border-stone-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold tracking-wider text-teal-400 uppercase">
                    Resumen del turno a confirmar
                  </span>
                  <div className="text-base font-bold text-white flex items-center gap-2">
                    <span>{especialidad}</span>
                    <span className="text-stone-400">•</span>
                    <span className="text-teal-300">{selectedSlot.displayDate}</span>
                  </div>
                  <div className="text-xs text-stone-300 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                    <span>Paciente: <strong>{pacienteNombre}</strong></span>
                    <span>Profesional: <strong>{selectedSlot.profesional}</strong></span>
                    <span>Origen: <strong>{localidad}</strong></span>
                    {isOptimized && <span className="text-teal-300 font-bold">🌿 Viaje optimizado</span>}
                  </div>
                </div>

                <button
                  onClick={handleConfirm}
                  className="px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 text-white font-bold rounded-xl text-sm shadow-xs transition-all flex items-center justify-center gap-2 shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar turno</span>
                </button>
              </div>

              {bookingError && (
                <div className="mt-3 p-3 bg-rose-500/20 border border-rose-400/40 rounded-xl text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{bookingError}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stage 4: Confirmed Result */}
        {stage === 'confirmed' && (
          <div className="py-6 text-center space-y-4 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50/50 border border-emerald-200">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Turno Confirmado
              </span>
              <h2 className="text-2xl font-bold text-stone-900 mt-2">¡Tu turno está listo!</h2>
              <p className="text-sm text-stone-500 max-w-md mx-auto mt-1">
                Te enviamos un recordatorio por WhatsApp y SMS. Presentate 15 minutos antes con la libreta de vacunación.
              </p>
            </div>

            <div className="max-w-sm mx-auto bg-stone-50 border border-stone-200 rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between border-b border-stone-200 pb-2">
                <span className="text-stone-500">Código de Turno:</span>
                <span className="font-mono font-bold text-teal-900 text-sm">{bookingCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Persona a cargo (Paciente):</span>
                <span className="font-semibold text-stone-800">{pacienteNombre} ({pacienteEdad} años)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Tutor/a Responsable:</span>
                <span className="font-semibold text-teal-900">{currentTutor.nombre} {currentTutor.apellido}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Especialidad:</span>
                <span className="font-semibold text-stone-800">{especialidad}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Profesional:</span>
                <span className="font-semibold text-stone-800">{selectedSlot.profesional}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Fecha y Hora:</span>
                <span className="font-bold text-stone-900">{selectedSlot.displayDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Lugar:</span>
                <span className="font-medium text-stone-700">Hospital Juan Pablo II • Consultorio 12</span>
              </div>
              {isOptimized && (
                <div className="pt-2 border-t border-stone-200 text-teal-800 font-semibold text-center">
                  ✅ Visitas coordinadas en un solo viaje desde {localidad}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  alert(`Turno ${bookingCode} agregado al calendario de tu dispositivo.`);
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors border border-stone-200"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>Agregar al calendario</span>
              </button>
              <button
                onClick={() => onCompleted(bookingCode)}
                className="w-full sm:w-auto px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs shadow-xs transition-all"
              >
                Ver mis turnos
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
