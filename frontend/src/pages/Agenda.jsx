import { Fragment, useEffect, useState } from 'react';
import * as agendaService from '../services/agenda';
import * as clientesService from '../services/clientes';
import * as veiculosService from '../services/veiculos';
import { formatarDataHora, formatarHorario } from '../utils/formatacao';
import { erroDataPassada } from '../utils/validadores';
import { useMensagemSucesso } from '../hooks/useMensagemSucesso';
import MensagemSucesso from '../components/MensagemSucesso';
import ErroCampo from '../components/ErroCampo';

function hojeISO() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function somarDias(dataISO, quantidade) {
  const [ano, mes, dia] = dataISO.split('-').map(Number);
  const data = new Date(ano, mes - 1, dia + quantidade);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(
    data.getDate(),
  ).padStart(2, '0')}`;
}

const ROTULO_STATUS = {
  AGENDADO: 'Agendado',
  REAGENDADO: 'Reagendado',
  CANCELADO: 'Cancelado',
  CONCLUIDO: 'Concluído',
};

function SugestoesHorario({ sugestoes, onEscolher }) {
  if (!sugestoes || sugestoes.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-sm text-amber-800">Horários livres mais próximos:</p>
      <div className="flex flex-wrap gap-2">
        {sugestoes.map((sugestao) => (
          <button
            key={sugestao}
            type="button"
            onClick={() => onEscolher(sugestao)}
            className="rounded-md border border-amber-300 bg-white px-3 py-1 text-sm font-medium text-amber-800 hover:bg-amber-100"
          >
            {formatarDataHora(sugestao)}
          </button>
        ))}
      </div>
    </div>
  );
}

function NovoAgendamentoForm({ dataSelecionada, clientes, onCriado }) {
  const [clienteId, setClienteId] = useState('');
  const [veiculoId, setVeiculoId] = useState('');
  const [veiculosDoCliente, setVeiculosDoCliente] = useState([]);
  const [hora, setHora] = useState('08:00');
  const [observacoes, setObservacoes] = useState('');
  const [erro, setErro] = useState('');
  const [sugestoes, setSugestoes] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const erroData = erroDataPassada(dataSelecionada);

  function handleClienteChange(novoClienteId) {
    setClienteId(novoClienteId);
    setVeiculoId('');
    if (!novoClienteId) {
      setVeiculosDoCliente([]);
      return;
    }
    veiculosService.listarPorCliente(novoClienteId).then(setVeiculosDoCliente);
  }

  async function criar(dataHoraISO) {
    setErro('');
    setSugestoes(null);
    setEnviando(true);
    try {
      await agendaService.criar({
        dataHora: dataHoraISO,
        clienteId,
        veiculoId: veiculoId || undefined,
        observacoes: observacoes || undefined,
      });
      setObservacoes('');
      onCriado();
    } catch (error) {
      if (error.response?.status === 409 && error.response?.data?.sugestoes) {
        setErro(error.response.data.message);
        setSugestoes(error.response.data.sugestoes);
      } else {
        setErro(error.response?.data?.message ?? 'Não foi possível agendar.');
      }
    } finally {
      setEnviando(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!clienteId || !hora || erroData) return;
    criar(`${dataSelecionada}T${hora}:00`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
    >
      <h2 className="font-medium text-slate-900">Novo agendamento — {dataSelecionada}</h2>
      {erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {erro}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="horaAgendamento">
            Horário
          </label>
          <input
            id="horaAgendamento"
            type="time"
            required
            aria-describedby={erroData ? 'erro-data-agendamento' : undefined}
            value={hora}
            onChange={(event) => setHora(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <ErroCampo id="erro-data-agendamento" mensagem={erroData} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="clienteAgendamento">
            Cliente
          </label>
          <select
            id="clienteAgendamento"
            required
            value={clienteId}
            onChange={(event) => handleClienteChange(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Selecione...</option>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="veiculoAgendamento">
            Veículo (opcional)
          </label>
          <select
            id="veiculoAgendamento"
            value={veiculoId}
            onChange={(event) => setVeiculoId(event.target.value)}
            disabled={!clienteId}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
          >
            <option value="">Nenhum</option>
            {veiculosDoCliente.map((veiculo) => (
              <option key={veiculo.id} value={veiculo.id}>
                {veiculo.placa}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-4">
          <label className="block text-sm font-medium text-slate-700" htmlFor="observacoesAgendamento">
            Observações
          </label>
          <input
            id="observacoesAgendamento"
            value={observacoes}
            onChange={(event) => setObservacoes(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <SugestoesHorario
        sugestoes={sugestoes}
        onEscolher={(sugestao) => {
          setHora(formatarHorario(sugestao));
          criar(sugestao);
        }}
      />

      <button
        type="submit"
        disabled={enviando || Boolean(erroData)}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {enviando ? 'Agendando...' : 'Agendar'}
      </button>
    </form>
  );
}

function ReagendarForm({ agendamento, onCancelar, onReagendado }) {
  const dataAtual = new Date(agendamento.dataHora);
  const [data, setData] = useState(
    `${dataAtual.getFullYear()}-${String(dataAtual.getMonth() + 1).padStart(2, '0')}-${String(
      dataAtual.getDate(),
    ).padStart(2, '0')}`,
  );
  const [hora, setHora] = useState(formatarHorario(agendamento.dataHora));
  const [erro, setErro] = useState('');
  const [sugestoes, setSugestoes] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const erroData = erroDataPassada(data);

  async function reagendar(dataHoraISO) {
    setErro('');
    setSugestoes(null);
    setEnviando(true);
    try {
      await agendaService.reagendar(agendamento.id, dataHoraISO);
      onReagendado();
    } catch (error) {
      if (error.response?.status === 409 && error.response?.data?.sugestoes) {
        setErro(error.response.data.message);
        setSugestoes(error.response.data.sugestoes);
      } else {
        setErro(error.response?.data?.message ?? 'Não foi possível reagendar.');
      }
    } finally {
      setEnviando(false);
    }
  }

  function handleConfirmar() {
    if (erroData) return;
    reagendar(`${data}T${hora}:00`);
  }

  return (
    <div className="space-y-2 rounded-md bg-slate-50 p-3 text-sm">
      {erro && <p className="text-red-700">{erro}</p>}
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-xs text-slate-500" htmlFor={`data-${agendamento.id}`}>
            Nova data
          </label>
          <input
            id={`data-${agendamento.id}`}
            type="date"
            aria-describedby={erroData ? `erro-data-reagendar-${agendamento.id}` : undefined}
            value={data}
            onChange={(event) => setData(event.target.value)}
            className="mt-1 rounded-md border border-slate-300 px-2 py-1"
          />
          <ErroCampo id={`erro-data-reagendar-${agendamento.id}`} mensagem={erroData} />
        </div>
        <div>
          <label className="block text-xs text-slate-500" htmlFor={`hora-${agendamento.id}`}>
            Novo horário
          </label>
          <input
            id={`hora-${agendamento.id}`}
            type="time"
            value={hora}
            onChange={(event) => setHora(event.target.value)}
            className="mt-1 rounded-md border border-slate-300 px-2 py-1"
          />
        </div>
        <button
          type="button"
          disabled={enviando || Boolean(erroData)}
          onClick={handleConfirmar}
          className="rounded-md bg-slate-900 px-3 py-1.5 font-medium text-white disabled:opacity-50"
        >
          Confirmar
        </button>
        <button type="button" onClick={onCancelar} className="font-medium text-slate-600">
          Cancelar
        </button>
      </div>
      <SugestoesHorario
        sugestoes={sugestoes}
        onEscolher={(sugestao) => {
          const novaData = new Date(sugestao);
          setData(
            `${novaData.getFullYear()}-${String(novaData.getMonth() + 1).padStart(2, '0')}-${String(
              novaData.getDate(),
            ).padStart(2, '0')}`,
          );
          setHora(formatarHorario(sugestao));
          reagendar(sugestao);
        }}
      />
    </div>
  );
}

function Agenda() {
  const [dataSelecionada, setDataSelecionada] = useState(hojeISO());
  const [agendamentos, setAgendamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [reagendandoId, setReagendandoId] = useState(null);
  const [mensagemSucesso, mostrarSucesso] = useMensagemSucesso();

  async function carregarDia() {
    const dados = await agendaService.listarPorDia(dataSelecionada);
    setAgendamentos(dados);
    setCarregando(false);
  }

  useEffect(() => {
    // carregarDia() só muda estado depois do await; a regra não enxerga isso.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarDia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSelecionada]);

  useEffect(() => {
    clientesService.listar({}).then(setClientes);
  }, []);

  async function cancelar(agendamento) {
    if (!window.confirm(`Cancelar o agendamento de ${formatarHorario(agendamento.dataHora)}?`)) {
      return;
    }
    await agendaService.cancelar(agendamento.id);
    await carregarDia();
    mostrarSucesso('Agendamento cancelado com sucesso.');
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Agenda</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDataSelecionada((atual) => somarDias(atual, -1))}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            ← Dia anterior
          </button>
          <input
            type="date"
            value={dataSelecionada}
            onChange={(event) => setDataSelecionada(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={() => setDataSelecionada((atual) => somarDias(atual, 1))}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Próximo dia →
          </button>
          <button
            type="button"
            onClick={() => setDataSelecionada(hojeISO())}
            className="text-sm font-medium text-slate-600 hover:underline"
          >
            Hoje
          </button>
        </div>
      </div>

      <MensagemSucesso mensagem={mensagemSucesso} />

      <NovoAgendamentoForm
        dataSelecionada={dataSelecionada}
        clientes={clientes}
        onCriado={async () => {
          await carregarDia();
          mostrarSucesso('Agendamento criado com sucesso.');
        }}
      />

      {carregando ? (
        <p className="text-slate-500">Carregando...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-2">Horário</th>
                <th className="px-4 py-2">Cliente</th>
                <th className="px-4 py-2">Veículo</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {agendamentos.map((agendamento) => (
                <Fragment key={agendamento.id}>
                  <tr>
                    <td className="px-4 py-2 font-medium">{formatarHorario(agendamento.dataHora)}</td>
                    <td className="px-4 py-2">{agendamento.cliente?.nome}</td>
                    <td className="px-4 py-2">{agendamento.veiculo?.placa ?? '—'}</td>
                    <td className="px-4 py-2">
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {ROTULO_STATUS[agendamento.status] ?? agendamento.status}
                      </span>
                    </td>
                    <td className="space-x-2 px-4 py-2">
                      {agendamento.status !== 'CANCELADO' && agendamento.status !== 'CONCLUIDO' && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setReagendandoId(
                                reagendandoId === agendamento.id ? null : agendamento.id,
                              )
                            }
                            className="font-medium text-slate-700 hover:underline"
                          >
                            Reagendar
                          </button>
                          <button
                            type="button"
                            onClick={() => cancelar(agendamento)}
                            className="font-medium text-red-600 hover:underline"
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                  {reagendandoId === agendamento.id && (
                    <tr>
                      <td colSpan={5} className="px-4 pb-3">
                        <ReagendarForm
                          agendamento={agendamento}
                          onCancelar={() => setReagendandoId(null)}
                          onReagendado={async () => {
                            setReagendandoId(null);
                            await carregarDia();
                            mostrarSucesso('Agendamento reagendado com sucesso.');
                          }}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {agendamentos.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    Nenhum agendamento para este dia.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default Agenda;
