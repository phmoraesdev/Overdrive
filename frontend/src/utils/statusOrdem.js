export const ROTULO_STATUS = {
  ABERTA: 'Aberta',
  AGUARDANDO_APROVACAO: 'Aguardando aprovação',
  REPROVADA: 'Reprovada',
  EM_EXECUCAO: 'Em execução',
  AGUARDANDO_PECA: 'Aguardando peça',
  PRONTO_PARA_RETIRADA: 'Pronto para retirada',
  ENCERRADA: 'Encerrada',
};

// Mapa único de cor por status, usado tanto no selo da OS (OrdemDetalhe,
// HistoricoVeiculo) quanto no destaque das colunas do painel (PainelOS) —
// para as duas telas sempre representarem o mesmo status com a mesma cor.
export const COR_STATUS = {
  ABERTA: 'slate',
  AGUARDANDO_APROVACAO: 'amber',
  REPROVADA: 'red',
  EM_EXECUCAO: 'blue',
  AGUARDANDO_PECA: 'amber',
  PRONTO_PARA_RETIRADA: 'emerald',
  ENCERRADA: 'slate',
};
