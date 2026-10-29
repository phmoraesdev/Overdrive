import { z } from 'zod';

export const FORMATOS = ['json', 'pdf', 'xlsx'];

export const periodoSchema = z.object({
  inicio: z.coerce.date({ message: 'Informe a data inicial.' }),
  fim: z.coerce.date({ message: 'Informe a data final.' }),
  formato: z.enum(FORMATOS).optional().default('json'),
});
