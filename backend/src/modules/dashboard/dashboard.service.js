import * as ordensService from '../ordens/ordens.service.js';
import * as agendaService from '../agenda/agenda.service.js';
import * as financeiroService from '../financeiro/financeiro.service.js';
import * as relatoriosService from '../relatorios/relatorios.service.js';
import * as pecasService from '../estoque/pecas.service.js';

// Agendamentos cancelados não interessam no resumo do dia — só os ativos.
const STATUS_AGENDAMENTO_ATIVOS = ['AGENDADO', 'REAGENDADO'];
const DIAS_PARA_VENCER = 7;

function hojeISO() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(
    hoje.getDate(),
  ).padStart(2, '0')}`;
}

function primeiroDiaDoMesISO() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;
}

function mesmoDia(dataA, dataB) {
  return (
    dataA.getFullYear() === dataB.getFullYear() &&
    dataA.getMonth() === dataB.getMonth() &&
    dataA.getDate() === dataB.getDate()
  );
}

function paraOsResumo(ordemServico) {
  return {
    id: ordemServico.id,
    numero: ordemServico.numero,
    status: ordemServico.status,
    veiculoPlaca: ordemServico.veiculo.placa,
    veiculoMarcaModelo: `${ordemServico.veiculo.marca} ${ordemServico.veiculo.modelo}`,
  };
}

function paraContaResumo(conta) {
  return {
    id: conta.id,
    descricao: conta.descricao,
    fornecedor: conta.fornecedor,
    valor: conta.valor,
    vencimento: conta.vencimento,
  };
}

async function montarBlocoRecepcionista(ordensPainel) {
  const agendamentos = await agendaService.listarPorDia(hojeISO());
  const hoje = new Date();

  const abertasHoje = ordensPainel.filter(
    (os) => os.status === 'ABERTA' && mesmoDia(new Date(os.abertaEm), hoje),
  ).length;
  const aguardandoAprovacao = ordensPainel.filter(
    (os) => os.status === 'AGUARDANDO_APROVACAO',
  ).length;
  const prontasParaRetirada = ordensPainel.filter(
    (os) => os.status === 'PRONTO_PARA_RETIRADA',
  ).length;

  // Mesma condição de notificacoes.service.js#notificarClientePronto — aqui
  // calculada sob demanda em vez de guardada, porque hoje ela só existe como
  // retorno efêmero da troca de status (RF11).
  const clientesSemContato = ordensPainel
    .filter((os) => os.status === 'PRONTO_PARA_RETIRADA')
    .filter((os) => !os.cliente.email && !os.cliente.telefone)
    .map((os) => ({
      ordemServicoId: os.id,
      numero: os.numero,
      clienteNome: os.cliente.nome,
      veiculoPlaca: os.veiculo.placa,
    }));

  const agendamentosHoje = agendamentos
    .filter((agendamento) => STATUS_AGENDAMENTO_ATIVOS.includes(agendamento.status))
    .map((agendamento) => ({
      id: agendamento.id,
      dataHora: agendamento.dataHora,
      clienteNome: agendamento.cliente.nome,
      veiculoPlaca: agendamento.veiculo?.placa ?? null,
    }));

  return {
    contagens: { abertasHoje, aguardandoAprovacao, prontasParaRetirada },
    agendamentosHoje,
    clientesSemContato,
  };
}

function montarBlocoMecanico(ordensPainel) {
  return {
    // ABERTA = o mecânico ainda está avaliando o veículo e montando o
    // orçamento; não existe um status dedicado "em diagnóstico" no
    // `StatusOrdemServico` (schema.prisma), então reaproveitamos ABERTA.
    emDiagnostico: ordensPainel.filter((os) => os.status === 'ABERTA').map(paraOsResumo),
    emExecucao: ordensPainel.filter((os) => os.status === 'EM_EXECUCAO').map(paraOsResumo),
    aguardandoPeca: ordensPainel.filter((os) => os.status === 'AGUARDANDO_PECA').map(paraOsResumo),
  };
}

async function montarBlocoAdministrador() {
  // Datas como objeto Date, não string — mesmo tipo que `periodoSchema`
  // (z.coerce.date) entrega ao service quando a rota HTTP de relatórios é
  // chamada; aqui é uma chamada direta de service para service, sem zod.
  const [faturamentoMes, contasPagar, pecasEmAlerta] = await Promise.all([
    relatoriosService.faturamento(new Date(primeiroDiaDoMesISO()), new Date(hojeISO())),
    financeiroService.listar({ tipo: 'PAGAR' }),
    pecasService.listarEmAlerta(),
  ]);

  const limiteSeteDias = new Date();
  limiteSeteDias.setDate(limiteSeteDias.getDate() + DIAS_PARA_VENCER);

  const contasVencidas = contasPagar.filter((conta) => conta.vencida).map(paraContaResumo);
  const contasAVencerEm7Dias = contasPagar
    .filter(
      (conta) =>
        conta.status === 'ABERTA' &&
        !conta.vencida &&
        new Date(conta.vencimento) <= limiteSeteDias,
    )
    .map(paraContaResumo);

  return {
    faturamentoMes,
    contasVencidas,
    contasAVencerEm7Dias,
    pecasEmAlerta,
  };
}

// Monta o painel inicial (dashboard) de acordo com o perfil autenticado —
// cada bloco só é calculado (e só volta na resposta) se aquele perfil pode
// vê-lo, então um MECANICO nunca recebe dado de financeiro/relatórios e
// vice-versa, mesmo que peça direto na API.
export async function montar(funcionario) {
  const resultado = { perfil: funcionario.perfil };

  // Os três perfis usam o painel Kanban de alguma forma (contagens,
  // listas do mecânico ou alerta de cliente sem contato) — uma só consulta.
  const ordensPainel = await ordensService.listarParaPainel();

  if (funcionario.perfil === 'RECEPCIONISTA' || funcionario.perfil === 'ADMINISTRADOR') {
    resultado.recepcionista = await montarBlocoRecepcionista(ordensPainel);
  }

  if (funcionario.perfil === 'MECANICO') {
    resultado.mecanico = montarBlocoMecanico(ordensPainel);
  }

  if (funcionario.perfil === 'ADMINISTRADOR') {
    resultado.administrador = await montarBlocoAdministrador();
  }

  return resultado;
}
