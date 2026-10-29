import { z } from 'zod';

export const TIPOS_CONTA = ['PAGAR', 'RECEBER'];

export const criarContaSchema = z.object({
  tipo: z.enum(TIPOS_CONTA, { message: 'Informe o tipo da conta.' }),
  fornecedor: z.string().trim().optional().or(z.literal('')),
  descricao: z.string().trim().min(3, 'Descrição deve ter pelo menos 3 caracteres.'),
  valor: z.coerce.number().positive('Valor deve ser maior que zero.'),
  vencimento: z.coerce.date({ message: 'Informe o vencimento.' }),
});

export const atualizarContaSchema = criarContaSchema.partial();

export const baixarContaSchema = z.object({
  valorPago: z.coerce.number().positive('Valor pago deve ser maior que zero.'),
  pagaEm: z.coerce.date().optional(),
});

export const fluxoCaixaSchema = z.object({
  inicio: z.coerce.date({ message: 'Informe a data inicial.' }),
  fim: z.coerce.date({ message: 'Informe a data final.' }),
});
