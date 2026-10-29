import * as financeiroService from './financeiro.service.js';
import {
  atualizarContaSchema,
  baixarContaSchema,
  criarContaSchema,
  fluxoCaixaSchema,
} from './financeiro.schemas.js';

export async function listar(req, res) {
  const contas = await financeiroService.listar({ tipo: req.query.tipo, status: req.query.status });
  res.json(contas);
}

export async function buscarPorId(req, res) {
  const conta = await financeiroService.buscarPorId(req.params.id);
  res.json(conta);
}

export async function criar(req, res) {
  const dados = criarContaSchema.parse(req.body);
  const conta = await financeiroService.criar(dados);
  res.status(201).json(conta);
}

export async function atualizar(req, res) {
  const dados = atualizarContaSchema.parse(req.body);
  const conta = await financeiroService.atualizar(req.params.id, dados);
  res.json(conta);
}

export async function remover(req, res) {
  await financeiroService.remover(req.params.id);
  res.status(204).end();
}

export async function baixar(req, res) {
  const dados = baixarContaSchema.parse(req.body);
  const conta = await financeiroService.baixar(req.params.id, dados);
  res.json(conta);
}

export async function fluxoCaixa(req, res) {
  const { inicio, fim } = fluxoCaixaSchema.parse(req.query);
  const resultado = await financeiroService.fluxoCaixa(inicio, fim);
  res.json(resultado);
}
