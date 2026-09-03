import { supabase } from '../lib/supabase';
import { Tutor } from '../types';
import { TutorRow } from '../types/database';

function mapTutor(row: TutorRow): Tutor {
  return {
    id: row.id,
    nombre: row.nombre,
    apellido: row.apellido,
    dni: row.dni,
    telefono: row.telefono,
    email: row.email || '',
    localidad: row.localidad as Tutor['localidad'],
    domicilio: row.domicilio || undefined,
  };
}

export async function getTutores(): Promise<Tutor[]> {
  const { data, error } = await supabase.from('tutores').select('*').order('nombre');
  if (error) throw error;
  return (data || []).map(mapTutor);
}

export async function getTutorById(id: string): Promise<Tutor | null> {
  const { data, error } = await supabase.from('tutores').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapTutor(data) : null;
}

export async function findTutorByDni(dni: string): Promise<Tutor | null> {
  const { data, error } = await supabase
    .from('tutores')
    .select('*')
    .eq('dni', dni.replace(/\D/g, ''))
    .maybeSingle();
  if (error) throw error;
  return data ? mapTutor(data) : null;
}

export async function createTutor(data: {
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  email?: string;
  localidad: string;
  domicilio?: string;
}): Promise<Tutor> {
  const { data: row, error } = await supabase
    .from('tutores')
    .insert({
      nombre: data.nombre,
      apellido: data.apellido,
      dni: data.dni.replace(/\D/g, ''),
      telefono: data.telefono,
      email: data.email,
      localidad: data.localidad,
      domicilio: data.domicilio,
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapTutor(row);
}
