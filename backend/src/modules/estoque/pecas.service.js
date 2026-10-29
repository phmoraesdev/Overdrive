import { AvisosConfirmacaoError, ConflitoError, NaoEncontradoError } from '../../shared/errors.js';
import * as pecasRepository from './pecas.repository.js';

function avisosDePreco(precoCusto, precoVenda) {
  const avisos = [];
  if (Number(precoVenda) < Number(precoCusto)) {
    avisos.push({
      tipo: 'PRECO_VENDA_ABAIXO_DO_CUSTO',
      mensagem: 'O preço de venda é menor que o preço de custo.',
    });
  }
  return avisos;
}

export function listar(filtros) {
  return pecasRepository.listar(filtros);
}

// PB18/RF15: "em alerta" é sempre calculado na hora — não existe uma tabela
// de alertas para ficar sincronizada nem para limpar depois. Assim que o
// saldo volta acima do mínimo, a peça simplesmente some da lista na próxima
// consulta — é isso que dá o "resolve sozinho" pedido no requisito.
export function pecaEmAlerta(peca) {
  return Number(peca.quantidade) <= Number(peca.quantidadeMinima);
}

export async function listarEmAlerta() {
  const pecas = await pecasRepository.listarAtivas();
  return pecas.filter(pecaEmAlerta);
}

export async function buscarPorId(id) {
  const peca = await pecasRepository.buscarPorId(id);
  if (!peca) {
    throw new NaoEncontradoError('Peça não encontrada.');
  }
  return peca;
}

export async function criar(dados) {
  const existente = await pecasRepository.buscarPorCodigo(dados.codigo);
  if (existente) {
    throw new ConflitoError('Já existe uma peça cadastrada com este código.');
  }

  const avisos = avisosDePreco(dados.precoCusto, dados.precoVenda);
  if (avisos.length > 0 && !dados.ignorarAvisos) {
    throw new AvisosConfirmacaoError(avisos);
  }

  return pecasRepository.criar({
    codigo: dados.codigo,
    descricao: dados.descricao,
    precoCusto: dados.precoCusto,
    precoVenda: dados.precoVenda,
    quantidade: dados.quantidade ?? 0,
    quantidadeMinima: dados.quantidadeMinima ?? 0,
  });
}

export async function atualizar(id, dados) {
  const peca = await pecasRepository.buscarPorId(id);
  if (!peca) {
    throw new NaoEncontradoError('Peça não encontrada.');
  }

  if (dados.codigo && dados.codigo !== peca.codigo) {
    const existente = await pecasRepository.buscarPorCodigo(dados.codigo);
    if (existente) {
      throw new ConflitoError('Já existe uma peça cadastrada com este código.');
    }
  }

  const precoAlterado = dados.precoCusto !== undefined || dados.precoVenda !== undefined;
  if (precoAlterado) {
    const precoCusto = dados.precoCusto ?? peca.precoCusto;
    const precoVenda = dados.precoVenda ?? peca.precoVenda;
    const avisos = avisosDePreco(precoCusto, precoVenda);
    if (avisos.length > 0 && !dados.ignorarAvisos) {
      throw new AvisosConfirmacaoError(avisos);
    }
  }

  const atualizacoes = {
    ...(dados.codigo && { codigo: dados.codigo }),
    ...(dados.descricao && { descricao: dados.descricao }),
    ...(dados.precoCusto !== undefined && { precoCusto: dados.precoCusto }),
    ...(dados.precoVenda !== undefined && { precoVenda: dados.precoVenda }),
    ...(dados.quantidade !== undefined && { quantidade: dados.quantidade }),
    ...(dados.quantidadeMinima !== undefined && { quantidadeMinima: dados.quantidadeMinima }),
  };

  return pecasRepository.atualizar(id, atualizacoes);
}

export async function definirAtivo(id, ativo) {
  const peca = await pecasRepository.buscarPorId(id);
  if (!peca) {
    throw new NaoEncontradoError('Peça não encontrada.');
  }
  return pecasRepository.definirAtivo(id, ativo);
}
