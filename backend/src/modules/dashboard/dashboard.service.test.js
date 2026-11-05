import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../ordens/ordens.service.js', () => ({
  listarParaPainel: vi.fn(),
}));

vi.mock('../agenda/agenda.service.js', () => ({
  listarPorDia: vi.fn(),
}));

vi.mock('../financeiro/financeiro.service.js', () => ({
  listar: vi.fn(),
}));

vi.mock('../relatorios/relatorios.service.js', () => ({
  faturamento: vi.fn(),
}));

vi.mock('../estoque/pecas.service.js', () => ({
  listarEmAlerta: vi.fn(),
}));

const ordensService = await import('../ordens/ordens.service.js');
const agendaService = await import('../agenda/agenda.service.js');
const financeiroService = await import('../financeiro/financeiro.service.js');
const relatoriosService = await import('../relatorios/relatorios.service.js');
const pecasService = await import('../estoque/pecas.service.js');
const dashboardService = await import('./dashboard.service.js');

const FUNCIONARIO_RECEPCIONISTA = { id: 'func-1', nome: 'Fernanda', perfil: 'RECEPCIONISTA' };
const FUNCIONARIO_MECANICO = { id: 'func-2', nome: 'Rafaela', perfil: 'MECANICO' };
const FUNCIONARIO_ADMIN = { id: 'func-3', nome: 'Ana', perfil: 'ADMINISTRADOR' };

const FATURAMENTO_ZERO = {
  periodo: { inicio: '2026-10-01', fim: '2026-10-30' },
  quantidadeOS: 0,
  faturamentoTotal: 0,
  ticketMedio: 0,
  ordens: [],
};

function os(overrides) {
  return {
    id: 'os-id',
    numero: 1,
    status: 'ABERTA',
    abertaEm: new Date(),
    veiculo: { placa: 'ABC1234', marca: 'Fiat', modelo: 'Argo' },
    cliente: { nome: 'Cliente Teste', email: 'cliente@example.com', telefone: '11999999999' },
    ...overrides,
  };
}

function conta(overrides) {
  return {
    id: 'conta-id',
    descricao: 'Fornecedor X',
    fornecedor: null,
    valor: 100,
    vencimento: new Date(),
    status: 'ABERTA',
    vencida: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  ordensService.listarParaPainel.mockResolvedValue([]);
  agendaService.listarPorDia.mockResolvedValue([]);
  financeiroService.listar.mockResolvedValue([]);
  relatoriosService.faturamento.mockResolvedValue(FATURAMENTO_ZERO);
  pecasService.listarEmAlerta.mockResolvedValue([]);
});

describe('montar — visibilidade por perfil', () => {
  it('RECEPCIONISTA recebe só o bloco dela', async () => {
    const resultado = await dashboardService.montar(FUNCIONARIO_RECEPCIONISTA);

    expect(resultado.perfil).toBe('RECEPCIONISTA');
    expect(resultado.recepcionista).toBeDefined();
    expect(resultado.mecanico).toBeUndefined();
    expect(resultado.administrador).toBeUndefined();
  });

  it('MECANICO recebe só o bloco dele e não chama services de outros perfis', async () => {
    const resultado = await dashboardService.montar(FUNCIONARIO_MECANICO);

    expect(resultado.perfil).toBe('MECANICO');
    expect(resultado.mecanico).toBeDefined();
    expect(resultado.recepcionista).toBeUndefined();
    expect(resultado.administrador).toBeUndefined();

    expect(agendaService.listarPorDia).not.toHaveBeenCalled();
    expect(financeiroService.listar).not.toHaveBeenCalled();
    expect(relatoriosService.faturamento).not.toHaveBeenCalled();
    expect(pecasService.listarEmAlerta).not.toHaveBeenCalled();
  });

  it('ADMINISTRADOR recebe o bloco da recepção MAIS o dele, mas não o do mecânico', async () => {
    const resultado = await dashboardService.montar(FUNCIONARIO_ADMIN);

    expect(resultado.perfil).toBe('ADMINISTRADOR');
    expect(resultado.recepcionista).toBeDefined();
    expect(resultado.administrador).toBeDefined();
    expect(resultado.mecanico).toBeUndefined();
  });
});

