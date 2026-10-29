import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./financeiro.repository.js', () => ({
  listar: vi.fn(),
  buscarPorId: vi.fn(),
  criar: vi.fn(),
  atualizar: vi.fn(),
  remover: vi.fn(),
  baixar: vi.fn(),
  listarPagasNoPeriodo: vi.fn(),
}));

const financeiroRepository = await import('./financeiro.repository.js');
const financeiroService = await import('./financeiro.service.js');

const CONTA_ABERTA = {
  id: 'conta-1',
  tipo: 'PAGAR',
  fornecedor: 'Distribuidora de Peças XYZ',
  descricao: 'Compra de peças',
  valor: 500,
  valorPago: null,
  vencimento: new Date('2026-01-10'),
  status: 'ABERTA',
  ordemServicoId: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-02-01T12:00:00'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('listar / buscarPorId — campo vencida calculado na hora', () => {
  it('marca como vencida uma conta ABERTA com vencimento no passado', async () => {
    financeiroRepository.listar.mockResolvedValue([CONTA_ABERTA]);

    const [conta] = await financeiroService.listar({});

    expect(conta.vencida).toBe(true);
  });

  it('não marca como vencida uma conta ABERTA com vencimento no futuro', async () => {
    financeiroRepository.buscarPorId.mockResolvedValue({
      ...CONTA_ABERTA,
      vencimento: new Date('2026-03-01'),
    });

    const conta = await financeiroService.buscarPorId('conta-1');

    expect(conta.vencida).toBe(false);
  });

  it('não marca como vencida uma conta já paga, mesmo com vencimento no passado', async () => {
    financeiroRepository.buscarPorId.mockResolvedValue({ ...CONTA_ABERTA, status: 'PAGA' });

    const conta = await financeiroService.buscarPorId('conta-1');

    expect(conta.vencida).toBe(false);
  });

  it('lança erro quando a conta não existe', async () => {
    financeiroRepository.buscarPorId.mockResolvedValue(null);

    await expect(financeiroService.buscarPorId('inexistente')).rejects.toMatchObject({ status: 404 });
  });
});

describe('criar', () => {
  it('cria uma conta a pagar com fornecedor', async () => {
    financeiroRepository.criar.mockResolvedValue({ ...CONTA_ABERTA, id: 'conta-2' });

    const resultado = await financeiroService.criar({
      tipo: 'PAGAR',
      fornecedor: 'Distribuidora XYZ',
      descricao: 'Compra de peças',
      valor: 500,
      vencimento: new Date('2026-03-01'),
    });

    expect(resultado.id).toBe('conta-2');
    expect(financeiroRepository.criar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'PAGAR', fornecedor: 'Distribuidora XYZ' }),
    );
  });

  it('cria uma conta a receber manual sem fornecedor (null, não undefined)', async () => {
    financeiroRepository.criar.mockResolvedValue({ ...CONTA_ABERTA, tipo: 'RECEBER' });

    await financeiroService.criar({
      tipo: 'RECEBER',
      descricao: 'Serviço avulso fora de uma OS',
      valor: 150,
      vencimento: new Date('2026-03-01'),
    });

    expect(financeiroRepository.criar).toHaveBeenCalledWith(
      expect.objectContaining({ fornecedor: null }),
    );
  });
});

describe('atualizar', () => {
  it('bloqueia alterar uma conta já paga', async () => {
    financeiroRepository.buscarPorId.mockResolvedValue({ ...CONTA_ABERTA, status: 'PAGA' });

    await expect(
      financeiroService.atualizar('conta-1', { valor: 600 }),
    ).rejects.toMatchObject({ status: 400 });

    expect(financeiroRepository.atualizar).not.toHaveBeenCalled();
  });

  it('lança erro quando a conta não existe', async () => {
    financeiroRepository.buscarPorId.mockResolvedValue(null);

    await expect(financeiroService.atualizar('inexistente', { valor: 600 })).rejects.toMatchObject({
      status: 404,
    });
  });

  it('atualiza só os campos informados', async () => {
    financeiroRepository.buscarPorId.mockResolvedValue(CONTA_ABERTA);
    financeiroRepository.atualizar.mockResolvedValue({ ...CONTA_ABERTA, valor: 600 });

    const resultado = await financeiroService.atualizar('conta-1', { valor: 600 });

    expect(resultado.valor).toBe(600);
    expect(financeiroRepository.atualizar).toHaveBeenCalledWith('conta-1', { valor: 600 });
  });
});

