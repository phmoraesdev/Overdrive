import * as relatoriosService from './relatorios.service.js';
import { gerarPdf, gerarXlsx } from './relatorios.exportacao.js';
import { periodoSchema } from './relatorios.schemas.js';

function formatarReais(valor) {
  return `R$ ${Number(valor).toFixed(2).replace('.', ',')}`;
}

function formatarData(data) {
  return new Date(data).toLocaleDateString('pt-BR');
}

function subtituloPeriodo(inicio, fim) {
  return `Período: ${formatarData(inicio)} a ${formatarData(fim)}`;
}

async function enviarRelatorio(
  res,
  formato,
  { titulo, subtitulo, colunas, linhas, resumo, nomeArquivo, dadosJson },
) {
  if (formato === 'pdf') {
    const buffer = await gerarPdf({ titulo, subtitulo, colunas, linhas, resumo });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${nomeArquivo}.pdf"`);
    res.send(buffer);
    return;
  }

  if (formato === 'xlsx') {
    const buffer = await gerarXlsx({ titulo, colunas, linhas });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}.xlsx"`);
    res.send(buffer);
    return;
  }

  res.json(dadosJson);
}

export async function faturamento(req, res) {
  const { inicio, fim, formato } = periodoSchema.parse(req.query);
  const dados = await relatoriosService.faturamento(inicio, fim);

  await enviarRelatorio(res, formato, {
    titulo: 'Relatório de Faturamento',
    subtitulo: subtituloPeriodo(inicio, fim),
    resumo: [
      `OS encerradas: ${dados.quantidadeOS}`,
      `Faturamento total: ${formatarReais(dados.faturamentoTotal)}`,
      `Ticket médio: ${formatarReais(dados.ticketMedio)}`,
    ],
    colunas: ['OS', 'Encerrada em', 'Valor'],
    linhas: dados.ordens.map((os) => [
      `nº ${os.numero}`,
      formatarData(os.encerradaEm),
      formatarReais(os.valor),
    ]),
    nomeArquivo: 'faturamento',
    dadosJson: dados,
  });
}

export async function desempenho(req, res) {
  const { inicio, fim, formato } = periodoSchema.parse(req.query);
  const dados = await relatoriosService.desempenhoPorMecanico(inicio, fim);

  await enviarRelatorio(res, formato, {
    titulo: 'Relatório de Desempenho por Mecânico',
    subtitulo: subtituloPeriodo(inicio, fim),
    colunas: ['Mecânico', 'OS encerradas', 'Total mão de obra'],
    linhas: dados.map((linha) => [
      linha.mecanicoNome,
      String(linha.quantidadeOS),
      formatarReais(linha.totalMaoDeObra),
    ]),
    nomeArquivo: 'desempenho-por-mecanico',
    dadosJson: dados,
  });
}
