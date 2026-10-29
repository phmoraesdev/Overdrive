import { z } from 'zod';
import { cpfValido } from '../../shared/cpf.js';

export const criarClienteSchema = z.object({
  nome: z.string().trim().min(3, 'Nome deve ter pelo menos 3 caracteres.'),
  cpf: z.string().refine(cpfValido, { message: 'CPF inválido.' }),
  telefone: z.string().trim().min(8, 'Telefone inválido.'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('E-mail inválido.')
    .optional()
    .or(z.literal('')),
  endereco: z.string().trim().optional().or(z.literal('')),
});

export const atualizarClienteSchema = criarClienteSchema.partial();
