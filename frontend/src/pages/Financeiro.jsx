import { Fragment, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as financeiroService from '../services/financeiro';
import { formatarReais, formatarData } from '../utils/formatacao';
import { useMensagemSucesso } from '../hooks/useMensagemSucesso';
import MensagemSucesso from '../components/MensagemSucesso';

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function primeiroDiaDoMesISO() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;
}

const FORM_INICIAL = { tipo: 'PAGAR', fornecedor: '', descricao: '', valor: '', vencimento: '' };

function NovaContaForm({ onCancelar, onSalvo }) {
  const [dados, setDados] = useState(FORM_INICIAL);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await financeiroService.criar(dados);
      onSalvo();
    } catch (error) {
      setErro(error.response?.data?.message ?? 'Não foi possível salvar a conta.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 space-y-3 rounded-lg border border-slate-200 bg-white p-4"
    >
      <h2 className="font-medium text-slate-900">Nova conta</h2>
      {erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {erro}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="tipo">
            Tipo
          </label>
          <select
            id="tipo"
            value={dados.tipo}
            onChange={(event) => setDados({ ...dados, tipo: event.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="PAGAR">A pagar</option>
            <option value="RECEBER">A receber</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="fornecedor">
            Fornecedor (opcional)
          </label>
          <input
            id="fornecedor"
            value={dados.fornecedor}
            onChange={(event) => setDados({ ...dados, fornecedor: event.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="descricao">
            Descrição
          </label>
          <input
            id="descricao"
            required
            value={dados.descricao}
            onChange={(event) => setDados({ ...dados, descricao: event.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="valor">
            Valor (R$)
          </label>
          <input
            id="valor"
            type="number"
            min="0.01"
            step="0.01"
            required
            value={dados.valor}
            onChange={(event) => setDados({ ...dados, valor: event.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="vencimento">
            Vencimento
          </label>
          <input
            id="vencimento"
            type="date"
            required
            value={dados.vencimento}
            onChange={(event) => setDados({ ...dados, vencimento: event.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {enviando ? 'Salvando...' : 'Salvar'}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function BaixaForm({ conta, onCancelar, onBaixado }) {
  const [valorPago, setValorPago] = useState(String(conta.valor));
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function handleBaixar() {
    setErro('');
    setEnviando(true);
    try {
      await financeiroService.baixar(conta.id, { valorPago: Number(valorPago) });
      onBaixado();
    } catch (error) {
      setErro(error.response?.data?.message ?? 'Não foi possível registrar a baixa.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md bg-slate-50 p-2 text-sm">
      {erro && <span className="text-red-700">{erro}</span>}
      <label htmlFor={`valor-pago-${conta.id}`}>Valor pago (R$)</label>
      <input
        id={`valor-pago-${conta.id}`}
        type="number"
        min="0.01"
        step="0.01"
        value={valorPago}
        onChange={(event) => setValorPago(event.target.value)}
        className="w-28 rounded-md border border-slate-300 px-2 py-1"
      />
      <button
        type="button"
        onClick={handleBaixar}
        disabled={enviando}
        className="rounded-md bg-emerald-600 px-3 py-1 font-medium text-white disabled:opacity-50"
      >
        Confirmar baixa
      </button>
      <button type="button" onClick={onCancelar} className="font-medium text-slate-600">
        Cancelar
      </button>
    </div>
  );
}

function FluxoCaixa() {
  const [inicio, setInicio] = useState(primeiroDiaDoMesISO());
  const [fim, setFim] = useState(hojeISO());
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');

  async function consultar() {
    setErro('');
    try {
      const dados = await financeiroService.fluxoCaixa(inicio, fim);
      setResultado(dados);
    } catch (error) {
      setErro(error.response?.data?.message ?? 'Não foi possível consultar o fluxo de caixa.');
    }
  }

  useEffect(() => {
    // consultar() só muda estado depois do await; a regra não enxerga isso.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    consultar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="font-medium text-slate-900">Fluxo de caixa</h2>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-slate-500" htmlFor="inicio">
            De
          </label>
          <input
            id="inicio"
            type="date"
            value={inicio}
            onChange={(event) => setInicio(event.target.value)}
            className="mt-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500" htmlFor="fim">
            Até
          </label>
          <input
            id="fim"
            type="date"
            value={fim}
            onChange={(event) => setFim(event.target.value)}
            className="mt-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={consultar}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Consultar
        </button>
      </div>

      {erro && <p className="text-sm text-red-700">{erro}</p>}

      {resultado && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-emerald-50 p-3">
              <p className="text-xs text-emerald-700">Entradas</p>
              <p className="text-lg font-semibold text-emerald-800">
                {formatarReais(resultado.entradas)}
              </p>
            </div>
            <div className="rounded-md bg-red-50 p-3">
              <p className="text-xs text-red-700">Saídas</p>
              <p className="text-lg font-semibold text-red-800">{formatarReais(resultado.saidas)}</p>
            </div>
            <div className="rounded-md bg-slate-100 p-3">
              <p className="text-xs text-slate-600">Saldo</p>
              <p className="text-lg font-semibold text-slate-900">{formatarReais(resultado.saldo)}</p>
            </div>
          </div>

          {resultado.porDia.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-slate-600">
                  <tr>
                    <th className="py-1 pr-2">Dia</th>
                    <th className="py-1 pr-2">Entradas</th>
                    <th className="py-1 pr-2">Saídas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resultado.porDia.map((linha) => (
                    <tr key={linha.data}>
                      <td className="py-1 pr-2">{formatarData(linha.data)}</td>
                      <td className="py-1 pr-2 text-emerald-700">{formatarReais(linha.entradas)}</td>
                      <td className="py-1 pr-2 text-red-700">{formatarReais(linha.saidas)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const TIPOS_VALIDOS = ['PAGAR', 'RECEBER'];

function Financeiro() {
  const [searchParams] = useSearchParams();
  const [contas, setContas] = useState([]);
  // Atalho vindo do dashboard (?tipo=PAGAR): já filtra ao abrir a tela.
  const [tipo, setTipo] = useState(() => {
    const tipoUrl = searchParams.get('tipo');
    return TIPOS_VALIDOS.includes(tipoUrl) ? tipoUrl : '';
  });
  const [carregando, setCarregando] = useState(true);
  const [formAberto, setFormAberto] = useState(false);
  const [contaBaixando, setContaBaixando] = useState(null);
  const [mensagemSucesso, mostrarSucesso] = useMensagemSucesso();

  async function carregar() {
    const dados = await financeiroService.listar({ tipo: tipo || undefined });
    setContas(dados);
    setCarregando(false);
  }

  useEffect(() => {
    // carregar() só muda estado depois do await; a regra não enxerga isso.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  async function handleSalvo() {
    setFormAberto(false);
    await carregar();
    mostrarSucesso('Conta cadastrada com sucesso.');
  }

  async function remover(conta) {
    if (!window.confirm(`Excluir a conta "${conta.descricao}"?`)) return;
    try {
      await financeiroService.remover(conta.id);
      await carregar();
      mostrarSucesso('Conta excluída com sucesso.');
    } catch (error) {
      window.alert(error.response?.data?.message ?? 'Não foi possível excluir a conta.');
    }
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Financeiro</h1>

      <MensagemSucesso mensagem={mensagemSucesso} />

      <FluxoCaixa />

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Contas</h2>
          <div className="flex items-center gap-2">
            <select
              value={tipo}
              onChange={(event) => setTipo(event.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              aria-label="Filtrar por tipo"
            >
              <option value="">Todos os tipos</option>
              <option value="PAGAR">A pagar</option>
              <option value="RECEBER">A receber</option>
            </select>
            <button
              type="button"
              onClick={() => setFormAberto((aberto) => !aberto)}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Nova conta
            </button>
          </div>
        </div>

        {formAberto && <NovaContaForm onCancelar={() => setFormAberto(false)} onSalvo={handleSalvo} />}

        {carregando ? (
          <p className="text-slate-500">Carregando...</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-2">Tipo</th>
                  <th className="px-4 py-2">Descrição</th>
                  <th className="px-4 py-2">Valor</th>
                  <th className="px-4 py-2">Vencimento</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contas.map((conta) => (
                  <Fragment key={conta.id}>
                    <tr>
                      <td className="px-4 py-2">{conta.tipo === 'PAGAR' ? 'A pagar' : 'A receber'}</td>
                      <td className="px-4 py-2">
                        {conta.descricao}
                        {conta.fornecedor && (
                          <span className="text-slate-500"> — {conta.fornecedor}</span>
                        )}
                      </td>
                      <td className="px-4 py-2">{formatarReais(conta.valor)}</td>
                      <td className="px-4 py-2">{formatarData(conta.vencimento)}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            conta.status === 'PAGA'
                              ? 'bg-emerald-100 text-emerald-700'
                              : conta.vencida
                                ? 'bg-red-100 text-red-700'
                                : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {conta.status === 'PAGA' ? 'Paga' : conta.vencida ? 'Vencida' : 'Aberta'}
                        </span>
                      </td>
                      <td className="space-x-2 px-4 py-2">
                        {conta.status !== 'PAGA' && (
                          <button
                            type="button"
                            onClick={() =>
                              setContaBaixando(contaBaixando === conta.id ? null : conta.id)
                            }
                            className="font-medium text-slate-700 hover:underline"
                          >
                            Registrar pagamento
                          </button>
                        )}
                        {conta.status !== 'PAGA' && !conta.ordemServicoId && (
                          <button
                            type="button"
                            onClick={() => remover(conta)}
                            className="font-medium text-red-600 hover:underline"
                          >
                            Excluir
                          </button>
                        )}
                      </td>
                    </tr>
                    {contaBaixando === conta.id && (
                      <tr>
                        <td colSpan={6} className="px-4 pb-2">
                          <BaixaForm
                            conta={conta}
                            onCancelar={() => setContaBaixando(null)}
                            onBaixado={async () => {
                              setContaBaixando(null);
                              await carregar();
                              mostrarSucesso('Pagamento registrado com sucesso.');
                            }}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {contas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                      Nenhuma conta encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export default Financeiro;
