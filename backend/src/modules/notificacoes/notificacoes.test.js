import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./notificacoes.repository.js', () => ({
  criar: vi.fn(),
  listarPorOrdemServico: vi.fn(),
}));

const notificacoesRepository = await import('./notificacoes.repository.js');
const notificacoesService = await import('./notificacoes.service.js');

const OS_BASE = {
  id: 'os-1',
  numero: 10,
  veiculo: { placa: 'ABC1234' },
  cliente: { nome: 'João da Silva', email: null, telefone: null },
};

function provedorFake(overrides = {}) {
  return {
    enviarEmail: vi.fn().mockResolvedValue({ status: 'ENVIADA' }),
    enviarWhatsapp: vi.fn().mockResolvedValue({ status: 'ENVIADA' }),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  notificacoesRepository.criar.mockImplementation((dados) => Promise.resolve({ id: 'notif-1', ...dados }));
});

describe('notificarClientePronto', () => {
  it('avisa a recepção quando o cliente não tem nenhum contato cadastrado', async () => {
    const provedor = provedorFake();

    const resultado = await notificacoesService.notificarClientePronto(OS_BASE, provedor);

    expect(resultado.alertaRecepcao).toBe(true);
    expect(resultado.enviadas).toEqual([]);
    expect(provedor.enviarEmail).not.toHaveBeenCalled();
    expect(provedor.enviarWhatsapp).not.toHaveBeenCalled();
    expect(notificacoesRepository.criar).not.toHaveBeenCalled();
  });

  it('envia só por e-mail quando o cliente só tem e-mail cadastrado', async () => {
    const provedor = provedorFake();
    const os = { ...OS_BASE, cliente: { ...OS_BASE.cliente, email: 'joao@example.com' } };

    const resultado = await notificacoesService.notificarClientePronto(os, provedor);

    expect(resultado.alertaRecepcao).toBe(false);
    expect(resultado.enviadas).toHaveLength(1);
    expect(provedor.enviarEmail).toHaveBeenCalledWith(
      expect.objectContaining({ destinatario: 'joao@example.com' }),
    );
    expect(provedor.enviarWhatsapp).not.toHaveBeenCalled();
    expect(notificacoesRepository.criar).toHaveBeenCalledWith(
      expect.objectContaining({ canal: 'EMAIL', status: 'ENVIADA', ordemServicoId: 'os-1' }),
    );
  });

  it('envia por e-mail e WhatsApp quando o cliente tem os dois contatos, com o número da OS na mensagem', async () => {
    const provedor = provedorFake();
    const os = {
      ...OS_BASE,
      cliente: { nome: 'João da Silva', email: 'joao@example.com', telefone: '11999998888' },
    };

    const resultado = await notificacoesService.notificarClientePronto(os, provedor);

    expect(resultado.alertaRecepcao).toBe(false);
    expect(resultado.enviadas).toHaveLength(2);
    expect(provedor.enviarEmail).toHaveBeenCalledWith(
      expect.objectContaining({ corpo: expect.stringContaining('OS nº 10') }),
    );
    expect(provedor.enviarWhatsapp).toHaveBeenCalledWith(
      expect.objectContaining({ destinatario: '11999998888', mensagem: expect.stringContaining('OS nº 10') }),
    );
  });

  it('grava a notificação com status FALHA quando o provedor não consegue enviar, sem lançar erro', async () => {
    const provedor = provedorFake({
      enviarEmail: vi.fn().mockResolvedValue({ status: 'FALHA', erro: 'SMTP indisponível' }),
    });
    const os = { ...OS_BASE, cliente: { ...OS_BASE.cliente, email: 'joao@example.com' } };

    const resultado = await notificacoesService.notificarClientePronto(os, provedor);

    expect(resultado.alertaRecepcao).toBe(false);
    expect(notificacoesRepository.criar).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'FALHA', erro: 'SMTP indisponível' }),
    );
  });
});
