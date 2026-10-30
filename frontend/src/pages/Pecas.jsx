import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/authContextBase.js';
import * as pecasService from '../services/pecas';
import { formatarReais } from '../utils/formatacao';
import { useMensagemSucesso } from '../hooks/useMensagemSucesso';
import MensagemSucesso from '../components/MensagemSucesso';

const FORM_INICIAL = {
  codigo: '',
  descricao: '',
  precoCusto: '',
  precoVenda: '',
  quantidade: '',
  quantidadeMinima: '',
};

function paraFormulario(peca) {
  return {
    codigo: peca.codigo,
    descricao: peca.descricao,
    precoCusto: peca.precoCusto,
    precoVenda: peca.precoVenda,
    quantidade: peca.quantidade,
    quantidadeMinima: peca.quantidadeMinima,
  };
}

function PecaForm({ peca, onCancelar, onSalvo }) {
  const [dados, setDados] = useState(peca ? paraFormulario(peca) : FORM_INICIAL);
  const [avisos, setAvisos] = useState(null);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function salvar(ignorarAvisos) {
    setErro('');
    setEnviando(true);
    try {
      const payload = { ...dados, ignorarAvisos };
      if (peca) {
        await pecasService.atualizar(peca.id, payload);
      } else {
        await pecasService.criar(payload);
      }
      setAvisos(null);
      onSalvo();
    } catch (error) {
      if (error.response?.status === 409 && error.response?.data?.avisos) {
        setAvisos(error.response.data.avisos);
      } else {
        setErro(error.response?.data?.message ?? 'Não foi possível salvar a peça.');
      }
    } finally {
      setEnviando(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    salvar(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 space-y-3 rounded-lg border border-slate-200 bg-white p-4"
    >
      <h2 className="font-medium text-slate-900">{peca ? 'Editar peça' : 'Nova peça'}</h2>
      {erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {erro}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="codigo">
            Código
          </label>
          <input
            id="codigo"
            required
            value={dados.codigo}
            onChange={(event) => setDados({ ...dados, codigo: event.target.value })}
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
          <label className="block text-sm font-medium text-slate-700" htmlFor="precoCusto">
            Preço de custo (R$)
          </label>
          <input
            id="precoCusto"
            type="number"
            step="0.01"
            min="0"
            required
            value={dados.precoCusto}
            onChange={(event) => setDados({ ...dados, precoCusto: event.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="precoVenda">
            Preço de venda (R$)
          </label>
          <input
            id="precoVenda"
            type="number"
            step="0.01"
            min="0"
            required
            value={dados.precoVenda}
            onChange={(event) => setDados({ ...dados, precoVenda: event.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="quantidade">
            Quantidade
          </label>
          <input
            id="quantidade"
            type="number"
            min="0"
            value={dados.quantidade}
            onChange={(event) => setDados({ ...dados, quantidade: event.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="quantidadeMinima">
            Estoque mínimo
          </label>
          <input
            id="quantidadeMinima"
            type="number"
            min="0"
            value={dados.quantidadeMinima}
            onChange={(event) => setDados({ ...dados, quantidadeMinima: event.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {avisos && (
        <div className="space-y-2">
          <div className="space-y-1 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            {avisos.map((aviso) => (
              <p key={aviso.tipo}>Atenção: {aviso.mensagem}</p>
            ))}
          </div>
          <button
            type="button"
            disabled={enviando}
            onClick={() => salvar(true)}
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            Salvar mesmo assim
          </button>
        </div>
      )}

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

function Pecas() {
  const { funcionario } = useAuth();
  const ehAdministrador = funcionario?.perfil === 'ADMINISTRADOR';

  const [pecas, setPecas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [formAberto, setFormAberto] = useState(false);
  const [pecaEmEdicao, setPecaEmEdicao] = useState(null);
  const [emAlerta, setEmAlerta] = useState([]);
  const [mensagemSucesso, mostrarSucesso] = useMensagemSucesso();

  async function carregar() {
    const dados = await pecasService.listar({ busca });
    setPecas(dados);
    setCarregando(false);
  }

  useEffect(() => {
    // carregar() só muda estado depois do await; a regra não enxerga isso.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  useEffect(() => {
    if (ehAdministrador) {
      pecasService.listarEmAlerta().then(setEmAlerta);
    }
  }, [ehAdministrador, pecas]);

  function abrirNovo() {
    setPecaEmEdicao(null);
    setFormAberto(true);
  }

  function abrirEdicao(peca) {
    setPecaEmEdicao(peca);
    setFormAberto(true);
  }

  function fecharForm() {
    setFormAberto(false);
    setPecaEmEdicao(null);
  }

  async function handleSalvo() {
    const eraEdicao = Boolean(pecaEmEdicao);
    fecharForm();
    await carregar();
    mostrarSucesso(eraEdicao ? 'Peça atualizada com sucesso.' : 'Peça cadastrada com sucesso.');
  }

  async function alternarAtivo(peca) {
    const acao = peca.ativo ? 'inativar' : 'reativar';
    if (!window.confirm(`Tem certeza que deseja ${acao} a peça ${peca.descricao}?`)) {
      return;
    }
    await pecasService.definirAtivo(peca.id, !peca.ativo);
    await carregar();
    mostrarSucesso(acao === 'inativar' ? 'Peça inativada com sucesso.' : 'Peça reativada com sucesso.');
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Peças</h1>
        {ehAdministrador && (
          <button
            type="button"
            onClick={abrirNovo}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Nova peça
          </button>
        )}
      </div>

      <MensagemSucesso mensagem={mensagemSucesso} />

      {ehAdministrador && emAlerta.length > 0 && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          <p className="font-medium">
            {emAlerta.length} peça{emAlerta.length > 1 ? 's' : ''} no estoque mínimo ou abaixo dele:
          </p>
          <ul className="ml-4 list-disc">
            {emAlerta.map((peca) => (
              <li key={peca.id}>
                {peca.descricao} ({peca.codigo}) — saldo {peca.quantidade}, mínimo {peca.quantidadeMinima}
              </li>
            ))}
          </ul>
        </div>
      )}

      <input
        type="search"
        placeholder="Buscar por código ou descrição..."
        value={busca}
        onChange={(event) => setBusca(event.target.value)}
        className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
        aria-label="Buscar peça"
      />

      {ehAdministrador && formAberto && (
        <PecaForm peca={pecaEmEdicao} onCancelar={fecharForm} onSalvo={handleSalvo} />
      )}

      {carregando ? (
        <p className="text-slate-500">Carregando...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-2">Código</th>
                <th className="px-4 py-2">Descrição</th>
                <th className="px-4 py-2">Preço de custo</th>
                <th className="px-4 py-2">Preço de venda</th>
                <th className="px-4 py-2">Quantidade</th>
                <th className="px-4 py-2">Estoque mínimo</th>
                <th className="px-4 py-2">Status</th>
                {ehAdministrador && <th className="px-4 py-2">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pecas.map((peca) => (
                <tr key={peca.id}>
                  <td className="px-4 py-2 font-medium">{peca.codigo}</td>
                  <td className="px-4 py-2">{peca.descricao}</td>
                  <td className="px-4 py-2">{formatarReais(peca.precoCusto)}</td>
                  <td className="px-4 py-2">{formatarReais(peca.precoVenda)}</td>
                  <td
                    className={`px-4 py-2 ${
                      peca.quantidade <= peca.quantidadeMinima ? 'font-medium text-red-600' : ''
                    }`}
                  >
                    {peca.quantidade}
                  </td>
                  <td className="px-4 py-2">{peca.quantidadeMinima}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        peca.ativo
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {peca.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  {ehAdministrador && (
                    <td className="space-x-2 px-4 py-2">
                      <button
                        type="button"
                        onClick={() => abrirEdicao(peca)}
                        className="font-medium text-slate-700 hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => alternarAtivo(peca)}
                        className="font-medium text-red-600 hover:underline"
                      >
                        {peca.ativo ? 'Inativar' : 'Reativar'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {pecas.length === 0 && (
                <tr>
                  <td colSpan={ehAdministrador ? 8 : 7} className="px-4 py-6 text-center text-slate-500">
                    Nenhuma peça encontrada.
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

export default Pecas;
