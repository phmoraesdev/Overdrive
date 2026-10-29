import {
  AppError,
  AvisosConfirmacaoError,
  ConflitoError,
  NaoEncontradoError,
} from '../../shared/errors.js';
import { calcularTotalItem, calcularTotalOrcamento } from '../../shared/dinheiro.js';
import * as veiculosService from '../veiculos/veiculos.service.js';
import * as pecasService from '../estoque/pecas.service.js';
import * as notificacoesService from '../notificacoes/notificacoes.service.js';
import * as ordensRepository from './ordens.repository.js';
import { gerarReciboBuffer } from './ordens.recibo.js';

// RF06: busca do veículo (e do cliente dono) pela placa, mais os dados que o
// recepcionista precisa ver antes de abrir a OS (se já há uma em andamento e
// qual foi a última quilometragem registrada).
export async function buscarParaAbertura(placa) {
  const veiculo = await veiculosService.buscarPorPlaca(placa);
  const [osEmAndamento, ultimaOS] = await Promise.all([
    ordensRepository.buscarEmAndamentoPorVeiculo(veiculo.id),
    ordensRepository.buscarUltimaPorVeiculo(veiculo.id),
  ]);

  return { veiculo, osEmAndamento, ultimaOS };
}

// RF04: histórico de OS de um veículo pela placa, da mais recente para a
// mais antiga.
export async function listarHistoricoPorPlaca(placa) {
  const veiculo = await veiculosService.buscarPorPlaca(placa);
  return ordensRepository.listarPorVeiculo(veiculo.id);
}

export async function buscarPorId(id) {
  const ordemServico = await ordensRepository.buscarPorId(id);
  if (!ordemServico) {
    throw new NaoEncontradoError('Ordem de serviço não encontrada.');
  }
  return ordemServico;
}

function avisosDeAbertura({ osEmAndamento, ultimaOS, kmEntrada }) {
  const avisos = [];

  if (osEmAndamento) {
    avisos.push({
      tipo: 'OS_EM_ANDAMENTO',
      mensagem: `Este veículo já tem a OS nº ${osEmAndamento.numero} em andamento.`,
    });
  }

  if (ultimaOS && kmEntrada < ultimaOS.kmEntrada) {
    avisos.push({
      tipo: 'KM_MENOR',
      mensagem: `A quilometragem informada (${kmEntrada}) é menor que a da última OS (${ultimaOS.kmEntrada} km).`,
    });
  }

  return avisos;
}

// RF06/RF07, RNF03 e RNF09: abre a OS com o checklist de entrada na mesma
// chamada (o front manda tudo de uma vez, sem sair da tela de abertura).
// RF07/PB08: o checklist é obrigatório — o schema de validação já exige
// `checklist.nivelCombustivel`, mas repetimos a checagem aqui porque a
// garantia de "não abre OS sem checklist" é uma regra de negócio, não só de
// formato de entrada.
export async function abrir(dados, abertaPorId) {
  if (!dados.checklist) {
    throw new AppError('O checklist de entrada é obrigatório para abrir a OS.', 400);
  }

  const veiculo = await veiculosService.buscarPorId(dados.veiculoId);

  const [osEmAndamento, ultimaOS] = await Promise.all([
    ordensRepository.buscarEmAndamentoPorVeiculo(veiculo.id),
    ordensRepository.buscarUltimaPorVeiculo(veiculo.id),
  ]);

  const avisos = avisosDeAbertura({ osEmAndamento, ultimaOS, kmEntrada: dados.kmEntrada });
  if (avisos.length > 0 && !dados.ignorarAvisos) {
    throw new AvisosConfirmacaoError(avisos);
  }

  return ordensRepository.criarComChecklist({
    veiculoId: veiculo.id,
    clienteId: veiculo.clienteId,
    kmEntrada: dados.kmEntrada,
    problemaRelatado: dados.problemaRelatado,
    abertaPorId,
    checklist: dados.checklist,
  });
}

// --- PB11: orçamento -------------------------------------------------------

function comTotal(item) {
  return { ...item, total: calcularTotalItem(item.quantidade, item.valorUnitario) };
}

async function exigirOsAberta(ordemServicoId) {
  const ordemServico = await buscarPorId(ordemServicoId);
  if (ordemServico.status !== 'ABERTA') {
    throw new AppError(
      'O orçamento só pode ser alterado enquanto a OS estiver com status Aberta.',
      400,
    );
  }
  return ordemServico;
}

export async function listarOrcamento(ordemServicoId) {
  const itens = await ordensRepository.listarItensOrcamento(ordemServicoId);
  const itensComTotal = itens.map(comTotal);
  return { itens: itensComTotal, total: calcularTotalOrcamento(itens) };
}

