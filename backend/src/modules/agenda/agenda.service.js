import { AppError, HorarioLotadoError, NaoEncontradoError } from '../../shared/errors.js';
import * as clientesService from '../clientes/clientes.service.js';
import * as veiculosService from '../veiculos/veiculos.service.js';
import * as agendaRepository from './agenda.repository.js';

// Configurável por variável de ambiente (RNF da capacidade de atendimento);
// cai para 3 boxes simultâneos por horário se não for definida.
export const LIMITE_BOXES_POR_HORARIO = Number(process.env.LIMITE_BOXES_POR_HORARIO ?? 3);

const DURACAO_SLOT_MINUTOS = 30;
const HORA_ABERTURA = 8;
const HORA_FECHAMENTO = 18;
const MAX_SUGESTOES = 3;
const MAX_TENTATIVAS_SUGESTAO = 200;

function proximoSlot(dataHora) {
  return new Date(dataHora.getTime() + DURACAO_SLOT_MINUTOS * 60000);
}

// Oficina funciona de segunda a sábado, 8h às 18h (RNF07).
function dentroDoHorarioComercial(dataHora) {
  const dia = dataHora.getDay();
  const horaDecimal = dataHora.getHours() + dataHora.getMinutes() / 60;
  return dia >= 1 && dia <= 6 && horaDecimal >= HORA_ABERTURA && horaDecimal < HORA_FECHAMENTO;
}

async function horarioDisponivel(dataHora, ignorarId) {
  const total = await agendaRepository.contarAtivosNoHorario(dataHora, ignorarId);
  return total < LIMITE_BOXES_POR_HORARIO;
}

export async function sugerirHorarios(dataHoraDesejada, quantidade = MAX_SUGESTOES) {
  const sugestoes = [];
  let candidato = proximoSlot(new Date(dataHoraDesejada));
  let tentativas = 0;

  while (sugestoes.length < quantidade && tentativas < MAX_TENTATIVAS_SUGESTAO) {
    tentativas += 1;
    if (dentroDoHorarioComercial(candidato) && (await horarioDisponivel(candidato))) {
      sugestoes.push(new Date(candidato));
    }
    candidato = proximoSlot(candidato);
  }

  return sugestoes;
}

// `new Date('YYYY-MM-DD')` é interpretado como meia-noite UTC pela spec do
// JS, não meia-noite local — em fusos negativos isso "volta" um dia depois
// de setHours(0,0,0,0). Por isso o dia é montado a partir dos componentes
// (ano/mês/dia) direto no construtor local, que não tem essa ambiguidade.
function inicioDoDiaLocal(dataStr) {
  const [ano, mes, dia] = String(dataStr).slice(0, 10).split('-').map(Number);
  return new Date(ano, mes - 1, dia, 0, 0, 0, 0);
}

export function listarPorDia(dataStr) {
  const inicio = inicioDoDiaLocal(dataStr);
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 1);
  return agendaRepository.listarPorPeriodo(inicio, fim);
}

export async function criar(dados) {
  await clientesService.buscarPorId(dados.clienteId);
  if (dados.veiculoId) {
    await veiculosService.buscarPorId(dados.veiculoId);
  }

  const dataHora = new Date(dados.dataHora);

  if (!(await horarioDisponivel(dataHora))) {
    throw new HorarioLotadoError(await sugerirHorarios(dataHora));
  }

  return agendaRepository.criar({
    dataHora,
    clienteId: dados.clienteId,
    veiculoId: dados.veiculoId || null,
    observacoes: dados.observacoes || null,
  });
}

export async function reagendar(id, novaDataHora) {
  const agendamento = await agendaRepository.buscarPorId(id);
  if (!agendamento) {
    throw new NaoEncontradoError('Agendamento não encontrado.');
  }
  if (agendamento.status === 'CANCELADO') {
    throw new AppError('Não é possível reagendar um atendimento cancelado.', 400);
  }

  const dataHora = new Date(novaDataHora);

  if (!(await horarioDisponivel(dataHora, id))) {
    throw new HorarioLotadoError(await sugerirHorarios(dataHora));
  }

  return agendaRepository.atualizar(id, { dataHora, status: 'REAGENDADO' });
}

// Cancelar libera o horário: o agendamento sai da lista de status ativos
// usada por `contarAtivosNoHorario`, então a vaga volta a contar como livre.
export async function cancelar(id) {
  const agendamento = await agendaRepository.buscarPorId(id);
  if (!agendamento) {
    throw new NaoEncontradoError('Agendamento não encontrado.');
  }

  return agendaRepository.atualizar(id, { status: 'CANCELADO' });
}
