import prisma from '../../shared/prismaClient.js';

export const CAMPOS_PUBLICOS = {
  id: true,
  tipo: true,
  fornecedor: true,
  descricao: true,
  valor: true,
  valorPago: true,
  vencimento: true,
  status: true,
  formaPagamento: true,
  pagaEm: true,
  ordemServicoId: true,
  createdAt: true,
  updatedAt: true,
};

export function listar({ tipo, status } = {}) {
  return prisma.conta.findMany({
    where: { ...(tipo && { tipo }), ...(status && { status }) },
    select: CAMPOS_PUBLICOS,
    orderBy: { vencimento: 'asc' },
  });
}

export function buscarPorId(id) {
  return prisma.conta.findUnique({ where: { id }, select: CAMPOS_PUBLICOS });
}

export function criar(dados) {
  return prisma.conta.create({ data: dados, select: CAMPOS_PUBLICOS });
}

export function atualizar(id, dados) {
  return prisma.conta.update({ where: { id }, data: dados, select: CAMPOS_PUBLICOS });
}

export function baixar(id, dados) {
  return prisma.conta.update({
    where: { id },
    data: { status: 'PAGA', ...dados },
    select: CAMPOS_PUBLICOS,
  });
}

export function remover(id) {
  return prisma.conta.delete({ where: { id } });
}

// Usado pelo fluxo de caixa (PB19): só o que já foi efetivamente pago, no
// período pedido.
export function listarPagasNoPeriodo(inicio, fim) {
  return prisma.conta.findMany({
    where: { status: 'PAGA', pagaEm: { gte: inicio, lt: fim } },
    select: { tipo: true, valor: true, valorPago: true, pagaEm: true },
  });
}
