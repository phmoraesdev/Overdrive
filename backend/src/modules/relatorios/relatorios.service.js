import { calcularTotalOrcamento, deCentavos, paraCentavos } from '../../shared/dinheiro.js';
import * as relatoriosRepository from './relatorios.repository.js';

// RF17/PB20: faturamento = soma dos itens aprovados das OS encerradas no
// período (o que a oficina efetivamente cobrou), não o que já foi recebido
// em caixa — isso é o fluxo de caixa (PB19), outra pergunta.
export async function faturamento(inicio, fim) {
  const ordens = await relatoriosRepository.listarOrdensEncerradasNoPeriodo(inicio, fim);

  const linhas = ordens.map((os) => ({
    numero: os.numero,
    encerradaEm: os.encerradaEm,
    valor: calcularTotalOrcamento(os.itensOrcamento),
  }));

  const faturamentoTotal = deCentavos(
    linhas.reduce((soma, linha) => soma + paraCentavos(linha.valor), 0),
  );
  const quantidadeOS = linhas.length;
  const ticketMedio =
    quantidadeOS > 0 ? deCentavos(Math.round(paraCentavos(faturamentoTotal) / quantidadeOS)) : 0;

  return { periodo: { inicio, fim }, quantidadeOS, faturamentoTotal, ticketMedio, ordens: linhas };
}

// RF17/PB20: desempenho por mecânico = quantas OS ele encerrou e quanto
// cobrou de mão de obra nelas, no período. Só considera OS com mecânico
// responsável identificado (atribuído quando ele finaliza o orçamento —
// ver ordens.repository.js#finalizarOrcamento).
export async function desempenhoPorMecanico(inicio, fim) {
  const ordens = await relatoriosRepository.listarOrdensEncerradasNoPeriodo(inicio, fim);
  const porMecanico = new Map();

  for (const os of ordens) {
    if (!os.mecanicoId) continue;

    const atual = porMecanico.get(os.mecanicoId) ?? {
      mecanicoId: os.mecanicoId,
      mecanicoNome: os.mecanico?.nome ?? 'Desconhecido',
      quantidadeOS: 0,
      totalMaoDeObraCentavos: 0,
    };

    atual.quantidadeOS += 1;
    const itensMaoDeObra = os.itensOrcamento.filter((item) => item.tipo === 'MAO_DE_OBRA');
    atual.totalMaoDeObraCentavos += paraCentavos(calcularTotalOrcamento(itensMaoDeObra));

    porMecanico.set(os.mecanicoId, atual);
  }

  return [...porMecanico.values()]
    .map((linha) => ({
      mecanicoId: linha.mecanicoId,
      mecanicoNome: linha.mecanicoNome,
      quantidadeOS: linha.quantidadeOS,
      totalMaoDeObra: deCentavos(linha.totalMaoDeObraCentavos),
    }))
    .sort((a, b) => b.totalMaoDeObra - a.totalMaoDeObra);
}
