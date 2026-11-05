import api from './api';

export async function obter() {
  const { data } = await api.get('/dashboard');
  return data;
}
