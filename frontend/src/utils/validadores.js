// Espelha backend/src/shared/cpf.js e backend/src/shared/placa.js — mesmo
// algoritmo dos dois lados para as regras não divergirem (RNF05). Se uma
// mudar, a outra precisa mudar junto.

function limparCpf(cpf) {
  return (cpf ?? '').replace(/\D/g, '');
}

function calcularDigitoVerificadorCpf(base) {
  let soma = 0;
  let peso = base.length + 1;
  for (const digito of base) {
    soma += Number(digito) * peso;
    peso -= 1;
  }
  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}

export function cpfValido(cpf) {
  const digits = limparCpf(cpf);
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  const base = digits.slice(0, 9);
  const digito1 = calcularDigitoVerificadorCpf(base);
  const digito2 = calcularDigitoVerificadorCpf(base + String(digito1));

  return digits === base + String(digito1) + String(digito2);
}

const PADRAO_PLACA_ANTIGO = /^[A-Z]{3}[0-9]{4}$/;
const PADRAO_PLACA_MERCOSUL = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

function limparPlaca(placa) {
  return (placa ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function placaValida(placa) {
  const normalizada = limparPlaca(placa);
  return PADRAO_PLACA_ANTIGO.test(normalizada) || PADRAO_PLACA_MERCOSUL.test(normalizada);
}

// Mensagens em português para validação durante a digitação (RNF05). Cada
// função retorna '' quando o valor é válido (ou está vazio — campo vazio é
// responsabilidade do `required` do HTML, não repetimos "obrigatório" aqui).

export function erroCpf(cpf) {
  if (!cpf || !limparCpf(cpf)) return '';
  return cpfValido(cpf) ? '' : 'CPF inválido.';
}

export function erroPlaca(placa) {
  if (!placa || !limparPlaca(placa)) return '';
  return placaValida(placa)
    ? ''
    : 'Placa inválida. Use o formato antigo (ABC1234) ou Mercosul (ABC1D23).';
}

// RNF05 — agenda: a data do atendimento não pode estar no passado. Recebe
// uma data no formato 'YYYY-MM-DD' (valor de <input type="date">) e compara
// só a data (sem horário), para não acusar erro no próprio dia.
export function erroDataPassada(dataISO) {
  if (!dataISO) return '';
  const [ano, mes, dia] = dataISO.split('-').map(Number);
  const dataEscolhida = new Date(ano, mes - 1, dia);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return dataEscolhida < hoje ? 'A data não pode estar no passado.' : '';
}
