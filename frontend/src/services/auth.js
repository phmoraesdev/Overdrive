import api from './api';

export async function login(email, senha) {
  const { data } = await api.post('/auth/login', { email, senha });
  return data.funcionario;
}

export async function logout() {
  await api.post('/auth/logout');
}

export async function buscarSessaoAtual() {
  const { data } = await api.get('/auth/me');
  return data.funcionario;
}
