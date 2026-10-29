// Matemática de dinheiro em centavos (inteiros) para não acumular erro de
// ponto flutuante (ex.: 0.1 + 0.2 !== 0.3) nos totais do orçamento.

export function paraCentavos(valor) {
  return Math.round(Number(valor) * 100);
}

export function deCentavos(centavos) {
  return centavos / 100;
}

// Total de um item = valor unitário x quantidade, arredondado ao centavo.
// Quantidade pode ser fracionária (ex.: 1.5h de mão de obra).
export function calcularTotalItem(quantidade, valorUnitario) {
  const centavos = Math.round(paraCentavos(valorUnitario) * Number(quantidade));
  return deCentavos(centavos);
}

// Soma os totais já arredondados de cada item — é assim que a maioria dos
// sistemas de orçamento/nota fiscal concilia "soma das linhas" com o total.
export function calcularTotalOrcamento(itens) {
  const centavos = itens.reduce(
    (soma, item) => soma + paraCentavos(calcularTotalItem(item.quantidade, item.valorUnitario)),
    0,
  );
  return deCentavos(centavos);
}

// Divide um valor total em N parcelas iguais, em centavos, sem perder nem
// sobrar centavo: a diferença de arredondamento vai inteira para a última
// parcela.
export function dividirEmParcelas(valorTotal, numeroParcelas) {
  const totalCentavos = paraCentavos(valorTotal);
  const baseCentavos = Math.floor(totalCentavos / numeroParcelas);
  const resto = totalCentavos - baseCentavos * numeroParcelas;

  return Array.from({ length: numeroParcelas }, (_, indice) => {
    const ehUltima = indice === numeroParcelas - 1;
    return deCentavos(ehUltima ? baseCentavos + resto : baseCentavos);
  });
}
