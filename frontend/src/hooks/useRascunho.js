import { useCallback, useState } from 'react';

function carregar(chave) {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

function persistir(chave, dados) {
  try {
    localStorage.setItem(chave, JSON.stringify(dados));
  } catch {
    // localStorage indisponível (modo privado, cota cheia etc.) — segue sem rascunho.
  }
}

function remover(chave) {
  try {
    localStorage.removeItem(chave);
  } catch {
    // ver comentário acima
  }
}

// Rascunho em localStorage (RNF09): não perde o que foi digitado se a página
// recarregar ou a conexão cair. `chave` precisa ser única por formulário (e,
// quando fizer sentido, por registro — ex. incluir o número da OS na chave).
export function useRascunho(chave) {
  const [rascunhoEncontrado, setRascunhoEncontrado] = useState(() => carregar(chave));

  const salvarRascunho = useCallback((dados) => persistir(chave, dados), [chave]);

  const descartarRascunho = useCallback(() => {
    remover(chave);
    setRascunhoEncontrado(null);
  }, [chave]);

  return { rascunhoEncontrado, salvarRascunho, descartarRascunho };
}
