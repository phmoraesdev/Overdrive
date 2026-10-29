import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./clientes.repository.js', () => ({
  buscarPorCpf: vi.fn(),
  buscarPorId: vi.fn(),
  listar: vi.fn(),
  criar: vi.fn(),
  atualizar: vi.fn(),
  definirAtivo: vi.fn(),
}));

const clientesRepository = await import('./clientes.repository.js');
const clientesService = await import('./clientes.service.js');

const CLIENTE_FAKE = {
  id: 'cliente-1',
  nome: 'João da Silva',
  cpf: '52998224725',
  telefone: '11999998888',
  email: 'joao@example.com',
  endereco: null,
  ativo: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('criar', () => {
  it('bloqueia CPF duplicado com mensagem clara', async () => {
    clientesRepository.buscarPorCpf.mockResolvedValue(CLIENTE_FAKE);

    await expect(
      clientesService.criar({
        nome: 'Outro Nome',
        cpf: '529.982.247-25',
        telefone: '11988887777',
      }),
    ).rejects.toMatchObject({ status: 409 });

    expect(clientesRepository.criar).not.toHaveBeenCalled();
  });

  it('normaliza o CPF (remove máscara) antes de salvar', async () => {
    clientesRepository.buscarPorCpf.mockResolvedValue(null);
    clientesRepository.criar.mockResolvedValue(CLIENTE_FAKE);

    await clientesService.criar({
      nome: 'João da Silva',
      cpf: '529.982.247-25',
      telefone: '11999998888',
    });

    expect(clientesRepository.criar).toHaveBeenCalledWith(
      expect.objectContaining({ cpf: '52998224725' }),
    );
  });
});

describe('atualizar', () => {
  it('lança erro quando o cliente não existe', async () => {
    clientesRepository.buscarPorId.mockResolvedValue(null);

    await expect(clientesService.atualizar('inexistente', { nome: 'Novo' })).rejects.toMatchObject(
      { status: 404 },
    );
  });

  it('bloqueia troca para um CPF já usado por outro cliente', async () => {
    clientesRepository.buscarPorId.mockResolvedValue(CLIENTE_FAKE);
    clientesRepository.buscarPorCpf.mockResolvedValue({ id: 'outro-cliente' });

    await expect(
      clientesService.atualizar('cliente-1', { cpf: '111.444.777-35' }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('permite manter o mesmo CPF do próprio cliente', async () => {
    clientesRepository.buscarPorId.mockResolvedValue(CLIENTE_FAKE);
    clientesRepository.atualizar.mockResolvedValue(CLIENTE_FAKE);

    await clientesService.atualizar('cliente-1', { cpf: '529.982.247-25', nome: 'João S.' });

    expect(clientesRepository.buscarPorCpf).not.toHaveBeenCalled();
    expect(clientesRepository.atualizar).toHaveBeenCalled();
  });
});

describe('definirAtivo', () => {
  it('lança erro quando o cliente não existe', async () => {
    clientesRepository.buscarPorId.mockResolvedValue(null);

    await expect(clientesService.definirAtivo('inexistente', false)).rejects.toMatchObject({
      status: 404,
    });
  });

  it('inativa um cliente existente', async () => {
    clientesRepository.buscarPorId.mockResolvedValue(CLIENTE_FAKE);
    clientesRepository.definirAtivo.mockResolvedValue({ ...CLIENTE_FAKE, ativo: false });

    const resultado = await clientesService.definirAtivo('cliente-1', false);

    expect(resultado.ativo).toBe(false);
    expect(clientesRepository.definirAtivo).toHaveBeenCalledWith('cliente-1', false);
  });
});
