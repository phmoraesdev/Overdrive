import * as agendaService from './agenda.service.js';
import { criarAgendamentoSchema, reagendarAgendamentoSchema } from './agenda.schemas.js';

export async function listarPorDia(req, res) {
  const data = req.query.data ?? new Date().toISOString();
  const agendamentos = await agendaService.listarPorDia(data);
  res.json(agendamentos);
}

export async function criar(req, res) {
  const dados = criarAgendamentoSchema.parse(req.body);
  const agendamento = await agendaService.criar(dados);
  res.status(201).json(agendamento);
}

export async function reagendar(req, res) {
  const { dataHora } = reagendarAgendamentoSchema.parse(req.body);
  const agendamento = await agendaService.reagendar(req.params.id, dataHora);
  res.json(agendamento);
}

export async function cancelar(req, res) {
  const agendamento = await agendaService.cancelar(req.params.id);
  res.json(agendamento);
}
