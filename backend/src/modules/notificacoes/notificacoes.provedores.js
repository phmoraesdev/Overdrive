import nodemailer from 'nodemailer';

// PB14: dois provedores atrás da mesma interface ({ enviarEmail, enviarWhatsapp }
// — ambos recebem destinatário/mensagem e devolvem { status, erro? }), trocados
// por variável de ambiente. O padrão é o simulado: só loga e deixa o service
// gravar a notificação no banco, sem depender de nenhuma credencial externa.
// O real manda e-mail de verdade (Nodemailer/SMTP) e WhatsApp via um webhook
// HTTP genérico configurável — qualquer API de WhatsApp que aceite um POST
// {to, message} serve, sem acoplar a um provedor específico.

async function enviarEmailSimulado({ destinatario, assunto, corpo }) {
  console.log(`[notificacao simulada] e-mail para ${destinatario} — "${assunto}"\n${corpo}`);
  return { status: 'ENVIADA' };
}

async function enviarWhatsappSimulado({ destinatario, mensagem }) {
  console.log(`[notificacao simulada] whatsapp para ${destinatario}\n${mensagem}`);
  return { status: 'ENVIADA' };
}

let transportadorEmail;

function obterTransportadorEmail() {
  if (!transportadorEmail) {
    transportadorEmail = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return transportadorEmail;
}

async function enviarEmailReal({ destinatario, assunto, corpo }) {
  try {
    await obterTransportadorEmail().sendMail({
      from: process.env.SMTP_FROM ?? 'oficina@overdrive.com',
      to: destinatario,
      subject: assunto,
      text: corpo,
    });
    return { status: 'ENVIADA' };
  } catch (error) {
    return { status: 'FALHA', erro: error.message };
  }
}

async function enviarWhatsappReal({ destinatario, mensagem }) {
  if (!process.env.WHATSAPP_API_URL) {
    return { status: 'FALHA', erro: 'WHATSAPP_API_URL não configurada.' };
  }
  try {
    const resposta = await fetch(process.env.WHATSAPP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.WHATSAPP_API_TOKEN && {
          Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
        }),
      },
      body: JSON.stringify({ to: destinatario, message: mensagem }),
    });
    if (!resposta.ok) {
      return { status: 'FALHA', erro: `API de WhatsApp respondeu ${resposta.status}.` };
    }
    return { status: 'ENVIADA' };
  } catch (error) {
    return { status: 'FALHA', erro: error.message };
  }
}

const PROVEDOR_SIMULADO = { enviarEmail: enviarEmailSimulado, enviarWhatsapp: enviarWhatsappSimulado };
const PROVEDOR_REAL = { enviarEmail: enviarEmailReal, enviarWhatsapp: enviarWhatsappReal };

export function obterProvedor() {
  return process.env.PROVEDOR_NOTIFICACAO === 'real' ? PROVEDOR_REAL : PROVEDOR_SIMULADO;
}
