import { z } from 'zod';
import * as pecasService from './pecas.service.js';
import { atualizarPecaSchema, criarPecaSchema } from './pecas.schemas.js';

const definirAtivoSchema = z.object({ ativo: z.boolean() });

export async function listar(req, res) {
  const pecas = await pecasService.listar({ busca: req.query.busca });
  res.json(pecas);
}

export async function listarEmAlerta(req, res) {
  const pecas = await pecasService.listarEmAlerta();
  res.json(pecas);
}

export async function buscarPorId(req, res) {
  const peca = await pecasService.buscarPorId(req.params.id);
  res.json(peca);
}

export async function criar(req, res) {
  const dados = criarPecaSchema.parse(req.body);
  const peca = await pecasService.criar(dados);
  res.status(201).json(peca);
}

export async function atualizar(req, res) {
  const dados = atualizarPecaSchema.parse(req.body);
  const peca = await pecasService.atualizar(req.params.id, dados);
  res.json(peca);
}

export async function definirAtivo(req, res) {
  const { ativo } = definirAtivoSchema.parse(req.body);
  const peca = await pecasService.definirAtivo(req.params.id, ativo);
  res.json(peca);
}
