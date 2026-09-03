import { describe, it, expect } from 'vitest';
import { calculateAgeFromBirthdate, relacionToDb, relacionToUi, toLocalidad } from '../mappers';

describe('calculateAgeFromBirthdate', () => {
  it('calcula años y meses correctamente para un niño de 8 años', () => {
    const eightYearsAgo = new Date();
    eightYearsAgo.setFullYear(eightYearsAgo.getFullYear() - 8);
    const iso = eightYearsAgo.toISOString().slice(0, 10);

    const { years, months } = calculateAgeFromBirthdate(iso);
    expect(years).toBe(8);
    expect(months).toBe(0);
  });

  it('devuelve 0 para fecha vacía', () => {
    expect(calculateAgeFromBirthdate('')).toEqual({ years: 0, months: 0, totalMonths: 0 });
  });
});

describe('relacionToDb / relacionToUi', () => {
  it('hace round-trip para Madre', () => {
    expect(relacionToUi(relacionToDb('Madre'))).toBe('Madre');
  });

  it('mapea Abuelo/a a ABUELO en la base', () => {
    expect(relacionToDb('Abuelo/a')).toBe('ABUELO');
  });

  it('usa OTRO como fallback para relaciones desconocidas', () => {
    expect(relacionToDb('Vecino' as any)).toBe('OTRO');
  });
});

describe('toLocalidad', () => {
  it('devuelve la localidad conocida tal cual', () => {
    expect(toLocalidad('Mercedes')).toBe('Mercedes');
  });

  it('cae a Otra si no está en el listado', () => {
    expect(toLocalidad('Ciudad Inventada')).toBe('Otra');
    expect(toLocalidad(null)).toBe('Otra');
  });
});
