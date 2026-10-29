import api from './api';

export async function listarPorCliente(clienteId) {
  const { data } = await api.get('/veiculos', { params: { clienteId } });
  return data;
}

export async function criar(dados) {
  const { data } = await api.post('/veiculos', dados);
  return data;
}

export async function atualizar(id, dados) {
  const { data } = await api.patch(`/veiculos/${id}`, dados);
  return data;
}

export async function definirAtivo(id, ativo) {
  const { data } = await api.patch(`/veiculos/${id}/ativo`, { ativo });
  return data;
}

export async function transferirProprietario(id, novoClienteId) {
  const { data } = await api.patch(`/veiculos/${id}/transferir`, { novoClienteId });
  return data;
}
