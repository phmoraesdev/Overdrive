const PADRAO_ANTIGO = /^[A-Z]{3}[0-9]{4}$/;
const PADRAO_MERCOSUL = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

export function limparPlaca(placa) {
  return (placa ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function formatarPlaca(placa) {
  const normalizada = limparPlaca(placa);
  if (PADRAO_ANTIGO.test(normalizada)) {
    return normalizada.replace(/^([A-Z]{3})([0-9]{4})$/, '$1-$2');
  }
  return normalizada;
}

export function placaValida(placa) {
  const normalizada = limparPlaca(placa);
  return PADRAO_ANTIGO.test(normalizada) || PADRAO_MERCOSUL.test(normalizada);
}
