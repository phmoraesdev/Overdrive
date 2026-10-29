import jwt from 'jsonwebtoken';
import { NaoAutorizadoError } from '../shared/errors.js';

export const DURACAO_SESSAO_MS = 30 * 60 * 1000;

export function gerarTokenSessao(funcionario) {
  return jwt.sign(
    { sub: funcionario.id, nome: funcionario.nome, perfil: funcionario.perfil },
    process.env.JWT_SECRET,
    { expiresIn: '30m' },
  );
}

export function opcoesCookieSessao() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: DURACAO_SESSAO_MS,
  };
}

export function authenticate(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return next(new NaoAutorizadoError());
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, nome: payload.nome, perfil: payload.perfil };

    // Sessão expira em 30 min de inatividade: cada requisição autenticada
    // renova o cookie (RNF11), em vez de usar uma validade fixa desde o login.
    res.cookie('token', gerarTokenSessao(req.user), opcoesCookieSessao());

    return next();
  } catch {
    return next(new NaoAutorizadoError());
  }
}
