import { ZodError } from 'zod';
import { AppError } from '../shared/errors.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  if (error instanceof ZodError) {
    const primeiraMensagem = error.issues[0]?.message ?? 'Dados inválidos.';
    return res.status(400).json({ message: primeiraMensagem, issues: error.issues });
  }

  if (error instanceof AppError) {
    const corpo = { message: error.message };
    if (error.avisos) corpo.avisos = error.avisos;
    if (error.sugestoes) corpo.sugestoes = error.sugestoes;
    return res.status(error.status).json(corpo);
  }

  console.error(error);
  return res.status(500).json({ message: 'Erro interno do servidor.' });
}
