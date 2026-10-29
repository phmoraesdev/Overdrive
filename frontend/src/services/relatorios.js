import api from './api';

export async function faturamento(inicio, fim) {
  const { data } = await api.get('/relatorios/faturamento', { params: { inicio, fim } });
  return data;
}

export async function desempenho(inicio, fim) {
  const { data } = await api.get('/relatorios/desempenho', { params: { inicio, fim } });
  return data;
}

function paramsUrl(inicio, fim, formato) {
  return new URLSearchParams({ inicio, fim, formato }).toString();
}

export function urlFaturamento(inicio, fim, formato) {
  return `/api/relatorios/faturamento?${paramsUrl(inicio, fim, formato)}`;
}

export function urlDesempenho(inicio, fim, formato) {
  return `/api/relatorios/desempenho?${paramsUrl(inicio, fim, formato)}`;
}
