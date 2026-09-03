import { describe, it, expect } from 'vitest';
import { validatePediatricAge } from '../patients.service';

// Regla del hospital: mayor de 1 mes y hasta 15 años inclusive.
describe('validatePediatricAge', () => {
  it('rechaza recién nacidos de hasta 1 mes', () => {
    expect(validatePediatricAge(0, 1).valid).toBe(false);
    expect(validatePediatricAge(0, 0).valid).toBe(false);
  });

  it('acepta un bebé de 2 meses', () => {
    expect(validatePediatricAge(0, 2).valid).toBe(true);
  });

  it('acepta hasta 15 años inclusive', () => {
    expect(validatePediatricAge(15).valid).toBe(true);
  });

  it('rechaza a partir de 16 años', () => {
    expect(validatePediatricAge(16).valid).toBe(false);
    expect(validatePediatricAge(18).valid).toBe(false);
  });

  it('acepta edades intermedias típicas', () => {
    expect(validatePediatricAge(8).valid).toBe(true);
    expect(validatePediatricAge(1).valid).toBe(true);
  });
});
