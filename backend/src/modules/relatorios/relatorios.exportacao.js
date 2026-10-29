import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

// Geradores de PDF/XLSX genéricos (título, colunas, linhas, resumo opcional)
// — os dois relatórios da sprint (faturamento e desempenho por mecânico)
// só precisam montar esses arrays, sem duplicar a parte de layout.

export function gerarPdf({ titulo, subtitulo, colunas, linhas, resumo }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const partes = [];

    doc.on('data', (parte) => partes.push(parte));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);

    doc.fontSize(16).text(titulo, { align: 'center' });
    if (subtitulo) {
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('gray').text(subtitulo, { align: 'center' });
      doc.fillColor('black');
    }
    doc.moveDown();

    if (resumo) {
      doc.fontSize(11);
      resumo.forEach((linha) => doc.text(linha));
      doc.moveDown();
    }

    doc.fontSize(10).font('Helvetica-Bold').text(colunas.join('   |   '));
    doc.font('Helvetica');
    doc.moveDown(0.3);
    linhas.forEach((linha) => doc.text(linha.join('   |   ')));

    doc.end();
  });
}

export async function gerarXlsx({ titulo, colunas, linhas }) {
  const workbook = new ExcelJS.Workbook();
  const planilha = workbook.addWorksheet(titulo.slice(0, 31));

  planilha.addRow(colunas);
  planilha.getRow(1).font = { bold: true };
  linhas.forEach((linha) => planilha.addRow(linha));
  planilha.columns.forEach((coluna) => {
    coluna.width = 24;
  });

  return workbook.xlsx.writeBuffer();
}
