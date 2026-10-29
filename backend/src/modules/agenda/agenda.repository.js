import prisma from '../../shared/prismaClient.js';

export const CAMPOS_PUBLICOS = {
  id: true,
  dataHora: true,
  status: true,
  observacoes: true,
  clienteId: true,
  veiculoId: true,
  createdAt: true,
  updatedAt: true,
};

const STATUS_ATIVOS = ['AGENDADO', 'REAGENDADO'];

export function contarAtivosNoHorario(dataHora, ignorarId) {
  return prisma.agendamento.count({
    where: {
      dataHora,
      status: { in: STATUS_ATIVOS },
      ...(ignorarId && { id: { not: ignorarId } }),
    },
  });
}

export function buscarPorId(id) {
  return prisma.agendamento.findUnique({ where: { id }, select: CAMPOS_PUBLICOS });
}

export function criar(dados) {
  return prisma.agendamento.create({ data: dados, select: CAMPOS_PUBLICOS });
}

export function atualizar(id, dados) {
  return prisma.agendamento.update({ where: { id }, data: dados, select: CAMPOS_PUBLICOS });
}

export function listarPorPeriodo(inicio, fim) {
  return prisma.agendamento.findMany({
    where: { dataHora: { gte: inicio, lt: fim } },
    select: {
      ...CAMPOS_PUBLICOS,
      cliente: { select: { id: true, nome: true, telefone: true } },
      veiculo: { select: { id: true, placa: true, marca: true, modelo: true } },
    },
    orderBy: { dataHora: 'asc' },
  });
}
