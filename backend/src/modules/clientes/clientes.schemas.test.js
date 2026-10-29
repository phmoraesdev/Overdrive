import { describe, expect, it } from 'vitest';
import { criarClienteSchema } from './clientes.schemas.js';

const DADOS_VALIDOS = {
  nome: 'João da Silva',
  cpf: '529.982.247-25',
  telefone: '11999998888',
};

describe('criarClienteSchema', () => {
  it('aceita dados válidos', () => {
    expect(criarClienteSchema.safeParse(DADOS_VALIDOS).success).toBe(true);
  });

  it('rejeita CPF inválido', () => {
    const resultado = criarClienteSchema.safeParse({ ...DADOS_VALIDOS, cpf: '111.111.111-11' });
    expect(resultado.success).toBe(false);
  });

  it('rejeita nome vazio (campo obrigatório)', () => {
    const resultado = criarClienteSchema.safeParse({ ...DADOS_VALIDOS, nome: '' });
    expect(resultado.success).toBe(false);
  });

  it('rejeita telefone ausente (campo obrigatório)', () => {
    const { telefone: _telefone, ...semTelefone } = DADOS_VALIDOS;
    const resultado = criarClienteSchema.safeParse(semTelefone);
    expect(resultado.success).toBe(false);
  });
});
