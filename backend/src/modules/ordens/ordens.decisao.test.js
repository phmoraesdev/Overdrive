import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./ordens.repository.js', () => ({
  buscarPorId: vi.fn(),
  registrarDecisao: vi.fn(),
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
const ordensService = await import('./ordens.service.js');

const OS_AGUARDANDO = {
  id: 'os-1',
  status: 'AGUARDANDO_APROVACAO',
  itensOrcamento: [{ id: 'item-1' }, { id: 'item-2' }],
};

beforeEach(() => {
  vi.clearAllMocks();
  ordensRepository.buscarPorId.mockResolvedValue(OS_AGUARDANDO);
});

describe('registrarDecisao', () => {
  it('bloqueia fora do status AGUARDANDO_APROVACAO', async () => {
    ordensRepository.buscarPorId.mockResolvedValue({ ...OS_AGUARDANDO, status: 'ABERTA' });

    await expect(
      ordensService.registrarDecisao(
        'os-1',
        { decisao: 'APROVADO', meioContato: 'TELEFONE' },
        'func-1',
      ),
    ).rejects.toMatchObject({ status: 400 });

    expect(ordensRepository.registrarDecisao).not.toHaveBeenCalled();
  });

  it('aprovação total muda a OS para EM_EXECUCAO', async () => {
    ordensRepository.registrarDecisao.mockResolvedValue({ ...OS_AGUARDANDO, status: 'EM_EXECUCAO' });

    const resultado = await ordensService.registrarDecisao(
      'os-1',
      { decisao: 'APROVADO', meioContato: 'TELEFONE' },
      'func-1',
    );

    expect(resultado.status).toBe('EM_EXECUCAO');
    expect(ordensRepository.registrarDecisao).toHaveBeenCalledWith(
      expect.objectContaining({ statusNovo: 'EM_EXECUCAO', decisao: 'APROVADO' }),
    );
  });

  it('reprovação registra o motivo e muda a OS para REPROVADA', async () => {
    ordensRepository.registrarDecisao.mockResolvedValue({ ...OS_AGUARDANDO, status: 'REPROVADA' });

    const resultado = await ordensService.registrarDecisao(
      'os-1',
      { decisao: 'REPROVADO', meioContato: 'WHATSAPP', motivo: 'Cliente achou caro' },
      'func-1',
    );

    expect(resultado.status).toBe('REPROVADA');
    expect(ordensRepository.registrarDecisao).toHaveBeenCalledWith(
      expect.objectContaining({ statusNovo: 'REPROVADA', motivo: 'Cliente achou caro' }),
    );
  });

  it('aprovação parcial rejeita item que não pertence a esta OS', async () => {
    await expect(
      ordensService.registrarDecisao(
        'os-1',
        {
          decisao: 'APROVADO_PARCIAL',
          meioContato: 'PRESENCIAL',
          itensAprovadosIds: ['item-de-outra-os'],
        },
        'func-1',
      ),
    ).rejects.toMatchObject({ status: 400 });

    expect(ordensRepository.registrarDecisao).not.toHaveBeenCalled();
  });

  it('aprovação parcial aceita itens válidos, recalcula e vai para EM_EXECUCAO', async () => {
    ordensRepository.registrarDecisao.mockResolvedValue({ ...OS_AGUARDANDO, status: 'EM_EXECUCAO' });

    const resultado = await ordensService.registrarDecisao(
      'os-1',
      { decisao: 'APROVADO_PARCIAL', meioContato: 'TELEFONE', itensAprovadosIds: ['item-1'] },
      'func-1',
    );

    expect(resultado.status).toBe('EM_EXECUCAO');
    expect(ordensRepository.registrarDecisao).toHaveBeenCalledWith(
      expect.objectContaining({ statusNovo: 'EM_EXECUCAO', itensAprovadosIds: ['item-1'] }),
    );
  });
});
