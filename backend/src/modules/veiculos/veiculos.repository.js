import prisma from '../../shared/prismaClient.js';

export const CAMPOS_PUBLICOS = {
  id: true,
  placa: true,
  marca: true,
  modelo: true,
  ano: true,
  cor: true,
  km: true,
  ativo: true,
  clienteId: true,
  createdAt: true,
  updatedAt: true,
};

export function buscarPorPlaca(placa) {
  return prisma.veiculo.findUnique({ where: { placa } });
}

export function buscarPorId(id) {
  return prisma.veiculo.findUnique({ where: { id }, select: CAMPOS_PUBLICOS });
}

export function buscarPorPlacaComCliente(placa) {
  return prisma.veiculo.findUnique({
    where: { placa },
    select: {
      ...CAMPOS_PUBLICOS,
      cliente: {
        select: { id: true, nome: true, cpf: true, telefone: true, email: true, ativo: true },
      },
    },
  });
}

export function listarPorCliente(clienteId) {
  return prisma.veiculo.findMany({
    where: { clienteId },
    select: CAMPOS_PUBLICOS,
    orderBy: { placa: 'asc' },
  });
}

export function criar(dados) {
  return prisma.veiculo.create({ data: dados, select: CAMPOS_PUBLICOS });
}

export function atualizar(id, dados) {
  return prisma.veiculo.update({ where: { id }, data: dados, select: CAMPOS_PUBLICOS });
}

export function definirAtivo(id, ativo) {
  return prisma.veiculo.update({ where: { id }, data: { ativo }, select: CAMPOS_PUBLICOS });
}
