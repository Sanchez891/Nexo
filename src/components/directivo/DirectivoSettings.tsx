import React, { useState } from 'react';
import { useHospital } from '../../context/HospitalContext';
import {
  Settings,
  Building2,
  Stethoscope,
  Clock,
  ShieldAlert,
  Save,
  Plus,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const DirectivoSettings: React.FC = () => {
  const { specialties, doctors } = useHospital();

  const [activeTab, setActiveTab] = useState<'parametros' | 'especialidades' | 'profesionales'>('parametros');

  // Config state
  const [duracionTurno, setDuracionTurno] = useState('30');
  const [cupoMaximo, setCupoMaximo] = useState('24');
  const [prioridadInterior, setPrioridadInterior] = useState(true);
  const [alertaAnticipadaHoras, setAlertaAnticipadaHoras] = useState('24');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
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
            <span className="text-xs text-stone-500 font-medium">Hospital Pediátrico Juan Pablo II</span>
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
            <button className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-colors">
              <Plus className="w-3.5 h-3.5" />
              <span>+ Añadir Especialidad</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {specialties.map((sp) => (
              <div key={sp.id} className="p-4 rounded-2xl border border-stone-200 bg-stone-50 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-stone-900">{sp.nombre}</h4>
                  <span className="text-xs text-stone-500">Duración promedio: {sp.duracionMinutos} minutos</span>
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
            <button className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-colors">
              <Plus className="w-3.5 h-3.5" />
              <span>+ Nuevo Profesional</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {doctors.map((d) => (
              <div key={d.id} className="p-4 rounded-2xl border border-stone-200 bg-stone-50 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-stone-900">{d.nombre}</h4>
                  <p className="text-xs text-stone-500">{d.especialidad} • Consultorio {d.consultorio}</p>
                </div>
                <span className="text-xs font-mono font-bold text-teal-800 bg-white px-2 py-1 rounded-lg border border-stone-200">
                  Cons. {d.consultorio}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
