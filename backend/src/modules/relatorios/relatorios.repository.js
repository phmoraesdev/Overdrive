import prisma from '../../shared/prismaClient.js';

// Base de todo relatório desta sprint: OS encerradas no período, com os itens
// aprovados (o que realmente foi cobrado) e o mecânico responsável.
export function listarOrdensEncerradasNoPeriodo(inicio, fim) {
  return prisma.ordemServico.findMany({
    where: { status: 'ENCERRADA', encerradaEm: { gte: inicio, lt: fim } },
    select: {
      id: true,
      numero: true,
      encerradaEm: true,
      mecanicoId: true,
      mecanico: { select: { id: true, nome: true } },
      itensOrcamento: {
        where: { aprovado: true },
        select: { tipo: true, quantidade: true, valorUnitario: true },
      },
    },
    orderBy: { encerradaEm: 'asc' },
  });
}