describe('baixar — registrar o pagamento', () => {
  it('bloqueia baixar uma conta já paga', async () => {
    financeiroRepository.buscarPorId.mockResolvedValue({ ...CONTA_ABERTA, status: 'PAGA' });

    await expect(
      financeiroService.baixar('conta-1', { valorPago: 500 }),
    ).rejects.toMatchObject({ status: 400 });

    expect(financeiroRepository.baixar).not.toHaveBeenCalled();
  });

  it('registra data e valor pago, mudando o status para PAGA', async () => {
    financeiroRepository.buscarPorId.mockResolvedValue(CONTA_ABERTA);
    financeiroRepository.baixar.mockResolvedValue({ ...CONTA_ABERTA, status: 'PAGA', valorPago: 480 });

    const resultado = await financeiroService.baixar('conta-1', {
      valorPago: 480,
      pagaEm: new Date('2026-02-01'),
    });

    expect(resultado.status).toBe('PAGA');
    expect(financeiroRepository.baixar).toHaveBeenCalledWith('conta-1', {
      valorPago: 480,
      pagaEm: new Date('2026-02-01'),
    });
  });

  it('usa a data atual quando pagaEm não é informado', async () => {
    financeiroRepository.buscarPorId.mockResolvedValue(CONTA_ABERTA);
    financeiroRepository.baixar.mockResolvedValue({ ...CONTA_ABERTA, status: 'PAGA' });

    await financeiroService.baixar('conta-1', { valorPago: 500 });

    expect(financeiroRepository.baixar).toHaveBeenCalledWith('conta-1', {
      valorPago: 500,
      pagaEm: new Date('2026-02-01T12:00:00'),
    });
  });
});

describe('remover', () => {
  it('bloqueia excluir uma conta gerada por uma OS', async () => {
    financeiroRepository.buscarPorId.mockResolvedValue({ ...CONTA_ABERTA, ordemServicoId: 'os-1' });

    await expect(financeiroService.remover('conta-1')).rejects.toMatchObject({ status: 400 });
    expect(financeiroRepository.remover).not.toHaveBeenCalled();
  });

  it('remove uma conta manual', async () => {
    financeiroRepository.buscarPorId.mockResolvedValue(CONTA_ABERTA);

    await financeiroService.remover('conta-1');

    expect(financeiroRepository.remover).toHaveBeenCalledWith('conta-1');
  });
});

describe('fluxoCaixa', () => {
  it('soma entradas (RECEBER) e saídas (PAGAR) pagas no período', async () => {
    financeiroRepository.listarPagasNoPeriodo.mockResolvedValue([
      { tipo: 'RECEBER', valor: 200, valorPago: null, pagaEm: new Date('2026-01-05') },
      { tipo: 'RECEBER', valor: 300, valorPago: 300, pagaEm: new Date('2026-01-05') },
      { tipo: 'PAGAR', valor: 150, valorPago: 150, pagaEm: new Date('2026-01-06') },
    ]);

    const resultado = await financeiroService.fluxoCaixa('2026-01-01', '2026-01-31');

    expect(resultado.entradas).toBe(500);
    expect(resultado.saidas).toBe(150);
    expect(resultado.saldo).toBe(350);
  });

  it('agrupa por dia', async () => {
    financeiroRepository.listarPagasNoPeriodo.mockResolvedValue([
      { tipo: 'RECEBER', valor: 100, valorPago: null, pagaEm: new Date('2026-01-05') },
      { tipo: 'RECEBER', valor: 100, valorPago: null, pagaEm: new Date('2026-01-06') },
    ]);

    const resultado = await financeiroService.fluxoCaixa('2026-01-01', '2026-01-31');

    expect(resultado.porDia).toEqual([
      { data: '2026-01-05', entradas: 100, saidas: 0 },
      { data: '2026-01-06', entradas: 100, saidas: 0 },
    ]);
  });

  it('não acumula erro de ponto flutuante somando várias contas quebradas', async () => {
    financeiroRepository.listarPagasNoPeriodo.mockResolvedValue([
      { tipo: 'RECEBER', valor: 0.1, valorPago: null, pagaEm: new Date('2026-01-05') },
      { tipo: 'RECEBER', valor: 0.2, valorPago: null, pagaEm: new Date('2026-01-05') },
    ]);

    const resultado = await financeiroService.fluxoCaixa('2026-01-01', '2026-01-31');

    expect(resultado.entradas).toBe(0.3);
  });

  it('retorna zerado quando não há contas pagas no período', async () => {
    financeiroRepository.listarPagasNoPeriodo.mockResolvedValue([]);

    const resultado = await financeiroService.fluxoCaixa('2026-01-01', '2026-01-31');

    expect(resultado).toEqual({ entradas: 0, saidas: 0, saldo: 0, porDia: [] });
  });
});
