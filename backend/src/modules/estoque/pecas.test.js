import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./pecas.repository.js', () => ({
  buscarPorCodigo: vi.fn(),
  buscarPorId: vi.fn(),
  listar: vi.fn(),
  listarAtivas: vi.fn(),
  criar: vi.fn(),
  atualizar: vi.fn(),
  definirAtivo: vi.fn(),
}));

const pecasRepository = await import('./pecas.repository.js');
const pecasService = await import('./pecas.service.js');

const PECA_FAKE = {
  id: 'peca-1',
  codigo: 'FTR-001',
  descricao: 'Filtro de óleo',
  precoCusto: 20,
  precoVenda: 45,
  quantidade: 10,
  quantidadeMinima: 2,
  ativo: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listar', () => {
  it('repassa os filtros para o repositório', async () => {
    pecasRepository.listar.mockResolvedValue([PECA_FAKE]);

    const resultado = await pecasService.listar({ busca: 'filtro' });

    expect(resultado).toEqual([PECA_FAKE]);
    expect(pecasRepository.listar).toHaveBeenCalledWith({ busca: 'filtro' });
  });
});

describe('buscarPorId', () => {
  it('lança erro quando a peça não existe', async () => {
    pecasRepository.buscarPorId.mockResolvedValue(null);

    await expect(pecasService.buscarPorId('inexistente')).rejects.toMatchObject({ status: 404 });
  });

  it('retorna a peça quando ela existe', async () => {
    pecasRepository.buscarPorId.mockResolvedValue(PECA_FAKE);

    const resultado = await pecasService.buscarPorId('peca-1');

    expect(resultado).toEqual(PECA_FAKE);
  });
});

describe('definirAtivo', () => {
  it('lança erro quando a peça não existe', async () => {
    pecasRepository.buscarPorId.mockResolvedValue(null);

    await expect(pecasService.definirAtivo('inexistente', false)).rejects.toMatchObject({
      status: 404,
    });
  });

  it('inativa a peça quando ela existe', async () => {
    pecasRepository.buscarPorId.mockResolvedValue(PECA_FAKE);
    pecasRepository.definirAtivo.mockResolvedValue({ ...PECA_FAKE, ativo: false });

    const resultado = await pecasService.definirAtivo('peca-1', false);

    expect(resultado.ativo).toBe(false);
    expect(pecasRepository.definirAtivo).toHaveBeenCalledWith('peca-1', false);
  });
});

describe('criar', () => {
  it('bloqueia código duplicado', async () => {
    pecasRepository.buscarPorCodigo.mockResolvedValue(PECA_FAKE);

    await expect(
      pecasService.criar({ codigo: 'FTR-001', descricao: 'Filtro', precoCusto: 10, precoVenda: 20 }),
    ).rejects.toMatchObject({ status: 409 });

    expect(pecasRepository.criar).not.toHaveBeenCalled();
  });

  it('exige confirmação quando o preço de venda é menor que o custo', async () => {
    pecasRepository.buscarPorCodigo.mockResolvedValue(null);

    await expect(
      pecasService.criar({
        codigo: 'FTR-002',
        descricao: 'Filtro de ar',
        precoCusto: 50,
        precoVenda: 30,
      }),
    ).rejects.toMatchObject({
      status: 409,
      avisos: [expect.objectContaining({ tipo: 'PRECO_VENDA_ABAIXO_DO_CUSTO' })],
    });

    expect(pecasRepository.criar).not.toHaveBeenCalled();
  });

  it('cria quando o aviso de preço é confirmado explicitamente', async () => {
    pecasRepository.buscarPorCodigo.mockResolvedValue(null);
    pecasRepository.criar.mockResolvedValue({ ...PECA_FAKE, precoVenda: 15 });

    const resultado = await pecasService.criar({
      codigo: 'FTR-003',
      descricao: 'Filtro de combustível',
      precoCusto: 20,
      precoVenda: 15,
      ignorarAvisos: true,
    });

    expect(resultado.precoVenda).toBe(15);
  });

  it('cria normalmente quando o preço de venda é maior que o custo', async () => {
    pecasRepository.buscarPorCodigo.mockResolvedValue(null);
    pecasRepository.criar.mockResolvedValue(PECA_FAKE);

    const resultado = await pecasService.criar({
      codigo: 'FTR-001',
      descricao: 'Filtro de óleo',
      precoCusto: 20,
      precoVenda: 45,
    });

    expect(resultado).toEqual(PECA_FAKE);
  });
});

