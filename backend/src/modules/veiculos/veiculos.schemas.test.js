import { describe, expect, it } from 'vitest';
import { criarVeiculoSchema } from './veiculos.schemas.js';

const DADOS_VALIDOS = {
  placa: 'ABC1234',
  marca: 'Volkswagen',
  modelo: 'Gol',
  ano: 2015,
  clienteId: 'cliente-1',
};

describe('criarVeiculoSchema', () => {
  it('aceita placa no padrão antigo e no Mercosul', () => {
    expect(criarVeiculoSchema.safeParse(DADOS_VALIDOS).success).toBe(true);
    expect(criarVeiculoSchema.safeParse({ ...DADOS_VALIDOS, placa: 'ABC1D23' }).success).toBe(
      true,
    );
  });

  it('rejeita placa com formato inválido', () => {
    const resultado = criarVeiculoSchema.safeParse({ ...DADOS_VALIDOS, placa: 'XYZ99' });
    expect(resultado.success).toBe(false);
  });

  it('rejeita ano fora da faixa aceitável', () => {
    const resultado = criarVeiculoSchema.safeParse({ ...DADOS_VALIDOS, ano: 1900 });
    expect(resultado.success).toBe(false);
  });

  it('rejeita quando falta o cliente dono do veículo', () => {
    const { clienteId: _clienteId, ...semCliente } = DADOS_VALIDOS;
    const resultado = criarVeiculoSchema.safeParse(semCliente);
    expect(resultado.success).toBe(false);
  });
});
