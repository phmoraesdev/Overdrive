import { useRef, useState } from 'react';

// Mensagem de sucesso temporária (RNF: feedback ao usuário), usada da mesma
// forma em todas as telas que salvam algo — aparece por `duracaoMs` e some.
export function useMensagemSucesso(duracaoMs = 4000) {
  const [mensagem, setMensagem] = useState('');
  const temporizadorRef = useRef(null);

  function mostrarSucesso(texto) {
    if (temporizadorRef.current) clearTimeout(temporizadorRef.current);
    setMensagem(texto);
    temporizadorRef.current = setTimeout(() => setMensagem(''), duracaoMs);
  }

  return [mensagem, mostrarSucesso];
}
