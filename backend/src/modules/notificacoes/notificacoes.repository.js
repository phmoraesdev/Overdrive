import prisma from '../../shared/prismaClient.js';

export function criar(dados) {
  return prisma.notificacao.create({ data: dados });
}

export function listarPorOrdemServico(ordemServicoId) {
  return prisma.notificacao.findMany({
    where: { ordemServicoId },
    orderBy: { enviadaEm: 'desc' },
  });
}
