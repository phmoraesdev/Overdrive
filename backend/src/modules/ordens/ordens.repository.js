import prisma from '../../shared/prismaClient.js';
import { ConflitoError } from '../../shared/errors.js';
import { dividirEmParcelas } from '../../shared/dinheiro.js';
import * as pecasRepository from '../estoque/pecas.repository.js';

export const CAMPOS_PUBLICOS = {
  id: true,
  numero: true,
  status: true,
  kmEntrada: true,
  problemaRelatado: true,
  abertaEm: true,
  encerradaEm: true,
  decisaoOrcamento: true,
  meioContatoDecisao: true,
  motivoReprovacao: true,
  decisaoRegistradaEm: true,
  clienteId: true,
  veiculoId: true,
  mecanicoId: true,
  abertaPorId: true,
  createdAt: true,
  updatedAt: true,
};

// Usado no detalhe da OS: checklist, itens do orçamento, histórico de status
// (com quem alterou) e as contas/parcelas geradas no encerramento.
export const DETALHE_INCLUDE = {
  checklistEntrada: true,
  itensOrcamento: { orderBy: { createdAt: 'asc' } },
  historicosStatus: {
    orderBy: { alteradoEm: 'asc' },
    include: { funcionario: { select: { id: true, nome: true } } },
  },
  contas: { include: { parcelas: { orderBy: { numero: 'asc' } } } },
  veiculo: { select: { id: true, placa: true, marca: true, modelo: true } },
  cliente: { select: { id: true, nome: true, telefone: true, email: true } },
};

// Em andamento = ainda não chegou a um estado final do diagrama de estados
// (docs/Overdrive_Requisitos_e_Modelagem.docx): nem Reprovada, nem Encerrada.
export function buscarEmAndamentoPorVeiculo(veiculoId) {
  return prisma.ordemServico.findFirst({
    where: { veiculoId, status: { notIn: ['REPROVADA', 'ENCERRADA'] } },
    orderBy: { abertaEm: 'desc' },
    select: CAMPOS_PUBLICOS,
  });
}

export function buscarUltimaPorVeiculo(veiculoId) {
  return prisma.ordemServico.findFirst({
    where: { veiculoId },
    orderBy: { abertaEm: 'desc' },
    select: CAMPOS_PUBLICOS,
  });
}

export function listarPorVeiculo(veiculoId) {
  return prisma.ordemServico.findMany({
    where: { veiculoId },
    orderBy: { abertaEm: 'desc' },
    select: CAMPOS_PUBLICOS,
  });
}

// Painel Kanban (PB13): todas as OS que ainda estão em algum ponto do fluxo.
// `cliente.email`/`telefone` não são usados pelo painel em si — servem para
// o dashboard (modules/dashboard) calcular o alerta de cliente sem contato
// sem precisar de outra consulta.
export function listarParaPainel() {
  return prisma.ordemServico.findMany({
    where: { status: { notIn: ['ENCERRADA', 'REPROVADA'] } },
    select: {
      ...CAMPOS_PUBLICOS,
      veiculo: { select: { placa: true, marca: true, modelo: true } },
      cliente: { select: { nome: true, email: true, telefone: true } },
    },
    orderBy: { abertaEm: 'asc' },
  });
}

export function buscarPorId(id) {
  return prisma.ordemServico.findUnique({ where: { id }, include: DETALHE_INCLUDE });
}

async function proximoNumero(tx) {
  const ultima = await tx.ordemServico.findFirst({
    orderBy: { numero: 'desc' },
    select: { numero: true },
  });
  return (ultima?.numero ?? 0) + 1;
}

export async function criarComChecklist({
  veiculoId,
  clienteId,
  kmEntrada,
  problemaRelatado,
  abertaPorId,
  checklist,
}) {
  return prisma.$transaction(async (tx) => {
    const numero = await proximoNumero(tx);

    return tx.ordemServico.create({
      data: {
        numero,
        kmEntrada,
        problemaRelatado,
        veiculoId,
        clienteId,
        abertaPorId,
        checklistEntrada: {
          create: {
            avarias: JSON.stringify(checklist.avarias ?? []),
            nivelCombustivel: checklist.nivelCombustivel,
            itensPresentes: JSON.stringify(checklist.itensPresentes ?? []),
            observacoes: checklist.observacoes || null,
          },
        },
      },
      include: { checklistEntrada: true },
    });
  });
}

// --- PB11: orçamento -----------------------------------------------------

export function listarItensOrcamento(ordemServicoId) {
  return prisma.itemOrcamento.findMany({
    where: { ordemServicoId },
    orderBy: { createdAt: 'asc' },
  });
}

export function buscarItemOrcamento(id) {
  return prisma.itemOrcamento.findUnique({ where: { id } });
}

export function criarItemOrcamento(ordemServicoId, dados) {
  return prisma.itemOrcamento.create({
    data: {
      ordemServicoId,
      tipo: dados.tipo,
      descricao: dados.descricao,
      quantidade: dados.quantidade,
      valorUnitario: dados.valorUnitario,
      pecaId: dados.pecaId ?? null,
    },
  });
}

export function atualizarItemOrcamento(id, dados) {
  return prisma.itemOrcamento.update({ where: { id }, data: dados });
}

