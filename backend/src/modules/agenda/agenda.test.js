import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./agenda.repository.js', () => ({
  contarAtivosNoHorario: vi.fn(),
  buscarPorId: vi.fn(),
  criar: vi.fn(),
  atualizar: vi.fn(),
  listarPorPeriodo: vi.fn(),
}));

vi.mock('../clientes/clientes.service.js', () => ({
  buscarPorId: vi.fn(),
}));

vi.mock('../veiculos/veiculos.service.js', () => ({
  buscarPorId: vi.fn(),
}));

const agendaRepository = await import('./agenda.repository.js');
const clientesService = await import('../clientes/clientes.service.js');
const veiculosService = await import('../veiculos/veiculos.service.js');
const agendaService = await import('./agenda.service.js');

// Terça-feira às 10h, dentro do horário comercial (8h-18h, seg-sáb).
const HORARIO_COMERCIAL = new Date('2026-11-03T10:00:00');

const AGENDAMENTO_FAKE = {
  id: 'agendamento-1',
  dataHora: HORARIO_COMERCIAL,
  status: 'AGENDADO',
  clienteId: 'cliente-1',
  veiculoId: 'veiculo-1',
};

beforeEach(() => {
  vi.clearAllMocks();
  clientesService.buscarPorId.mockResolvedValue({ id: 'cliente-1' });
  veiculosService.buscarPorId.mockResolvedValue({ id: 'veiculo-1' });
});

describe('criar', () => {
  it('bloqueia quando o horário está lotado e sugere próximos horários livres', async () => {
    agendaRepository.contarAtivosNoHorario
      .mockResolvedValueOnce(agendaService.LIMITE_BOXES_POR_HORARIO) // horário pedido: lotado
      .mockResolvedValue(0); // demais horários pesquisados: livres

    await expect(
      agendaService.criar({
        dataHora: HORARIO_COMERCIAL.toISOString(),
        clienteId: 'cliente-1',
      }),
    ).rejects.toMatchObject({
      status: 409,
      sugestoes: expect.arrayContaining([expect.any(Date)]),
    });

    expect(agendaRepository.criar).not.toHaveBeenCalled();
  });

  it('agenda quando há boxes disponíveis', async () => {
    agendaRepository.contarAtivosNoHorario.mockResolvedValue(0);
    agendaRepository.criar.mockResolvedValue(AGENDAMENTO_FAKE);

    const resultado = await agendaService.criar({
      dataHora: HORARIO_COMERCIAL.toISOString(),
      clienteId: 'cliente-1',
      veiculoId: 'veiculo-1',
    });

    expect(resultado).toEqual(AGENDAMENTO_FAKE);
  });

  it('propaga erro quando o cliente não existe', async () => {
    clientesService.buscarPorId.mockRejectedValue(
      Object.assign(new Error('Cliente não encontrado.'), { status: 404 }),
    );

    await expect(
      agendaService.criar({ dataHora: HORARIO_COMERCIAL.toISOString(), clienteId: 'inexistente' }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe('reagendar', () => {
  it('lança erro quando o agendamento não existe', async () => {
    agendaRepository.buscarPorId.mockResolvedValue(null);

    await expect(
      agendaService.reagendar('inexistente', HORARIO_COMERCIAL.toISOString()),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('bloqueia reagendar um atendimento já cancelado', async () => {
    agendaRepository.buscarPorId.mockResolvedValue({ ...AGENDAMENTO_FAKE, status: 'CANCELADO' });

    await expect(
      agendaService.reagendar('agendamento-1', HORARIO_COMERCIAL.toISOString()),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('bloqueia reagendar para um horário lotado', async () => {
    agendaRepository.buscarPorId.mockResolvedValue(AGENDAMENTO_FAKE);
    agendaRepository.contarAtivosNoHorario.mockResolvedValue(agendaService.LIMITE_BOXES_POR_HORARIO);

    await expect(
      agendaService.reagendar('agendamento-1', HORARIO_COMERCIAL.toISOString()),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('reagenda e marca o status como REAGENDADO, ignorando a própria vaga na contagem', async () => {
    agendaRepository.buscarPorId.mockResolvedValue(AGENDAMENTO_FAKE);
    agendaRepository.contarAtivosNoHorario.mockResolvedValue(0);
    agendaRepository.atualizar.mockResolvedValue({ ...AGENDAMENTO_FAKE, status: 'REAGENDADO' });

    const resultado = await agendaService.reagendar('agendamento-1', HORARIO_COMERCIAL.toISOString());

    expect(resultado.status).toBe('REAGENDADO');
    expect(agendaRepository.contarAtivosNoHorario).toHaveBeenCalledWith(
      expect.any(Date),
      'agendamento-1',
    );
    expect(agendaRepository.atualizar).toHaveBeenCalledWith(
      'agendamento-1',
      expect.objectContaining({ status: 'REAGENDADO' }),
    );
  });
});

describe('listarPorDia', () => {
  it('monta a janela do dia inteiro em horário local, sem perder registros por fuso', async () => {
    agendaRepository.listarPorPeriodo.mockResolvedValue([AGENDAMENTO_FAKE]);

    const resultado = await agendaService.listarPorDia('2026-11-03');

    expect(resultado).toEqual([AGENDAMENTO_FAKE]);
    const [inicio, fim] = agendaRepository.listarPorPeriodo.mock.calls[0];
    expect(inicio.getFullYear()).toBe(2026);
    expect(inicio.getMonth()).toBe(10); // novembro = índice 10
    expect(inicio.getDate()).toBe(3);
    expect(inicio.getHours()).toBe(0);
    expect(fim.getDate()).toBe(4);
  });

  it('aceita uma data-hora completa e usa só a parte da data', async () => {
    agendaRepository.listarPorPeriodo.mockResolvedValue([]);

    await agendaService.listarPorDia('2026-11-03T23:50:00.000Z');

    const [inicio] = agendaRepository.listarPorPeriodo.mock.calls[0];
    expect(inicio.getDate()).toBe(3);
  });
});

describe('cancelar', () => {
  it('lança erro quando o agendamento não existe', async () => {
    agendaRepository.buscarPorId.mockResolvedValue(null);

    await expect(agendaService.cancelar('inexistente')).rejects.toMatchObject({ status: 404 });
  });

  it('cancela e libera o horário (status CANCELADO)', async () => {
    agendaRepository.buscarPorId.mockResolvedValue(AGENDAMENTO_FAKE);
    agendaRepository.atualizar.mockResolvedValue({ ...AGENDAMENTO_FAKE, status: 'CANCELADO' });

    const resultado = await agendaService.cancelar('agendamento-1');

    expect(resultado.status).toBe('CANCELADO');
    expect(agendaRepository.atualizar).toHaveBeenCalledWith('agendamento-1', {
      status: 'CANCELADO',
    });
  });
});
