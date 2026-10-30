import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as clientesService from '../services/clientes';
import { useMensagemSucesso } from '../hooks/useMensagemSucesso';
import MensagemSucesso from '../components/MensagemSucesso';
import ErroCampo from '../components/ErroCampo';
import { erroCpf } from '../utils/validadores';

const FORM_INICIAL = { nome: '', cpf: '', telefone: '', email: '', endereco: '' };

function ClienteForm({ onCancelar, onSalvo }) {
  const [dados, setDados] = useState(FORM_INICIAL);
  const [erro, setErro] = useState('');
  const [erroCpfCampo, setErroCpfCampo] = useState('');
  const [enviando, setEnviando] = useState(false);

  function handleCpfChange(valor) {
    setDados({ ...dados, cpf: valor });
    if (erroCpfCampo) setErroCpfCampo(erroCpf(valor));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const erroCpfAtual = erroCpf(dados.cpf);
    setErroCpfCampo(erroCpfAtual);
    if (erroCpfAtual) return;

    setErro('');
    setEnviando(true);
    try {
      await clientesService.criar(dados);
      onSalvo();
    } catch (error) {
      setErro(error.response?.data?.message ?? 'Não foi possível salvar o cliente.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 space-y-3 rounded-lg border border-slate-200 bg-white p-4"
    >
      <h2 className="font-medium text-slate-900">Novo cliente</h2>
      {erro && (
        <p id="erro-cliente-form" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {erro}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="nome">
            Nome
          </label>
          <input
            id="nome"
            required
            aria-describedby={erro ? 'erro-cliente-form' : undefined}
            value={dados.nome}
            onChange={(event) => setDados({ ...dados, nome: event.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="cpf">
            CPF
          </label>
          <input
            id="cpf"
            required
            placeholder="000.000.000-00"
            aria-describedby={[erroCpfCampo && 'erro-cpf-cliente', erro && 'erro-cliente-form']
              .filter(Boolean)
              .join(' ') || undefined}
            value={dados.cpf}
            onChange={(event) => handleCpfChange(event.target.value)}
            onBlur={(event) => setErroCpfCampo(erroCpf(event.target.value))}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <ErroCampo id="erro-cpf-cliente" mensagem={erroCpfCampo} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="telefone">
            Telefone
          </label>
          <input
            id="telefone"
            required
            aria-describedby={erro ? 'erro-cliente-form' : undefined}
            value={dados.telefone}
            onChange={(event) => setDados({ ...dados, telefone: event.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            aria-describedby={erro ? 'erro-cliente-form' : undefined}
            value={dados.email}
            onChange={(event) => setDados({ ...dados, email: event.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="endereco">
            Endereço
          </label>
          <input
            id="endereco"
            value={dados.endereco}
            onChange={(event) => setDados({ ...dados, endereco: event.target.value })}
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

function Clientes() {
  const [searchParams] = useSearchParams();
  const [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  // Atalho vindo do dashboard (?novo=1): já abre o formulário de cadastro.
  const [formAberto, setFormAberto] = useState(() => searchParams.get('novo') === '1');
  const [mensagemSucesso, mostrarSucesso] = useMensagemSucesso();

  async function carregar() {
    const dados = await clientesService.listar({ busca });
    setClientes(dados);
    setCarregando(false);
  }

  useEffect(() => {
    // carregar() só muda estado depois do await; a regra não enxerga isso.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  async function handleSalvo() {
    setFormAberto(false);
    await carregar();
    mostrarSucesso('Cliente cadastrado com sucesso.');
  }

  async function alternarAtivo(cliente) {
    const acao = cliente.ativo ? 'inativar' : 'reativar';
    if (!window.confirm(`Tem certeza que deseja ${acao} ${cliente.nome}?`)) {
      return;
    }
    await clientesService.definirAtivo(cliente.id, !cliente.ativo);
    await carregar();
    mostrarSucesso(acao === 'inativar' ? 'Cliente inativado com sucesso.' : 'Cliente reativado com sucesso.');
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Clientes</h1>
        <button
          type="button"
          onClick={() => setFormAberto((aberto) => !aberto)}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Novo cliente
        </button>
      </div>

      <MensagemSucesso mensagem={mensagemSucesso} />

      <input
        type="search"
        placeholder="Buscar por nome ou CPF..."
        value={busca}
        onChange={(event) => setBusca(event.target.value)}
        className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
        aria-label="Buscar cliente"
      />

      {formAberto && <ClienteForm onCancelar={() => setFormAberto(false)} onSalvo={handleSalvo} />}

      {carregando ? (
        <p className="text-slate-500">Carregando...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-2">Nome</th>
                <th className="px-4 py-2">CPF</th>
                <th className="px-4 py-2">Telefone</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clientes.map((cliente) => (
                <tr key={cliente.id}>
                  <td className="px-4 py-2">
                    <Link
                      to={`/clientes/${cliente.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {cliente.nome}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{cliente.cpf}</td>
                  <td className="px-4 py-2">{cliente.telefone}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        cliente.ativo
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {cliente.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="space-x-2 px-4 py-2">
                    <Link
                      to={`/clientes/${cliente.id}`}
                      className="font-medium text-slate-700 hover:underline"
                    >
                      Ver / Editar
                    </Link>
                    <button
                      type="button"
                      onClick={() => alternarAtivo(cliente)}
                      className="font-medium text-red-600 hover:underline"
                    >
                      {cliente.ativo ? 'Inativar' : 'Reativar'}
                    </button>
                  </td>
                </tr>
              ))}
              {clientes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    Nenhum cliente encontrado.
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

export default Clientes;
