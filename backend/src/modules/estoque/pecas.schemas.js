import { z } from 'zod';

export const criarPecaSchema = z.object({
  codigo: z.string().trim().min(1, 'Código é obrigatório.'),
  descricao: z.string().trim().min(3, 'Descrição deve ter pelo menos 3 caracteres.'),
  precoCusto: z.coerce.number().min(0, 'Preço de custo não pode ser negativo.'),
  precoVenda: z.coerce.number().min(0, 'Preço de venda não pode ser negativo.'),
  quantidade: z.coerce.number().int().min(0, 'Quantidade não pode ser negativa.').optional(),
  quantidadeMinima: z.coerce
    .number()
    .int()
    .min(0, 'Estoque mínimo não pode ser negativo.')
    .optional(),
  ignorarAvisos: z.boolean().optional().default(false),
});

export const atualizarPecaSchema = criarPecaSchema.partial();
