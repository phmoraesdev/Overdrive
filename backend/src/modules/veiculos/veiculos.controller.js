import { z } from 'zod';
import * as veiculosService from './veiculos.service.js';
import {
  atualizarVeiculoSchema,
  criarVeiculoSchema,
  transferirVeiculoSchema,
} from './veiculos.schemas.js';

const definirAtivoSchema = z.object({ ativo: z.boolean() });

export async function listarPorCliente(req, res) {
  const veiculos = await veiculosService.listarPorCliente(req.query.clienteId);
  res.json(veiculos);
}

export async function buscarPorId(req, res) {
  const veiculo = await veiculosService.buscarPorId(req.params.id);
  res.json(veiculo);
}

export async function criar(req, res) {
  const dados = criarVeiculoSchema.parse(req.body);
  const veiculo = await veiculosService.criar(dados);
  res.status(201).json(veiculo);
}

export async function atualizar(req, res) {
  const dados = atualizarVeiculoSchema.parse(req.body);
  const veiculo = await veiculosService.atualizar(req.params.id, dados);
  res.json(veiculo);
}

export async function definirAtivo(req, res) {
  const { ativo } = definirAtivoSchema.parse(req.body);
  const veiculo = await veiculosService.definirAtivo(req.params.id, ativo);
  res.json(veiculo);
}

export async function transferirProprietario(req, res) {
  const { novoClienteId } = transferirVeiculoSchema.parse(req.body);
  const veiculo = await veiculosService.transferirProprietario(req.params.id, novoClienteId);
  res.json(veiculo);
}
