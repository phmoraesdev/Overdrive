import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./ordens.repository.js', () => ({
  buscarPorId: vi.fn(),
  listarItensOrcamento: vi.fn(),
  buscarItemOrcamento: vi.fn(),
  criarItemOrcamento: vi.fn(),
  atualizarItemOrcamento: vi.fn(),
  removerItemOrcamento: vi.fn(),
  finalizarOrcamento: vi.fn(),
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
const ordensService = await import('./ordens.service.js');

const OS_ABERTA = { id: 'os-1', status: 'ABERTA', numero: 10, itensOrcamento: [] };

beforeEach(() => {
  vi.clearAllMocks();
  ordensRepository.buscarPorId.mockResolvedValue(OS_ABERTA);
});

describe('adicionarItemOrcamento', () => {
  it('bloqueia alteração do orçamento fora do status ABERTA', async () => {
    ordensRepository.buscarPorId.mockResolvedValue({ ...OS_ABERTA, status: 'EM_EXECUCAO' });

    await expect(
      ordensService.adicionarItemOrcamento('os-1', {
        tipo: 'MAO_DE_OBRA',
        descricao: 'Troca de óleo',
        quantidade: 1,
        valorUnitario: 100,
      }),
    ).rejects.toMatchObject({ status: 400 });

    expect(ordensRepository.criarItemOrcamento).not.toHaveBeenCalled();
  });

  it('adiciona item de mão de obra e calcula o total', async () => {
    ordensRepository.criarItemOrcamento.mockResolvedValue({
      id: 'item-1',
      tipo: 'MAO_DE_OBRA',
      descricao: 'Troca de óleo',
      quantidade: 1,
      valorUnitario: 100,
      aprovado: false,
    });

    const resultado = await ordensService.adicionarItemOrcamento('os-1', {
      tipo: 'MAO_DE_OBRA',
      descricao: 'Troca de óleo',
      quantidade: 1,
      valorUnitario: 100,
    });

    expect(resultado.item.total).toBe(100);
    expect(resultado.aviso).toBeNull();
  });

  it('adiciona item de peça usando o preço de venda cadastrado, não um valor arbitrário', async () => {
    pecasService.buscarPorId.mockResolvedValue({
      id: 'peca-1',
      descricao: 'Filtro de óleo',
      precoVenda: 35,
      quantidade: 10,
    });
    ordensRepository.criarItemOrcamento.mockResolvedValue({
      id: 'item-2',
      tipo: 'PECA',
      descricao: 'Filtro de óleo',
      quantidade: 2,
      valorUnitario: 35,
      pecaId: 'peca-1',
      aprovado: false,
    });

    const resultado = await ordensService.adicionarItemOrcamento('os-1', {
      tipo: 'PECA',
      pecaId: 'peca-1',
      quantidade: 2,
    });

    expect(resultado.item.total).toBe(70);
    expect(resultado.aviso).toBeNull();
    expect(ordensRepository.criarItemOrcamento).toHaveBeenCalledWith(
      'os-1',
      expect.objectContaining({ valorUnitario: 35, descricao: 'Filtro de óleo' }),
    );
  });

  it('avisa estoque insuficiente sem bloquear a inclusão do item', async () => {
    pecasService.buscarPorId.mockResolvedValue({
      id: 'peca-1',
      descricao: 'Pastilha de freio',
      precoVenda: 120,
      quantidade: 2,
    });
    ordensRepository.criarItemOrcamento.mockResolvedValue({
      id: 'item-3',
      tipo: 'PECA',
      descricao: 'Pastilha de freio',
      quantidade: 4,
      valorUnitario: 120,
      pecaId: 'peca-1',
      aprovado: false,
    });

    const resultado = await ordensService.adicionarItemOrcamento('os-1', {
      tipo: 'PECA',
      pecaId: 'peca-1',
      quantidade: 4,
    });

    expect(resultado.aviso).toMatchObject({ tipo: 'ESTOQUE_INSUFICIENTE' });
    expect(ordensRepository.criarItemOrcamento).toHaveBeenCalled();
  });
});

describe('listarOrcamento', () => {
  it('calcula o total de cada item e o total geral', async () => {
    ordensRepository.listarItensOrcamento.mockResolvedValue([
      { id: 'item-1', descricao: 'Filtro de óleo', quantidade: 2, valorUnitario: 35 },
      { id: 'item-2', descricao: 'Mão de obra', quantidade: 1, valorUnitario: 100 },
    ]);

    const resultado = await ordensService.listarOrcamento('os-1');

    expect(resultado.itens[0].total).toBe(70);
    expect(resultado.itens[1].total).toBe(100);
    expect(resultado.total).toBe(170);
  });

  it('retorna total 0 para orçamento sem itens', async () => {
    ordensRepository.listarItensOrcamento.mockResolvedValue([]);

    const resultado = await ordensService.listarOrcamento('os-1');

    expect(resultado).toEqual({ itens: [], total: 0 });
  });
});

