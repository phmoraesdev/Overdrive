export function formatarReais(valor) {
  return `R$ ${Number(valor).toFixed(2).replace('.', ',')}`;
}

export function formatarData(data) {
  return new Date(data).toLocaleDateString('pt-BR');
}

export function formatarDataHora(data) {
  return new Date(data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function formatarHorario(data) {
  return new Date(data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
