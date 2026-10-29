import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./relatorios.repository.js', () => ({
  listarOrdensEncerradasNoPeriodo: vi.fn(),
}));

const relatoriosRepository = await import('./relatorios.repository.js');
const relatoriosService = await import('./relatorios.service.js');

const INICIO = new Date('2026-01-01');
const FIM = new Date('2026-02-01');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('faturamento', () => {
  it('retorna zerado quando não há OS encerradas no período', async () => {
    relatoriosRepository.listarOrdensEncerradasNoPeriodo.mockResolvedValue([]);

    const resultado = await relatoriosService.faturamento(INICIO, FIM);

    expect(resultado).toMatchObject({ quantidadeOS: 0, faturamentoTotal: 0, ticketMedio: 0 });
  });

  it('soma só os itens aprovados de cada OS e calcula o ticket médio', async () => {
    relatoriosRepository.listarOrdensEncerradasNoPeriodo.mockResolvedValue([
      {
        numero: 1,
        encerradaEm: new Date('2026-01-10'),
        itensOrcamento: [
          { tipo: 'PECA', quantidade: 2, valorUnitario: 35 }, // 70
          { tipo: 'MAO_DE_OBRA', quantidade: 1, valorUnitario: 100 }, // 100
        ],
      },
      {
        numero: 2,
        encerradaEm: new Date('2026-01-20'),
        itensOrcamento: [{ tipo: 'MAO_DE_OBRA', quantidade: 1, valorUnitario: 60 }], // 60
      },
    ]);

    const resultado = await relatoriosService.faturamento(INICIO, FIM);

    expect(resultado.quantidadeOS).toBe(2);
    expect(resultado.faturamentoTotal).toBe(230); // 170 + 60
    expect(resultado.ticketMedio).toBe(115); // 230 / 2
    expect(resultado.ordens).toEqual([
      { numero: 1, encerradaEm: new Date('2026-01-10'), valor: 170 },
      { numero: 2, encerradaEm: new Date('2026-01-20'), valor: 60 },
    ]);
  });

  it('repositório já filtra pelo período — o service só agrega o que recebe', async () => {
    relatoriosRepository.listarOrdensEncerradasNoPeriodo.mockResolvedValue([]);

    await relatoriosService.faturamento(INICIO, FIM);

    expect(relatoriosRepository.listarOrdensEncerradasNoPeriodo).toHaveBeenCalledWith(INICIO, FIM);
  });
});

describe('desempenhoPorMecanico', () => {
  it('agrupa por mecânico, somando OS e mão de obra', async () => {
    relatoriosRepository.listarOrdensEncerradasNoPeriodo.mockResolvedValue([
      {
        numero: 1,
        mecanicoId: 'mec-1',
        mecanico: { id: 'mec-1', nome: 'Marcos Mecânico' },
        itensOrcamento: [
          { tipo: 'PECA', quantidade: 1, valorUnitario: 50 }, // não entra na mão de obra
          { tipo: 'MAO_DE_OBRA', quantidade: 1, valorUnitario: 100 },
        ],
      },
      {
        numero: 2,
        mecanicoId: 'mec-1',
        mecanico: { id: 'mec-1', nome: 'Marcos Mecânico' },
        itensOrcamento: [{ tipo: 'MAO_DE_OBRA', quantidade: 2, valorUnitario: 40 }], // 80
      },
      {
        numero: 3,
        mecanicoId: 'mec-2',
        mecanico: { id: 'mec-2', nome: 'Outro Mecânico' },
        itensOrcamento: [{ tipo: 'MAO_DE_OBRA', quantidade: 1, valorUnitario: 300 }],
      },
    ]);

    const resultado = await relatoriosService.desempenhoPorMecanico(INICIO, FIM);

    expect(resultado).toEqual([
      { mecanicoId: 'mec-2', mecanicoNome: 'Outro Mecânico', quantidadeOS: 1, totalMaoDeObra: 300 },
      { mecanicoId: 'mec-1', mecanicoNome: 'Marcos Mecânico', quantidadeOS: 2, totalMaoDeObra: 180 },
    ]);
  });

  it('ignora OS sem mecânico responsável identificado', async () => {
    relatoriosRepository.listarOrdensEncerradasNoPeriodo.mockResolvedValue([
      {
        numero: 1,
        mecanicoId: null,
        mecanico: null,
        itensOrcamento: [{ tipo: 'MAO_DE_OBRA', quantidade: 1, valorUnitario: 100 }],
      },
    ]);

    const resultado = await relatoriosService.desempenhoPorMecanico(INICIO, FIM);

    expect(resultado).toEqual([]);
  });

  it('não conta peças como mão de obra', async () => {
    relatoriosRepository.listarOrdensEncerradasNoPeriodo.mockResolvedValue([
      {
        numero: 1,
        mecanicoId: 'mec-1',
        mecanico: { id: 'mec-1', nome: 'Marcos Mecânico' },
        itensOrcamento: [{ tipo: 'PECA', quantidade: 3, valorUnitario: 35 }],
      },
    ]);

    const resultado = await relatoriosService.desempenhoPorMecanico(INICIO, FIM);

    expect(resultado[0].totalMaoDeObra).toBe(0);
  });
});
