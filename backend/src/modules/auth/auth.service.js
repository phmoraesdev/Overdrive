import { gerarTokenSessao } from '../../middlewares/authenticate.js';
import * as funcionariosService from '../funcionarios/funcionarios.service.js';

export async function login({ email, senha }) {
  const funcionario = await funcionariosService.autenticar({ email, senha });
  const token = gerarTokenSessao(funcionario);
  return { token, funcionario };
}
