import React, { useState, useEffect } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { Patient, Appointment, Localidad, TipoPrestacion, TipoAgenda } from '../../types';
import { AvailableSlot, getSlotsDisponibles } from '../../services/agenda.service';
import {
  Users,
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  Search,
  Plus,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Compass,
  Building2,
  CalendarCheck,
  Stethoscope,
  Heart,
  Truck,
  ShieldAlert,
} from 'lucide-react';

export const AsistenteSocialPortal: React.FC = () => {
  const {
    patients,
    appointments,
    specialties,
    bookAppointment,
    optimizePatientVisits,
    registerPatient,
    validatePediatricAge,
    advanceDemoStep,
  } = useHospital();

  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [showNewAptModal, setShowNewAptModal] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<{
    originalTrips: number;
    optimizedTrips: number;
    avoidedTrips: number;
    proposedDate: string;
    affectedAppointments: Appointment[];
  } | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // New Patient Form State
  const [newPatientForm, setNewPatientForm] = useState({
    nombre: '',
    dni: '',
    edad: 7,
    localidad: 'Mercedes' as Localidad,
    telefono: '',
    tutor: '',
    antecedentes: '',
  });
  const [patientError, setPatientError] = useState<string | null>(null);

  // New Appointment Form State
  const [newAptForm, setNewAptForm] = useState({
    especialidad: specialties[0]?.nombre || '',
    tipoPrestacion: 'consulta_medica' as TipoPrestacion,
    tipoAgenda: specialties[0]?.tipoAgenda || ('PROFESIONAL' as TipoAgenda),
    motivo: 'Evaluación de seguimiento solicitada por Servicio Social',
  });
  const [bookingMsg, setBookingMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Filter patients from the interior (distance > 0 or not Corrientes Capital)
  const interiorPatients = patients.filter((p) => {
    const isInterior = p.localidad !== 'Corrientes Capital';
    const matchesSearch =
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.dni.includes(searchTerm) ||
      p.localidad.toLowerCase().includes(searchTerm.toLowerCase());
    return isInterior && matchesSearch;
  });

  useEffect(() => {
    if (!selectedPatientId && interiorPatients[0]) {
      setSelectedPatientId(interiorPatients[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patients.length]);

  const currentPatient: Patient | undefined =
    patients.find((p) => p.id === selectedPatientId) || interiorPatients[0];

  // Active appointments for selected patient
  const patientAppointments = currentPatient
    ? appointments.filter((a) => a.pacienteId === currentPatient.id && a.estado !== 'CANCELADO')
    : [];

  // Unique trip days (dates)
  const uniqueTripDates = Array.from(new Set(patientAppointments.map((a) => a.fecha)));
  const tripCount = uniqueTripDates.length;

  const handleRunOptimization = async () => {
    if (!currentPatient) return;
    setIsOptimizing(true);
    try {
      const res = await optimizePatientVisits(currentPatient.id);
      setOptimizationResult(res);
      advanceDemoStep();
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setPatientError(null);

    const res = await registerPatient({
      nombre: newPatientForm.nombre,
      dni: newPatientForm.dni,
      edad: newPatientForm.edad,
      localidad: newPatientForm.localidad,
    });

    if (res.success && res.patient) {
      setSelectedPatientId(res.patient.id);
      setShowNewPatientModal(false);
      setNewPatientForm({
        nombre: '',
        dni: '',
        edad: 7,
        localidad: 'Mercedes',
        telefono: '',
        tutor: '',
        antecedentes: '',
      });
    } else {
      setPatientError(res.error || 'Error al registrar paciente.');
    }
  };

  // Disponibilidad real para el modal de "solicitar turno para la familia"
  const [aptSlots, setAptSlots] = useState<AvailableSlot[]>([]);
  const [loadingAptSlots, setLoadingAptSlots] = useState(false);
  const [selectedAptSlotId, setSelectedAptSlotId] = useState<string | null>(null);

  useEffect(() => {
    if (!showNewAptModal) return;
    const servicio = specialties.find((s) => s.nombre === newAptForm.especialidad);
    if (!servicio) return;
    setLoadingAptSlots(true);
    setSelectedAptSlotId(null);
    getSlotsDisponibles({
      servicioId: servicio.id,
      profesionalId: undefined,
      tipoAgenda: servicio.tipoAgenda,
    })
      .then(setAptSlots)
      .finally(() => setLoadingAptSlots(false));
  }, [showNewAptModal, newAptForm.especialidad, specialties]);

  const handleBookForFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingMsg(null);
    if (!currentPatient || !selectedAptSlotId) {
      setBookingMsg({ success: false, text: 'Elegí un horario disponible de la agenda real.' });
      return;
    }

    const res = await bookAppointment({
      slotId: selectedAptSlotId,
      pacienteId: currentPatient.id,
      tutorSolicitanteId: currentPatient.tutorId,
      origenCanal: 'asistente_social',
      motivoResumido: newAptForm.motivo,
    });

    if (res.success) {
      setBookingMsg({ success: true, text: `Turno asignado exitosamente (${res.appointment?.codigo}).` });
      setTimeout(() => {
        setShowNewAptModal(false);
        setBookingMsg(null);
      }, 1200);
    } else {
      setBookingMsg({ success: false, text: res.error || 'No se pudo reservar el turno.' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Top Welcome Header */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-stone-900 text-white p-6 sm:p-8 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/15 backdrop-blur-xs text-teal-100 border border-white/10">
            <Compass className="w-3.5 h-3.5" />
            <span>Servicio Social Hospitalario • Acompañamiento Territorial</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Gestión de Pacientes del Interior
          </h1>
          <p className="text-xs sm:text-sm text-stone-200 font-medium max-w-2xl leading-relaxed">
            Coordinación integral para familias del interior de Corrientes, zonas rurales y parajes. 
            Centralizá turnos en un solo viaje para reducir costos de pasajes, traslados y ausentismo escolar.
          </p>
        </div>
      </div>

      {/* Main Grid: Patients Directory (Left) + Detail & Trip Optimizer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interior Patients Directory */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-700" />
              <h2 className="font-bold text-sm text-stone-900">Familias del Interior</h2>
            </div>
            <button
              onClick={() => setShowNewPatientModal(true)}
              className="px-2.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, DNI o localidad..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-700"
            />
          </div>

          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1 no-scrollbar">
            {interiorPatients.map((p) => {
              const isSelected = p.id === currentPatient.id;
              const apts = appointments.filter(
                (a) => (a.pacienteId === p.id || a.pacienteNombre.toLowerCase() === p.nombre.toLowerCase()) && a.estado !== 'CANCELADO'
              );
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    setSelectedPatientId(p.id);
                    setOptimizationResult(null);
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all text-left ${
                    isSelected
                      ? 'bg-teal-50/80 border-teal-600 shadow-xs ring-1 ring-teal-600'
                      : 'bg-stone-50/70 border-stone-200 hover:bg-stone-100/80 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-stone-900">{p.nombre}</h4>
                      <p className="text-[11px] text-stone-500 font-medium">
                        {p.edad} años • DNI {p.dni}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-teal-900 border border-teal-200">
                      {apts.length} {apts.length === 1 ? 'turno' : 'turnos'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-2 text-[11px] text-stone-600">
                    <MapPin className="w-3 h-3 text-teal-700" />
                    <span>
                      {p.localidad} {p.distanciaKm ? `(~${p.distanciaKm} km)` : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Patient Profile + Trip Optimization Panel */}
        <div className="lg:col-span-8 space-y-6">
          {!currentPatient ? (
            <div className="bg-white rounded-2xl p-10 border border-stone-200 shadow-2xs text-center text-stone-400 text-sm">
              No hay pacientes del interior registrados todavía. Usá "+ Nuevo" para dar de alta al primero.
            </div>
          ) : (
          <>
          {/* Patient Card */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                    Ficha de Acompañamiento
                  </span>
                  <span className="text-xs text-stone-500">ID: {currentPatient.id}</span>
                </div>
                <h2 className="text-xl font-black text-stone-900 mt-1">{currentPatient.nombre}</h2>
                <p className="text-xs text-stone-600 font-medium mt-0.5">
                  Tutor: {currentPatient.tutor} • Tel: {currentPatient.telefono}
                </p>
              </div>

              <button
                onClick={() => setShowNewAptModal(true)}
                className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Solicitar turno para la familia</span>
              </button>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                <span className="text-[11px] font-bold text-stone-400 block uppercase">Origen / Distancia</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-4 h-4 text-teal-700 shrink-0" />
                  <span className="text-sm font-bold text-stone-900">
                    {currentPatient.localidad} ({currentPatient.distanciaKm || 245} km)
                  </span>
                </div>
              </div>

              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                <span className="text-[11px] font-bold text-stone-400 block uppercase">Turnos Programados</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <CalendarCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="text-sm font-bold text-stone-900">
                    {patientAppointments.length} prestaciones activas
                  </span>
                </div>
              </div>

              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                <span className="text-[11px] font-bold text-stone-400 block uppercase">Viajes Requeridos</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Truck className="w-4 h-4 text-amber-700 shrink-0" />
                  <span className="text-sm font-bold text-stone-900">
                    {tripCount} {tripCount === 1 ? 'viaje a la Capital' : 'viajes a la Capital'}
                  </span>
                </div>
              </div>
            </div>

            {currentPatient.antecedentes && (
              <div className="bg-stone-50/90 p-3 rounded-xl border border-stone-200 text-xs text-stone-700">
                <span className="font-bold text-stone-900">Antecedentes / Observación de campo: </span>
                {currentPatient.antecedentes}
              </div>
            )}
          </div>

          {/* TRIP OPTIMIZATION MODULE (Requirement 16 & Scene 6) */}
          <div className="bg-gradient-to-br from-amber-50/70 via-stone-50 to-teal-50/40 rounded-2xl p-5 border-2 border-amber-300 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-700 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-950">
                    Optimización Logística de Traslado
                  </span>
                  <h3 className="text-base font-bold text-stone-900 mt-1">
                    Agrupación de Prestaciones para Familias del Interior
                  </h3>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Detecta si el niño tiene múltiples consultas o estudios en días separados y encuentra un día coordinado.
                  </p>
                </div>
              </div>

              <button
                onClick={handleRunOptimization}
                disabled={isOptimizing || tripCount <= 1}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
                  tripCount > 1
                    ? 'bg-amber-700 hover:bg-amber-800 text-white shadow-xs'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                }`}
              >
                {isOptimizing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Buscando alternativa...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Optimizar visita</span>
                  </>
                )}
              </button>
            </div>

            {/* Current Schedule Situation */}
            <div className="bg-white rounded-xl p-4 border border-stone-200 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-700 uppercase text-[11px]">
                  Esquema actual de turnos del paciente:
                </span>
                <span className="text-amber-800 font-bold bg-amber-100/80 px-2 py-0.5 rounded-md">
                  {tripCount > 1 ? `Este esquema requeriría ${tripCount} viajes independientes` : 'Agrupado en 1 solo viaje'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {patientAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="bg-stone-50 p-3 rounded-lg border border-stone-200 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900">{apt.especialidad}</span>
                      <span className="text-[10px] text-stone-500 font-bold uppercase">{apt.tipoPrestacion}</span>
                    </div>
                    <div className="flex items-center gap-1 text-teal-800 font-bold">
                      <Calendar className="w-3 h-3" />
                      <span>{apt.fecha} • {apt.hora} hs</span>
                    </div>
                    <p className="text-[11px] text-stone-500 truncate">{apt.profesional}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Optimization Success Box */}
            {optimizationResult && (
              <div className="bg-emerald-50/90 border-2 border-emerald-400 rounded-xl p-4.5 space-y-3 animate-fade-in">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-stone-900">
                      Encontramos una alternativa que permite realizar las {optimizationResult.affectedAppointments.length} prestaciones en un mismo viaje
                    </h4>
                    <p className="text-xs text-stone-600 mt-0.5">
                      {optimizationResult.proposedDate ? (
                        <>Día propuesto con mayor concentración de disponibilidad real: <span className="font-bold text-emerald-900">{optimizationResult.proposedDate}</span>.</>
                      ) : (
                        'No encontramos un día con disponibilidad real para agrupar todas las prestaciones; te sugerimos coordinar manualmente.'
                      )}
                    </p>
                  </div>
                </div>

                {/* Badges metrics required by rule 16: Viajes originales, optimizados, evitados */}
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-stone-400 block">Viajes originales</span>
                    <span className="text-lg font-black text-rose-700">{optimizationResult.originalTrips}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-stone-400 block">Viajes optimizados</span>
                    <span className="text-lg font-black text-emerald-800">{optimizationResult.optimizedTrips}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-stone-400 block">Viajes evitados</span>
                    <span className="text-lg font-black text-teal-800">{optimizationResult.avoidedTrips} traslados</span>
                  </div>
                </div>

                {/* Turnos actuales del paciente (la reasignación final la confirma un humano) */}
                <div className="bg-white p-3 rounded-lg border border-emerald-200 space-y-2">
                  <span className="text-xs font-bold text-stone-800 block">
                    Prestaciones pendientes a coordinar:
                  </span>
                  <div className="space-y-1.5">
                    {optimizationResult.affectedAppointments.map((apt, idx) => (
                      <div key={apt.id} className="flex items-center justify-between text-xs py-1 border-b border-stone-100 last:border-0">
                        <span className="font-medium text-stone-700">{idx + 1}. {apt.especialidad}</span>
                        <span className="font-bold text-emerald-800">{apt.fecha} • {apt.hora} hs</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-stone-500 bg-white/60 p-2 rounded-lg border border-emerald-100">
                  <ShieldAlert className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>Nota institucional: La optimización logística coordina agendas para accesibilidad y no reemplaza criterios médicos ni prioridades de urgencia.</span>
                </div>
              </div>
            )}
          </div>

          {/* Detailed Appointments Table */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-2xs space-y-3">
            <h3 className="font-bold text-sm text-stone-900">
              Detalle de Prestaciones Programadas para {currentPatient.nombre}
            </h3>

            {patientAppointments.length === 0 ? (
              <div className="text-center py-8 text-stone-400 text-xs">
                No tiene turnos programados en este momento.
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {patientAppointments.map((apt) => (
                  <div key={apt.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-stone-900">{apt.especialidad}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                          {apt.tipoAgenda === 'SERVICIO' ? 'Por Servicio' : 'Por Profesional'}
                        </span>
                        {apt.optimizadoViaje && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> Viaje optimizado
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        {apt.profesional} • Consultorio {apt.consultorio}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs font-bold text-stone-900 block">{apt.fecha}</span>
                        <span className="text-[11px] text-teal-800 font-bold">{apt.hora} hs</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-stone-100 text-stone-700 border border-stone-200">
                        {apt.estado}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </>
          )}
        </div>
      </div>

      {/* Modal: Registrar Paciente Pediátrico con Validación de Edad */}
      {showNewPatientModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200">
            <h3 className="text-base font-bold text-stone-900 mb-1">
              Registrar Nuevo Paciente del Interior
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Atención pediátrica: pacientes mayores de 1 mes de vida hasta 15 años inclusive.
            </p>

            {patientError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{patientError}</span>
              </div>
            )}

            <form onSubmit={handleCreatePatient} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-stone-600 block uppercase mb-1">
                  Nombre completo del niño/a
                </label>
                <input
                  type="text"
                  required
                  value={newPatientForm.nombre}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, nombre: e.target.value })}
                  placeholder="Ej: Lucas Benítez"
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-stone-600 block uppercase mb-1">DNI</label>
                  <input
                    type="text"
                    required
                    value={newPatientForm.dni}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, dni: e.target.value })}
                    placeholder="55.123.456"
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-stone-600 block uppercase mb-1">
                    Edad (1 mes a 15 años)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="15"
                    required
                    value={newPatientForm.edad}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, edad: parseFloat(e.target.value) })}
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-stone-600 block uppercase mb-1">Localidad</label>
                  <select
                    value={newPatientForm.localidad}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, localidad: e.target.value as Localidad })}
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50"
                  >
                    <option value="Mercedes">Mercedes</option>
                    <option value="Goya">Goya</option>
                    <option value="Paso de los Libres">Paso de los Libres</option>
                    <option value="Curuzú Cuatiá">Curuzú Cuatiá</option>
                    <option value="Bella Vista">Bella Vista</option>
                    <option value="Ituzaingó">Ituzaingó</option>
                    <option value="Santo Tomé">Santo Tomé</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-stone-600 block uppercase mb-1">Teléfono</label>
                  <input
                    type="text"
                    required
                    value={newPatientForm.telefono}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, telefono: e.target.value })}
                    placeholder="+54 3773 ..."
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-600 block uppercase mb-1">
                  Tutor Responsable
                </label>
                <input
                  type="text"
                  required
                  value={newPatientForm.tutor}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, tutor: e.target.value })}
                  placeholder="Nombre de la madre/padre/tutor"
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewPatientModal(false)}
                  className="flex-1 py-2 text-xs font-semibold text-stone-600 bg-stone-100 rounded-xl hover:bg-stone-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-teal-700 rounded-xl hover:bg-teal-800 transition-colors shadow-xs"
                >
                  Guardar paciente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Solicitar Turno en Representación de la Familia */}
      {showNewAptModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200">
            <h3 className="text-base font-bold text-stone-900 mb-1">
              Solicitar Turno para {currentPatient.nombre}
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Canal oficial: Asistente Social • Origen: {currentPatient.localidad}
            </p>

            {bookingMsg && (
              <div
                className={`p-3 mb-4 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  bookingMsg.success
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {bookingMsg.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                <span>{bookingMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleBookForFamily} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-stone-600 block uppercase mb-1">
                  Especialidad / Servicio
                </label>
                <select
                  value={newAptForm.especialidad}
                  onChange={(e) => {
                    const chosen = specialties.find((s) => s.nombre === e.target.value);
                    setNewAptForm({
                      ...newAptForm,
                      especialidad: e.target.value,
                      tipoAgenda: chosen?.tipoAgenda || 'PROFESIONAL',
                      tipoPrestacion: chosen?.tipoPrestacion || 'consulta_medica',
                    });
                  }}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50"
                >
                  {specialties.map((s) => (
                    <option key={s.id} value={s.nombre}>
                      {s.nombre} ({s.tipoAgenda === 'SERVICIO' ? 'Por Servicio' : 'Por Profesional'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-600 block uppercase mb-1">
                  Horario disponible (agenda real, hasta 30 días)
                </label>
                {loadingAptSlots ? (
                  <p className="text-stone-500 text-xs py-2">Cargando disponibilidad…</p>
                ) : aptSlots.length === 0 ? (
                  <p className="text-rose-700 text-xs py-2 font-semibold">No hay horarios disponibles para este servicio.</p>
                ) : (
                  <select
                    value={selectedAptSlotId || ''}
                    onChange={(e) => setSelectedAptSlotId(e.target.value || null)}
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50"
                  >
                    <option value="">Seleccionar horario…</option>
                    {aptSlots.map((s) => (
                      <option key={s.slotId} value={s.slotId}>
                        {s.fecha} {s.hora} hs — {s.profesional}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-600 block uppercase mb-1">
                  Motivo / Nota social
                </label>
                <input
                  type="text"
                  value={newAptForm.motivo}
                  onChange={(e) => setNewAptForm({ ...newAptForm, motivo: e.target.value })}
                  placeholder="Motivo de derivación o nota"
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewAptModal(false)}
                  className="flex-1 py-2 text-xs font-semibold text-stone-600 bg-stone-100 rounded-xl hover:bg-stone-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-teal-700 rounded-xl hover:bg-teal-800 transition-colors shadow-xs"
                >
                  Confirmar turno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
