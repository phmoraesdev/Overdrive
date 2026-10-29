import api from './api';

export async function listar({ busca } = {}) {
  const { data } = await api.get('/clientes', { params: { busca } });
  return data;
}

export async function buscarPorId(id) {
  const { data } = await api.get(`/clientes/${id}`);
  return data;
}

export async function criar(dados) {
  const { data } = await api.post('/clientes', dados);
  return data;
}

export async function atualizar(id, dados) {
  const { data } = await api.patch(`/clientes/${id}`, dados);
  return data;
}

export async function definirAtivo(id, ativo) {
  const { data } = await api.patch(`/clientes/${id}/ativo`, { ativo });
  return data;
}
