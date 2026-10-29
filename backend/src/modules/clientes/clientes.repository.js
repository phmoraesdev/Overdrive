import prisma from '../../shared/prismaClient.js';

export const CAMPOS_PUBLICOS = {
  id: true,
  nome: true,
  cpf: true,
  telefone: true,
  email: true,
  endereco: true,
  ativo: true,
  createdAt: true,
  updatedAt: true,
};

export function buscarPorCpf(cpf) {
  return prisma.cliente.findUnique({ where: { cpf } });
}

export function buscarPorId(id) {
  return prisma.cliente.findUnique({ where: { id }, select: CAMPOS_PUBLICOS });
}

export function listar({ busca } = {}) {
  return prisma.cliente.findMany({
    where: busca
      ? { OR: [{ nome: { contains: busca } }, { cpf: { contains: busca } }] }
      : {},
    select: CAMPOS_PUBLICOS,
    orderBy: { nome: 'asc' },
  });
}

export function criar(dados) {
  return prisma.cliente.create({ data: dados, select: CAMPOS_PUBLICOS });
}

export function atualizar(id, dados) {
  return prisma.cliente.update({ where: { id }, data: dados, select: CAMPOS_PUBLICOS });
}

export function definirAtivo(id, ativo) {
  return prisma.cliente.update({ where: { id }, data: { ativo }, select: CAMPOS_PUBLICOS });
}
