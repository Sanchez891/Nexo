import React from 'react';
import { HospitalProvider, useHospital } from './context/HospitalContext';
import { Navbar } from './components/common/Navbar';
import { FamiliarPortal } from './components/familiar/FamiliarPortal';
import { AdminPortal } from './components/administrativo/AdminPortal';
import { DoctorPortal } from './components/medico/DoctorPortal';
import { AsistenteSocialPortal } from './components/social/AsistenteSocialPortal';
import { DirectivoSettings } from './components/directivo/DirectivoSettings';
import { WhatsAppSimulator } from './components/whatsapp/WhatsAppSimulator';
import { Loader2, AlertTriangle } from 'lucide-react';
import { isSupabaseConfigured } from './lib/supabase';

const HospitalAppContent: React.FC = () => {
  const { role, loading, dataError, refreshAll } = useHospital();

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100 p-6">
        <div className="max-w-md bg-white border border-rose-200 rounded-2xl p-6 text-center space-y-3 shadow-sm">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
          <h2 className="font-bold text-stone-900">Falta configurar Supabase</h2>
          <p className="text-sm text-stone-600">
            Definí <code className="font-mono text-xs bg-stone-100 px-1 rounded">VITE_SUPABASE_URL</code> y{' '}
            <code className="font-mono text-xs bg-stone-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> en un archivo{' '}
            <code className="font-mono text-xs bg-stone-100 px-1 rounded">.env.local</code> (ver .env.example) y reiniciá la app.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <div className="flex flex-col items-center gap-3 text-stone-500">
          <Loader2 className="w-8 h-8 animate-spin text-teal-700" />
          <p className="text-sm font-medium">Cargando datos del hospital…</p>
        </div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100 p-6">
        <div className="max-w-md bg-white border border-rose-200 rounded-2xl p-6 text-center space-y-3 shadow-sm">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
          <h2 className="font-bold text-stone-900">No se pudo consultar la base de datos</h2>
          <p className="text-sm text-stone-600">{dataError}</p>
          <button
            onClick={() => refreshAll()}
            className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold"
          >
            Intentar nuevamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100/80 text-stone-900 flex flex-col font-sans antialiased selection:bg-teal-700 selection:text-white">
      {/* Universal Institutional Header & Role Navigation */}
      <Navbar />

      {/* Main View Area based on Selected Role */}
      <main className="flex-1 pb-16">
        {role === 'familiar' && <FamiliarPortal />}
        {role === 'administrativo' && <AdminPortal />}
        {role === 'medico' && <DoctorPortal />}
        {role === 'asistente_social' && <AsistenteSocialPortal />}
        {role === 'administrador' && <DirectivoSettings />}
      </main>

      {/* WhatsApp Bot Simulator Modal */}
      <WhatsAppSimulator />

      {/* Institutional Footer */}
      <footer className="bg-stone-900 text-stone-400 text-xs py-8 border-t border-stone-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
              <img src="/nexo-logo.png" alt="Nexo" className="w-full h-full object-contain scale-125" />
            </div>
            <div>
              <div className="text-stone-200 font-bold text-sm">
                Hospital Pediátrico Juan Pablo II
              </div>
              <div className="text-[11px] text-stone-400">
                Avenida Artigas 1435 • Ciudad de Corrientes, Argentina • Exclusivamente Pediátrico (1 mes a 15 años)
              </div>
            </div>
          </div>

          <div className="text-center sm:text-right space-y-0.5">
            <p className="text-stone-300 font-medium text-xs">
              “Un solo sistema para el hospital, cualquier canal para la familia.”
            </p>
            <p className="text-[11px] text-teal-400 font-bold">
              Urgencias 24 hs sin turno • Consultas y estudios programados con hasta 30 días de anticipación
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <HospitalProvider>
      <HospitalAppContent />
    </HospitalProvider>
  );
}
