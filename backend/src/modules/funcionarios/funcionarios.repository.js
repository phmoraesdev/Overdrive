import prisma from '../../shared/prismaClient.js';

export const CAMPOS_PUBLICOS = {
  id: true,
  nome: true,
  email: true,
  perfil: true,
  ativo: true,
  ultimoLoginEm: true,
  createdAt: true,
  updatedAt: true,
};

export function buscarPorEmailComSenha(email) {
  return prisma.funcionario.findUnique({ where: { email } });
}

export function buscarPorId(id) {
  return prisma.funcionario.findUnique({ where: { id }, select: CAMPOS_PUBLICOS });
}

export function listar({ busca, perfil } = {}) {
  return prisma.funcionario.findMany({
    where: {
      ...(busca
        ? { OR: [{ nome: { contains: busca } }, { email: { contains: busca } }] }
        : {}),
      ...(perfil ? { perfil } : {}),
    },
    select: CAMPOS_PUBLICOS,
    orderBy: { nome: 'asc' },
  });
}

export function criar(dados) {
  return prisma.funcionario.create({ data: dados, select: CAMPOS_PUBLICOS });
}

export function atualizar(id, dados) {
  return prisma.funcionario.update({ where: { id }, data: dados, select: CAMPOS_PUBLICOS });
}

export function definirAtivo(id, ativo) {
  return prisma.funcionario.update({ where: { id }, data: { ativo }, select: CAMPOS_PUBLICOS });
}

export function registrarTentativaFalha(id, { tentativasLogin, bloqueadoAte }) {
  return prisma.funcionario.update({
    where: { id },
    data: { tentativasLogin, bloqueadoAte },
  });
}

export function registrarLoginSucesso(id) {
  return prisma.funcionario.update({
    where: { id },
    data: { tentativasLogin: 0, bloqueadoAte: null, ultimoLoginEm: new Date() },
  });
}

export function resetarTentativas(id) {
  return prisma.funcionario.update({
    where: { id },
    data: { tentativasLogin: 0, bloqueadoAte: null },
  });
}
