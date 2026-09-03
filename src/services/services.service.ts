import { supabase } from '../lib/supabase';
import { Specialty, TipoPrestacion } from '../types';
import { ServicioRow } from '../types/database';

function inferTipoPrestacion(nombre: string): TipoPrestacion {
  const n = nombre.toLowerCase();
  if (n.includes('laborator')) return 'laboratorio';
  if (n.includes('imagen') || n.includes('diagnóstico') || n.includes('diagnostico')) return 'estudios_imagenes';
  if (n.includes('odont')) return 'odontologia';
  return 'consulta_medica';
}

export function mapServicio(row: ServicioRow): Specialty {
  return {
    id: row.id,
    nombre: row.nombre,
    tipoPrestacion: inferTipoPrestacion(row.nombre),
    tipoAgenda: row.tipo_agenda,
    descripcion: row.descripcion || '',
    consultoriosHabilitados: [],
    duracionMinutos: 30,
    demandaEstimada: '—',
  };
}

export async function getServiciosActivos(): Promise<Specialty[]> {
  const { data, error } = await supabase.from('servicios').select('*').eq('activo', true).order('nombre');
  if (error) throw error;
  return (data || []).map(mapServicio);
}

export async function addServicio(data: { nombre: string; descripcion?: string; tipoAgenda: 'SERVICIO' | 'PROFESIONAL' }): Promise<Specialty> {
  const { data: row, error } = await supabase
    .from('servicios')
    .insert({ nombre: data.nombre, descripcion: data.descripcion, tipo_agenda: data.tipoAgenda })
    .select('*')
    .single();
  if (error) throw error;
  return mapServicio(row);
}

export async function updateServicio(id: string, data: Partial<{ nombre: string; descripcion: string; activo: boolean }>): Promise<Specialty> {
  const { data: row, error } = await supabase.from('servicios').update(data).eq('id', id).select('*').single();
  if (error) throw error;
  return mapServicio(row);
}
