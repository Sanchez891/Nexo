import React from 'react';
import { useHospital } from '../../context/HospitalContext';
import { UserRole } from '../../types';
import { CheckCircle2, ChevronRight, Sparkles, X, ArrowRight, Layers, MessageSquare, UserCheck, Stethoscope, Clock, Compass } from 'lucide-react';

interface Step {
  number: number;
  title: string;
  role: UserRole;
  badge: string;
  description: string;
  actionHint: string;
}

export const DemoWalkthroughModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { currentDemoStep, setCurrentDemoStep, setRole, openWhatsAppSimulator } = useHospital();

  const STEPS: Step[] = [
    {
      number: 1,
      title: 'ESCENA 1 — Canal WhatsApp & Bandeja Multicanal',
      role: 'administrativo',
      badge: 'WhatsApp → Agenda',
      description: 'El secretario abre la bandeja y ve el mensaje informal: "Hola, necesito un turno con neurología para mi hija. Somos de Goya." La IA ya estructuró: Especialidad Neurología, Paciente Camila Benítez (7 años), Localidad Goya. Selecciona tipo de agenda (Servicio o Profesional) y confirma el turno.',
      actionHint: 'Entrá a Bandeja de Solicitudes y tocá "Revisar y asignar" en el mensaje de Camila Benítez.',
    },
    {
      number: 2,
      title: 'ESCENA 2 — Recepción / Llegada de la Familia a Ventanilla',
      role: 'administrativo',
      badge: 'Llegada → En Espera',
      description: 'La familia llega al hospital desde el interior. En la Agenda Centralizada el turno está en PENDIENTE_DE_LLEGADA. Al tocar [Registrar llegada], cambia a EN_ESPERA e impacta de inmediato en la pantalla del médico.',
      actionHint: 'En la Agenda Centralizada, buscá a Bautista Fernández y tocá [Registrar llegada].',
    },
    {
      number: 3,
      title: 'ESCENA 3 — Atención Médica en Consultorio',
      role: 'medico',
      badge: 'En Consultorio → Atendido',
      description: 'El médico ve su lista de pacientes en espera en sala. Hace clic en [Llamar a consultorio], el estado pasa a EN_CONSULTORIO. Al concluir la consulta, toca [Finalizar atención] y queda en ATENDIDO.',
      actionHint: 'En el Portal Médico, llamá al paciente en espera y luego tocá [Finalizar atención].',
    },
    {
      number: 4,
      title: 'ESCENA 4 — Cancelación y Lista de Espera Inteligente',
      role: 'administrativo',
      badge: 'Reasignación Inmediata',
      description: 'Al cancelarse un turno en la agenda, el sistema detecta inmediatamente el hueco liberado y activa el banner con candidatos compatibles en lista de espera. Con un solo clic se reasigna el turno.',
      actionHint: 'En la Agenda Centralizada, cancelá cualquier turno o asigná el candidato del banner superior.',
    },
    {
      number: 5,
      title: 'ESCENA 5 — Paciente del Interior (Asistente Social)',
      role: 'asistente_social',
      badge: 'Optimizar Viaje',
      description: 'La Asistente Social gestiona pacientes derivados del interior (Mercedes, Curuzú Cuatiá, Goya) y agrupa en una misma jornada la consulta médica con estudios complementarios para evitar que la familia viaje dos veces.',
      actionHint: 'En el Portal Asistente Social, tocá "Coordinar turnos agrupados" para viajar una sola vez.',
    },
  ];

  const handleJumpToStep = (step: Step) => {
    setCurrentDemoStep(step.number);
    setRole(step.role);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-800 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs">
              <Sparkles className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">Guía de Demostración para Jurados</h2>
              <p className="text-xs text-teal-200">
                Hospital Pediátrico Juan Pablo II • 5 Escenas funcionales del Hackathon
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps List */}
        <div className="p-5 overflow-y-auto space-y-3">
          {/* WhatsApp Interactive Simulator Highlight */}
          <div className="bg-emerald-900 text-white rounded-2xl p-4 shadow-md border border-emerald-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500 text-emerald-950 font-black text-[10px] uppercase px-2 py-0.5 rounded-full">
                  NUEVO • WHATSAPP BOT
                </span>
                <span className="text-emerald-200 text-xs font-semibold">Simulador de Conversación Móvil</span>
              </div>
              <h3 className="font-bold text-sm text-white">Bot Asistente de Turnos (WhatsApp)</h3>
              <p className="text-xs text-emerald-100/90 leading-relaxed max-w-lg">
                Probá interactuar con el bot de WhatsApp para agendar turno de neurología para Sofía Gómez, consultar turnos activos o cancelarlos. Todos los turnos impactan directamente en la agenda central.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                openWhatsAppSimulator();
              }}
              className="px-4 py-2.5 rounded-xl bg-white text-emerald-950 font-black text-xs hover:bg-emerald-50 transition-all shadow-xs flex items-center justify-center gap-2 shrink-0 border border-emerald-200"
            >
              <MessageSquare className="w-4 h-4 text-emerald-700" />
              <span>Simular WhatsApp</span>
            </button>
          </div>

          <div className="bg-teal-50/80 border border-teal-200 rounded-2xl p-3.5 flex items-start gap-3">
            <Layers className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
            <p className="text-xs text-teal-950 leading-relaxed font-medium">
              Hacé clic en cualquiera de las 5 escenas para cambiar automáticamente de rol y comenzar el flujo de evaluación en vivo.
            </p>
          </div>

          {STEPS.map((s) => {
            const isCurrent = currentDemoStep === s.number;
            return (
              <div
                key={s.number}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isCurrent
                    ? 'border-teal-600 bg-teal-50/40 ring-2 ring-teal-200 shadow-xs'
                    : 'border-stone-200 bg-white hover:border-teal-300 hover:bg-stone-50/70'
                }`}
                onClick={() => handleJumpToStep(s)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                        isCurrent
                          ? 'bg-teal-700 text-white shadow-xs'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {s.number}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="text-xs font-extrabold text-stone-900">{s.title}</h4>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200">
                          Rol: {s.role}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-900">
                          {s.badge}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 mb-2 leading-relaxed">{s.description}</p>
                      <div className="text-[11px] font-bold text-teal-900 bg-teal-100/70 px-2.5 py-1 rounded-lg inline-block border border-teal-200/50">
                        🎯 {s.actionHint}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleJumpToStep(s);
                    }}
                    className="p-1.5 rounded-lg text-teal-700 hover:bg-teal-100 transition-colors shrink-0"
                    title="Ir a este paso"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="bg-stone-50 px-5 py-3 border-t border-stone-200 flex items-center justify-between">
          <span className="text-xs text-stone-500 font-medium">
            Todos los roles están sincronizados mediante estado global y almacenamiento local persistente.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Cerrar guía
          </button>
        </div>
      </div>
    </div>
  );
};
