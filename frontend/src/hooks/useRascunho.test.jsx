import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useRascunho } from './useRascunho';

const CHAVE = 'overdrive:teste-rascunho';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('useRascunho', () => {
  it('não encontra rascunho quando o localStorage está vazio', () => {
    const { result } = renderHook(() => useRascunho(CHAVE));
    expect(result.current.rascunhoEncontrado).toBeNull();
  });

  it('salva o rascunho no localStorage', () => {
    const { result } = renderHook(() => useRascunho(CHAVE));
    act(() => {
      result.current.salvarRascunho({ placa: 'ABC1234' });
    });
    expect(JSON.parse(localStorage.getItem(CHAVE))).toEqual({ placa: 'ABC1234' });
  });

  it('recupera um rascunho salvo anteriormente (nova montagem do hook)', () => {
    localStorage.setItem(CHAVE, JSON.stringify({ descricao: 'Troca de pastilha' }));
    const { result } = renderHook(() => useRascunho(CHAVE));
    expect(result.current.rascunhoEncontrado).toEqual({ descricao: 'Troca de pastilha' });
  });

  it('descarta o rascunho e limpa o localStorage', () => {
    localStorage.setItem(CHAVE, JSON.stringify({ descricao: 'Troca de pastilha' }));
    const { result } = renderHook(() => useRascunho(CHAVE));
    expect(result.current.rascunhoEncontrado).not.toBeNull();

    act(() => {
      result.current.descartarRascunho();
    });

    expect(result.current.rascunhoEncontrado).toBeNull();
    expect(localStorage.getItem(CHAVE)).toBeNull();
  });

  it('não quebra quando o valor salvo não é um JSON válido', () => {
    localStorage.setItem(CHAVE, '{json-invalido');
    const { result } = renderHook(() => useRascunho(CHAVE));
    expect(result.current.rascunhoEncontrado).toBeNull();
  });

  it('usa chaves diferentes para formulários diferentes', () => {
    const { result: resultA } = renderHook(() => useRascunho('overdrive:rascunho-a'));
    const { result: resultB } = renderHook(() => useRascunho('overdrive:rascunho-b'));

    act(() => {
      resultA.current.salvarRascunho({ valor: 'a' });
    });

    expect(localStorage.getItem('overdrive:rascunho-a')).not.toBeNull();
    expect(localStorage.getItem('overdrive:rascunho-b')).toBeNull();
    expect(resultB.current.rascunhoEncontrado).toBeNull();

    localStorage.removeItem('overdrive:rascunho-a');
  });
});
