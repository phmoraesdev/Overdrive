import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./ordens.repository.js', () => ({
  buscarPorId: vi.fn(),
  encerrarComPagamentoEBaixa: vi.fn(),
}));

vi.mock('../veiculos/veiculos.service.js', () => ({
  buscarPorPlaca: vi.fn(),
  buscarPorId: vi.fn(),
}));

vi.mock('../estoque/pecas.service.js', () => ({
  buscarPorId: vi.fn(),
}));

vi.mock('./ordens.recibo.js', () => ({
  gerarReciboBuffer: vi.fn(),
}));

vi.mock('../notificacoes/notificacoes.service.js', () => ({
  notificarClientePronto: vi.fn().mockResolvedValue({ enviadas: [], alertaRecepcao: false }),
}));

const ordensRepository = await import('./ordens.repository.js');
const pecasService = await import('../estoque/pecas.service.js');
const ordensRecibo = await import('./ordens.recibo.js');
const ordensService = await import('./ordens.service.js');

const OS_PRONTA = {
  id: 'os-1',
  numero: 55,
  status: 'PRONTO_PARA_RETIRADA',
  itensOrcamento: [
    { id: 'item-1', tipo: 'PECA', pecaId: 'peca-1', quantidade: 2, valorUnitario: 35, aprovado: true },
    { id: 'item-2', tipo: 'MAO_DE_OBRA', quantidade: 1, valorUnitario: 100, aprovado: true },
    // item não aprovado (sobrou do orçamento parcial) — nunca deve virar baixa de estoque.
    { id: 'item-3', tipo: 'PECA', pecaId: 'peca-2', quantidade: 1, valorUnitario: 50, aprovado: false },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  ordensRepository.buscarPorId.mockResolvedValue(OS_PRONTA);
  pecasService.buscarPorId.mockImplementation((id) =>
    Promise.resolve({ id, descricao: `Peça ${id}`, quantidade: 100 }),
  );
});

describe('encerrar — bloqueios (PB16)', () => {
  it('bloqueia fora do status PRONTO_PARA_RETIRADA', async () => {
    ordensRepository.buscarPorId.mockResolvedValue({ ...OS_PRONTA, status: 'EM_EXECUCAO' });

    await expect(
      ordensService.encerrar('os-1', { formaPagamento: 'PIX' }, 'func-1'),
    ).rejects.toMatchObject({ status: 400 });

    expect(ordensRepository.encerrarComPagamentoEBaixa).not.toHaveBeenCalled();
  });

  it('bloqueia quando não há itens aprovados para cobrar', async () => {
    ordensRepository.buscarPorId.mockResolvedValue({ ...OS_PRONTA, itensOrcamento: [] });

    await expect(
      ordensService.encerrar('os-1', { formaPagamento: 'PIX' }, 'func-1'),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe('encerrar — pagamento e parcelas (PB16)', () => {
  it('encerra à vista com numeroParcelas = 1 por padrão', async () => {
    ordensRepository.encerrarComPagamentoEBaixa.mockResolvedValue({
      ordemServico: { ...OS_PRONTA, status: 'ENCERRADA' },
      conta: { status: 'PAGA' },
    });

    const resultado = await ordensService.encerrar('os-1', { formaPagamento: 'DINHEIRO' }, 'func-1');

    expect(resultado.ordemServico.status).toBe('ENCERRADA');
    expect(ordensRepository.encerrarComPagamentoEBaixa).toHaveBeenCalledWith(
      expect.objectContaining({ numeroParcelas: 1, formaPagamento: 'DINHEIRO' }),
    );
  });

  it('calcula o valor total só com os itens aprovados (2x35 + 1x100 = 170)', async () => {
    ordensRepository.encerrarComPagamentoEBaixa.mockResolvedValue({
      ordemServico: OS_PRONTA,
      conta: {},
    });

    await ordensService.encerrar('os-1', { formaPagamento: 'PIX' }, 'func-1');

    expect(ordensRepository.encerrarComPagamentoEBaixa).toHaveBeenCalledWith(
      expect.objectContaining({ valorTotal: 170 }),
    );
  });

  it('repassa o número de parcelas quando parcelado', async () => {
    ordensRepository.encerrarComPagamentoEBaixa.mockResolvedValue({
      ordemServico: OS_PRONTA,
      conta: {},
    });

    await ordensService.encerrar(
      'os-1',
      { formaPagamento: 'CARTAO', parcelado: true, numeroParcelas: 3 },
      'func-1',
    );

    expect(ordensRepository.encerrarComPagamentoEBaixa).toHaveBeenCalledWith(
      expect.objectContaining({ numeroParcelas: 3 }),
    );
  });
});

describe('encerrar — baixa de estoque (PB17)', () => {
  it('manda para baixa só as peças dos itens aprovados, nunca as reprovadas', async () => {
    ordensRepository.encerrarComPagamentoEBaixa.mockResolvedValue({
      ordemServico: OS_PRONTA,
      conta: {},
    });

    await ordensService.encerrar('os-1', { formaPagamento: 'PIX' }, 'func-1');

    const chamada = ordensRepository.encerrarComPagamentoEBaixa.mock.calls[0][0];
    expect(chamada.itensParaBaixa).toEqual([{ pecaId: 'peca-1', quantidade: 2 }]);
    expect(chamada.itensParaBaixa.some((item) => item.pecaId === 'peca-2')).toBe(false);
  });

  it('bloqueia o encerramento quando o saldo de alguma peça aprovada é insuficiente', async () => {
    pecasService.buscarPorId.mockResolvedValue({ id: 'peca-1', descricao: 'Filtro', quantidade: 1 });

    await expect(
      ordensService.encerrar('os-1', { formaPagamento: 'PIX' }, 'func-1'),
    ).rejects.toMatchObject({ status: 409 });

    // nada deve ser gravado se o saldo não fecha — nem a conta, nem a baixa, nem o status.
    expect(ordensRepository.encerrarComPagamentoEBaixa).not.toHaveBeenCalled();
  });

  it('não valida saldo de peças de itens não aprovados (nunca seriam baixadas mesmo)', async () => {
    ordensRepository.encerrarComPagamentoEBaixa.mockResolvedValue({
      ordemServico: OS_PRONTA,
      conta: {},
    });

    await ordensService.encerrar('os-1', { formaPagamento: 'PIX' }, 'func-1');

    expect(pecasService.buscarPorId).not.toHaveBeenCalledWith('peca-2');
  });
});

describe('gerarRecibo', () => {
  it('bloqueia gerar recibo antes da OS estar ENCERRADA', async () => {
    ordensRepository.buscarPorId.mockResolvedValue({ ...OS_PRONTA, status: 'PRONTO_PARA_RETIRADA' });

    await expect(ordensService.gerarRecibo('os-1')).rejects.toMatchObject({ status: 400 });
    expect(ordensRecibo.gerarReciboBuffer).not.toHaveBeenCalled();
  });

  it('gera o recibo quando a OS está ENCERRADA', async () => {
    const osEncerrada = { ...OS_PRONTA, status: 'ENCERRADA' };
    ordensRepository.buscarPorId.mockResolvedValue(osEncerrada);
    ordensRecibo.gerarReciboBuffer.mockResolvedValue(Buffer.from('%PDF-fake'));

    const buffer = await ordensService.gerarRecibo('os-1');

    expect(ordensRecibo.gerarReciboBuffer).toHaveBeenCalledWith(osEncerrada);
    expect(buffer.toString()).toContain('%PDF');
  });
});
