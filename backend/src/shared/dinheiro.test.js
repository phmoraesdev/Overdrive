import { describe, expect, it } from 'vitest';
import {
  calcularTotalItem,
  calcularTotalOrcamento,
  dividirEmParcelas,
} from './dinheiro.js';

describe('calcularTotalItem', () => {
  it('multiplica quantidade por valor unitário', () => {
    expect(calcularTotalItem(2, 35)).toBe(70);
  });

  it('arredonda ao centavo em multiplicações que dariam dízima', () => {
    // 3 x 0.1 em ponto flutuante puro daria 0.30000000000000004
    expect(calcularTotalItem(3, 0.1)).toBe(0.3);
  });

  it('aceita quantidade fracionária (ex.: horas de mão de obra)', () => {
    expect(calcularTotalItem(1.5, 100)).toBe(150);
  });
});

describe('calcularTotalOrcamento', () => {
  it('soma os totais de peças e mão de obra', () => {
    const itens = [
      { tipo: 'PECA', quantidade: 2, valorUnitario: 35 }, // 70
      { tipo: 'MAO_DE_OBRA', quantidade: 1, valorUnitario: 120 }, // 120
    ];
    expect(calcularTotalOrcamento(itens)).toBe(190);
  });

  it('não acumula erro de ponto flutuante em valores quebrados', () => {
    const itens = [
      { quantidade: 1, valorUnitario: 0.1 },
      { quantidade: 1, valorUnitario: 0.2 },
    ];
    expect(calcularTotalOrcamento(itens)).toBe(0.3);
  });

  it('retorna 0 para orçamento sem itens', () => {
    expect(calcularTotalOrcamento([])).toBe(0);
  });
});

describe('dividirEmParcelas', () => {
  it('divide igualmente quando o total é múltiplo do número de parcelas', () => {
    expect(dividirEmParcelas(300, 3)).toEqual([100, 100, 100]);
  });

  it('joga a sobra de centavos na última parcela, sem perder nem sobrar', () => {
    const parcelas = dividirEmParcelas(100, 3);
    expect(parcelas).toEqual([33.33, 33.33, 33.34]);
    const somaCentavos = parcelas.reduce((soma, valor) => soma + Math.round(valor * 100), 0);
    expect(somaCentavos).toBe(10000);
  });

  it('funciona com uma única parcela (pagamento à vista)', () => {
    expect(dividirEmParcelas(150.5, 1)).toEqual([150.5]);
  });
});
