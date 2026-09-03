// Helpers para convertir entre las filas de Supabase (inglés/DB, enums en
// mayúsculas) y los tipos que ya consume el frontend (src/types.ts), para no
// tener que reescribir toda la UI existente.

import { Localidad, TipoRelacionTutor } from '../types';
import { TipoRelacionTutorDb } from '../types/database';

export const DB_TO_UI_RELACION: Record<TipoRelacionTutorDb, TipoRelacionTutor> = {
  MADRE: 'Madre',
  PADRE: 'Padre',
  TUTOR_LEGAL: 'Tutor legal',
  ABUELO: 'Abuelo/a',
  ABUELA: 'Abuelo/a',
  TIO: 'Tío/a',
  TIA: 'Tío/a',
  HERMANO: 'Hermano/a mayor responsable',
  HERMANA: 'Hermano/a mayor responsable',
  OTRO: 'Otro responsable autorizado',
};

const UI_TO_DB_RELACION: Record<TipoRelacionTutor, TipoRelacionTutorDb> = {
  Madre: 'MADRE',
  Padre: 'PADRE',
  'Tutor legal': 'TUTOR_LEGAL',
  'Abuelo/a': 'ABUELO',
  'Tío/a': 'TIO',
  'Hermano/a mayor responsable': 'HERMANO',
  'Otro responsable autorizado': 'OTRO',
};

export function relacionToDb(relacion: TipoRelacionTutor | string): TipoRelacionTutorDb {
  return UI_TO_DB_RELACION[relacion as TipoRelacionTutor] || 'OTRO';
}

export function relacionToUi(relacion: TipoRelacionTutorDb): TipoRelacionTutor {
  return DB_TO_UI_RELACION[relacion] || 'Otro responsable autorizado';
}

export function toLocalidad(value: string | null | undefined): Localidad {
  const known: Localidad[] = [
    'Corrientes Capital',
    'Goya',
    'Mercedes',
    'Paso de los Libres',
    'Curuzú Cuatiá',
    'Bella Vista',
    'Ituzaingó',
    'Santo Tomé',
    'San Luis del Palmar',
    'Esquina',
    'Monte Caseros',
    'Saladas',
  ];
  if (value && (known as string[]).includes(value)) return value as Localidad;
  return 'Otra';
}

/** Calcula edad en años y meses a partir de una fecha de nacimiento (YYYY-MM-DD). */
export function calculateAgeFromBirthdate(fechaNacimientoStr: string): {
  years: number;
  months: number;
  totalMonths: number;
} {
  if (!fechaNacimientoStr) return { years: 0, months: 0, totalMonths: 0 };
  const birth = new Date(fechaNacimientoStr);
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) months--;
  if (months < 0) {
    years--;
    months += 12;
  }
  const totalMonths = Math.max(0, years * 12 + months);
  return { years: Math.max(0, years), months: Math.max(0, months), totalMonths };
}
