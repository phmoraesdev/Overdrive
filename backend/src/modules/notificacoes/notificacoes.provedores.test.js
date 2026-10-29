import { afterEach, describe, expect, it } from 'vitest';
import { obterProvedor } from './notificacoes.provedores.js';

const PROVEDOR_ORIGINAL = process.env.PROVEDOR_NOTIFICACAO;

afterEach(() => {
  process.env.PROVEDOR_NOTIFICACAO = PROVEDOR_ORIGINAL;
});

describe('obterProvedor', () => {
  it('usa o provedor simulado por padrão (sem variável de ambiente)', () => {
    delete process.env.PROVEDOR_NOTIFICACAO;
    const provedor = obterProvedor();
    expect(typeof provedor.enviarEmail).toBe('function');
    expect(typeof provedor.enviarWhatsapp).toBe('function');
  });

  it('usa o provedor simulado para qualquer valor diferente de "real"', () => {
    process.env.PROVEDOR_NOTIFICACAO = 'qualquer-coisa';
    const provedorSimulado = obterProvedor();

    process.env.PROVEDOR_NOTIFICACAO = 'real';
    const provedorReal = obterProvedor();

    expect(provedorSimulado).not.toBe(provedorReal);
  });

  it('o provedor simulado não lança erro mesmo sem nenhuma credencial configurada', async () => {
    delete process.env.PROVEDOR_NOTIFICACAO;
    const provedor = obterProvedor();

    const resultadoEmail = await provedor.enviarEmail({
      destinatario: 'cliente@example.com',
      assunto: 'Teste',
      corpo: 'Mensagem de teste',
    });
    const resultadoWhatsapp = await provedor.enviarWhatsapp({
      destinatario: '11999998888',
      mensagem: 'Mensagem de teste',
    });

    expect(resultadoEmail).toEqual({ status: 'ENVIADA' });
    expect(resultadoWhatsapp).toEqual({ status: 'ENVIADA' });
  });
});
