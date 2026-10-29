import { z } from 'zod';
import * as funcionariosService from './funcionarios.service.js';
import { atualizarFuncionarioSchema, criarFuncionarioSchema } from './funcionarios.schemas.js';

const definirAtivoSchema = z.object({ ativo: z.boolean() });

export async function listar(req, res) {
  const funcionarios = await funcionariosService.listar({
    busca: req.query.busca,
    perfil: req.query.perfil,
  });
  res.json(funcionarios);
}

export async function buscarPorId(req, res) {
  const funcionario = await funcionariosService.buscarPorId(req.params.id);
  if (!funcionario) {
    return res.status(404).json({ message: 'Funcionário não encontrado.' });
  }
  return res.json(funcionario);
}

export async function criar(req, res) {
  const dados = criarFuncionarioSchema.parse(req.body);
  const funcionario = await funcionariosService.criar(dados);
  res.status(201).json(funcionario);
}

export async function atualizar(req, res) {
  const dados = atualizarFuncionarioSchema.parse(req.body);
  const funcionario = await funcionariosService.atualizar(req.params.id, dados);
  res.json(funcionario);
}

export async function definirAtivo(req, res) {
  const { ativo } = definirAtivoSchema.parse(req.body);
  const funcionario = await funcionariosService.definirAtivo(req.params.id, ativo);
  res.json(funcionario);
}
