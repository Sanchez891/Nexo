import React, { useState } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { InboundRequest } from '../../types';
import {
  MessageSquare,
  Phone,
  Users,
  Globe,
  Bot,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Clock,
} from 'lucide-react';
import { NewManualAppointmentModal } from './NewManualAppointmentModal';

export const MultichannelRequests: React.FC = () => {
  const { inboundRequests, processInboundRequest } = useHospital();
  const [activePrefill, setActivePrefill] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  const getChannelBadge = (canal: InboundRequest['canal']) => {
    switch (canal) {
      case 'whatsapp':
        return {
          icon: <MessageSquare className="w-4 h-4" />,
          label: 'WhatsApp',
          style: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        };
      case 'telefono':
        return {
          icon: <Phone className="w-4 h-4" />,
          label: 'Teléfono',
          style: 'bg-stone-100 text-stone-800 border-stone-200',
        };
      case 'presencial':
        return {
          icon: <Users className="w-4 h-4" />,
          label: 'Mesa Presencial',
          style: 'bg-amber-50 text-amber-800 border-amber-200',
        };
      case 'web':
        return {
          icon: <Globe className="w-4 h-4" />,
          label: 'Formulario Web',
          style: 'bg-teal-50 text-teal-800 border-teal-200',
        };
    }
  };

  const handleReviewAndAssign = (req: InboundRequest) => {
    setActivePrefill({
      pacienteNombre: req.interpretacion.pacienteNombre,
      especialidad: req.interpretacion.especialidad,
      localidad: req.interpretacion.localidad,
      origenCanal: req.canal,
      motivo: req.mensajeOriginal,
      fecha: '2026-09-09',
      hora: '11:30',
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-5">
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-stone-900 flex items-center gap-2">
              <span>Bandeja de Solicitudes Multicanal</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-stone-100 text-teal-800 border border-stone-200">
                {inboundRequests.filter((r) => r.estado === 'pendiente').length} pendientes
              </span>
            </h2>
            <p className="text-xs text-stone-500">
              Transformación automática de mensajes informales (WhatsApp, llamadas y ventanilla) a la agenda médica unificada.
            </p>
          </div>

          <div className="text-xs font-semibold text-stone-700 bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-200 flex items-center gap-2">
            <Bot className="w-4 h-4 text-teal-700" />
            <span>Motor NLP de triaje activo</span>
          </div>
        </div>
      </div>

      {/* Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {inboundRequests.map((req) => {
          const badge = getChannelBadge(req.canal);
          const isPending = req.estado === 'pendiente';

          return (
            <div
              key={req.id}
              className={`bg-white rounded-2xl p-5 border transition-all flex flex-col justify-between space-y-4 shadow-2xs ${
                isPending ? 'border-stone-200 hover:border-teal-400' : 'border-stone-200/60 opacity-70 bg-stone-50/50'
              }`}
            >
              <div className="space-y-3">
                {/* Channel Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${badge.style}`}>
                      {badge.icon}
                      <span>{badge.label}</span>
                    </span>
                    <span className="text-xs font-medium text-stone-500">{req.remitente}</span>
                  </div>
                  <span className="text-[11px] text-stone-400 font-mono">{req.fechaHora}</span>
                </div>

                {/* Raw informal message */}
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs text-stone-800 italic relative">
                  <span className="text-[10px] uppercase font-bold text-stone-400 not-italic block mb-1">
                    Mensaje recibido:
                  </span>
                  "{req.mensajeOriginal}"
                </div>

                {/* Automatic structured interpretation */}
                <div className="bg-stone-50/80 p-3 rounded-xl border border-stone-200 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-teal-800 font-bold text-[11px] uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                    <span>Interpretación automática IA</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-stone-400 block">Especialidad:</span>
                      <span className="font-bold text-stone-800">{req.interpretacion.especialidad}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block">Localidad:</span>
                      <span className="font-semibold text-stone-800 flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 text-teal-700" />
                        {req.interpretacion.localidad}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block">Tipo de consulta:</span>
                      <span className="font-medium text-stone-800">{req.interpretacion.tipoConsulta}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block">Paciente:</span>
                      <span className="font-bold text-stone-800">{req.interpretacion.pacienteNombre}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-stone-400">
                  Estado: {req.estado.toUpperCase()}
                </span>

                {isPending ? (
                  <button
                    onClick={() => handleReviewAndAssign(req)}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <span>Revisar y asignar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Asignado a agenda</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <NewManualAppointmentModal
          prefill={activePrefill}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};
