import React from 'react';
import {
  TrendingUp,
  MapPin,
  CalendarCheck,
  AlertOctagon,
  XCircle,
  Clock,
  Sparkles,
  MessageSquare,
  Phone,
  Users,
  Globe,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const specialtyDemands = [
    { name: 'Cardiología Pediátrica', percent: 42, count: 52, color: 'bg-teal-700' },
    { name: 'Neurología Infantil', percent: 26, count: 32, color: 'bg-teal-600' },
    { name: 'Traumatología', percent: 18, count: 22, color: 'bg-stone-600' },
    { name: 'Nutrición', percent: 14, count: 18, color: 'bg-amber-600' },
  ];

  const channelDistribution = [
    { name: 'WhatsApp / Chat', share: '45%', icon: <MessageSquare className="w-3.5 h-3.5 text-emerald-700" /> },
    { name: 'Atención Telefónica', share: '25%', icon: <Phone className="w-3.5 h-3.5 text-teal-700" /> },
    { name: 'Ventanilla Presencial', share: '20%', icon: <Users className="w-3.5 h-3.5 text-amber-700" /> },
    { name: 'Portal Web Autogestionado', share: '10%', icon: <Globe className="w-3.5 h-3.5 text-stone-700" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Top Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Turnos Otorgados</span>
            <CalendarCheck className="w-4 h-4 text-teal-700" />
          </div>
          <div className="text-2xl font-extrabold text-stone-900">124</div>
          <span className="text-[11px] text-emerald-700 font-semibold">+14% vs. mes anterior</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tasa de Ausentismo</span>
            <AlertOctagon className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-2xl font-extrabold text-stone-900">6.4%</div>
          <span className="text-[11px] text-emerald-700 font-semibold">Reducido con recordatorios</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Cancelaciones</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-stone-900">8</div>
          <span className="text-[11px] text-teal-800 font-semibold">100% reasignadas por lista</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tiempo de Asignación</span>
            <Clock className="w-4 h-4 text-teal-700" />
          </div>
          <div className="text-2xl font-extrabold text-stone-900">1.8 min</div>
          <span className="text-[11px] text-emerald-700 font-semibold">Antes: 4.5 días hábiles</span>
        </div>
      </div>

      {/* Featured Strategic Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Highlight 1: 37% Pacientes del Interior */}
        <div className="bg-stone-900 text-stone-100 rounded-3xl p-6 shadow-xs border border-stone-800 relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-800 text-teal-300 border border-stone-700 text-xs font-semibold backdrop-blur-xs">
              <MapPin className="w-3.5 h-3.5 text-teal-300" />
              <span>Alcance Provincial</span>
            </div>
            <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">37%</div>
            <h3 className="text-base font-bold text-stone-100">
              de los pacientes registrados provienen del interior de Corrientes
            </h3>
            <p className="text-xs text-stone-400 leading-relaxed pt-1">
              Familias de Mercedes, Goya, Curuzú Cuatiá, Paso de los Libres y Bella Vista acceden a turnos hospitalarios antes de viajar.
            </p>
          </div>
        </div>

        {/* Highlight 2: Viajes potencialmente evitados */}
        <div className="bg-teal-900 text-white rounded-3xl p-6 shadow-xs border border-teal-800 relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-800/80 text-teal-200 border border-teal-700 text-xs font-semibold backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-teal-300" />
              <span>Impacto en Familias</span>
            </div>
            <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">18</div>
            <h3 className="text-base font-bold text-teal-100">
              Viajes potencialmente evitados mediante optimización
            </h3>
            <p className="text-xs text-teal-200/90 leading-relaxed pt-1">
              Consultas coordinadas el mismo día (ej. Cardiología + Nutrición) que ahorran pasajes, combustible, pérdidas de días laborales y cansancio a los niños.
            </p>
          </div>
        </div>
      </div>

      {/* Gráfico Simple: Solicitudes por Especialidad */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-stone-900">Demanda y Solicitudes por Especialidad</h3>
            <p className="text-xs text-stone-500">Distribución de turnos pedidos este mes</p>
          </div>
          <span className="text-xs font-semibold text-stone-400">Total: 124 solicitudes</span>
        </div>

        <div className="space-y-3.5">
          {specialtyDemands.map((sp) => (
            <div key={sp.name} className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-stone-800">{sp.name}</span>
                <span className="text-stone-600">{sp.count} turnos ({sp.percent}%)</span>
              </div>
              <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full ${sp.color} transition-all duration-500`}
                  style={{ width: `${sp.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Canales de Acceso */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs space-y-4">
        <h3 className="text-base font-bold text-stone-900">Distribución por Canales de Atención</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {channelDistribution.map((ch) => (
            <div key={ch.name} className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
              <div className="flex items-center gap-1.5 mb-2">
                {ch.icon}
                <span className="text-xs font-bold text-stone-800">{ch.share}</span>
              </div>
              <span className="text-xs text-stone-500 block leading-tight">{ch.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
