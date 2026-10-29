import { useEffect, useState } from 'react';
import * as authService from '../services/auth';
import { definirAoExpirarSessao } from '../services/api';
import { AuthContext } from './authContextBase.js';

export function AuthProvider({ children }) {
  const [funcionario, setFuncionario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [sessaoExpirada, setSessaoExpirada] = useState(false);

  useEffect(() => {
    authService
      .buscarSessaoAtual()
      .then(setFuncionario)
      .catch(() => setFuncionario(null))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => {
    definirAoExpirarSessao(() => {
      setFuncionario(null);
      setSessaoExpirada(true);
    });
  }, []);

  async function entrar(email, senha) {
    const dados = await authService.login(email, senha);
    setFuncionario(dados);
    setSessaoExpirada(false);
  }

  async function sair() {
    await authService.logout();
    setFuncionario(null);
  }

  const valor = {
    funcionario,
    carregando,
    sessaoExpirada,
    entrar,
    sair,
    limparSessaoExpirada: () => setSessaoExpirada(false),
  };

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
