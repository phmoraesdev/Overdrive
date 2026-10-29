import { z } from 'zod';

export const PERFIS = ['RECEPCIONISTA', 'MECANICO', 'ADMINISTRADOR'];

export const criarFuncionarioSchema = z.object({
  nome: z.string().trim().min(3, 'Nome deve ter pelo menos 3 caracteres.'),
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
  senha: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres.'),
  perfil: z.enum(PERFIS, { message: 'Perfil inválido.' }),
});

export const atualizarFuncionarioSchema = z.object({
  nome: z.string().trim().min(3, 'Nome deve ter pelo menos 3 caracteres.').optional(),
  email: z.string().trim().toLowerCase().email('E-mail inválido.').optional(),
  senha: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres.').optional(),
  perfil: z.enum(PERFIS, { message: 'Perfil inválido.' }).optional(),
});