describe('atualizarItemOrcamento', () => {
  it('bloqueia alteração fora do status ABERTA', async () => {
    ordensRepository.buscarPorId.mockResolvedValue({ ...OS_ABERTA, status: 'EM_EXECUCAO' });

    await expect(
      ordensService.atualizarItemOrcamento('os-1', 'item-1', { quantidade: 3 }),
    ).rejects.toMatchObject({ status: 400 });

    expect(ordensRepository.atualizarItemOrcamento).not.toHaveBeenCalled();
  });

  it('lança erro quando o item não pertence a esta OS', async () => {
    ordensRepository.buscarItemOrcamento.mockResolvedValue({ id: 'item-1', ordemServicoId: 'outra-os' });

    await expect(
      ordensService.atualizarItemOrcamento('os-1', 'item-1', { quantidade: 3 }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('atualiza a quantidade de um item de mão de obra, sem checar estoque', async () => {
    ordensRepository.buscarItemOrcamento.mockResolvedValue({ id: 'item-1', ordemServicoId: 'os-1' });
    ordensRepository.atualizarItemOrcamento.mockResolvedValue({
      id: 'item-1',
      tipo: 'MAO_DE_OBRA',
      quantidade: 2,
      valorUnitario: 100,
      pecaId: null,
    });

    const resultado = await ordensService.atualizarItemOrcamento('os-1', 'item-1', { quantidade: 2 });

    expect(resultado.item.total).toBe(200);
    expect(resultado.aviso).toBeNull();
    expect(pecasService.buscarPorId).not.toHaveBeenCalled();
  });

  it('avisa estoque insuficiente ao aumentar a quantidade de um item de peça', async () => {
    ordensRepository.buscarItemOrcamento.mockResolvedValue({ id: 'item-1', ordemServicoId: 'os-1' });
    ordensRepository.atualizarItemOrcamento.mockResolvedValue({
      id: 'item-1',
      tipo: 'PECA',
      quantidade: 10,
      valorUnitario: 35,
      pecaId: 'peca-1',
    });
    pecasService.buscarPorId.mockResolvedValue({ id: 'peca-1', descricao: 'Filtro', quantidade: 3 });

    const resultado = await ordensService.atualizarItemOrcamento('os-1', 'item-1', { quantidade: 10 });

    expect(resultado.aviso).toMatchObject({ tipo: 'ESTOQUE_INSUFICIENTE' });
  });
});

describe('removerItemOrcamento', () => {
  it('lança erro quando o item não pertence a esta OS', async () => {
    ordensRepository.buscarItemOrcamento.mockResolvedValue({
      id: 'item-x',
      ordemServicoId: 'outra-os',
    });

    await expect(ordensService.removerItemOrcamento('os-1', 'item-x')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('remove o item quando ele pertence à OS', async () => {
    ordensRepository.buscarItemOrcamento.mockResolvedValue({ id: 'item-1', ordemServicoId: 'os-1' });

    await ordensService.removerItemOrcamento('os-1', 'item-1');

    expect(ordensRepository.removerItemOrcamento).toHaveBeenCalledWith('item-1');
  });
});

describe('finalizarOrcamento', () => {
  it('bloqueia finalizar um orçamento vazio', async () => {
    ordensRepository.listarItensOrcamento.mockResolvedValue([]);

    await expect(ordensService.finalizarOrcamento('os-1', 'func-1')).rejects.toMatchObject({
      status: 400,
    });

    expect(ordensRepository.finalizarOrcamento).not.toHaveBeenCalled();
  });

  it('finaliza e muda para AGUARDANDO_APROVACAO quando há itens', async () => {
    ordensRepository.listarItensOrcamento.mockResolvedValue([{ id: 'item-1' }]);
    ordensRepository.finalizarOrcamento.mockResolvedValue({
      ...OS_ABERTA,
      status: 'AGUARDANDO_APROVACAO',
    });

    const resultado = await ordensService.finalizarOrcamento('os-1', 'func-1');

    expect(resultado.status).toBe('AGUARDANDO_APROVACAO');
    expect(ordensRepository.finalizarOrcamento).toHaveBeenCalledWith({
      id: 'os-1',
      statusAnterior: 'ABERTA',
      funcionarioId: 'func-1',
    });
  });

  it('bloqueia finalizar fora do status ABERTA', async () => {
    ordensRepository.buscarPorId.mockResolvedValue({ ...OS_ABERTA, status: 'AGUARDANDO_APROVACAO' });

    await expect(ordensService.finalizarOrcamento('os-1', 'func-1')).rejects.toMatchObject({
      status: 400,
    });
  });
});
