import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { gerarPdf, gerarXlsx } from './relatorios.exportacao.js';

const RELATORIO_FAKE = {
  titulo: 'Relatório de Teste',
  subtitulo: 'Período: 01/01/2026 a 31/01/2026',
  resumo: ['OS encerradas: 2', 'Faturamento total: R$ 230,00'],
  colunas: ['OS', 'Encerrada em', 'Valor'],
  linhas: [
    ['nº 1', '10/01/2026', 'R$ 170,00'],
    ['nº 2', '20/01/2026', 'R$ 60,00'],
  ],
};

describe('gerarPdf', () => {
  it('gera um PDF válido (cabeçalho %PDF) e não vazio', async () => {
    const buffer = await gerarPdf(RELATORIO_FAKE);

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(buffer.length).toBeGreaterThan(100);
  });

  it('funciona sem resumo (relatório de desempenho não tem resumo)', async () => {
    const { resumo: _resumo, ...semResumo } = RELATORIO_FAKE;
    const buffer = await gerarPdf(semResumo);

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});

describe('gerarXlsx', () => {
  it('gera uma planilha válida, que a biblioteca consegue reabrir com as linhas certas', async () => {
    const buffer = await gerarXlsx(RELATORIO_FAKE);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const planilha = workbook.worksheets[0];

    expect(planilha.getRow(1).values.slice(1)).toEqual(RELATORIO_FAKE.colunas);
    expect(planilha.getRow(2).values.slice(1)).toEqual(RELATORIO_FAKE.linhas[0]);
    expect(planilha.rowCount).toBe(1 + RELATORIO_FAKE.linhas.length);
  });

  it('corta o nome da aba para no máximo 31 caracteres (limite do Excel)', async () => {
    const buffer = await gerarXlsx({
      ...RELATORIO_FAKE,
      titulo: 'Um título de relatório extremamente longo para a aba',
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    expect(workbook.worksheets[0].name.length).toBeLessThanOrEqual(31);
  });
});
