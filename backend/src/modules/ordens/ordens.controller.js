import * as ordensService from './ordens.service.js';
import {
  abrirOrdemServicoSchema,
  atualizarItemOrcamentoSchema,
  atualizarStatusSchema,
  criarItemOrcamentoSchema,
  encerrarOrdemServicoSchema,
  registrarDecisaoSchema,
} from './ordens.schemas.js';

export async function buscarParaAbertura(req, res) {
  const dados = await ordensService.buscarParaAbertura(req.query.placa);
  res.json(dados);
}

export async function listarPorPlaca(req, res) {
  const ordens = await ordensService.listarHistoricoPorPlaca(req.query.placa);
  res.json(ordens);
}

export async function listarPainel(req, res) {
  const ordens = await ordensService.listarParaPainel();
  res.json(ordens);
}

export async function buscarPorId(req, res) {
  const ordemServico = await ordensService.buscarPorId(req.params.id);
  res.json(ordemServico);
}

export async function abrir(req, res) {
  const dados = abrirOrdemServicoSchema.parse(req.body);
  const ordemServico = await ordensService.abrir(dados, req.user.id);
  res.status(201).json(ordemServico);
}

// --- PB11: orçamento ---------------------------------------------------

export async function listarOrcamento(req, res) {
  const orcamento = await ordensService.listarOrcamento(req.params.id);
  res.json(orcamento);
}

export async function adicionarItemOrcamento(req, res) {
  const dados = criarItemOrcamentoSchema.parse(req.body);
  const resultado = await ordensService.adicionarItemOrcamento(req.params.id, dados);
  res.status(201).json(resultado);
}

export async function atualizarItemOrcamento(req, res) {
  const dados = atualizarItemOrcamentoSchema.parse(req.body);
  const resultado = await ordensService.atualizarItemOrcamento(
    req.params.id,
    req.params.itemId,
    dados,
  );
  res.json(resultado);
}

export async function removerItemOrcamento(req, res) {
  await ordensService.removerItemOrcamento(req.params.id, req.params.itemId);
  res.status(204).end();
}

export async function finalizarOrcamento(req, res) {
  const ordemServico = await ordensService.finalizarOrcamento(req.params.id, req.user.id);
  res.json(ordemServico);
}

// --- PB12: decisão do orçamento -------------------------------------------

export async function registrarDecisao(req, res) {
  const dados = registrarDecisaoSchema.parse(req.body);
  const ordemServico = await ordensService.registrarDecisao(req.params.id, dados, req.user.id);
  res.json(ordemServico);
}

// --- PB13: status da OS ------------------------------------------------------

export async function atualizarStatus(req, res) {
  const { status } = atualizarStatusSchema.parse(req.body);
  const ordemServico = await ordensService.atualizarStatus(req.params.id, status, req.user.id);
  res.json(ordemServico);
}

// --- PB16 + PB17: encerramento, pagamento e baixa de estoque -----------------

export async function encerrar(req, res) {
  const dados = encerrarOrdemServicoSchema.parse(req.body);
  const resultado = await ordensService.encerrar(req.params.id, dados, req.user.id);
  res.json(resultado);
}

export async function gerarRecibo(req, res) {
  const buffer = await ordensService.gerarRecibo(req.params.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="recibo-os-${req.params.id}.pdf"`);
  res.send(buffer);
}

// --- PB14: notificações ------------------------------------------------------

export async function listarNotificacoes(req, res) {
  const notificacoes = await ordensService.listarNotificacoes(req.params.id);
  res.json(notificacoes);
}
