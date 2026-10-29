import PDFDocument from 'pdfkit';
import { calcularTotalItem, calcularTotalOrcamento } from '../../shared/dinheiro.js';

const ROTULOS_FORMA_PAGAMENTO = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  CARTAO: 'Cartão',
  BOLETO: 'Boleto',
};

function formatarReais(valor) {
  return `R$ ${Number(valor).toFixed(2).replace('.', ',')}`;
}

function formatarData(data) {
  return new Date(data).toLocaleDateString('pt-BR');
}

// PB16: recibo simples em PDF, gerado sob demanda (não fica salvo em disco),
// a partir dos dados já carregados da OS (itens aprovados, conta e parcelas).
export function gerarReciboBuffer(ordemServico) {
  const itensAprovados = ordemServico.itensOrcamento.filter((item) => item.aprovado);
  const total = calcularTotalOrcamento(itensAprovados);
  const conta = ordemServico.contas?.[0];

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const partes = [];

    doc.on('data', (parte) => partes.push(parte));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);

    doc.fontSize(18).text('Overdrive — Recibo de Serviço', { align: 'center' });
    doc.moveDown();

    doc.fontSize(11);
    doc.text(`OS nº ${ordemServico.numero}`);
    doc.text(`Encerrada em: ${formatarData(ordemServico.encerradaEm)}`);
    doc.text(`Cliente: ${ordemServico.cliente.nome} — ${ordemServico.cliente.telefone}`);
    doc.text(
      `Veículo: ${ordemServico.veiculo.placa} — ${ordemServico.veiculo.marca} ${ordemServico.veiculo.modelo}`,
    );
    doc.moveDown();

    doc.fontSize(13).text('Itens');
    doc.fontSize(10);
    itensAprovados.forEach((item) => {
      const totalItem = calcularTotalItem(item.quantidade, item.valorUnitario);
      doc.text(
        `${item.descricao} — ${item.quantidade} x ${formatarReais(item.valorUnitario)} = ${formatarReais(totalItem)}`,
      );
    });
    doc.moveDown();

    doc.fontSize(13).text(`Total: ${formatarReais(total)}`);
    doc.fontSize(10);
    if (conta) {
      doc.text(`Forma de pagamento: ${ROTULOS_FORMA_PAGAMENTO[conta.formaPagamento] ?? conta.formaPagamento}`);
      if (conta.parcelas.length > 1) {
        doc.text(`Parcelado em ${conta.parcelas.length}x:`);
        conta.parcelas.forEach((parcela) => {
          doc.text(`  Parcela ${parcela.numero}: ${formatarReais(parcela.valor)} — vence em ${formatarData(parcela.vencimento)}`);
        });
      } else {
        doc.text('Pago à vista.');
      }
    }

    doc.end();
  });
}
