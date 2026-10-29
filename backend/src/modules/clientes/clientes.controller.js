import { z } from 'zod';
import * as clientesService from './clientes.service.js';
import { atualizarClienteSchema, criarClienteSchema } from './clientes.schemas.js';

const definirAtivoSchema = z.object({ ativo: z.boolean() });

export async function listar(req, res) {
  const clientes = await clientesService.listar({ busca: req.query.busca });
  res.json(clientes);
}

export async function buscarPorId(req, res) {
  const cliente = await clientesService.buscarPorId(req.params.id);
  res.json(cliente);
}

export async function criar(req, res) {
  const dados = criarClienteSchema.parse(req.body);
  const cliente = await clientesService.criar(dados);
  res.status(201).json(cliente);
}

export async function atualizar(req, res) {
  const dados = atualizarClienteSchema.parse(req.body);
  const cliente = await clientesService.atualizar(req.params.id, dados);
  res.json(cliente);
}

export async function definirAtivo(req, res) {
  const { ativo } = definirAtivoSchema.parse(req.body);
  const cliente = await clientesService.definirAtivo(req.params.id, ativo);
  res.json(cliente);
}
