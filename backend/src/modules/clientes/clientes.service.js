import { limparCpf } from '../../shared/cpf.js';
import { ConflitoError, NaoEncontradoError } from '../../shared/errors.js';
import * as clientesRepository from './clientes.repository.js';

export function listar(filtros) {
  return clientesRepository.listar(filtros);
}

export async function buscarPorId(id) {
  const cliente = await clientesRepository.buscarPorId(id);
  if (!cliente) {
    throw new NaoEncontradoError('Cliente não encontrado.');
  }
  return cliente;
}

export async function criar(dados) {
  const cpf = limparCpf(dados.cpf);
  const existente = await clientesRepository.buscarPorCpf(cpf);
  if (existente) {
    throw new ConflitoError('Já existe um cliente cadastrado com este CPF.');
  }

  return clientesRepository.criar({
    nome: dados.nome,
    cpf,
    telefone: dados.telefone,
    email: dados.email || null,
    endereco: dados.endereco || null,
  });
}

export async function atualizar(id, dados) {
  const cliente = await clientesRepository.buscarPorId(id);
  if (!cliente) {
    throw new NaoEncontradoError('Cliente não encontrado.');
  }

  const atualizacoes = {
    ...(dados.nome && { nome: dados.nome }),
    ...(dados.telefone && { telefone: dados.telefone }),
    ...(dados.email !== undefined && { email: dados.email || null }),
    ...(dados.endereco !== undefined && { endereco: dados.endereco || null }),
  };

  if (dados.cpf) {
    const cpf = limparCpf(dados.cpf);
    if (cpf !== cliente.cpf) {
      const existente = await clientesRepository.buscarPorCpf(cpf);
      if (existente) {
        throw new ConflitoError('Já existe um cliente cadastrado com este CPF.');
      }
    }
    atualizacoes.cpf = cpf;
  }

  return clientesRepository.atualizar(id, atualizacoes);
}

export async function definirAtivo(id, ativo) {
  const cliente = await clientesRepository.buscarPorId(id);
  if (!cliente) {
    throw new NaoEncontradoError('Cliente não encontrado.');
  }
  return clientesRepository.definirAtivo(id, ativo);
}
