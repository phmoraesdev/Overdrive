import { describe, expect, it } from 'vitest';
import { formatarPlaca, limparPlaca, placaValida } from './placa.js';

describe('placaValida', () => {
  it('aceita o padrão antigo (ABC1234), com ou sem traço', () => {
    expect(placaValida('ABC1234')).toBe(true);
    expect(placaValida('ABC-1234')).toBe(true);
  });

  it('aceita o padrão Mercosul (ABC1D23)', () => {
    expect(placaValida('ABC1D23')).toBe(true);
  });

  it('aceita letras minúsculas', () => {
    expect(placaValida('abc1234')).toBe(true);
  });

  it('rejeita placas com formato inválido', () => {
    expect(placaValida('ABC123')).toBe(false);
    expect(placaValida('AB1234')).toBe(false);
    expect(placaValida('')).toBe(false);
  });
});

describe('limparPlaca / formatarPlaca', () => {
  it('remove separadores e deixa maiúsculo', () => {
    expect(limparPlaca('abc-1234')).toBe('ABC1234');
  });

  it('formata o padrão antigo com traço', () => {
    expect(formatarPlaca('abc1234')).toBe('ABC-1234');
  });

  it('mantém o padrão Mercosul sem separador', () => {
    expect(formatarPlaca('abc1d23')).toBe('ABC1D23');
  });
});
