import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

let aoExpirarSessao = null;

export function definirAoExpirarSessao(callback) {
  aoExpirarSessao = callback;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const ehRotaDeLogin = error.config?.url === '/auth/login';
    if (error.response?.status === 401 && !ehRotaDeLogin && aoExpirarSessao) {
      aoExpirarSessao();
    }
    return Promise.reject(error);
  },
);

export default api;
