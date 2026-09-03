import React, { useEffect, useState } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { getTiempoPromedioAtencionMinutos } from '../../services/appointments.service';
import {
  CalendarCheck,
  AlertOctagon,
  XCircle,
  Clock,
  Timer,
  MapPin,
  MessageSquare,
  Phone,
  Users,
  Globe,
  Compass,
} from 'lucide-react';

const BAR_COLORS = ['bg-teal-700', 'bg-teal-600', 'bg-stone-600', 'bg-amber-600', 'bg-emerald-700', 'bg-teal-800'];

const CHANNEL_META: Record<string, { label: string; icon: React.ReactNode }> = {
  whatsapp: { label: 'WhatsApp / Chat', icon: <MessageSquare className="w-3.5 h-3.5 text-emerald-700" /> },
  telefono: { label: 'Atención Telefónica', icon: <Phone className="w-3.5 h-3.5 text-teal-700" /> },
  presencial: { label: 'Ventanilla Presencial', icon: <Users className="w-3.5 h-3.5 text-amber-700" /> },
  web: { label: 'Portal Web Autogestionado', icon: <Globe className="w-3.5 h-3.5 text-stone-700" /> },
  asistente_social: { label: 'Asistente Social', icon: <Compass className="w-3.5 h-3.5 text-teal-800" /> },
};

export const ReportsView: React.FC = () => {
  const { appointments, waitlist } = useHospital();

  const [tiempoPromedioAtencion, setTiempoPromedioAtencion] = useState<number | null>(null);
  const [loadingTiempoAtencion, setLoadingTiempoAtencion] = useState(true);

  useEffect(() => {
    setLoadingTiempoAtencion(true);
    getTiempoPromedioAtencionMinutos()
      .then(setTiempoPromedioAtencion)
      .catch(() => setTiempoPromedioAtencion(null))
      .finally(() => setLoadingTiempoAtencion(false));
  }, [appointments]);

  const total = appointments.length;
  const activos = appointments.filter((a) => a.estado !== 'CANCELADO');
  const noAsistio = appointments.filter((a) => a.estado === 'NO_ASISTIO').length;
  const cancelados = appointments.filter((a) => a.estado === 'CANCELADO').length;
  const tasaAusentismo = activos.length > 0 ? ((noAsistio / activos.length) * 100).toFixed(1) : '0.0';

  const especialidadCounts = new Map<string, number>();
  activos.forEach((a) => especialidadCounts.set(a.especialidad, (especialidadCounts.get(a.especialidad) || 0) + 1));
  const specialtyDemands = Array.from(especialidadCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count], idx) => ({
      name,
      count,
      percent: activos.length > 0 ? Math.round((count / activos.length) * 100) : 0,
      color: BAR_COLORS[idx % BAR_COLORS.length],
    }));

  const canalCounts = new Map<string, number>();
  appointments.forEach((a) => canalCounts.set(a.origenCanal, (canalCounts.get(a.origenCanal) || 0) + 1));
  const channelDistribution = Array.from(canalCounts.entries()).map(([canal, count]) => ({
    name: CHANNEL_META[canal]?.label || canal,
    icon: CHANNEL_META[canal]?.icon || <Globe className="w-3.5 h-3.5 text-stone-700" />,
    share: total > 0 ? `${Math.round((count / total) * 100)}%` : '0%',
  }));

  const localidadesPacientes = new Set(activos.map((a) => a.pacienteLocalidad));
  const pacientesInterior = new Set(
    activos.filter((a) => a.pacienteLocalidad !== 'Corrientes Capital').map((a) => a.pacienteId)
  ).size;
  const pacientesTotal = new Set(activos.map((a) => a.pacienteId)).size;
  const porcentajeInterior = pacientesTotal > 0 ? Math.round((pacientesInterior / pacientesTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Metrics Grid — calculado en vivo sobre los turnos reales */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Turnos Registrados</span>
            <CalendarCheck className="w-4 h-4 text-teal-700" />
          </div>
          <div className="text-2xl font-extrabold text-stone-900">{total}</div>
          <span className="text-[11px] text-stone-500 font-semibold">En la agenda central</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tiempo Prom. de Atención</span>
            <Timer className="w-4 h-4 text-teal-700" />
          </div>
          <div className="text-2xl font-extrabold text-stone-900">
            {loadingTiempoAtencion ? '…' : tiempoPromedioAtencion !== null ? `${Math.round(tiempoPromedioAtencion)} min` : '—'}
          </div>
          <span className="text-[11px] text-stone-500 font-semibold">
            {tiempoPromedioAtencion !== null ? 'Desde ingreso a consultorio hasta finalizar' : 'Sin atenciones finalizadas todavía'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tasa de Ausentismo</span>
            <AlertOctagon className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-2xl font-extrabold text-stone-900">{tasaAusentismo}%</div>
          <span className="text-[11px] text-stone-500 font-semibold">{noAsistio} de {activos.length} turnos activos</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Cancelaciones</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-stone-900">{cancelados}</div>
          <span className="text-[11px] text-teal-800 font-semibold">Slot liberado automáticamente</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Lista de Espera</span>
            <Clock className="w-4 h-4 text-teal-700" />
          </div>
          <div className="text-2xl font-extrabold text-stone-900">{waitlist.length}</div>
          <span className="text-[11px] text-stone-500 font-semibold">Pacientes activos esperando</span>
        </div>
      </div>

      {/* Featured Strategic Highlight: Alcance provincial (real) */}
      <div className="bg-stone-900 text-stone-100 rounded-3xl p-6 shadow-xs border border-stone-800 relative overflow-hidden">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-800 text-teal-300 border border-stone-700 text-xs font-semibold backdrop-blur-xs">
            <MapPin className="w-3.5 h-3.5 text-teal-300" />
            <span>Alcance Provincial</span>
          </div>
          <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">{porcentajeInterior}%</div>
          <h3 className="text-base font-bold text-stone-100">
            de los pacientes con turnos activos provienen del interior de Corrientes
          </h3>
          <p className="text-xs text-stone-400 leading-relaxed pt-1">
            {localidadesPacientes.size} localidades distintas registradas en turnos activos.
          </p>
        </div>
      </div>

      {/* Demanda por Especialidad (real) */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-stone-900">Demanda por Especialidad</h3>
            <p className="text-xs text-stone-500">Turnos activos por servicio (agenda central)</p>
          </div>
          <span className="text-xs font-semibold text-stone-400">Total: {activos.length} turnos activos</span>
        </div>

        {specialtyDemands.length === 0 ? (
          <p className="text-xs text-stone-400 py-4 text-center">Todavía no hay turnos registrados.</p>
        ) : (
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
        )}
      </div>

      {/* Canales de Acceso (real) */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs space-y-4">
        <h3 className="text-base font-bold text-stone-900">Distribución por Canales de Atención</h3>
        {channelDistribution.length === 0 ? (
          <p className="text-xs text-stone-400 py-4 text-center">Todavía no hay turnos registrados.</p>
        ) : (
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
        )}
      </div>
    </div>
  );
};
