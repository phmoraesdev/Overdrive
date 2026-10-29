import api from './api';

export async function buscarParaAbertura(placa) {
  const { data } = await api.get('/ordens/buscar-veiculo', { params: { placa } });
  return data;
}

export async function listarHistoricoPorPlaca(placa) {
  const { data } = await api.get('/ordens', { params: { placa } });
  return data;
}

export async function buscarPorId(id) {
  const { data } = await api.get(`/ordens/${id}`);
  return data;
}

export async function abrir(dados) {
  const { data } = await api.post('/ordens', dados);
  return data;
}

export async function listarPainel() {
  const { data } = await api.get('/ordens/painel');
  return data;
}

// --- PB11: orçamento ---

export async function listarOrcamento(ordemServicoId) {
  const { data } = await api.get(`/ordens/${ordemServicoId}/orcamento`);
  return data;
}

export async function adicionarItemOrcamento(ordemServicoId, dados) {
  const { data } = await api.post(`/ordens/${ordemServicoId}/orcamento/itens`, dados);
  return data;
}

export async function atualizarItemOrcamento(ordemServicoId, itemId, dados) {
  const { data } = await api.patch(`/ordens/${ordemServicoId}/orcamento/itens/${itemId}`, dados);
  return data;
}

export async function removerItemOrcamento(ordemServicoId, itemId) {
  await api.delete(`/ordens/${ordemServicoId}/orcamento/itens/${itemId}`);
}

export async function finalizarOrcamento(ordemServicoId) {
  const { data } = await api.post(`/ordens/${ordemServicoId}/orcamento/finalizar`);
  return data;
}

// --- PB12: decisão do orçamento ---

export async function registrarDecisao(ordemServicoId, dados) {
  const { data } = await api.post(`/ordens/${ordemServicoId}/decisao`, dados);
  return data;
}

// --- PB13: status da OS ---

export async function atualizarStatus(ordemServicoId, status) {
  const { data } = await api.patch(`/ordens/${ordemServicoId}/status`, { status });
  return data;
}

// --- PB16 + PB17: encerramento, pagamento e baixa de estoque ---

export async function encerrar(ordemServicoId, dados) {
  const { data } = await api.post(`/ordens/${ordemServicoId}/encerrar`, dados);
  return data;
}

export function urlRecibo(ordemServicoId) {
  return `/api/ordens/${ordemServicoId}/recibo`;
}

// --- PB14: notificações ao cliente ---

export async function listarNotificacoes(ordemServicoId) {
  const { data } = await api.get(`/ordens/${ordemServicoId}/notificacoes`);
  return data;
}
