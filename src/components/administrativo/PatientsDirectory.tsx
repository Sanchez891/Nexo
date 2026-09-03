import React, { useState } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { Patient } from '../../types';
import { Search, MapPin, Phone, User, Calendar, FileText, ShieldCheck, Heart } from 'lucide-react';

export const PatientsDirectory: React.FC = () => {
  const { patients, tutors, relaciones } = useHospital();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const filteredPatients = patients.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(term) ||
      p.dni.includes(term) ||
      p.localidad.toLowerCase().includes(term) ||
      (p.tutor && p.tutor.toLowerCase().includes(term))
    );
  });

  const getTutorInfo = (p: Patient) => {
    if (p.tutorId) {
      const t = tutors.find((tut) => tut.id === p.tutorId);
      if (t) {
        return {
          tutor: t,
          relacion: p.relacionConTutor || 'Tutor legal',
        };
      }
    }
    return {
      tutor: null,
      relacion: p.relacionConTutor || 'Tutor legal',
    };
  };

  return (
    <div className="space-y-5">
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-stone-900">Directorio de Pacientes Pediátricos</h2>
          <p className="text-xs text-stone-500">
            Padrón centralizado con personas a cargo (1 mes a 15 años) y sus tutores responsables vinculados.
          </p>
        </div>
        <span className="text-xs font-bold text-teal-800 bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-200">
          {patients.length} personas a cargo registradas
        </span>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre del paciente, DNI, tutor o localidad (Mercedes, Goya, Capital)..."
            className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 focus:ring-2 focus:ring-teal-600 focus:outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider text-stone-500">
              <tr>
                <th className="py-3 px-4">Paciente (Persona a cargo)</th>
                <th className="py-3 px-4">DNI</th>
                <th className="py-3 px-4">Edad</th>
                <th className="py-3 px-4">Localidad</th>
                <th className="py-3 px-4">Tutor Responsable</th>
                <th className="py-3 px-4">Vínculo</th>
                <th className="py-3 px-4">Teléfono Contacto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredPatients.map((p) => {
                const info = getTutorInfo(p);
                return (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedPatient(p)}
                    className="hover:bg-stone-50/70 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-bold text-stone-900">
                      <div className="flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>{p.nombre}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-stone-600">{p.dni}</td>
                    <td className="py-3 px-4 text-stone-700 font-semibold">{p.edad} años</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-stone-700 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-md">
                        <MapPin className="w-3 h-3 text-teal-700" />
                        {p.localidad}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-800 font-semibold">
                      {info.tutor ? `${info.tutor.nombre} ${info.tutor.apellido}` : p.tutor}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200">
                        {info.relacion}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-600 font-mono">
                      {info.tutor ? info.tutor.telefono : p.telefono}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPatient && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider bg-teal-50 px-2 py-0.5 rounded-md">
                  Ficha Pediátrica
                </span>
                <h3 className="font-extrabold text-base text-stone-900 mt-1">
                  {selectedPatient.nombre}
                </h3>
              </div>
              <span className="text-xs font-bold text-stone-500 font-mono">
                {selectedPatient.dni}
              </span>
            </div>

            <div className="text-xs space-y-3">
              {/* Persona a cargo section */}
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-1.5">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                  Datos del Paciente
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div><strong>Edad:</strong> {selectedPatient.edad} años</div>
                  <div><strong>Nacimiento:</strong> {selectedPatient.fechaNacimiento || 'No registrada'}</div>
                  <div><strong>Localidad:</strong> {selectedPatient.localidad}</div>
                  <div><strong>Rango Pediátrico:</strong> <span className="text-emerald-700 font-bold">Válido (≤ 15 años)</span></div>
                </div>
              </div>

              {/* Tutor section */}
              <div className="bg-teal-50/50 p-3.5 rounded-xl border border-teal-200/80 space-y-1.5">
                <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                  Tutor / Adulto Responsable
                </span>
                <div className="space-y-1 text-stone-800">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Nombre del Tutor:</span>
                    <span className="font-bold">{selectedPatient.tutor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Vínculo:</span>
                    <span className="font-semibold text-teal-900">{selectedPatient.relacionConTutor || 'Tutor Responsable'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Teléfono registrado:</span>
                    <span className="font-mono">{selectedPatient.telefono}</span>
                  </div>
                </div>
              </div>

              {selectedPatient.antecedentes && (
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <strong className="text-stone-700 block mb-0.5">Antecedentes Clínicos:</strong>
                  <p className="text-stone-600 leading-relaxed">{selectedPatient.antecedentes}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedPatient(null)}
              className="w-full py-2.5 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition-colors shadow-xs"
            >
              Cerrar Ficha
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
