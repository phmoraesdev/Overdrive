import { AcessoNegadoError } from '../shared/errors.js';

export function authorize(...perfis) {
  return (req, res, next) => {
    if (!req.user || !perfis.includes(req.user.perfil)) {
      return next(new AcessoNegadoError());
    }
    return next();
  };
}
