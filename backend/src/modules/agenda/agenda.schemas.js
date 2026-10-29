import { z } from 'zod';

export const criarAgendamentoSchema = z.object({
  dataHora: z.coerce.date({ message: 'Informe a data e o horário do atendimento.' }),
  clienteId: z.string().min(1, 'Informe o cliente.'),
  veiculoId: z.string().min(1).optional().or(z.literal('')),
  observacoes: z.string().trim().optional().or(z.literal('')),
});

export const reagendarAgendamentoSchema = z.object({
  dataHora: z.coerce.date({ message: 'Informe a nova data e horário.' }),
});
