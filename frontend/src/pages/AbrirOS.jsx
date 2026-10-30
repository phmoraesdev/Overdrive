import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as ordensService from '../services/ordens';
import { useRascunho } from '../hooks/useRascunho';

// RNF09: rascunho salvo no localStorage enquanto o recepcionista digita, para
// não perder o que já foi preenchido se a página recarregar ou a conexão cair.
const CHAVE_RASCUNHO = 'overdrive:rascunho-abrir-os';

const REGIOES_AVARIA = [
  'Para-choque dianteiro',
  'Para-choque traseiro',
  'Capô',
  'Teto',
  'Porta dianteira esquerda',
  'Porta dianteira direita',
  'Porta traseira esquerda',
  'Porta traseira direita',
  'Para-brisa',
  'Vidro traseiro',
  'Retrovisor esquerdo',
  'Retrovisor direito',
  'Rodas/Pneus',
  'Outro',
];

const ITENS_PRESENTES_OPCOES = [
  'Estepe',
  'Macaco',
  'Chave de roda',
  'Triângulo',
  'Extintor',
  'Documentos do veículo',
  'Tapetes',
  'Som/Rádio',
];

const NIVEIS_COMBUSTIVEL = [
  { value: 'VAZIO', label: 'Vazio' },
  { value: 'RESERVA', label: 'Reserva' },
  { value: 'UM_QUARTO', label: '1/4' },
  { value: 'MEIO', label: '1/2' },
  { value: 'TRES_QUARTOS', label: '3/4' },
  { value: 'CHEIO', label: 'Cheio' },
];

const CHECKLIST_INICIAL = {
  avarias: [],
  nivelCombustivel: '',
  itensPresentes: [],
  observacoes: '',
};

const FORMULARIO_INICIAL = { kmEntrada: '', problemaRelatado: '', checklist: CHECKLIST_INICIAL };

