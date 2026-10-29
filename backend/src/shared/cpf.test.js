import { describe, expect, it } from 'vitest';
import { cpfValido, formatarCpf, limparCpf } from './cpf.js';

describe('cpfValido', () => {
  it('aceita CPFs válidos, com ou sem máscara', () => {
    expect(cpfValido('529.982.247-25')).toBe(true);
    expect(cpfValido('52998224725')).toBe(true);
  });

  it('rejeita CPF com dígito verificador errado', () => {
    expect(cpfValido('529.982.247-26')).toBe(false);
  });

  it('rejeita CPF com todos os dígitos iguais', () => {
    expect(cpfValido('111.111.111-11')).toBe(false);
  });

  it('rejeita CPF com quantidade errada de dígitos', () => {
    expect(cpfValido('123456')).toBe(false);
  });

  it('rejeita valores vazios ou indefinidos', () => {
    expect(cpfValido('')).toBe(false);
    expect(cpfValido(undefined)).toBe(false);
  });
});

describe('limparCpf / formatarCpf', () => {
  it('remove caracteres não numéricos', () => {
    expect(limparCpf('529.982.247-25')).toBe('52998224725');
  });

  it('formata um CPF de 11 dígitos', () => {
    expect(formatarCpf('52998224725')).toBe('529.982.247-25');
  });
});
