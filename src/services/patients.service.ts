import { supabase } from '../lib/supabase';
import { Patient, TipoRelacionTutor, Tutor } from '../types';
import { PacienteRow, TutorPacienteRow, TutorRow } from '../types/database';
import { calculateAgeFromBirthdate, relacionToDb, relacionToUi, toLocalidad } from './mappers';

export interface PersonaACargo extends Patient {
  paciente: Patient;
  relacion: TipoRelacionTutor;
  tipoRelacion: TipoRelacionTutor;
  esPrincipal: boolean;
  responsablePrincipal: boolean;
  autorizado: boolean;
  autorizadoAGestionarTurnos: boolean;
}

export function mapPaciente(row: PacienteRow, tutorNombre?: string, tutorId?: string, relacion?: TipoRelacionTutor): Patient {
  const age = calculateAgeFromBirthdate(row.fecha_nacimiento);
  return {
    id: row.id,
    dni: row.dni,
    nombre: `${row.nombre}${row.apellido ? ' ' + row.apellido : ''}`.trim(),
    apellido: row.apellido || undefined,
    fechaNacimiento: row.fecha_nacimiento,
    edad: age.years,
    edadMeses: age.months,
    localidad: toLocalidad(row.localidad),
    telefono: '',
    tutor: tutorNombre || '',
    tutorId,
    relacionConTutor: relacion,
  };
}

/** Validación de edad pediátrica: mayor de 1 mes y hasta 15 años inclusive. */
export function validatePediatricAge(edadAnios: number, edadMeses?: number): { valid: boolean; error?: string } {
  const totalMonths = edadAnios * 12 + (edadMeses || 0);
  if (totalMonths <= 1) {
    return {
      valid: false,
      error:
        'El paciente no se encuentra dentro del rango etario de atención de este hospital. La atención pediátrica ambulatoria programada es para mayores de 1 mes de vida.',
    };
  }
  if (edadAnios >= 16) {
    return {
      valid: false,
      error: 'El paciente no se encuentra dentro del rango etario de atención de este hospital. La atención comprende hasta los 15 años inclusive.',
    };
  }
  return { valid: true };
}

export async function getPersonasACargo(tutorId: string): Promise<PersonaACargo[]> {
  const { data, error } = await supabase
    .from('tutor_paciente')
    .select('*, pacientes(*)')
    .eq('tutor_id', tutorId);
  if (error) throw error;

  return (data || [])
    .filter((row: any) => row.pacientes)
    .map((row: any) => {
      const rel = row as TutorPacienteRow;
      const pacienteRow = row.pacientes as PacienteRow;
      const relacion = relacionToUi(rel.tipo_relacion);
      const paciente = mapPaciente(pacienteRow, undefined, tutorId, relacion);
      return {
        ...paciente,
        paciente,
        relacion,
        tipoRelacion: relacion,
        esPrincipal: rel.responsable_principal,
        responsablePrincipal: rel.responsable_principal,
        autorizado: rel.autorizado_gestionar_turnos,
        autorizadoAGestionarTurnos: rel.autorizado_gestionar_turnos,
      };
    });
}

export async function getTutoresDePaciente(
  pacienteId: string
): Promise<Array<Tutor & { relacion: TipoRelacionTutor; responsablePrincipal: boolean; autorizado: boolean }>> {
  const { data, error } = await supabase
    .from('tutor_paciente')
    .select('*, tutores(*)')
    .eq('paciente_id', pacienteId);
  if (error) throw error;

  return (data || [])
    .filter((row: any) => row.tutores)
    .map((row: any) => {
      const rel = row as TutorPacienteRow;
      const t = row.tutores as TutorRow;
      return {
        id: t.id,
        nombre: t.nombre,
        apellido: t.apellido,
        dni: t.dni,
        telefono: t.telefono,
        email: t.email || '',
        localidad: t.localidad as Tutor['localidad'],
        domicilio: t.domicilio || undefined,
        relacion: relacionToUi(rel.tipo_relacion),
        responsablePrincipal: rel.responsable_principal,
        autorizado: rel.autorizado_gestionar_turnos,
      };
    });
}

