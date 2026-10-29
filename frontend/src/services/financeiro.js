import api from './api';

export async function listar({ tipo, status } = {}) {
  const { data } = await api.get('/financeiro', { params: { tipo, status } });
  return data;
}

export async function buscarPorId(id) {
  const { data } = await api.get(`/financeiro/${id}`);
  return data;
}

export async function criar(dados) {
  const { data } = await api.post('/financeiro', dados);
  return data;
}

export async function atualizar(id, dados) {
  const { data } = await api.patch(`/financeiro/${id}`, dados);
  return data;
}

export async function remover(id) {
  await api.delete(`/financeiro/${id}`);
}

export async function baixar(id, dados) {
  const { data } = await api.patch(`/financeiro/${id}/baixa`, dados);
  return data;
}

export async function fluxoCaixa(inicio, fim) {
  const { data } = await api.get('/financeiro/fluxo-caixa', { params: { inicio, fim } });
  return data;
}
