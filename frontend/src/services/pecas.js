import api from './api';

export async function listar({ busca } = {}) {
  const { data } = await api.get('/pecas', { params: { busca } });
  return data;
}

export async function buscarPorId(id) {
  const { data } = await api.get(`/pecas/${id}`);
  return data;
}

export async function listarEmAlerta() {
  const { data } = await api.get('/pecas/alertas');
  return data;
}

export async function criar(dados) {
  const { data } = await api.post('/pecas', dados);
  return data;
}

export async function atualizar(id, dados) {
  const { data } = await api.patch(`/pecas/${id}`, dados);
  return data;
}

export async function definirAtivo(id, ativo) {
  const { data } = await api.patch(`/pecas/${id}/ativo`, { ativo });
  return data;
}