export function removerItemOrcamento(id) {
  return prisma.itemOrcamento.delete({ where: { id } });
}

export async function finalizarOrcamento({ id, statusAnterior, funcionarioId }) {
  return prisma.$transaction(async (tx) => {
    await tx.historicoStatusOS.create({
      data: {
        ordemServicoId: id,
        statusAnterior,
        statusNovo: 'AGUARDANDO_APROVACAO',
        funcionarioId,
      },
    });

    return tx.ordemServico.update({
      where: { id },
      // Quem monta e finaliza o orçamento é quem fica responsável pela OS
      // (RF17/PB20 usa isso para o relatório de desempenho por mecânico).
      data: { status: 'AGUARDANDO_APROVACAO', mecanicoId: funcionarioId },
      include: DETALHE_INCLUDE,
    });
  });
}

// --- PB12: decisão do orçamento -------------------------------------------

export async function registrarDecisao({
  id,
  statusAnterior,
  statusNovo,
  decisao,
  meioContato,
  motivo,
  itensAprovadosIds,
  funcionarioId,
}) {
  return prisma.$transaction(async (tx) => {
    if (decisao === 'APROVADO') {
      await tx.itemOrcamento.updateMany({
        where: { ordemServicoId: id },
        data: { aprovado: true },
      });
    } else if (decisao === 'APROVADO_PARCIAL') {
      await tx.itemOrcamento.updateMany({
        where: { ordemServicoId: id },
        data: { aprovado: false },
      });
      await tx.itemOrcamento.updateMany({
        where: { ordemServicoId: id, id: { in: itensAprovadosIds } },
        data: { aprovado: true },
      });
    }
    // REPROVADO: nenhum item fica aprovado (já nascem com aprovado: false).

    await tx.historicoStatusOS.create({
      data: { ordemServicoId: id, statusAnterior, statusNovo, funcionarioId },
    });

    return tx.ordemServico.update({
      where: { id },
      data: {
        status: statusNovo,
        decisaoOrcamento: decisao,
        meioContatoDecisao: meioContato,
        motivoReprovacao: decisao === 'REPROVADO' ? motivo : null,
        decisaoRegistradaEm: new Date(),
      },
      include: DETALHE_INCLUDE,
    });
  });
}

// --- PB13: status da OS ----------------------------------------------------

export async function atualizarStatus({ id, statusAnterior, statusNovo, funcionarioId }) {
  return prisma.$transaction(async (tx) => {
    await tx.historicoStatusOS.create({
      data: { ordemServicoId: id, statusAnterior, statusNovo, funcionarioId },
    });

    return tx.ordemServico.update({
      where: { id },
      data: { status: statusNovo },
      include: DETALHE_INCLUDE,
    });
  });
}

// --- PB16 + PB17: encerramento, pagamento e baixa de estoque --------------

const TRINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000;

// Encerramento e baixa de estoque na mesma transação (PB17): se qualquer
// peça tiver saldo insuficiente, nada é gravado — nem a baixa, nem a conta,
// nem a mudança de status.
export async function encerrarComPagamentoEBaixa({
  id,
  numero,
  statusAnterior,
  formaPagamento,
  numeroParcelas,
  valorTotal,
  itensParaBaixa,
  funcionarioId,
}) {
  return prisma.$transaction(async (tx) => {
    for (const item of itensParaBaixa) {
      const peca = await pecasRepository.buscarPorIdNaTransacao(tx, item.pecaId);
      if (!peca || peca.quantidade < item.quantidade) {
        throw new ConflitoError(
          `Estoque insuficiente para "${peca?.descricao ?? item.pecaId}" ` +
            `(saldo: ${peca?.quantidade ?? 0}, necessário: ${item.quantidade}).`,
        );
      }
    }

    for (const item of itensParaBaixa) {
      await pecasRepository.darBaixaEstoque(tx, {
        pecaId: item.pecaId,
        quantidade: item.quantidade,
        ordemServicoId: id,
      });
    }

    const agora = new Date();
    const parcelado = numeroParcelas > 1;
    const valoresParcelas = parcelado ? dividirEmParcelas(valorTotal, numeroParcelas) : [];

    const conta = await tx.conta.create({
      data: {
        tipo: 'RECEBER',
        descricao: `Pagamento da OS nº ${numero}`,
        valor: valorTotal,
        vencimento: parcelado ? new Date(agora.getTime() + TRINTA_DIAS_MS) : agora,
        formaPagamento,
        status: parcelado ? 'ABERTA' : 'PAGA',
        pagaEm: parcelado ? null : agora,
        ordemServicoId: id,
        ...(parcelado && {
          parcelas: {
            create: valoresParcelas.map((valor, indice) => ({
              numero: indice + 1,
              valor,
              vencimento: new Date(agora.getTime() + (indice + 1) * TRINTA_DIAS_MS),
            })),
          },
        }),
      },
      include: { parcelas: { orderBy: { numero: 'asc' } } },
    });

    await tx.historicoStatusOS.create({
      data: { ordemServicoId: id, statusAnterior, statusNovo: 'ENCERRADA', funcionarioId },
    });

    const ordemServico = await tx.ordemServico.update({
      where: { id },
      data: { status: 'ENCERRADA', encerradaEm: agora },
      include: DETALHE_INCLUDE,
    });

    return { ordemServico, conta };
  });
}
