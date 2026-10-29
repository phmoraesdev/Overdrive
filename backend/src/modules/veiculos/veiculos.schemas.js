import { z } from 'zod';
import { placaValida } from '../../shared/placa.js';

const anoAtual = new Date().getFullYear();

export const criarVeiculoSchema = z.object({
  placa: z.string().refine(placaValida, { message: 'Placa inválida.' }),
  marca: z.string().trim().min(2, 'Marca é obrigatória.'),
  modelo: z.string().trim().min(1, 'Modelo é obrigatório.'),
  ano: z.coerce.number().int().min(1950, 'Ano inválido.').max(anoAtual + 1, 'Ano inválido.'),
  cor: z.string().trim().optional().or(z.literal('')),
  km: z.coerce.number().int().min(0, 'Quilometragem não pode ser negativa.').optional(),
  clienteId: z.string().min(1, 'Informe o cliente dono do veículo.'),
});

export const atualizarVeiculoSchema = criarVeiculoSchema
  .omit({ clienteId: true })
  .partial();

export const transferirVeiculoSchema = z.object({
  novoClienteId: z.string().min(1, 'Informe o novo cliente.'),
});
