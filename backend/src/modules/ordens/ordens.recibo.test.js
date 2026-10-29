import { describe, expect, it } from 'vitest';
import { gerarReciboBuffer } from './ordens.recibo.js';

const OS_BASE = {
  numero: 42,
  encerradaEm: new Date('2026-02-01'),
  cliente: { nome: 'João da Silva', telefone: '11999998888' },
  veiculo: { placa: 'ABC1234', marca: 'Volkswagen', modelo: 'Gol' },
  itensOrcamento: [
    { descricao: 'Filtro de óleo', quantidade: 2, valorUnitario: 35, aprovado: true },
    { descricao: 'Mão de obra', quantidade: 1, valorUnitario: 100, aprovado: true },
    { descricao: 'Pastilha de freio', quantidade: 1, valorUnitario: 120, aprovado: false },
  ],
};

describe('gerarReciboBuffer', () => {
  it('gera um PDF válido para pagamento à vista', async () => {
    const ordemServico = {
      ...OS_BASE,
      contas: [{ formaPagamento: 'PIX', parcelas: [] }],
    };

    const buffer = await gerarReciboBuffer(ordemServico);

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(buffer.length).toBeGreaterThan(100);
  });

  it('gera um PDF válido para pagamento parcelado', async () => {
    const ordemServico = {
      ...OS_BASE,
      contas: [
        {
          formaPagamento: 'CARTAO',
          parcelas: [
            { numero: 1, valor: 85, vencimento: new Date('2026-03-01') },
            { numero: 2, valor: 85, vencimento: new Date('2026-04-01') },
          ],
        },
      ],
    };

    const buffer = await gerarReciboBuffer(ordemServico);

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('não quebra quando a OS não tem conta vinculada ainda', async () => {
    const buffer = await gerarReciboBuffer({ ...OS_BASE, contas: [] });

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});
