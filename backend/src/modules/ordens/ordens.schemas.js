import { z } from 'zod';

export const NIVEIS_COMBUSTIVEL = [
  'VAZIO',
  'RESERVA',
  'UM_QUARTO',
  'MEIO',
  'TRES_QUARTOS',
  'CHEIO',
];

export const checklistSchema = z.object({
  avarias: z
    .array(
      z.object({
        regiao: z.string().trim().min(1, 'Informe a região da avaria.'),
        descricao: z.string().trim().min(1, 'Descreva a avaria.'),
      }),
    )
    .default([]),
  nivelCombustivel: z.enum(NIVEIS_COMBUSTIVEL, {
    message: 'Informe o nível de combustível.',
  }),
  itensPresentes: z.array(z.string().trim().min(1)).default([]),
  observacoes: z.string().trim().optional().or(z.literal('')),
});

export const abrirOrdemServicoSchema = z.object({
  veiculoId: z.string().min(1, 'Informe o veículo.'),
  kmEntrada: z.coerce.number().int().min(0, 'Quilometragem não pode ser negativa.'),
  problemaRelatado: z.string().trim().min(5, 'Descreva o problema relatado.'),
  checklist: checklistSchema,
  ignorarAvisos: z.boolean().optional().default(false),
});

// --- PB11: orçamento ---------------------------------------------------

export const criarItemOrcamentoSchema = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('PECA'),
    pecaId: z.string().min(1, 'Informe a peça.'),
    quantidade: z.coerce.number().positive('Quantidade deve ser maior que zero.'),
  }),
  z.object({
    tipo: z.literal('MAO_DE_OBRA'),
    descricao: z.string().trim().min(3, 'Descreva o serviço de mão de obra.'),
    quantidade: z.coerce.number().positive('Quantidade deve ser maior que zero.'),
    valorUnitario: z.coerce.number().positive('Valor deve ser maior que zero.'),
  }),
]);

export const atualizarItemOrcamentoSchema = z.object({
  quantidade: z.coerce.number().positive('Quantidade deve ser maior que zero.').optional(),
  valorUnitario: z.coerce.number().positive('Valor deve ser maior que zero.').optional(),
});

// --- PB12: decisão do orçamento -----------------------------------------

export const DECISOES_ORCAMENTO = ['APROVADO', 'APROVADO_PARCIAL', 'REPROVADO'];
export const MEIOS_CONTATO_DECISAO = ['TELEFONE', 'WHATSAPP', 'PRESENCIAL'];

export const registrarDecisaoSchema = z
  .object({
    decisao: z.enum(DECISOES_ORCAMENTO, { message: 'Informe a decisão do cliente.' }),
    meioContato: z.enum(MEIOS_CONTATO_DECISAO, { message: 'Informe o meio de contato.' }),
    motivo: z.string().trim().optional().or(z.literal('')),
    itensAprovadosIds: z.array(z.string().min(1)).optional(),
  })
  .refine((dados) => dados.decisao !== 'REPROVADO' || (dados.motivo ?? '').length > 0, {
    message: 'Informe o motivo da reprovação.',
    path: ['motivo'],
  })
  .refine(
    (dados) =>
      dados.decisao !== 'APROVADO_PARCIAL' ||
      (dados.itensAprovadosIds && dados.itensAprovadosIds.length > 0),
    { message: 'Selecione ao menos um item aprovado.', path: ['itensAprovadosIds'] },
  );

// --- PB13: status da OS ---------------------------------------------------

export const atualizarStatusSchema = z.object({
  status: z.string().min(1, 'Informe o novo status.'),
});

// --- PB16: encerramento e pagamento ---------------------------------------

export const FORMAS_PAGAMENTO = ['DINHEIRO', 'PIX', 'CARTAO', 'BOLETO'];

export const encerrarOrdemServicoSchema = z
  .object({
    formaPagamento: z.enum(FORMAS_PAGAMENTO, { message: 'Informe a forma de pagamento.' }),
    parcelado: z.boolean().optional().default(false),
    numeroParcelas: z.coerce.number().int().min(2).max(24).optional(),
  })
  .refine((dados) => !dados.parcelado || dados.numeroParcelas, {
    message: 'Informe o número de parcelas.',
    path: ['numeroParcelas'],
  });
