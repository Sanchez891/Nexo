import React, { useState } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { UserRole } from '../../types';
import {
  Heart,
  User,
  ClipboardList,
  Stethoscope,
  Settings,
  RotateCcw,
  Sparkles,
  MapPin,
  Compass,
  MessageSquare,
} from 'lucide-react';
import { DemoWalkthroughModal } from '../demo/DemoWalkthroughModal';

export const Navbar: React.FC = () => {
  const { role, setRole, resetDemoData, currentDemoStep, openWhatsAppSimulator } = useHospital();
  const [showDemoGuide, setShowDemoGuide] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const roles: { key: UserRole; label: string; icon: React.ReactNode; subtitle: string }[] = [
    {
      key: 'familiar',
      label: 'Familiar / Responsable',
      icon: <User className="w-4 h-4" />,
      subtitle: 'Portal de autogestión',
    },
    {
      key: 'administrativo',
      label: 'Secretario / Administrativo',
      icon: <ClipboardList className="w-4 h-4" />,
      subtitle: 'Centro de gestión y agendas',
    },
    {
      key: 'medico',
      label: 'Médico / Profesional',
      icon: <Stethoscope className="w-4 h-4" />,
      subtitle: 'Atención en consultorio y servicio',
    },
    {
      key: 'asistente_social',
      label: 'Asistente Social',
      icon: <Compass className="w-4 h-4" />,
      subtitle: 'Gestión pacientes del interior',
    },
    {
      key: 'administrador',
      label: 'Administrador',
      icon: <Settings className="w-4 h-4" />,
      subtitle: 'Configuración hospitalaria',
    },
  ];

  return (
    <>
      <header className="bg-white/95 backdrop-blur-xs border-b border-stone-200 sticky top-0 z-40 shadow-xs">
        {/* Top Institutional Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 gap-3 border-b border-stone-100">
            {/* Hospital Branding */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-700 to-emerald-800 flex items-center justify-center text-white shadow-xs ring-2 ring-teal-100">
                <Heart className="w-6 h-6 fill-white/20" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-stone-900 text-lg leading-tight">
                    Hospital Pediátrico Juan Pablo II
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider bg-teal-50 text-teal-800 px-2 py-0.5 rounded-full border border-teal-200/80">
                    <MapPin className="w-3 h-3" /> Corrientes
                  </span>
                </div>
                <p className="text-xs text-stone-500 font-medium">
                  Un solo sistema para el hospital. Cualquier canal para la familia.
                </p>
              </div>
            </div>

            {/* Quick Demo Utilities */}
            <div className="flex items-center gap-2 self-end md:self-auto">
              <button
                onClick={openWhatsAppSimulator}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 transition-all shadow-xs"
                title="Abrir Simulador de WhatsApp Bot conectado a la agenda central"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-100" />
                <span>Simular WhatsApp</span>
                <span className="w-2 h-2 rounded-full bg-emerald-200 animate-pulse"></span>
              </button>

              <button
                onClick={() => setShowDemoGuide(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 text-teal-900 hover:bg-teal-100 border border-teal-200 transition-colors shadow-xs"
                title="Ver las 6 escenas de la demo para jurados"
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                <span>Escena {currentDemoStep} de 6: Guía Demo</span>
              </button>

              <button
                onClick={() => setShowResetConfirm(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-600 hover:text-amber-800 hover:bg-amber-50 border border-stone-200 transition-colors"
                title="Reiniciar datos iniciales para una nueva demostración"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reiniciar demo</span>
              </button>
            </div>
          </div>

          {/* Role Navigation Bar (5 Roles) */}
          <div className="flex items-center justify-between py-2 overflow-x-auto no-scrollbar gap-2">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-stone-400 mr-2 uppercase tracking-wider hidden xl:inline">
                Rol activo:
              </span>
              <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200">
                {roles.map((r) => {
                  const isActive = role === r.key;
                  return (
                    <button
                      key={r.key}
                      onClick={() => setRole(r.key)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                        isActive
                          ? 'bg-white text-teal-900 shadow-xs ring-1 ring-stone-200 font-bold'
                          : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                      }`}
                    >
                      <span className={isActive ? 'text-teal-700' : 'text-stone-400'}>
                        {r.icon}
                      </span>
                      <span>{r.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-2 text-[11px] text-stone-500">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>Agenda centralizada en tiempo real</span>
            </div>
          </div>
        </div>

        {/* Subheader tagline banner */}
        <div className="bg-stone-100/90 border-t border-stone-200 py-1.5 px-4 text-center text-xs font-medium text-stone-700">
          <span>Atención pediátrica especializada (1 mes a 15 años) • Menos trámites. Menos viajes. Más acceso para Corrientes.</span>
        </div>
      </header>

      {/* Demo Guide Modal */}
      {showDemoGuide && <DemoWalkthroughModal onClose={() => setShowDemoGuide(false)} />}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-stone-200 text-center">
            <div className="w-12 h-12 bg-amber-50 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-3 border border-amber-200">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-stone-900 mb-1">
              ¿Reiniciar datos de la demostración?
            </h3>
            <p className="text-xs text-stone-500 mb-5 leading-relaxed">
              Esto restablecerá la agenda, demoras, ausencias, lista de espera, turnos y solicitudes al estado inicial listo para presentar.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2 text-xs font-medium text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors border border-stone-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  resetDemoData();
                  setShowResetConfirm(false);
                }}
                className="flex-1 py-2 text-xs font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors shadow-xs"
              >
                Reiniciar todo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
