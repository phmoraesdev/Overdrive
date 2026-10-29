import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./veiculos.repository.js', () => ({
  buscarPorPlaca: vi.fn(),
  buscarPorId: vi.fn(),
  listarPorCliente: vi.fn(),
  criar: vi.fn(),
  atualizar: vi.fn(),
  definirAtivo: vi.fn(),
}));

vi.mock('../clientes/clientes.service.js', () => ({
  buscarPorId: vi.fn(),
}));

const veiculosRepository = await import('./veiculos.repository.js');
const clientesService = await import('../clientes/clientes.service.js');
const veiculosService = await import('./veiculos.service.js');

const VEICULO_FAKE = {
  id: 'veiculo-1',
  placa: 'ABC1234',
  marca: 'Volkswagen',
  modelo: 'Gol',
  ano: 2015,
  cor: 'Prata',
  km: 50000,
  clienteId: 'cliente-1',
  ativo: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  clientesService.buscarPorId.mockResolvedValue({ id: 'cliente-1' });
});

describe('criar', () => {
  it('bloqueia placa duplicada com mensagem clara', async () => {
    veiculosRepository.buscarPorPlaca.mockResolvedValue(VEICULO_FAKE);

    await expect(
      veiculosService.criar({
        placa: 'ABC-1234',
        marca: 'Fiat',
        modelo: 'Uno',
        ano: 2010,
        clienteId: 'cliente-1',
      }),
    ).rejects.toMatchObject({ status: 409 });

    expect(veiculosRepository.criar).not.toHaveBeenCalled();
  });

  it('normaliza a placa (maiúscula, sem traço) antes de salvar', async () => {
    veiculosRepository.buscarPorPlaca.mockResolvedValue(null);
    veiculosRepository.criar.mockResolvedValue(VEICULO_FAKE);

    await veiculosService.criar({
      placa: 'abc-1234',
      marca: 'Volkswagen',
      modelo: 'Gol',
      ano: 2015,
      clienteId: 'cliente-1',
    });

    expect(veiculosRepository.criar).toHaveBeenCalledWith(
      expect.objectContaining({ placa: 'ABC1234' }),
    );
  });

  it('propaga erro quando o cliente informado não existe', async () => {
    veiculosRepository.buscarPorPlaca.mockResolvedValue(null);
    clientesService.buscarPorId.mockRejectedValue(
      Object.assign(new Error('Cliente não encontrado.'), { status: 404 }),
    );

    await expect(
      veiculosService.criar({
        placa: 'ABC1234',
        marca: 'Fiat',
        modelo: 'Uno',
        ano: 2010,
        clienteId: 'inexistente',
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe('transferirProprietario', () => {
  it('lança erro quando o veículo não existe', async () => {
    veiculosRepository.buscarPorId.mockResolvedValue(null);

    await expect(
      veiculosService.transferirProprietario('inexistente', 'cliente-2'),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('lança erro quando o novo cliente não existe', async () => {
    veiculosRepository.buscarPorId.mockResolvedValue(VEICULO_FAKE);
    clientesService.buscarPorId.mockRejectedValue(
      Object.assign(new Error('Cliente não encontrado.'), { status: 404 }),
    );

    await expect(
      veiculosService.transferirProprietario('veiculo-1', 'inexistente'),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('transfere o veículo para o novo cliente', async () => {
    veiculosRepository.buscarPorId.mockResolvedValue(VEICULO_FAKE);
    veiculosRepository.atualizar.mockResolvedValue({ ...VEICULO_FAKE, clienteId: 'cliente-2' });

    const resultado = await veiculosService.transferirProprietario('veiculo-1', 'cliente-2');

    expect(resultado.clienteId).toBe('cliente-2');
    expect(veiculosRepository.atualizar).toHaveBeenCalledWith('veiculo-1', {
      clienteId: 'cliente-2',
    });
  });
});
