import React, { useState } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { TipoAgenda } from '../../types';
import {
  Settings,
  Sparkles,
  Save,
  Plus,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const DirectivoSettings: React.FC = () => {
  const { specialties, doctors, addSpecialty, addProfessional } = useHospital();

  const [activeTab, setActiveTab] = useState<'parametros' | 'especialidades' | 'profesionales'>('parametros');

  // Config state
  const [duracionTurno, setDuracionTurno] = useState('30');
  const [cupoMaximo, setCupoMaximo] = useState('24');
  const [prioridadInterior, setPrioridadInterior] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Nueva especialidad
  const [showSpecialtyModal, setShowSpecialtyModal] = useState(false);
  const [specialtyForm, setSpecialtyForm] = useState({
    nombre: '',
    descripcion: '',
    tipoAgenda: 'PROFESIONAL' as TipoAgenda,
  });
  const [specialtyError, setSpecialtyError] = useState<string | null>(null);
  const [savingSpecialty, setSavingSpecialty] = useState(false);

  const handleCreateSpecialty = async (e: React.FormEvent) => {
    e.preventDefault();
    setSpecialtyError(null);
    if (!specialtyForm.nombre.trim()) {
      setSpecialtyError('Ingresá un nombre para la especialidad.');
      return;
    }
    setSavingSpecialty(true);
    try {
      await addSpecialty({
        nombre: specialtyForm.nombre.trim(),
        descripcion: specialtyForm.descripcion.trim() || undefined,
        tipoAgenda: specialtyForm.tipoAgenda,
      });
      setSpecialtyForm({ nombre: '', descripcion: '', tipoAgenda: 'PROFESIONAL' });
      setShowSpecialtyModal(false);
    } catch (err: any) {
      setSpecialtyError(err?.message || 'No se pudo crear la especialidad. Puede que ya exista una con ese nombre.');
    } finally {
      setSavingSpecialty(false);
    }
  };

  // Nuevo profesional
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [doctorForm, setDoctorForm] = useState({ nombre: '', apellido: '', matricula: '' });
  const [selectedServicioIds, setSelectedServicioIds] = useState<string[]>([]);
  const [doctorError, setDoctorError] = useState<string | null>(null);
  const [savingDoctor, setSavingDoctor] = useState(false);

  const toggleServicio = (id: string) => {
    setSelectedServicioIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setDoctorError(null);
    if (!doctorForm.nombre.trim() || !doctorForm.apellido.trim()) {
      setDoctorError('Ingresá nombre y apellido del profesional.');
      return;
    }
    if (selectedServicioIds.length === 0) {
      setDoctorError('Seleccioná al menos un servicio para el profesional.');
      return;
    }
    setSavingDoctor(true);
    try {
      await addProfessional({
        nombre: doctorForm.nombre.trim(),
        apellido: doctorForm.apellido.trim(),
        matricula: doctorForm.matricula.trim() || undefined,
        servicioIds: selectedServicioIds,
      });
      setDoctorForm({ nombre: '', apellido: '', matricula: '' });
      setSelectedServicioIds([]);
      setShowDoctorModal(false);
    } catch (err: any) {
      setDoctorError(err?.message || 'No se pudo registrar el profesional.');
    } finally {
      setSavingDoctor(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-stone-900 text-teal-300 flex items-center justify-center font-bold shadow-xs">
              <Settings className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                Administración General & Dirección
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 mt-0.5">
                Configuración Hospitalaria
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 font-medium">Nexo-Hospital Pediátrico Juan Pablo II</span>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 mt-4 flex-wrap">
          <button
            onClick={() => setActiveTab('parametros')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'parametros'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Parámetros de Agenda
          </button>
          <button
            onClick={() => setActiveTab('especialidades')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'especialidades'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Especialidades ({specialties.length})
          </button>
          <button
            onClick={() => setActiveTab('profesionales')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'profesionales'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Profesionales & Consultorios ({doctors.length})
          </button>
        </div>
      </div>

      {/* Content: Parámetros */}
      {activeTab === 'parametros' && (
        <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs space-y-5">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="font-bold text-base text-stone-900">Reglas Operativas y Equidad para el Interior</h3>
            <p className="text-xs text-stone-500">Ajustá la política de cupos, duraciones y algoritmos de optimización de viajes.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-stone-700 block">Duración estándar de consulta</label>
              <select
                value={duracionTurno}
                onChange={(e) => setDuracionTurno(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 focus:ring-2 focus:ring-teal-600 focus:outline-none"
              >
                <option value="20">20 minutos (Alta rotación)</option>
                <option value="30">30 minutos (Estándar recomendado)</option>
                <option value="45">45 minutos (Evaluación compleja)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-700 block">Cupo máximo diario por médico</label>
              <input
                type="number"
                value={cupoMaximo}
                onChange={(e) => setCupoMaximo(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="p-4 bg-stone-100/70 border border-stone-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-bold text-xs text-stone-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-teal-700" />
                  Prioridad automática a pacientes del Interior de la Provincia
                </span>
                <p className="text-[11px] text-stone-600">
                  Reserva cupos y prioriza en lista de espera a familias de Mercedes, Goya, Curuzú Cuatiá y Paso de los Libres para agrupar citas el mismo día.
                </p>
              </div>
              <input
                type="checkbox"
                checked={prioridadInterior}
                onChange={(e) => setPrioridadInterior(e.target.checked)}
                className="w-5 h-5 rounded text-teal-700 focus:ring-teal-600 cursor-pointer accent-teal-700"
              />
            </div>
          </div>

          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Parámetros guardados y sincronizados en toda la red hospitalaria.</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Guardar configuración</span>
            </button>
          </div>
        </form>
      )}

      {/* Content: Especialidades */}
      {activeTab === 'especialidades' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-stone-900">Especialidades Activas</h3>
            <button
              onClick={() => setShowSpecialtyModal(true)}
              className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Añadir Especialidad</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {specialties.map((sp) => (
              <div key={sp.id} className="p-4 rounded-2xl border border-stone-200 bg-stone-50 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-stone-900">{sp.nombre}</h4>
                  <span className="text-xs text-stone-500">
                    {sp.tipoAgenda === 'SERVICIO' ? 'Agenda compartida de servicio' : 'Agenda por profesional'}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Activa
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content: Profesionales */}
      {activeTab === 'profesionales' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-stone-900">Plantel Profesional y Consultorios Asignados</h3>
            <button
              onClick={() => setShowDoctorModal(true)}
              className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Nuevo Profesional</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {doctors.map((d) => (
              <div key={d.id} className="p-4 rounded-2xl border border-stone-200 bg-stone-50 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-stone-900">{d.nombre}</h4>
                  <p className="text-xs text-stone-500">{d.especialidad}</p>
                </div>
                {d.ausente && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-200">
                    Ausente
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Nueva Especialidad */}
      {showSpecialtyModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <h3 className="text-base font-bold text-stone-900">Añadir Especialidad / Servicio</h3>

            {specialtyError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{specialtyError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSpecialty} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-bold text-stone-600 block uppercase mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={specialtyForm.nombre}
                  onChange={(e) => setSpecialtyForm({ ...specialtyForm, nombre: e.target.value })}
                  placeholder="Ej: Dermatología"
                  className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-600 block uppercase mb-1">Descripción (opcional)</label>
                <input
                  type="text"
                  value={specialtyForm.descripcion}
                  onChange={(e) => setSpecialtyForm({ ...specialtyForm, descripcion: e.target.value })}
                  placeholder="Breve descripción del servicio"
                  className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-600 block uppercase mb-1">Tipo de Agenda</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSpecialtyForm({ ...specialtyForm, tipoAgenda: 'PROFESIONAL' })}
                    className={`py-2 rounded-xl font-bold border transition-all ${
                      specialtyForm.tipoAgenda === 'PROFESIONAL'
                        ? 'bg-teal-700 text-white border-teal-800'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    Por Profesional
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpecialtyForm({ ...specialtyForm, tipoAgenda: 'SERVICIO' })}
                    className={`py-2 rounded-xl font-bold border transition-all ${
                      specialtyForm.tipoAgenda === 'SERVICIO'
                        ? 'bg-teal-700 text-white border-teal-800'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    Por Servicio
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-stone-400">
                Después de crearla podés agregarle disponibilidad real (horarios) desde el panel de agenda.
              </p>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSpecialtyModal(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-stone-600 bg-stone-100 rounded-xl hover:bg-stone-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSpecialty}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-teal-700 rounded-xl hover:bg-teal-800 shadow-xs disabled:opacity-60"
                >
                  {savingSpecialty ? 'Guardando…' : 'Crear especialidad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nuevo Profesional */}
      {showDoctorModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-stone-900">Nuevo Profesional</h3>

            {doctorError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{doctorError}</span>
              </div>
            )}

            <form onSubmit={handleCreateDoctor} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-stone-600 block uppercase mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    value={doctorForm.nombre}
                    onChange={(e) => setDoctorForm({ ...doctorForm, nombre: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-stone-600 block uppercase mb-1">Apellido</label>
                  <input
                    type="text"
                    required
                    value={doctorForm.apellido}
                    onChange={(e) => setDoctorForm({ ...doctorForm, apellido: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-600 block uppercase mb-1">Matrícula (opcional)</label>
                <input
                  type="text"
                  value={doctorForm.matricula}
                  onChange={(e) => setDoctorForm({ ...doctorForm, matricula: e.target.value })}
                  placeholder="MP-1234"
                  className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-600 block uppercase mb-1">
                  Servicios en los que atiende
                </label>
                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {specialties.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleServicio(s.id)}
                      className={`py-2 px-2 rounded-lg font-semibold border text-left transition-all ${
                        selectedServicioIds.includes(s.id)
                          ? 'bg-teal-700 text-white border-teal-800'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      {s.nombre}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDoctorModal(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-stone-600 bg-stone-100 rounded-xl hover:bg-stone-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingDoctor}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-teal-700 rounded-xl hover:bg-teal-800 shadow-xs disabled:opacity-60"
                >
                  {savingDoctor ? 'Guardando…' : 'Crear profesional'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
