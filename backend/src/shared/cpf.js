export function limparCpf(cpf) {
  return (cpf ?? '').replace(/\D/g, '');
}

export function formatarCpf(cpf) {
  const digits = limparCpf(cpf);
  if (digits.length !== 11) return cpf ?? '';
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function calcularDigitoVerificador(base) {
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
  const digito1 = calcularDigitoVerificador(base);
  const digito2 = calcularDigitoVerificador(base + String(digito1));

  return digits === base + String(digito1) + String(digito2);
}