function ChecklistForm({ checklist, onChange }) {
  const [regiao, setRegiao] = useState(REGIOES_AVARIA[0]);
  const [descricaoAvaria, setDescricaoAvaria] = useState('');

  function adicionarAvaria() {
    if (!descricaoAvaria.trim()) return;
    onChange({
      ...checklist,
      avarias: [...checklist.avarias, { regiao, descricao: descricaoAvaria.trim() }],
    });
    setDescricaoAvaria('');
  }

  function removerAvaria(index) {
    onChange({ ...checklist, avarias: checklist.avarias.filter((_, i) => i !== index) });
  }

  function alternarItem(item) {
    const presentes = checklist.itensPresentes.includes(item)
      ? checklist.itensPresentes.filter((i) => i !== item)
      : [...checklist.itensPresentes, item];
    onChange({ ...checklist, itensPresentes: presentes });
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="font-medium text-slate-900">Checklist de entrada</h2>

      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="nivelCombustivel">
          Nível de combustível
        </label>
        <select
          id="nivelCombustivel"
          required
          value={checklist.nivelCombustivel}
          onChange={(event) => onChange({ ...checklist, nivelCombustivel: event.target.value })}
          className="mt-1 w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Selecione...</option>
          {NIVEIS_COMBUSTIVEL.map((nivel) => (
            <option key={nivel.value} value={nivel.value}>
              {nivel.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <p className="mb-1 text-sm font-medium text-slate-700">Itens presentes</p>
        <div className="flex flex-wrap gap-3">
          {ITENS_PRESENTES_OPCOES.map((item) => (
            <label key={item} className="flex items-center gap-1.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={checklist.itensPresentes.includes(item)}
                onChange={() => alternarItem(item)}
              />
              {item}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1 text-sm font-medium text-slate-700">Avarias (região do veículo)</p>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs text-slate-500" htmlFor="regiaoAvaria">
              Região
            </label>
            <select
              id="regiaoAvaria"
              value={regiao}
              onChange={(event) => setRegiao(event.target.value)}
              className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            >
              {REGIOES_AVARIA.map((regiaoOpcao) => (
                <option key={regiaoOpcao} value={regiaoOpcao}>
                  {regiaoOpcao}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-48 flex-1">
            <label className="block text-xs text-slate-500" htmlFor="descricaoAvaria">
              Descrição
            </label>
            <input
              id="descricaoAvaria"
              value={descricaoAvaria}
              onChange={(event) => setDescricaoAvaria(event.target.value)}
              placeholder="Ex.: risco superficial"
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={adicionarAvaria}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Adicionar
          </button>
        </div>
        {checklist.avarias.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {checklist.avarias.map((avaria, index) => (
              <li
                key={`${avaria.regiao}-${index}`}
                className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1"
              >
                <span>
                  <span className="font-medium">{avaria.regiao}:</span> {avaria.descricao}
                </span>
                <button
                  type="button"
                  onClick={() => removerAvaria(index)}
                  className="font-medium text-red-600 hover:underline"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="observacoesChecklist">
          Observações
        </label>
        <textarea
          id="observacoesChecklist"
          rows={2}
          value={checklist.observacoes}
          onChange={(event) => onChange({ ...checklist, observacoes: event.target.value })}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}

function Avisos({ avisos }) {
  return (
    <div className="space-y-1 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
      {avisos.map((aviso) => (
        <p key={aviso.tipo}>Atenção: {aviso.mensagem}</p>
      ))}
    </div>
  );
}

function AbrirOS() {
  const [placaBusca, setPlacaBusca] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [erroBusca, setErroBusca] = useState('');
  const [dadosVeiculo, setDadosVeiculo] = useState(null);

  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
  const [avisos, setAvisos] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState('');
  const [osCriada, setOsCriada] = useState(null);
  const { rascunhoEncontrado, salvarRascunho, descartarRascunho } = useRascunho(CHAVE_RASCUNHO);

  async function buscarVeiculo(placaParam) {
    const placa = placaParam ?? placaBusca;
    if (!placa.trim()) return;
    setErroBusca('');
    setBuscando(true);
    try {
      const dados = await ordensService.buscarParaAbertura(placa);
      setDadosVeiculo(dados);
    } catch (error) {
      setDadosVeiculo(null);
      setErroBusca(error.response?.data?.message ?? 'Não foi possível buscar o veículo.');
    } finally {
      setBuscando(false);
    }
  }

  useEffect(() => {
    if (rascunhoEncontrado) {
      // Recupera o rascunho salvo (RNF09): não há como sincronizar isso de
      // outro jeito, o estado vem do localStorage, não de props/eventos.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlacaBusca(rascunhoEncontrado.placaBusca ?? '');
      setFormulario(rascunhoEncontrado.formulario ?? FORMULARIO_INICIAL);
      if (rascunhoEncontrado.placaBusca) {
        buscarVeiculo(rascunhoEncontrado.placaBusca);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (osCriada) return;
    salvarRascunho({ placaBusca, formulario });
  }, [placaBusca, formulario, osCriada, salvarRascunho]);

  function handleBuscarSubmit(event) {
    event.preventDefault();
    buscarVeiculo();
  }

  function trocarVeiculo() {
    setDadosVeiculo(null);
    setPlacaBusca('');
    setFormulario(FORMULARIO_INICIAL);
    setAvisos(null);
    setErroEnvio('');
  }

  async function abrirOS(ignorarAvisos) {
    setErroEnvio('');
    setEnviando(true);
    try {
      const resultado = await ordensService.abrir({
        veiculoId: dadosVeiculo.veiculo.id,
        kmEntrada: Number(formulario.kmEntrada),
        problemaRelatado: formulario.problemaRelatado,
        checklist: formulario.checklist,
        ignorarAvisos,
      });
      setOsCriada(resultado);
      setAvisos(null);
      descartarRascunho();
    } catch (error) {
      if (error.response?.status === 409 && error.response?.data?.avisos) {
        setAvisos(error.response.data.avisos);
      } else {
        setErroEnvio(error.response?.data?.message ?? 'Não foi possível abrir a ordem de serviço.');
      }
    } finally {
      setEnviando(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    abrirOS(false);
  }

  function abrirNovaOS() {
    setOsCriada(null);
    trocarVeiculo();
  }

  if (osCriada) {
    return (
      <section className="space-y-4">
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-6">
          <h1 className="text-xl font-semibold text-emerald-900">
            OS nº {osCriada.numero} aberta com sucesso
          </h1>
          <p className="mt-1 text-sm text-emerald-800">
            Status: {osCriada.status}. Checklist de entrada registrado.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={abrirNovaOS}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Abrir outra OS
          </button>
          <Link
            to="/ordens/historico"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Ver histórico do veículo
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Abrir ordem de serviço</h1>

      {!dadosVeiculo && (
        <form
          onSubmit={handleBuscarSubmit}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="placaBusca">
              Placa do veículo
            </label>
            <input
              id="placaBusca"
              required
              placeholder="ABC1234 ou ABC1D23"
              aria-describedby={erroBusca ? 'erro-busca-veiculo' : undefined}
              value={placaBusca}
              onChange={(event) => setPlacaBusca(event.target.value)}
              className="mt-1 w-56 rounded-md border border-slate-300 px-3 py-2 text-sm uppercase"
            />
          </div>
          <button
            type="submit"
            disabled={buscando}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {buscando ? 'Buscando...' : 'Buscar'}
          </button>
          {erroBusca && (
            <p
              id="erro-busca-veiculo"
              className="w-full rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {erroBusca}
            </p>
          )}
        </form>
      )}

      {dadosVeiculo && (
        <>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  {dadosVeiculo.veiculo.placa} — {dadosVeiculo.veiculo.marca}{' '}
                  {dadosVeiculo.veiculo.modelo}
                </p>
                <p className="text-sm text-slate-600">
                  Cliente: {dadosVeiculo.veiculo.cliente.nome} · {dadosVeiculo.veiculo.cliente.telefone}
                </p>
                <p className="text-sm text-slate-600">
                  Km atual registrado: {dadosVeiculo.veiculo.km}
                </p>
                {dadosVeiculo.ultimaOS && (
                  <p className="text-sm text-slate-600">
                    Última OS: nº {dadosVeiculo.ultimaOS.numero} ({dadosVeiculo.ultimaOS.kmEntrada} km,
                    status {dadosVeiculo.ultimaOS.status})
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={trocarVeiculo}
                className="text-sm font-medium text-slate-600 hover:underline"
              >
                Buscar outro veículo
              </button>
            </div>
            {dadosVeiculo.osEmAndamento && (
              <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Atenção: este veículo já tem a OS nº {dadosVeiculo.osEmAndamento.numero} em andamento
                (status {dadosVeiculo.osEmAndamento.status}).
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700" htmlFor="kmEntrada">
                  Quilometragem de entrada
                </label>
                <input
                  id="kmEntrada"
                  type="number"
                  min="0"
                  required
                  aria-describedby={erroEnvio ? 'erro-envio-os' : undefined}
                  value={formulario.kmEntrada}
                  onChange={(event) =>
                    setFormulario({ ...formulario, kmEntrada: event.target.value })
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700" htmlFor="problemaRelatado">
                  Problema relatado pelo cliente
                </label>
                <textarea
                  id="problemaRelatado"
                  required
                  rows={2}
                  aria-describedby={erroEnvio ? 'erro-envio-os' : undefined}
                  value={formulario.problemaRelatado}
                  onChange={(event) =>
                    setFormulario({ ...formulario, problemaRelatado: event.target.value })
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <ChecklistForm
              checklist={formulario.checklist}
              onChange={(checklist) => setFormulario({ ...formulario, checklist })}
            />

            {avisos && (
              <div className="space-y-2">
                <Avisos avisos={avisos} />
                <button
                  type="button"
                  disabled={enviando}
                  onClick={() => abrirOS(true)}
                  className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  Confirmar e abrir mesmo assim
                </button>
              </div>
            )}

            {erroEnvio && (
              <p id="erro-envio-os" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {erroEnvio}
              </p>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {enviando ? 'Abrindo...' : 'Abrir ordem de serviço'}
            </button>
          </form>
        </>
      )}
    </section>
  );
}

export default AbrirOS;