describe('montar — bloco da recepção: contagens', () => {
  it('conta só as ABERTA de hoje em "abertasHoje", ignora as de outros dias', async () => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);

    ordensService.listarParaPainel.mockResolvedValue([
      os({ id: 'os-1', status: 'ABERTA', abertaEm: new Date() }),
      os({ id: 'os-2', status: 'ABERTA', abertaEm: new Date() }),
      os({ id: 'os-3', status: 'ABERTA', abertaEm: ontem }),
    ]);

    const resultado = await dashboardService.montar(FUNCIONARIO_RECEPCIONISTA);

    expect(resultado.recepcionista.contagens.abertasHoje).toBe(2);
  });

  it('conta aguardando aprovação e prontas para retirada sem filtro de data', async () => {
    ordensService.listarParaPainel.mockResolvedValue([
      os({ id: 'os-1', status: 'AGUARDANDO_APROVACAO' }),
      os({ id: 'os-2', status: 'AGUARDANDO_APROVACAO' }),
      os({ id: 'os-3', status: 'PRONTO_PARA_RETIRADA' }),
      os({ id: 'os-4', status: 'EM_EXECUCAO' }),
    ]);

    const resultado = await dashboardService.montar(FUNCIONARIO_RECEPCIONISTA);

    expect(resultado.recepcionista.contagens.aguardandoAprovacao).toBe(2);
    expect(resultado.recepcionista.contagens.prontasParaRetirada).toBe(1);
  });

  it('dia sem nenhuma OS: contagens zeradas, listas vazias', async () => {
    const resultado = await dashboardService.montar(FUNCIONARIO_RECEPCIONISTA);

    expect(resultado.recepcionista.contagens).toEqual({
      abertasHoje: 0,
      aguardandoAprovacao: 0,
      prontasParaRetirada: 0,
    });
    expect(resultado.recepcionista.agendamentosHoje).toEqual([]);
    expect(resultado.recepcionista.clientesSemContato).toEqual([]);
  });
});

describe('montar — bloco da recepção: alerta de cliente sem contato', () => {
  it('sinaliza só as PRONTO_PARA_RETIRADA cujo cliente não tem e-mail nem telefone', async () => {
    ordensService.listarParaPainel.mockResolvedValue([
      os({
        id: 'os-1',
        numero: 10,
        status: 'PRONTO_PARA_RETIRADA',
        cliente: { nome: 'Sem Contato', email: null, telefone: null },
      }),
      os({
        id: 'os-2',
        numero: 11,
        status: 'PRONTO_PARA_RETIRADA',
        cliente: { nome: 'Com Telefone', email: null, telefone: '11988887777' },
      }),
      os({
        id: 'os-3',
        numero: 12,
        status: 'EM_EXECUCAO',
        cliente: { nome: 'Em Execução Sem Contato', email: null, telefone: null },
      }),
    ]);

    const resultado = await dashboardService.montar(FUNCIONARIO_RECEPCIONISTA);

    expect(resultado.recepcionista.clientesSemContato).toEqual([
      { ordemServicoId: 'os-1', numero: 10, clienteNome: 'Sem Contato', veiculoPlaca: 'ABC1234' },
    ]);
  });
});

describe('montar — bloco da recepção: agendamentos de hoje', () => {
  it('mostra só agendamentos AGENDADO e REAGENDADO, ignora CANCELADO', async () => {
    agendaService.listarPorDia.mockResolvedValue([
      {
        id: 'ag-1',
        dataHora: new Date('2026-10-30T09:00:00'),
        status: 'AGENDADO',
        cliente: { nome: 'João' },
        veiculo: { placa: 'ABC1234' },
      },
      {
        id: 'ag-2',
        dataHora: new Date('2026-10-30T10:00:00'),
        status: 'REAGENDADO',
        cliente: { nome: 'Maria' },
        veiculo: { placa: 'DEF5566' },
      },
      {
        id: 'ag-3',
        dataHora: new Date('2026-10-30T11:00:00'),
        status: 'CANCELADO',
        cliente: { nome: 'Carlos' },
        veiculo: null,
      },
    ]);

    const resultado = await dashboardService.montar(FUNCIONARIO_RECEPCIONISTA);

    expect(resultado.recepcionista.agendamentosHoje).toHaveLength(2);
    expect(resultado.recepcionista.agendamentosHoje.map((a) => a.id)).toEqual(['ag-1', 'ag-2']);
  });
});

