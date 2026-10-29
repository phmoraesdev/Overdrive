import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./ordens.repository.js', () => ({
  buscarEmAndamentoPorVeiculo: vi.fn(),
  buscarUltimaPorVeiculo: vi.fn(),
  listarPorVeiculo: vi.fn(),
  buscarPorId: vi.fn(),
  criarComChecklist: vi.fn(),
}));

vi.mock('../veiculos/veiculos.service.js', () => ({
  buscarPorPlaca: vi.fn(),
  buscarPorId: vi.fn(),
}));

vi.mock('../notificacoes/notificacoes.service.js', () => ({
  notificarClientePronto: vi.fn().mockResolvedValue({ enviadas: [], alertaRecepcao: false }),
}));

const ordensRepository = await import('./ordens.repository.js');
const veiculosService = await import('../veiculos/veiculos.service.js');
const ordensService = await import('./ordens.service.js');

const VEICULO_FAKE = {
  id: 'veiculo-1',
  placa: 'ABC1234',
  clienteId: 'cliente-1',
  km: 50000,
};

const CHECKLIST_FAKE = {
  avarias: [],
  nivelCombustivel: 'MEIO',
  itensPresentes: ['Estepe', 'Macaco'],
  observacoes: '',
};

beforeEach(() => {
  vi.clearAllMocks();
  veiculosService.buscarPorId.mockResolvedValue(VEICULO_FAKE);
  ordensRepository.buscarEmAndamentoPorVeiculo.mockResolvedValue(null);
  ordensRepository.buscarUltimaPorVeiculo.mockResolvedValue(null);
});

describe('abrir', () => {
  it('bloqueia abertura sem checklist', async () => {
    await expect(
      ordensService.abrir(
        { veiculoId: 'veiculo-1', kmEntrada: 51000, problemaRelatado: 'Barulho no motor' },
        'func-1',
      ),
    ).rejects.toMatchObject({ status: 400 });

    expect(ordensRepository.criarComChecklist).not.toHaveBeenCalled();
  });

  it('exige confirmação quando o veículo já tem OS em andamento', async () => {
    ordensRepository.buscarEmAndamentoPorVeiculo.mockResolvedValue({
      id: 'os-1',
      numero: 42,
    });

    await expect(
      ordensService.abrir(
        {
          veiculoId: 'veiculo-1',
          kmEntrada: 51000,
          problemaRelatado: 'Barulho no motor',
          checklist: CHECKLIST_FAKE,
        },
        'func-1',
      ),
    ).rejects.toMatchObject({
      status: 409,
      avisos: [expect.objectContaining({ tipo: 'OS_EM_ANDAMENTO' })],
    });

    expect(ordensRepository.criarComChecklist).not.toHaveBeenCalled();
  });

  it('exige confirmação quando o km informado é menor que o da última OS', async () => {
    ordensRepository.buscarUltimaPorVeiculo.mockResolvedValue({ id: 'os-0', kmEntrada: 60000 });

    await expect(
      ordensService.abrir(
        {
          veiculoId: 'veiculo-1',
          kmEntrada: 51000,
          problemaRelatado: 'Barulho no motor',
          checklist: CHECKLIST_FAKE,
        },
        'func-1',
      ),
    ).rejects.toMatchObject({
      status: 409,
      avisos: [expect.objectContaining({ tipo: 'KM_MENOR' })],
    });

    expect(ordensRepository.criarComChecklist).not.toHaveBeenCalled();
  });

  it('abre a OS quando os avisos são ignorados explicitamente', async () => {
    ordensRepository.buscarEmAndamentoPorVeiculo.mockResolvedValue({ id: 'os-1', numero: 42 });
    ordensRepository.criarComChecklist.mockResolvedValue({ id: 'os-2', numero: 43 });

    const resultado = await ordensService.abrir(
      {
        veiculoId: 'veiculo-1',
        kmEntrada: 51000,
        problemaRelatado: 'Barulho no motor',
        checklist: CHECKLIST_FAKE,
        ignorarAvisos: true,
      },
      'func-1',
    );

    expect(resultado).toEqual({ id: 'os-2', numero: 43 });
    expect(ordensRepository.criarComChecklist).toHaveBeenCalledWith(
      expect.objectContaining({ veiculoId: 'veiculo-1', clienteId: 'cliente-1' }),
    );
  });

  it('abre a OS normalmente quando não há avisos', async () => {
    ordensRepository.criarComChecklist.mockResolvedValue({ id: 'os-2', numero: 43 });

    const resultado = await ordensService.abrir(
      {
        veiculoId: 'veiculo-1',
        kmEntrada: 51000,
        problemaRelatado: 'Barulho no motor',
        checklist: CHECKLIST_FAKE,
      },
      'func-1',
    );

    expect(resultado.numero).toBe(43);
  });
});

describe('buscarParaAbertura', () => {
  it('retorna veículo, OS em andamento e última OS para a placa buscada', async () => {
    veiculosService.buscarPorPlaca.mockResolvedValue(VEICULO_FAKE);
    ordensRepository.buscarEmAndamentoPorVeiculo.mockResolvedValue({ id: 'os-1', numero: 5 });
    ordensRepository.buscarUltimaPorVeiculo.mockResolvedValue({ id: 'os-1', kmEntrada: 50000 });

    const resultado = await ordensService.buscarParaAbertura('ABC1234');

    expect(resultado).toEqual({
      veiculo: VEICULO_FAKE,
      osEmAndamento: { id: 'os-1', numero: 5 },
      ultimaOS: { id: 'os-1', kmEntrada: 50000 },
    });
  });

  it('propaga erro quando a placa não existe', async () => {
    veiculosService.buscarPorPlaca.mockRejectedValue(
      Object.assign(new Error('Nenhum veículo encontrado com esta placa.'), { status: 404 }),
    );

    await expect(ordensService.buscarParaAbertura('ZZZ9999')).rejects.toMatchObject({ status: 404 });
  });
});

describe('listarHistoricoPorPlaca', () => {
  it('retorna o histórico vazio quando o veículo não tem OS', async () => {
    veiculosService.buscarPorPlaca.mockResolvedValue(VEICULO_FAKE);
    ordensRepository.listarPorVeiculo.mockResolvedValue([]);

    const resultado = await ordensService.listarHistoricoPorPlaca('ABC1234');

    expect(resultado).toEqual([]);
  });

  it('propaga erro quando a placa não existe', async () => {
    veiculosService.buscarPorPlaca.mockRejectedValue(
      Object.assign(new Error('Nenhum veículo encontrado com esta placa.'), { status: 404 }),
    );

    await expect(ordensService.listarHistoricoPorPlaca('ZZZ9999')).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('buscarPorId', () => {
  it('lança erro quando a OS não existe', async () => {
    ordensRepository.buscarPorId.mockResolvedValue(null);

    await expect(ordensService.buscarPorId('inexistente')).rejects.toMatchObject({ status: 404 });
  });
});