export async function adicionarItemOrcamento(ordemServicoId, dados) {
  await exigirOsAberta(ordemServicoId);

  let item;
  let aviso = null;

  if (dados.tipo === 'PECA') {
    const peca = await pecasService.buscarPorId(dados.pecaId);
    item = await ordensRepository.criarItemOrcamento(ordemServicoId, {
      tipo: 'PECA',
      descricao: peca.descricao,
      quantidade: dados.quantidade,
      valorUnitario: peca.precoVenda,
      pecaId: peca.id,
    });
    if (Number(peca.quantidade) < dados.quantidade) {
      aviso = {
        tipo: 'ESTOQUE_INSUFICIENTE',
        mensagem: `Estoque insuficiente de "${peca.descricao}" (saldo: ${peca.quantidade}, pedido: ${dados.quantidade}).`,
      };
    }
  } else {
    item = await ordensRepository.criarItemOrcamento(ordemServicoId, {
      tipo: 'MAO_DE_OBRA',
      descricao: dados.descricao,
      quantidade: dados.quantidade,
      valorUnitario: dados.valorUnitario,
    });
  }

  return { item: comTotal(item), aviso };
}

async function buscarItemDaOs(ordemServicoId, itemId) {
  const item = await ordensRepository.buscarItemOrcamento(itemId);
  if (!item || item.ordemServicoId !== ordemServicoId) {
    throw new NaoEncontradoError('Item do orçamento não encontrado.');
  }
  return item;
}

export async function atualizarItemOrcamento(ordemServicoId, itemId, dados) {
  await exigirOsAberta(ordemServicoId);
  await buscarItemDaOs(ordemServicoId, itemId);

  const atualizacoes = {
    ...(dados.quantidade !== undefined && { quantidade: dados.quantidade }),
    ...(dados.valorUnitario !== undefined && { valorUnitario: dados.valorUnitario }),
  };

  const item = await ordensRepository.atualizarItemOrcamento(itemId, atualizacoes);

  let aviso = null;
  if (item.tipo === 'PECA' && item.pecaId && dados.quantidade !== undefined) {
    const peca = await pecasService.buscarPorId(item.pecaId);
    if (Number(peca.quantidade) < Number(item.quantidade)) {
      aviso = {
        tipo: 'ESTOQUE_INSUFICIENTE',
        mensagem: `Estoque insuficiente de "${peca.descricao}" (saldo: ${peca.quantidade}, pedido: ${item.quantidade}).`,
      };
    }
  }

  return { item: comTotal(item), aviso };
}

export async function removerItemOrcamento(ordemServicoId, itemId) {
  await exigirOsAberta(ordemServicoId);
  await buscarItemDaOs(ordemServicoId, itemId);
  await ordensRepository.removerItemOrcamento(itemId);
}

export async function finalizarOrcamento(ordemServicoId, funcionarioId) {
  const ordemServico = await exigirOsAberta(ordemServicoId);

  const itens = await ordensRepository.listarItensOrcamento(ordemServicoId);
  if (itens.length === 0) {
    throw new AppError('Não é possível finalizar um orçamento vazio.', 400);
  }

  return ordensRepository.finalizarOrcamento({
    id: ordemServicoId,
    statusAnterior: ordemServico.status,
    funcionarioId,
  });
}

// --- PB12: decisão do orçamento ---------------------------------------------

export async function registrarDecisao(ordemServicoId, dados, funcionarioId) {
  const ordemServico = await buscarPorId(ordemServicoId);
  if (ordemServico.status !== 'AGUARDANDO_APROVACAO') {
    throw new AppError(
      'A decisão do orçamento só pode ser registrada enquanto a OS está aguardando aprovação.',
      400,
    );
  }

  if (dados.decisao === 'APROVADO_PARCIAL') {
    const idsValidos = new Set(ordemServico.itensOrcamento.map((item) => item.id));
    const idsInvalidos = (dados.itensAprovadosIds ?? []).filter((id) => !idsValidos.has(id));
    if (idsInvalidos.length > 0) {
      throw new AppError('Um ou mais itens aprovados não pertencem a esta OS.', 400);
    }
  }

  const statusNovo = dados.decisao === 'REPROVADO' ? 'REPROVADA' : 'EM_EXECUCAO';

  return ordensRepository.registrarDecisao({
    id: ordemServicoId,
    statusAnterior: ordemServico.status,
    statusNovo,
    decisao: dados.decisao,
    meioContato: dados.meioContato,
    motivo: dados.motivo || null,
    itensAprovadosIds: dados.itensAprovadosIds ?? [],
    funcionarioId,
  });
}

