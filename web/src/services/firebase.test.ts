import { describe, expect, it } from 'vitest';
import { isValidProjectId } from './firebase';

describe('isValidProjectId', () => {
  it('rejeita undefined', () => {
    expect(isValidProjectId(undefined)).toBe(false);
  });

  it('rejeita string vazia', () => {
    expect(isValidProjectId('')).toBe(false);
  });

  it('rejeita o placeholder do template', () => {
    expect(isValidProjectId('COLE_AQUI')).toBe(false);
  });

  it('aceita um projectId real', () => {
    expect(isValidProjectId('meu-projeto-firebase')).toBe(true);
  });
});
