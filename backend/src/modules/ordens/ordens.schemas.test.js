import { describe, expect, it } from 'vitest';
import {
  abrirOrdemServicoSchema,
  checklistSchema,
  criarItemOrcamentoSchema,
  encerrarOrdemServicoSchema,
  registrarDecisaoSchema,
} from './ordens.schemas.js';

const CHECKLIST_VALIDO = {
  avarias: [{ regiao: 'Para-choque dianteiro', descricao: 'Risco superficial' }],
  nivelCombustivel: 'MEIO',
  itensPresentes: ['Estepe', 'Macaco'],
};

const DADOS_VALIDOS = {
  veiculoId: 'veiculo-1',
  kmEntrada: 51000,
  problemaRelatado: 'Barulho estranho ao frear',
  checklist: CHECKLIST_VALIDO,
};

describe('checklistSchema', () => {
  it('aceita checklist válido e preenche padrões das listas', () => {
    const resultado = checklistSchema.safeParse({ nivelCombustivel: 'CHEIO' });
    expect(resultado.success).toBe(true);
    expect(resultado.data.avarias).toEqual([]);
    expect(resultado.data.itensPresentes).toEqual([]);
  });

  it('rejeita checklist sem nível de combustível', () => {
    const resultado = checklistSchema.safeParse({});
    expect(resultado.success).toBe(false);
  });

  it('rejeita nível de combustível fora da lista', () => {
    const resultado = checklistSchema.safeParse({ nivelCombustivel: 'CHEIO_DEMAIS' });
    expect(resultado.success).toBe(false);
  });
});

describe('abrirOrdemServicoSchema', () => {
  it('aceita dados válidos', () => {
    expect(abrirOrdemServicoSchema.safeParse(DADOS_VALIDOS).success).toBe(true);
  });

  it('rejeita abertura sem checklist (não é possível abrir OS sem checklist)', () => {
    const { checklist: _checklist, ...semChecklist } = DADOS_VALIDOS;
    const resultado = abrirOrdemServicoSchema.safeParse(semChecklist);
    expect(resultado.success).toBe(false);
  });

  it('rejeita km negativo', () => {
    const resultado = abrirOrdemServicoSchema.safeParse({ ...DADOS_VALIDOS, kmEntrada: -1 });
    expect(resultado.success).toBe(false);
  });

  it('rejeita problema relatado muito curto', () => {
    const resultado = abrirOrdemServicoSchema.safeParse({ ...DADOS_VALIDOS, problemaRelatado: 'oi' });
    expect(resultado.success).toBe(false);
  });
});

describe('criarItemOrcamentoSchema', () => {
  it('aceita item de peça com quantidade positiva', () => {
    const resultado = criarItemOrcamentoSchema.safeParse({
      tipo: 'PECA',
      pecaId: 'peca-1',
      quantidade: 2,
    });
    expect(resultado.success).toBe(true);
  });

  it('rejeita item de peça sem pecaId', () => {
    const resultado = criarItemOrcamentoSchema.safeParse({ tipo: 'PECA', quantidade: 2 });
    expect(resultado.success).toBe(false);
  });

  it('aceita item de mão de obra com descrição e valor', () => {
    const resultado = criarItemOrcamentoSchema.safeParse({
      tipo: 'MAO_DE_OBRA',
      descricao: 'Alinhamento e balanceamento',
      quantidade: 1,
      valorUnitario: 80,
    });
    expect(resultado.success).toBe(true);
  });

  it('rejeita item de mão de obra sem valor unitário', () => {
    const resultado = criarItemOrcamentoSchema.safeParse({
      tipo: 'MAO_DE_OBRA',
      descricao: 'Alinhamento',
      quantidade: 1,
    });
    expect(resultado.success).toBe(false);
  });

  it('rejeita quantidade zero ou negativa', () => {
    expect(
      criarItemOrcamentoSchema.safeParse({ tipo: 'PECA', pecaId: 'peca-1', quantidade: 0 }).success,
    ).toBe(false);
  });
});

describe('registrarDecisaoSchema', () => {
  it('aceita aprovação total só com meio de contato', () => {
    const resultado = registrarDecisaoSchema.safeParse({
      decisao: 'APROVADO',
      meioContato: 'TELEFONE',
    });
    expect(resultado.success).toBe(true);
  });

  it('rejeita reprovação sem motivo', () => {
    const resultado = registrarDecisaoSchema.safeParse({
      decisao: 'REPROVADO',
      meioContato: 'WHATSAPP',
    });
    expect(resultado.success).toBe(false);
  });

  it('aceita reprovação com motivo', () => {
    const resultado = registrarDecisaoSchema.safeParse({
      decisao: 'REPROVADO',
      meioContato: 'WHATSAPP',
      motivo: 'Cliente achou caro',
    });
    expect(resultado.success).toBe(true);
  });

  it('rejeita aprovação parcial sem itens selecionados', () => {
    const resultado = registrarDecisaoSchema.safeParse({
      decisao: 'APROVADO_PARCIAL',
      meioContato: 'PRESENCIAL',
    });
    expect(resultado.success).toBe(false);
  });

  it('aceita aprovação parcial com itens selecionados', () => {
    const resultado = registrarDecisaoSchema.safeParse({
      decisao: 'APROVADO_PARCIAL',
      meioContato: 'PRESENCIAL',
      itensAprovadosIds: ['item-1'],
    });
    expect(resultado.success).toBe(true);
  });
});

describe('encerrarOrdemServicoSchema', () => {
  it('aceita pagamento à vista sem número de parcelas', () => {
    const resultado = encerrarOrdemServicoSchema.safeParse({ formaPagamento: 'DINHEIRO' });
    expect(resultado.success).toBe(true);
  });

  it('rejeita parcelado sem informar o número de parcelas', () => {
    const resultado = encerrarOrdemServicoSchema.safeParse({
      formaPagamento: 'CARTAO',
      parcelado: true,
    });
    expect(resultado.success).toBe(false);
  });

  it('aceita parcelado com número de parcelas', () => {
    const resultado = encerrarOrdemServicoSchema.safeParse({
      formaPagamento: 'CARTAO',
      parcelado: true,
      numeroParcelas: 3,
    });
    expect(resultado.success).toBe(true);
  });

  it('rejeita forma de pagamento inválida', () => {
    const resultado = encerrarOrdemServicoSchema.safeParse({ formaPagamento: 'CRIPTOMOEDA' });
    expect(resultado.success).toBe(false);
  });
});
