import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('nodemailer', () => ({
  default: { createTransport: vi.fn() },
}));

const ENV_ORIGINAL = { ...process.env };

// O transportador de e-mail é cacheado dentro do módulo (uma vez criado,
// nunca é recriado), então cada teste precisa de uma instância nova do
// módulo para poder configurar um mock de `sendMail` diferente.
async function carregarProvedorReal() {
  vi.resetModules();
  process.env.PROVEDOR_NOTIFICACAO = 'real';
  const nodemailer = (await import('nodemailer')).default;
  const { obterProvedor } = await import('./notificacoes.provedores.js');
  return { nodemailer, provedor: obterProvedor() };
}

afterEach(() => {
  process.env = { ...ENV_ORIGINAL };
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('provedor real — e-mail (Nodemailer)', () => {
  it('envia e-mail com sucesso', async () => {
    const { nodemailer, provedor } = await carregarProvedorReal();
    nodemailer.createTransport.mockReturnValue({ sendMail: vi.fn().mockResolvedValue({}) });

    const resultado = await provedor.enviarEmail({
      destinatario: 'cliente@example.com',
      assunto: 'OS pronta',
      corpo: 'Mensagem',
    });

    expect(resultado).toEqual({ status: 'ENVIADA' });
  });

  it('retorna FALHA com o motivo quando o envio lança erro', async () => {
    const { nodemailer, provedor } = await carregarProvedorReal();
    nodemailer.createTransport.mockReturnValue({
      sendMail: vi.fn().mockRejectedValue(new Error('Conexão SMTP recusada')),
    });

    const resultado = await provedor.enviarEmail({ destinatario: 'x', assunto: 'y', corpo: 'z' });

    expect(resultado).toEqual({ status: 'FALHA', erro: 'Conexão SMTP recusada' });
  });
});

describe('provedor real — WhatsApp (webhook HTTP)', () => {
  it('retorna FALHA quando WHATSAPP_API_URL não está configurada', async () => {
    const { provedor } = await carregarProvedorReal();
    delete process.env.WHATSAPP_API_URL;

    const resultado = await provedor.enviarWhatsapp({
      destinatario: '11999998888',
      mensagem: 'Oi',
    });

    expect(resultado).toEqual({ status: 'FALHA', erro: 'WHATSAPP_API_URL não configurada.' });
  });

  it('envia com sucesso quando a API responde ok', async () => {
    const { provedor } = await carregarProvedorReal();
    process.env.WHATSAPP_API_URL = 'https://api.exemplo.com/send';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

    const resultado = await provedor.enviarWhatsapp({
      destinatario: '11999998888',
      mensagem: 'Oi',
    });

    expect(resultado).toEqual({ status: 'ENVIADA' });
    expect(fetch).toHaveBeenCalledWith(
      'https://api.exemplo.com/send',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('retorna FALHA quando a API responde com erro HTTP', async () => {
    const { provedor } = await carregarProvedorReal();
    process.env.WHATSAPP_API_URL = 'https://api.exemplo.com/send';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const resultado = await provedor.enviarWhatsapp({
      destinatario: '11999998888',
      mensagem: 'Oi',
    });

    expect(resultado).toEqual({ status: 'FALHA', erro: 'API de WhatsApp respondeu 500.' });
  });

  it('retorna FALHA quando a chamada à API lança exceção (rede fora)', async () => {
    const { provedor } = await carregarProvedorReal();
    process.env.WHATSAPP_API_URL = 'https://api.exemplo.com/send';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const resultado = await provedor.enviarWhatsapp({
      destinatario: '11999998888',
      mensagem: 'Oi',
    });

    expect(resultado).toEqual({ status: 'FALHA', erro: 'Network error' });
  });
});
