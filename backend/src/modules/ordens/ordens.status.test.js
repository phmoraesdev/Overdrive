import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./ordens.repository.js', () => ({
  buscarPorId: vi.fn(),
  atualizarStatus: vi.fn(),
  listarParaPainel: vi.fn(),
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
  notificarClientePronto: vi.fn(),
}));

const ordensRepository = await import('./ordens.repository.js');
const notificacoesService = await import('../notificacoes/notificacoes.service.js');
const ordensService = await import('./ordens.service.js');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('atualizarStatus — transições permitidas', () => {
  it('permite EM_EXECUCAO -> AGUARDANDO_PECA', async () => {
    ordensRepository.buscarPorId.mockResolvedValue({ id: 'os-1', status: 'EM_EXECUCAO' });
    ordensRepository.atualizarStatus.mockResolvedValue({ id: 'os-1', status: 'AGUARDANDO_PECA' });

    const resultado = await ordensService.atualizarStatus('os-1', 'AGUARDANDO_PECA', 'func-1');

    expect(resultado.status).toBe('AGUARDANDO_PECA');
    expect(ordensRepository.atualizarStatus).toHaveBeenCalledWith({
      id: 'os-1',
      statusAnterior: 'EM_EXECUCAO',
      statusNovo: 'AGUARDANDO_PECA',
      funcionarioId: 'func-1',
    });
  });

  it('permite AGUARDANDO_PECA -> EM_EXECUCAO (peça chegou)', async () => {
    ordensRepository.buscarPorId.mockResolvedValue({ id: 'os-1', status: 'AGUARDANDO_PECA' });
    ordensRepository.atualizarStatus.mockResolvedValue({ id: 'os-1', status: 'EM_EXECUCAO' });

    const resultado = await ordensService.atualizarStatus('os-1', 'EM_EXECUCAO', 'func-1');

    expect(resultado.status).toBe('EM_EXECUCAO');
  });

  it('permite EM_EXECUCAO -> PRONTO_PARA_RETIRADA e notifica o cliente (RF11/PB14)', async () => {
    ordensRepository.buscarPorId.mockResolvedValue({ id: 'os-1', status: 'EM_EXECUCAO' });
    ordensRepository.atualizarStatus.mockResolvedValue({
      id: 'os-1',
      status: 'PRONTO_PARA_RETIRADA',
      cliente: { nome: 'João', email: 'joao@example.com', telefone: null },
    });
    notificacoesService.notificarClientePronto.mockResolvedValue({
      enviadas: [{ id: 'notif-1' }],
      alertaRecepcao: false,
    });

    const resultado = await ordensService.atualizarStatus('os-1', 'PRONTO_PARA_RETIRADA', 'func-1');

    expect(resultado.status).toBe('PRONTO_PARA_RETIRADA');
    expect(resultado.alertaRecepcao).toBe(false);
    expect(notificacoesService.notificarClientePronto).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'os-1' }),
    );
  });

  it('repassa alertaRecepcao: true quando o cliente não tem contato cadastrado', async () => {
    ordensRepository.buscarPorId.mockResolvedValue({ id: 'os-1', status: 'EM_EXECUCAO' });
    ordensRepository.atualizarStatus.mockResolvedValue({
      id: 'os-1',
      status: 'PRONTO_PARA_RETIRADA',
      cliente: { nome: 'João', email: null, telefone: null },
    });
    notificacoesService.notificarClientePronto.mockResolvedValue({
      enviadas: [],
      alertaRecepcao: true,
    });

    const resultado = await ordensService.atualizarStatus('os-1', 'PRONTO_PARA_RETIRADA', 'func-1');

    expect(resultado.alertaRecepcao).toBe(true);
  });

  it('não dispara notificação para transições que não envolvem ficar pronto', async () => {
    ordensRepository.buscarPorId.mockResolvedValue({ id: 'os-1', status: 'EM_EXECUCAO' });
    ordensRepository.atualizarStatus.mockResolvedValue({ id: 'os-1', status: 'AGUARDANDO_PECA' });

    await ordensService.atualizarStatus('os-1', 'AGUARDANDO_PECA', 'func-1');

    expect(notificacoesService.notificarClientePronto).not.toHaveBeenCalled();
  });
});

describe('atualizarStatus — transições bloqueadas', () => {
  it('bloqueia pular etapas (ABERTA -> ENCERRADA)', async () => {
    ordensRepository.buscarPorId.mockResolvedValue({ id: 'os-1', status: 'ABERTA' });

    await expect(ordensService.atualizarStatus('os-1', 'ENCERRADA', 'func-1')).rejects.toMatchObject(
      { status: 400 },
    );
    expect(ordensRepository.atualizarStatus).not.toHaveBeenCalled();
  });

  it('bloqueia AGUARDANDO_PECA -> PRONTO_PARA_RETIRADA direto (sem voltar pra execução)', async () => {
    ordensRepository.buscarPorId.mockResolvedValue({ id: 'os-1', status: 'AGUARDANDO_PECA' });

    await expect(
      ordensService.atualizarStatus('os-1', 'PRONTO_PARA_RETIRADA', 'func-1'),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('bloqueia transição a partir de um status terminal (ENCERRADA)', async () => {
    ordensRepository.buscarPorId.mockResolvedValue({ id: 'os-1', status: 'ENCERRADA' });

    await expect(
      ordensService.atualizarStatus('os-1', 'EM_EXECUCAO', 'func-1'),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('bloqueia transições reservadas a outros fluxos (ex.: aprovar orçamento por aqui)', async () => {
    ordensRepository.buscarPorId.mockResolvedValue({ id: 'os-1', status: 'AGUARDANDO_APROVACAO' });

    await expect(
      ordensService.atualizarStatus('os-1', 'EM_EXECUCAO', 'func-1'),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe('listarParaPainel', () => {
  it('repassa a listagem do repositório', async () => {
    ordensRepository.listarParaPainel.mockResolvedValue([{ id: 'os-1', status: 'EM_EXECUCAO' }]);

    const resultado = await ordensService.listarParaPainel();

    expect(resultado).toEqual([{ id: 'os-1', status: 'EM_EXECUCAO' }]);
  });
});