describe('montar — bloco do mecânico: três grupos', () => {
  it('separa ABERTA (em diagnóstico), EM_EXECUCAO e AGUARDANDO_PECA em grupos distintos', async () => {
    ordensService.listarParaPainel.mockResolvedValue([
      os({ id: 'os-1', numero: 1, status: 'ABERTA' }),
      os({ id: 'os-2', numero: 2, status: 'EM_EXECUCAO' }),
      os({ id: 'os-3', numero: 3, status: 'AGUARDANDO_PECA' }),
      os({ id: 'os-4', numero: 4, status: 'AGUARDANDO_APROVACAO' }),
    ]);

    const resultado = await dashboardService.montar(FUNCIONARIO_MECANICO);

    expect(resultado.mecanico.emDiagnostico).toEqual([
      {
        id: 'os-1',
        numero: 1,
        status: 'ABERTA',
        veiculoPlaca: 'ABC1234',
        veiculoMarcaModelo: 'Fiat Argo',
      },
    ]);
    expect(resultado.mecanico.emExecucao).toEqual([
      {
        id: 'os-2',
        numero: 2,
        status: 'EM_EXECUCAO',
        veiculoPlaca: 'ABC1234',
        veiculoMarcaModelo: 'Fiat Argo',
      },
    ]);
    expect(resultado.mecanico.aguardandoPeca).toEqual([
      {
        id: 'os-3',
        numero: 3,
        status: 'AGUARDANDO_PECA',
        veiculoPlaca: 'ABC1234',
        veiculoMarcaModelo: 'Fiat Argo',
      },
    ]);
  });

  it('dia sem OS para o mecânico: os três grupos ficam vazios', async () => {
    const resultado = await dashboardService.montar(FUNCIONARIO_MECANICO);

    expect(resultado.mecanico).toEqual({
      emDiagnostico: [],
      emExecucao: [],
      aguardandoPeca: [],
    });
  });
});

describe('montar — bloco do administrador', () => {
  it('usa relatoriosService.faturamento para o mês atual', async () => {
    relatoriosService.faturamento.mockResolvedValue({
      ...FATURAMENTO_ZERO,
      quantidadeOS: 3,
      faturamentoTotal: 900,
      ticketMedio: 300,
    });

    const resultado = await dashboardService.montar(FUNCIONARIO_ADMIN);

    expect(resultado.administrador.faturamentoMes).toEqual(
      expect.objectContaining({ quantidadeOS: 3, faturamentoTotal: 900, ticketMedio: 300 }),
    );
    expect(relatoriosService.faturamento).toHaveBeenCalledTimes(1);
  });

  it('separa contas a pagar vencidas das que vencem nos próximos 7 dias', async () => {
    const hoje = new Date();
    const emTresDias = new Date(hoje);
    emTresDias.setDate(emTresDias.getDate() + 3);
    const emVinteDias = new Date(hoje);
    emVinteDias.setDate(emVinteDias.getDate() + 20);
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);

    financeiroService.listar.mockResolvedValue([
      conta({ id: 'c-vencida', vencimento: ontem, vencida: true }),
      conta({ id: 'c-vence-em-3-dias', vencimento: emTresDias, vencida: false }),
      conta({ id: 'c-vence-em-20-dias', vencimento: emVinteDias, vencida: false }),
      conta({ id: 'c-paga', vencimento: ontem, vencida: false, status: 'PAGA' }),
    ]);

    const resultado = await dashboardService.montar(FUNCIONARIO_ADMIN);

    expect(resultado.administrador.contasVencidas.map((c) => c.id)).toEqual(['c-vencida']);
    expect(resultado.administrador.contasAVencerEm7Dias.map((c) => c.id)).toEqual([
      'c-vence-em-3-dias',
    ]);
    expect(financeiroService.listar).toHaveBeenCalledWith({ tipo: 'PAGAR' });
  });

  it('repassa a lista de peças em alerta sem alterar', async () => {
    pecasService.listarEmAlerta.mockResolvedValue([{ id: 'peca-1', codigo: 'PST-010' }]);

    const resultado = await dashboardService.montar(FUNCIONARIO_ADMIN);

    expect(resultado.administrador.pecasEmAlerta).toEqual([{ id: 'peca-1', codigo: 'PST-010' }]);
  });

  it('dia sem contas, sem OS encerrada e sem peça em alerta: tudo vazio/zerado', async () => {
    const resultado = await dashboardService.montar(FUNCIONARIO_ADMIN);

    expect(resultado.administrador.contasVencidas).toEqual([]);
    expect(resultado.administrador.contasAVencerEm7Dias).toEqual([]);
    expect(resultado.administrador.pecasEmAlerta).toEqual([]);
    expect(resultado.administrador.faturamentoMes.quantidadeOS).toBe(0);
  });
});
