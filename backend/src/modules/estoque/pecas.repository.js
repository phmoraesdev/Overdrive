import prisma from '../../shared/prismaClient.js';

export const CAMPOS_PUBLICOS = {
  id: true,
  codigo: true,
  descricao: true,
  precoCusto: true,
  precoVenda: true,
  quantidade: true,
  quantidadeMinima: true,
  ativo: true,
  createdAt: true,
  updatedAt: true,
};

export function buscarPorCodigo(codigo) {
  return prisma.peca.findUnique({ where: { codigo } });
}

export function buscarPorId(id) {
  return prisma.peca.findUnique({ where: { id }, select: CAMPOS_PUBLICOS });
}

export function listar({ busca } = {}) {
  return prisma.peca.findMany({
    where: busca
      ? { OR: [{ codigo: { contains: busca } }, { descricao: { contains: busca } }] }
      : {},
    select: CAMPOS_PUBLICOS,
    orderBy: { descricao: 'asc' },
  });
}

// Usada para o alerta de estoque mínimo (PB18): peça inativa não precisa de
// reposição, então fica de fora.
export function listarAtivas() {
  return prisma.peca.findMany({
    where: { ativo: true },
    select: CAMPOS_PUBLICOS,
    orderBy: { descricao: 'asc' },
  });
}

export function criar(dados) {
  return prisma.peca.create({ data: dados, select: CAMPOS_PUBLICOS });
}

export function atualizar(id, dados) {
  return prisma.peca.update({ where: { id }, data: dados, select: CAMPOS_PUBLICOS });
}

export function definirAtivo(id, ativo) {
  return prisma.peca.update({ where: { id }, data: { ativo }, select: CAMPOS_PUBLICOS });
}

// Usado pelo encerramento de OS (PB17/RF14): recebe o client de uma
// transação já aberta pelo módulo de ordens, para que a baixa de estoque e o
// encerramento da OS gravem (ou revertam) juntos, atomicamente. Por isso
// `tx` é obrigatório aqui, diferente das demais funções deste arquivo.
export function buscarPorIdNaTransacao(tx, id) {
  return tx.peca.findUnique({ where: { id } });
}

export async function darBaixaEstoque(tx, { pecaId, quantidade, ordemServicoId }) {
  await tx.peca.update({
    where: { id: pecaId },
    data: { quantidade: { decrement: quantidade } },
  });

  return tx.movimentacaoEstoque.create({
    data: {
      tipo: 'SAIDA',
      quantidade,
      motivo: 'Baixa automática por encerramento de OS',
      pecaId,
      ordemServicoId,
    },
  });
}
