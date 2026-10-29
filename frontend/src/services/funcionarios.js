import api from './api';

export async function listar({ busca } = {}) {
  const { data } = await api.get('/funcionarios', { params: { busca } });
  return data;
}

export async function buscarPorId(id) {
  const { data } = await api.get(`/funcionarios/${id}`);
  return data;
}

export async function criar(dados) {
  const { data } = await api.post('/funcionarios', dados);
  return data;
}

export async function atualizar(id, dados) {
  const { data } = await api.patch(`/funcionarios/${id}`, dados);
  return data;
}

export async function definirAtivo(id, ativo) {
  const { data } = await api.patch(`/funcionarios/${id}/ativo`, { ativo });
  return data;
}