export async function addPersonaACargo(data: {
  nombre: string;
  apellido?: string;
  dni: string;
  fechaNacimiento: string;
  localidad: string;
  relacion: TipoRelacionTutor;
  tutorId: string;
}): Promise<{ success: boolean; patient?: Patient; error?: string }> {
  const age = calculateAgeFromBirthdate(data.fechaNacimiento);
  const ageCheck = validatePediatricAge(age.years, age.months);
  if (!ageCheck.valid) {
    return { success: false, error: ageCheck.error };
  }

  const { data: pacienteRow, error: pacienteError } = await supabase
    .from('pacientes')
    .insert({
      nombre: data.nombre,
      apellido: data.apellido || '',
      dni: data.dni.replace(/\D/g, ''),
      fecha_nacimiento: data.fechaNacimiento,
      localidad: data.localidad,
    })
    .select('*')
    .single();

  if (pacienteError) {
    if (pacienteError.code === '23514') {
      return {
        success: false,
        error: 'El paciente no se encuentra dentro del rango etario de atención de este hospital (mayor de 1 mes y hasta 15 años inclusive).',
      };
    }
    if (pacienteError.code === '23505') {
      return { success: false, error: 'Ya existe un paciente registrado con ese DNI.' };
    }
    throw pacienteError;
  }

  const { error: relError } = await supabase.from('tutor_paciente').insert({
    tutor_id: data.tutorId,
    paciente_id: pacienteRow.id,
    tipo_relacion: relacionToDb(data.relacion),
    responsable_principal: true,
    autorizado_gestionar_turnos: true,
  });
  if (relError) throw relError;

  return { success: true, patient: mapPaciente(pacienteRow, undefined, data.tutorId, data.relacion) };
}

/** Alta rápida de paciente sin vínculo de tutor inmediato (uso de
 * Asistente Social / Administrativo cuando todavía no hay un tutor
 * registrado en el sistema). La edad se convierte a una fecha de
 * nacimiento aproximada para poder aplicar la misma validación etaria. */
export async function registerPacienteStandalone(data: {
  nombre: string;
  dni: string;
  edad: number;
  localidad: string;
}): Promise<{ success: boolean; patient?: Patient; error?: string }> {
  const ageCheck = validatePediatricAge(data.edad);
  if (!ageCheck.valid) {
    return { success: false, error: ageCheck.error };
  }

  const today = new Date();
  const estimatedBirth = new Date(today.getFullYear() - Math.floor(data.edad), today.getMonth(), today.getDate());
  const fechaNacimiento = estimatedBirth.toISOString().slice(0, 10);

  const { data: row, error } = await supabase
    .from('pacientes')
    .insert({
      nombre: data.nombre,
      apellido: '',
      dni: data.dni.replace(/\D/g, ''),
      fecha_nacimiento: fechaNacimiento,
      localidad: data.localidad,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23514') {
      return {
        success: false,
        error: 'El paciente no se encuentra dentro del rango etario de atención de este hospital (mayor de 1 mes y hasta 15 años inclusive).',
      };
    }
    if (error.code === '23505') {
      return { success: false, error: 'Ya existe un paciente registrado con ese DNI.' };
    }
    throw error;
  }

  return { success: true, patient: mapPaciente(row) };
}

export interface PatientSearchResult extends Patient {
  tutorResponsable?: string;
  tutorTelefono?: string;
}

/** Búsqueda administrativa por DNI, nombre o apellido (consulta al backend, no descarga todo). */
export async function searchPacientes(query: string): Promise<PatientSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const { data, error } = await supabase
    .from('pacientes')
    .select('*, tutor_paciente(tipo_relacion, responsable_principal, tutores(nombre, apellido, telefono))')
    .or(`dni.ilike.%${q}%,nombre.ilike.%${q}%,apellido.ilike.%${q}%`)
    .limit(25);
  if (error) throw error;

  return (data || []).map((row: any) => {
    const pacienteRow = row as PacienteRow;
    const principal = (row.tutor_paciente || []).find((r: any) => r.responsable_principal) || row.tutor_paciente?.[0];
    const tutorNombre = principal?.tutores ? `${principal.tutores.nombre} ${principal.tutores.apellido}` : undefined;
    const base = mapPaciente(pacienteRow, tutorNombre);
    return {
      ...base,
      tutorResponsable: tutorNombre,
      tutorTelefono: principal?.tutores?.telefono,
    };
  });
}
