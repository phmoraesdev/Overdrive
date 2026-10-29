import bcrypt from 'bcrypt';
import { AppError, ConflitoError, NaoEncontradoError } from '../../shared/errors.js';
import * as funcionariosRepository from './funcionarios.repository.js';

const SALT_ROUNDS = 10;
const MAX_TENTATIVAS = 5;
const DURACAO_BLOQUEIO_MS = 15 * 60 * 1000;

function minutosRestantes(bloqueadoAte) {
  return Math.ceil((bloqueadoAte.getTime() - Date.now()) / 60000);
}

export async function autenticar({ email, senha }) {
  const funcionario = await funcionariosRepository.buscarPorEmailComSenha(email);

  if (!funcionario) {
    throw new AppError('E-mail ou senha incorretos.', 401);
  }

  if (!funcionario.ativo) {
    throw new AppError('Funcionário inativo. Procure um administrador.', 403);
  }

  let tentativasAtuais = funcionario.tentativasLogin;

  if (funcionario.bloqueadoAte) {
    if (funcionario.bloqueadoAte.getTime() > Date.now()) {
      throw new AppError(
        `Conta bloqueada por tentativas incorretas. Tente novamente em ${minutosRestantes(funcionario.bloqueadoAte)} minuto(s).`,
        423,
      );
    }
    // Bloqueio expirado: zera o contador antes de avaliar a tentativa atual.
    tentativasAtuais = 0;
  }

  const senhaCorreta = await bcrypt.compare(senha, funcionario.senhaHash);

  if (!senhaCorreta) {
    const novasTentativas = tentativasAtuais + 1;

    if (novasTentativas >= MAX_TENTATIVAS) {
      await funcionariosRepository.registrarTentativaFalha(funcionario.id, {
        tentativasLogin: novasTentativas,
        bloqueadoAte: new Date(Date.now() + DURACAO_BLOQUEIO_MS),
      });
      throw new AppError(
        'Conta bloqueada por 15 minutos após 5 tentativas de login incorretas.',
        423,
      );
    }

    await funcionariosRepository.registrarTentativaFalha(funcionario.id, {
      tentativasLogin: novasTentativas,
      bloqueadoAte: null,
    });
    throw new AppError('E-mail ou senha incorretos.', 401);
  }

  await funcionariosRepository.registrarLoginSucesso(funcionario.id);

  return {
    id: funcionario.id,
    nome: funcionario.nome,
    email: funcionario.email,
    perfil: funcionario.perfil,
  };
}

export function buscarPorId(id) {
  return funcionariosRepository.buscarPorId(id);
}

export function listar(filtros) {
  return funcionariosRepository.listar(filtros);
}

export async function criar(dados) {
  const existente = await funcionariosRepository.buscarPorEmailComSenha(dados.email);
  if (existente) {
    throw new ConflitoError('Já existe um funcionário cadastrado com este e-mail.');
  }

  const senhaHash = await bcrypt.hash(dados.senha, SALT_ROUNDS);

  return funcionariosRepository.criar({
    nome: dados.nome,
    email: dados.email,
    senhaHash,
    perfil: dados.perfil,
  });
}

export async function atualizar(id, dados) {
  const funcionario = await funcionariosRepository.buscarPorId(id);
  if (!funcionario) {
    throw new NaoEncontradoError('Funcionário não encontrado.');
  }

  if (dados.email && dados.email !== funcionario.email) {
    const existente = await funcionariosRepository.buscarPorEmailComSenha(dados.email);
    if (existente) {
      throw new ConflitoError('Já existe um funcionário cadastrado com este e-mail.');
    }
  }

  const atualizacoes = {
    ...(dados.nome && { nome: dados.nome }),
    ...(dados.email && { email: dados.email }),
    ...(dados.perfil && { perfil: dados.perfil }),
  };

  if (dados.senha) {
    atualizacoes.senhaHash = await bcrypt.hash(dados.senha, SALT_ROUNDS);
  }

  return funcionariosRepository.atualizar(id, atualizacoes);
}

export async function definirAtivo(id, ativo) {
  const funcionario = await funcionariosRepository.buscarPorId(id);
  if (!funcionario) {
    throw new NaoEncontradoError('Funcionário não encontrado.');
  }

  return funcionariosRepository.definirAtivo(id, ativo);
}