// --- PB13: status da OS ------------------------------------------------------

// Só as transições que o mecânico resolve sozinho, no dia a dia da execução,
// entram aqui. As demais (Aberta -> Aguardando Aprovação, Aguardando
// Aprovação -> Em Execução/Reprovada, Pronto -> Encerrada) exigem dados
// próprios (orçamento, decisão do cliente, pagamento) e têm suas próprias
// funções acima/abaixo.
const TRANSICOES_STATUS_PERMITIDAS = {
  EM_EXECUCAO: ['AGUARDANDO_PECA', 'PRONTO_PARA_RETIRADA'],
  AGUARDANDO_PECA: ['EM_EXECUCAO'],
};

export function listarParaPainel() {
  return ordensRepository.listarParaPainel();
}

export async function atualizarStatus(ordemServicoId, novoStatus, funcionarioId) {
  const ordemServico = await buscarPorId(ordemServicoId);
  const permitidas = TRANSICOES_STATUS_PERMITIDAS[ordemServico.status] ?? [];

  if (!permitidas.includes(novoStatus)) {
    throw new AppError(
      `Não é possível mudar a OS de ${ordemServico.status} para ${novoStatus}.`,
      400,
    );
  }

  const atualizada = await ordensRepository.atualizarStatus({
    id: ordemServicoId,
    statusAnterior: ordemServico.status,
    statusNovo: novoStatus,
    funcionarioId,
  });

  // RF11/PB14: avisa o cliente assim que o carro fica pronto. Fica fora da
  // transação de cima de propósito — falha no envio (SMTP fora do ar, etc.)
  // não pode impedir o mecânico de marcar a OS como pronta.
  if (novoStatus === 'PRONTO_PARA_RETIRADA') {
    const { alertaRecepcao } = await notificacoesService.notificarClientePronto(atualizada);
    return { ...atualizada, alertaRecepcao };
  }

  return atualizada;
}

// --- PB16 + PB17: encerramento, pagamento e baixa de estoque -----------------

// Checagem prévia (fora da transação): dá um erro rápido e claro antes de
// gastar uma transação. `ordensRepository.encerrarComPagamentoEBaixa` repete
// essa checagem dentro da transação com os dados mais recentes — essa é a
// que vale de verdade contra corrida (duas OS baixando a mesma peça ao
// mesmo tempo); esta aqui é só para feedback rápido ao usuário.
async function validarSaldoParaBaixa(itensParaBaixa) {
  for (const item of itensParaBaixa) {
    const peca = await pecasService.buscarPorId(item.pecaId);
    if (Number(peca.quantidade) < item.quantidade) {
      throw new ConflitoError(
        `Estoque insuficiente para "${peca.descricao}" ` +
          `(saldo: ${peca.quantidade}, necessário: ${item.quantidade}).`,
      );
    }
  }
}

export async function encerrar(ordemServicoId, dados, funcionarioId) {
  const ordemServico = await buscarPorId(ordemServicoId);
  if (ordemServico.status !== 'PRONTO_PARA_RETIRADA') {
    throw new AppError(
      'A OS só pode ser encerrada quando estiver com status Pronto para retirada.',
      400,
    );
  }

  const itensAprovados = ordemServico.itensOrcamento.filter((item) => item.aprovado);
  const valorTotal = calcularTotalOrcamento(itensAprovados);
  if (valorTotal <= 0) {
    throw new AppError('Não há itens aprovados no orçamento para cobrar.', 400);
  }

  const itensParaBaixa = itensAprovados
    .filter((item) => item.tipo === 'PECA' && item.pecaId)
    .map((item) => ({ pecaId: item.pecaId, quantidade: Number(item.quantidade) }));

  await validarSaldoParaBaixa(itensParaBaixa);

  const numeroParcelas = dados.parcelado ? dados.numeroParcelas : 1;

  return ordensRepository.encerrarComPagamentoEBaixa({
    id: ordemServicoId,
    numero: ordemServico.numero,
    statusAnterior: ordemServico.status,
    formaPagamento: dados.formaPagamento,
    numeroParcelas,
    valorTotal,
    itensParaBaixa,
    funcionarioId,
  });
}

export async function gerarRecibo(ordemServicoId) {
  const ordemServico = await buscarPorId(ordemServicoId);
  if (ordemServico.status !== 'ENCERRADA') {
    throw new AppError('O recibo só fica disponível depois que a OS é encerrada.', 400);
  }
  return gerarReciboBuffer(ordemServico);
}
