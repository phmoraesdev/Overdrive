import * as notificacoesRepository from './notificacoes.repository.js';
import { obterProvedor } from './notificacoes.provedores.js';

function mensagemPronto(ordemServico) {
  return (
    `Olá, ${ordemServico.cliente.nome}! Seu veículo ${ordemServico.veiculo.placa} ` +
    `está pronto para retirada (OS nº ${ordemServico.numero}).`
  );
}

async function enviarEGravar(canal, { destinatario, mensagem, assunto, ordemServicoId }, provedor) {
  const resultado =
    canal === 'EMAIL'
      ? await provedor.enviarEmail({ destinatario, assunto, corpo: mensagem })
      : await provedor.enviarWhatsapp({ destinatario, mensagem });

  return notificacoesRepository.criar({
    ordemServicoId,
    canal,
    destinatario,
    mensagem,
    status: resultado.status,
    erro: resultado.erro ?? null,
  });
}

// RF11/PB14: avisa o cliente quando a OS fica pronta para retirada, por
// e-mail e WhatsApp (o canal que o cliente tiver cadastrado). Sem nenhum
// contato cadastrado, não há como notificar — a recepção precisa ligar.
export async function notificarClientePronto(ordemServico, provedor = obterProvedor()) {
  const { cliente } = ordemServico;
  const temEmail = Boolean(cliente.email);
  const temTelefone = Boolean(cliente.telefone);

  if (!temEmail && !temTelefone) {
    return { enviadas: [], alertaRecepcao: true };
  }

  const mensagem = mensagemPronto(ordemServico);
  const enviadas = [];

  if (temEmail) {
    enviadas.push(
      await enviarEGravar(
        'EMAIL',
        {
          destinatario: cliente.email,
          mensagem,
          assunto: `OS nº ${ordemServico.numero} pronta para retirada`,
          ordemServicoId: ordemServico.id,
        },
        provedor,
      ),
    );
  }

  if (temTelefone) {
    enviadas.push(
      await enviarEGravar(
        'WHATSAPP',
        { destinatario: cliente.telefone, mensagem, ordemServicoId: ordemServico.id },
        provedor,
      ),
    );
  }

  return { enviadas, alertaRecepcao: false };
}

export function listarPorOrdemServico(ordemServicoId) {
  return notificacoesRepository.listarPorOrdemServico(ordemServicoId);
}