describe('atualizar', () => {
  it('lança erro quando a peça não existe', async () => {
    pecasRepository.buscarPorId.mockResolvedValue(null);

    await expect(pecasService.atualizar('inexistente', { descricao: 'Novo' })).rejects.toMatchObject({
      status: 404,
    });
  });

  it('bloqueia troca para um código já usado por outra peça', async () => {
    pecasRepository.buscarPorId.mockResolvedValue(PECA_FAKE);
    pecasRepository.buscarPorCodigo.mockResolvedValue({ ...PECA_FAKE, id: 'peca-2' });

    await expect(pecasService.atualizar('peca-1', { codigo: 'OUTRO-COD' })).rejects.toMatchObject({
      status: 409,
    });
  });

  it('exige confirmação ao reduzir o preço de venda abaixo do custo', async () => {
    pecasRepository.buscarPorId.mockResolvedValue(PECA_FAKE);

    await expect(pecasService.atualizar('peca-1', { precoVenda: 10 })).rejects.toMatchObject({
      status: 409,
    });

    expect(pecasRepository.atualizar).not.toHaveBeenCalled();
  });

  it('não exige confirmação quando o preço não é alterado', async () => {
    pecasRepository.buscarPorId.mockResolvedValue(PECA_FAKE);
    pecasRepository.atualizar.mockResolvedValue({ ...PECA_FAKE, quantidade: 20 });

    const resultado = await pecasService.atualizar('peca-1', { quantidade: 20 });

    expect(resultado.quantidade).toBe(20);
  });
});

describe('pecaEmAlerta (PB18)', () => {
  it('fica em alerta quando o saldo atinge exatamente o mínimo', () => {
    expect(pecasService.pecaEmAlerta({ quantidade: 4, quantidadeMinima: 4 })).toBe(true);
  });

  it('fica em alerta quando o saldo está abaixo do mínimo', () => {
    expect(pecasService.pecaEmAlerta({ quantidade: 1, quantidadeMinima: 4 })).toBe(true);
  });

  it('não fica em alerta quando o saldo volta acima do mínimo', () => {
    expect(pecasService.pecaEmAlerta({ quantidade: 5, quantidadeMinima: 4 })).toBe(false);
  });
});

describe('listarEmAlerta (PB18)', () => {
  it('retorna só as peças ativas com saldo no mínimo ou abaixo dele', async () => {
    pecasRepository.listarAtivas.mockResolvedValue([
      { id: 'peca-1', descricao: 'Pastilha', quantidade: 2, quantidadeMinima: 4 }, // abaixo
      { id: 'peca-2', descricao: 'Filtro', quantidade: 4, quantidadeMinima: 4 }, // no mínimo
      { id: 'peca-3', descricao: 'Óleo', quantidade: 40, quantidadeMinima: 10 }, // normal
    ]);

    const resultado = await pecasService.listarEmAlerta();

    expect(resultado.map((peca) => peca.id)).toEqual(['peca-1', 'peca-2']);
  });

  it('resolve sozinho: some da lista assim que o saldo volta ao normal', async () => {
    pecasRepository.listarAtivas.mockResolvedValue([
      { id: 'peca-1', descricao: 'Pastilha', quantidade: 10, quantidadeMinima: 4 },
    ]);

    const resultado = await pecasService.listarEmAlerta();

    expect(resultado).toEqual([]);
  });
});
