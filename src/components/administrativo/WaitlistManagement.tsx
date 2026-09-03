import React, { useState, useEffect } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { WaitlistEntry } from '../../types';
import { AvailableSlot, getSlotsDisponibles } from '../../services/agenda.service';
import {
  Clock,
  UserCheck,
  Search,
  Filter,
  Check,
  Sparkles,
  MapPin,
  Calendar,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react';

export const WaitlistManagement: React.FC = () => {
  const { waitlist, assignWaitlistCandidate, removeFromWaitlist, specialties } = useHospital();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('Todas');
  const [assignModalCandidate, setAssignModalCandidate] = useState<WaitlistEntry | null>(null);

  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (!assignModalCandidate) {
      setAvailableSlots([]);
      setSelectedSlotId(null);
      return;
    }
    const servicio = specialties.find((s) => s.nombre === assignModalCandidate.especialidad);
    if (!servicio) return;

    setLoadingSlots(true);
    getSlotsDisponibles({ servicioId: servicio.id, tipoAgenda: servicio.tipoAgenda })
      .then((slots) => setAvailableSlots(slots))
      .finally(() => setLoadingSlots(false));
  }, [assignModalCandidate, specialties]);

  const filteredWaitlist = waitlist.filter((w) => {
    if (selectedSpecialty !== 'Todas' && w.especialidad !== selectedSpecialty) return false;
    if (
      searchTerm &&
      !w.pacienteNombre.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !w.dni.includes(searchTerm) &&
      !w.localidad.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleConfirmAssign = async () => {
    if (!assignModalCandidate || !selectedSlotId) return;
    setAssigning(true);
    try {
      const result = await assignWaitlistCandidate(assignModalCandidate.id, selectedSlotId);
      if (!result.success) {
        alert(result.error || 'No se pudo asignar el turno. Puede que ya se haya reservado, elegí otro horario.');
        return;
      }
      setAssignModalCandidate(null);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Stats */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-stone-900 flex items-center gap-2">
            <span>Gestión de Lista de Espera Inteligente</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              {waitlist.length} en espera
            </span>
          </h2>
          <p className="text-xs text-stone-500">
            Reasignación automática y asistida de cancelaciones para evitar vacantes no utilizadas.
          </p>
        </div>

        <div className="text-xs text-stone-600 bg-stone-50 border border-stone-200 p-2.5 rounded-xl flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-teal-700 shrink-0" />
          <span>Al liberar un turno en la agenda, el sistema busca aquí automáticamente.</span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por paciente, DNI o localidad del interior..."
            className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 focus:ring-2 focus:ring-teal-600 focus:outline-none"
          />
        </div>

        <div className="sm:w-64">
          <select
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-medium text-stone-800"
          >
            <option value="Todas">Todas las especialidades</option>
            <option value="Cardiología Pediátrica">Cardiología Pediátrica</option>
            <option value="Neurología">Neurología</option>
            <option value="Traumatología">Traumatología</option>
            <option value="Nutrición">Nutrición</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider text-stone-500">
              <tr>
                <th className="py-3 px-4">Paciente</th>
                <th className="py-3 px-4">Especialidad</th>
                <th className="py-3 px-4">Localidad</th>
                <th className="py-3 px-4">Fecha Solicitud</th>
                <th className="py-3 px-4">Preferencia</th>
                <th className="py-3 px-4">Prioridad</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredWaitlist.map((entry) => (
                <tr key={entry.id} className="hover:bg-stone-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-stone-900">{entry.pacienteNombre}</div>
                    <div className="text-[11px] text-stone-400">DNI: {entry.dni} • Tel: {entry.telefono}</div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-stone-800">
                    {entry.especialidad}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 font-medium text-stone-700 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-md">
                      <MapPin className="w-3 h-3 text-stone-400" />
                      {entry.localidad}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-stone-500 font-mono">
                    {entry.fechaSolicitud}
                  </td>
                  <td className="py-3 px-4 capitalize text-stone-600">
                    {entry.preferenciaHorario === 'cualquiera' ? 'Cualquier horario' : entry.preferenciaHorario}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                        entry.prioridad === 'alta'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-stone-100 text-stone-600 border-stone-200'
                      }`}
                    >
                      {entry.prioridad}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setAssignModalCandidate(entry)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-teal-800 bg-stone-100 hover:bg-stone-200 border border-stone-200 transition-colors"
                      >
                        Asignar turno disponible
                      </button>
                      <button
                        onClick={() => removeFromWaitlist(entry.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Quitar de lista"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Assign Modal */}
      {assignModalCandidate && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-stone-200 space-y-4">
            <h3 className="font-bold text-base text-stone-900">
              Asignar turno a {assignModalCandidate.pacienteNombre}
            </h3>
            <p className="text-xs text-stone-500">
              Especialidad: <strong>{assignModalCandidate.especialidad}</strong> • Origen: {assignModalCandidate.localidad}
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Horario disponible (agenda real)</label>
                {loadingSlots ? (
                  <p className="text-stone-500 py-2">Cargando disponibilidad…</p>
                ) : availableSlots.length === 0 ? (
                  <p className="text-rose-700 py-2">No hay horarios disponibles para este servicio en los próximos 30 días.</p>
                ) : (
                  <select
                    value={selectedSlotId || ''}
                    onChange={(e) => setSelectedSlotId(e.target.value || null)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800"
                  >
                    <option value="">Seleccionar horario…</option>
                    {availableSlots.map((s) => (
                      <option key={s.slotId} value={s.slotId}>
                        {s.fecha} {s.hora} hs — {s.profesional}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setAssignModalCandidate(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-stone-600 bg-stone-100 rounded-xl hover:bg-stone-200 border border-stone-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmAssign}
                disabled={!selectedSlotId || assigning}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-teal-700 rounded-xl hover:bg-teal-800 shadow-xs disabled:opacity-60"
              >
                {assigning ? 'Asignando…' : 'Confirmar Asignación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
