import { describe, expect, it } from 'vitest';
import { cpfValido, placaValida, erroCpf, erroPlaca, erroDataPassada } from './validadores';

describe('cpfValido', () => {
  it('aceita um CPF válido', () => {
    expect(cpfValido('111.444.777-35')).toBe(true);
    expect(cpfValido('11144477735')).toBe(true);
  });

  it('rejeita CPF com dígito verificador errado', () => {
    expect(cpfValido('111.444.777-36')).toBe(false);
  });

  it('rejeita CPF com todos os dígitos iguais', () => {
    expect(cpfValido('111.111.111-11')).toBe(false);
  });

  it('rejeita CPF com tamanho errado', () => {
    expect(cpfValido('123')).toBe(false);
  });
});

describe('placaValida', () => {
  it('aceita placa no padrão antigo', () => {
    expect(placaValida('ABC1234')).toBe(true);
    expect(placaValida('abc-1234')).toBe(true);
  });

  it('aceita placa no padrão Mercosul', () => {
    expect(placaValida('ABC1D23')).toBe(true);
  });

  it('rejeita placa em formato inválido', () => {
    expect(placaValida('AB1234')).toBe(false);
    expect(placaValida('ABCD123')).toBe(false);
    expect(placaValida('')).toBe(false);
  });
});

describe('erroCpf', () => {
  it('não acusa erro em campo vazio', () => {
    expect(erroCpf('')).toBe('');
    expect(erroCpf(undefined)).toBe('');
  });

  it('retorna mensagem em português para CPF inválido', () => {
    expect(erroCpf('123')).toBe('CPF inválido.');
  });

  it('não acusa erro para CPF válido', () => {
    expect(erroCpf('111.444.777-35')).toBe('');
  });
});

describe('erroPlaca', () => {
  it('não acusa erro em campo vazio', () => {
    expect(erroPlaca('')).toBe('');
  });

  it('retorna mensagem em português para placa inválida', () => {
    expect(erroPlaca('XYZ')).toContain('inválida');
  });

  it('não acusa erro para placa válida (antiga ou Mercosul)', () => {
    expect(erroPlaca('ABC1234')).toBe('');
    expect(erroPlaca('ABC1D23')).toBe('');
  });
});

describe('erroDataPassada', () => {
  it('não acusa erro em campo vazio', () => {
    expect(erroDataPassada('')).toBe('');
  });

  it('não acusa erro para hoje', () => {
    const hoje = new Date();
    const iso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(
      hoje.getDate(),
    ).padStart(2, '0')}`;
    expect(erroDataPassada(iso)).toBe('');
  });

  it('não acusa erro para data futura', () => {
    const futuro = new Date();
    futuro.setFullYear(futuro.getFullYear() + 1);
    const iso = `${futuro.getFullYear()}-${String(futuro.getMonth() + 1).padStart(2, '0')}-${String(
      futuro.getDate(),
    ).padStart(2, '0')}`;
    expect(erroDataPassada(iso)).toBe('');
  });

  it('acusa erro para data passada', () => {
    expect(erroDataPassada('2000-01-01')).toBe('A data não pode estar no passado.');
  });
});
