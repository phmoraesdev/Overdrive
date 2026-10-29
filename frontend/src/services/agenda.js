import api from './api';

export async function listarPorDia(data) {
  const { data: agendamentos } = await api.get('/agenda', { params: { data } });
  return agendamentos;
}

export async function criar(dados) {
  const { data } = await api.post('/agenda', dados);
  return data;
}

export async function reagendar(id, dataHora) {
  const { data } = await api.patch(`/agenda/${id}/reagendar`, { dataHora });
  return data;
}

export async function cancelar(id) {
  const { data } = await api.patch(`/agenda/${id}/cancelar`);
  return data;
}
