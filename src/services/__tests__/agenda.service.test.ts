import { describe, it, expect } from 'vitest';
import { filterByPreferenciaHoraria, maxBookingDate, AvailableSlot } from '../agenda.service';

const slot = (hora: string): AvailableSlot => ({
  slotId: `slot-${hora}`,
  fecha: '2030-01-01',
  hora,
  profesional: 'Dr. Test',
  consultorio: 'A confirmar',
  tipoAgenda: 'PROFESIONAL',
});

describe('filterByPreferenciaHoraria', () => {
  const slots = [slot('08:30'), slot('10:00'), slot('12:59'), slot('13:00'), slot('16:00')];

  it('mañana devuelve solo horarios antes de las 13:00', () => {
    const result = filterByPreferenciaHoraria(slots, 'manana');
    expect(result.map((s) => s.hora)).toEqual(['08:30', '10:00', '12:59']);
  });

  it('tarde devuelve solo horarios desde las 13:00', () => {
    const result = filterByPreferenciaHoraria(slots, 'tarde');
    expect(result.map((s) => s.hora)).toEqual(['13:00', '16:00']);
  });

  it('cualquiera no filtra nada', () => {
    expect(filterByPreferenciaHoraria(slots, 'cualquiera')).toHaveLength(5);
  });
});

describe('maxBookingDate', () => {
  it('devuelve una fecha exactamente 30 días en el futuro', () => {
    const today = new Date();
    const expected = new Date(today);
    expected.setDate(expected.getDate() + 30);
    expect(maxBookingDate()).toBe(expected.toISOString().slice(0, 10));
  });
});
