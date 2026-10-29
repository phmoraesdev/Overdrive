import { opcoesCookieSessao } from '../../middlewares/authenticate.js';
import * as authService from './auth.service.js';
import { loginSchema } from './auth.schemas.js';

export async function login(req, res) {
  const dados = loginSchema.parse(req.body);
  const { token, funcionario } = await authService.login(dados);
  res.cookie('token', token, opcoesCookieSessao());
  res.json({ funcionario });
}

export function logout(req, res) {
  res.clearCookie('token');
  res.status(204).end();
}

export function me(req, res) {
  res.json({ funcionario: req.user });
}
