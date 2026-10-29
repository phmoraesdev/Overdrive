import { limparPlaca } from '../../shared/placa.js';
import { ConflitoError, NaoEncontradoError } from '../../shared/errors.js';
import * as clientesService from '../clientes/clientes.service.js';
import * as veiculosRepository from './veiculos.repository.js';

export function listarPorCliente(clienteId) {
  return veiculosRepository.listarPorCliente(clienteId);
}

export async function buscarPorId(id) {
  const veiculo = await veiculosRepository.buscarPorId(id);
  if (!veiculo) {
    throw new NaoEncontradoError('Veículo não encontrado.');
  }
  return veiculo;
}

export async function criar(dados) {
  const placa = limparPlaca(dados.placa);

  const existente = await veiculosRepository.buscarPorPlaca(placa);
  if (existente) {
    throw new ConflitoError('Já existe um veículo cadastrado com esta placa.');
  }

  await clientesService.buscarPorId(dados.clienteId);

  return veiculosRepository.criar({
    placa,
    marca: dados.marca,
    modelo: dados.modelo,
    ano: dados.ano,
    cor: dados.cor || null,
    km: dados.km ?? 0,
    clienteId: dados.clienteId,
  });
}

export async function atualizar(id, dados) {
  const veiculo = await veiculosRepository.buscarPorId(id);
  if (!veiculo) {
    throw new NaoEncontradoError('Veículo não encontrado.');
  }

  const atualizacoes = {
    ...(dados.marca && { marca: dados.marca }),
    ...(dados.modelo && { modelo: dados.modelo }),
    ...(dados.ano && { ano: dados.ano }),
    ...(dados.cor !== undefined && { cor: dados.cor || null }),
    ...(dados.km !== undefined && { km: dados.km }),
  };

  if (dados.placa) {
    const placa = limparPlaca(dados.placa);
    if (placa !== veiculo.placa) {
      const existente = await veiculosRepository.buscarPorPlaca(placa);
      if (existente) {
        throw new ConflitoError('Já existe um veículo cadastrado com esta placa.');
      }
    }
    atualizacoes.placa = placa;
  }

  return veiculosRepository.atualizar(id, atualizacoes);
}

export async function definirAtivo(id, ativo) {
  const veiculo = await veiculosRepository.buscarPorId(id);
  if (!veiculo) {
    throw new NaoEncontradoError('Veículo não encontrado.');
  }
  return veiculosRepository.definirAtivo(id, ativo);
}

export async function transferirProprietario(id, novoClienteId) {
  const veiculo = await veiculosRepository.buscarPorId(id);
  if (!veiculo) {
    throw new NaoEncontradoError('Veículo não encontrado.');
  }

  await clientesService.buscarPorId(novoClienteId);

  return veiculosRepository.atualizar(id, { clienteId: novoClienteId });
}
