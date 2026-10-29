import { AppError, NaoEncontradoError } from '../../shared/errors.js';
import { paraCentavos, deCentavos } from '../../shared/dinheiro.js';
import * as financeiroRepository from './financeiro.repository.js';

// "Vencida" nunca é gravada — é calculada a cada leitura (status ABERTA +
// vencimento no passado). Isso evita precisar de um job agendado só para
// manter esse campo em dia.
function comVencida(conta) {
  const vencida = conta.status === 'ABERTA' && new Date(conta.vencimento) < new Date();
  return { ...conta, vencida };
}

export async function listar(filtros) {
  const contas = await financeiroRepository.listar(filtros);
  return contas.map(comVencida);
}

export async function buscarPorId(id) {
  const conta = await financeiroRepository.buscarPorId(id);
  if (!conta) {
    throw new NaoEncontradoError('Conta não encontrada.');
  }
  return comVencida(conta);
}

export function criar(dados) {
  return financeiroRepository.criar({
    tipo: dados.tipo,
    fornecedor: dados.fornecedor || null,
    descricao: dados.descricao,
    valor: dados.valor,
    vencimento: dados.vencimento,
  });
}

async function exigirEditavel(id) {
  const conta = await financeiroRepository.buscarPorId(id);
  if (!conta) {
    throw new NaoEncontradoError('Conta não encontrada.');
  }
  if (conta.status === 'PAGA') {
    throw new AppError('Não é possível alterar uma conta já paga.', 400);
  }
  return conta;
}

export async function atualizar(id, dados) {
  await exigirEditavel(id);

  const atualizacoes = {
    ...(dados.fornecedor !== undefined && { fornecedor: dados.fornecedor || null }),
    ...(dados.descricao && { descricao: dados.descricao }),
    ...(dados.valor !== undefined && { valor: dados.valor }),
    ...(dados.vencimento && { vencimento: dados.vencimento }),
  };

  return financeiroRepository.atualizar(id, atualizacoes);
}

export async function remover(id) {
  const conta = await exigirEditavel(id);
  if (conta.ordemServicoId) {
    throw new AppError('Contas geradas pelo encerramento de uma OS não podem ser excluídas.', 400);
  }
  await financeiroRepository.remover(id);
}

export async function baixar(id, dados) {
  await exigirEditavel(id);
  return financeiroRepository.baixar(id, {
    valorPago: dados.valorPago,
    pagaEm: dados.pagaEm ?? new Date(),
  });
}

// Fluxo de caixa (PB19): entradas (RECEBER) e saídas (PAGAR) já pagas dentro
// do período, totais e por dia — tudo em centavos por baixo para não
// acumular erro de ponto flutuante ao somar várias contas.
export async function fluxoCaixa(inicio, fim) {
  const contas = await financeiroRepository.listarPagasNoPeriodo(inicio, fim);

  const porDiaCentavos = new Map();
  let entradasCentavos = 0;
  let saidasCentavos = 0;

  for (const conta of contas) {
    const centavos = paraCentavos(conta.valorPago ?? conta.valor);
    const chave = new Date(conta.pagaEm).toISOString().slice(0, 10);
    const linha = porDiaCentavos.get(chave) ?? { entradas: 0, saidas: 0 };

    if (conta.tipo === 'RECEBER') {
      linha.entradas += centavos;
      entradasCentavos += centavos;
    } else {
      linha.saidas += centavos;
      saidasCentavos += centavos;
    }
    porDiaCentavos.set(chave, linha);
  }

  const porDia = [...porDiaCentavos.entries()]
    .map(([data, linha]) => ({
      data,
      entradas: deCentavos(linha.entradas),
      saidas: deCentavos(linha.saidas),
    }))
    .sort((a, b) => a.data.localeCompare(b.data));

  return {
    entradas: deCentavos(entradasCentavos),
    saidas: deCentavos(saidasCentavos),
    saldo: deCentavos(entradasCentavos - saidasCentavos),
    porDia,
  };
}
