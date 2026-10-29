import { useEffect, useState } from 'react';
import * as funcionariosService from '../services/funcionarios';

const PERFIS = ['RECEPCIONISTA', 'MECANICO', 'ADMINISTRADOR'];

const FORM_INICIAL = { nome: '', email: '', senha: '', perfil: 'RECEPCIONISTA' };

function FuncionarioForm({ funcionario, onCancelar, onSalvo }) {
  const [dados, setDados] = useState(
    funcionario
      ? { nome: funcionario.nome, email: funcionario.email, senha: '', perfil: funcionario.perfil }
      : FORM_INICIAL,
  );
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const payload = { ...dados };
      if (!payload.senha) delete payload.senha;

      if (funcionario) {
        await funcionariosService.atualizar(funcionario.id, payload);
      } else {
        await funcionariosService.criar(payload);
      }
      onSalvo();
    } catch (error) {
      setErro(error.response?.data?.message ?? 'Não foi possível salvar o funcionário.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 space-y-3 rounded-lg border border-slate-200 bg-white p-4"
    >
      <h2 className="font-medium text-slate-900">
        {funcionario ? 'Editar funcionário' : 'Novo funcionário'}
      </h2>
      {erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
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
            value={dados.nome}
            onChange={(event) => setDados({ ...dados, nome: event.target.value })}
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
            required
            value={dados.email}
            onChange={(event) => setDados({ ...dados, email: event.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="senha">
            Senha {funcionario && '(deixe em branco para manter)'}
          </label>
          <input
            id="senha"
            type="password"
            required={!funcionario}
            value={dados.senha}
            onChange={(event) => setDados({ ...dados, senha: event.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="perfil">
            Perfil
          </label>
          <select
            id="perfil"
            value={dados.perfil}
            onChange={(event) => setDados({ ...dados, perfil: event.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {PERFIS.map((perfil) => (
              <option key={perfil} value={perfil}>
                {perfil}
              </option>
            ))}
          </select>
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

function Funcionarios() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [formAberto, setFormAberto] = useState(false);
  const [funcionarioEmEdicao, setFuncionarioEmEdicao] = useState(null);

  async function carregar() {
    const dados = await funcionariosService.listar({ busca });
    setFuncionarios(dados);
    setCarregando(false);
  }

  useEffect(() => {
    // carregar() só muda estado depois do await; a regra não enxerga isso.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  function abrirNovo() {
    setFuncionarioEmEdicao(null);
    setFormAberto(true);
  }

  function abrirEdicao(funcionario) {
    setFuncionarioEmEdicao(funcionario);
    setFormAberto(true);
  }

  function fecharForm() {
    setFormAberto(false);
    setFuncionarioEmEdicao(null);
  }

  async function handleSalvo() {
    fecharForm();
    await carregar();
  }

  async function alternarAtivo(funcionario) {
    const acao = funcionario.ativo ? 'inativar' : 'reativar';
    if (!window.confirm(`Tem certeza que deseja ${acao} ${funcionario.nome}?`)) {
      return;
    }
    await funcionariosService.definirAtivo(funcionario.id, !funcionario.ativo);
    await carregar();
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Funcionários</h1>
        <button
          type="button"
          onClick={abrirNovo}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Novo funcionário
        </button>
      </div>

      <input
        type="search"
        placeholder="Buscar por nome ou e-mail..."
        value={busca}
        onChange={(event) => setBusca(event.target.value)}
        className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
        aria-label="Buscar funcionário"
      />

      {formAberto && (
        <FuncionarioForm
          funcionario={funcionarioEmEdicao}
          onCancelar={fecharForm}
          onSalvo={handleSalvo}
        />
      )}

      {carregando ? (
        <p className="text-slate-500">Carregando...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-2">Nome</th>
                <th className="px-4 py-2">E-mail</th>
                <th className="px-4 py-2">Perfil</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {funcionarios.map((funcionario) => (
                <tr key={funcionario.id}>
                  <td className="px-4 py-2">{funcionario.nome}</td>
                  <td className="px-4 py-2">{funcionario.email}</td>
                  <td className="px-4 py-2">{funcionario.perfil}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        funcionario.ativo
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {funcionario.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="space-x-2 px-4 py-2">
                    <button
                      type="button"
                      onClick={() => abrirEdicao(funcionario)}
                      className="font-medium text-slate-700 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => alternarAtivo(funcionario)}
                      className="font-medium text-red-600 hover:underline"
                    >
                      {funcionario.ativo ? 'Inativar' : 'Reativar'}
                    </button>
                  </td>
                </tr>
              ))}
              {funcionarios.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    Nenhum funcionário encontrado.
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

export default Funcionarios;
