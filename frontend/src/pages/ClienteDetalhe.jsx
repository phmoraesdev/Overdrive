import { Fragment, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as clientesService from '../services/clientes';
import * as veiculosService from '../services/veiculos';

const VEICULO_INICIAL = { placa: '', marca: '', modelo: '', ano: '', cor: '', km: '' };

function ClienteInfoForm({ cliente, onAtualizado }) {
  const [dados, setDados] = useState({
    nome: cliente.nome,
    cpf: cliente.cpf,
    telefone: cliente.telefone,
    email: cliente.email ?? '',
    endereco: cliente.endereco ?? '',
  });
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const atualizado = await clientesService.atualizar(cliente.id, dados);
      onAtualizado(atualizado);
    } catch (error) {
      setErro(error.response?.data?.message ?? 'Não foi possível salvar as alterações.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
    >
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
          <label className="block text-sm font-medium text-slate-700" htmlFor="cpf">
            CPF
          </label>
          <input
            id="cpf"
            required
            value={dados.cpf}
            onChange={(event) => setDados({ ...dados, cpf: event.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="telefone">
            Telefone
          </label>
          <input
            id="telefone"
            required
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
      <button
        type="submit"
        disabled={enviando}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {enviando ? 'Salvando...' : 'Salvar alterações'}
      </button>
    </form>
  );
}

function VeiculoForm({ clienteId, veiculo, onCancelar, onSalvo }) {
  const [dados, setDados] = useState(
    veiculo
      ? {
          placa: veiculo.placa,
          marca: veiculo.marca,
          modelo: veiculo.modelo,
          ano: veiculo.ano,
          cor: veiculo.cor ?? '',
          km: veiculo.km,
        }
      : VEICULO_INICIAL,
  );
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      if (veiculo) {
        await veiculosService.atualizar(veiculo.id, dados);
      } else {
        await veiculosService.criar({ ...dados, clienteId });
      }
      onSalvo();
    } catch (error) {
      setErro(error.response?.data?.message ?? 'Não foi possível salvar o veículo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 space-y-3 rounded-lg border border-slate-200 bg-white p-4"
    >
      <h3 className="font-medium text-slate-900">{veiculo ? 'Editar veículo' : 'Novo veículo'}</h3>
      {erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {erro}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="placa">
            Placa
          </label>
          <input
            id="placa"
            required
            placeholder="ABC1234 ou ABC1D23"
            value={dados.placa}
            onChange={(event) => setDados({ ...dados, placa: event.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="marca">
            Marca
          </label>
          <input
            id="marca"
            required
            value={dados.marca}
            onChange={(event) => setDados({ ...dados, marca: event.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="modelo">
            Modelo
          </label>
          <input
            id="modelo"
            required
            value={dados.modelo}
            onChange={(event) => setDados({ ...dados, modelo: event.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="ano">
            Ano
          </label>
          <input
            id="ano"
            type="number"
            required
            value={dados.ano}
            onChange={(event) => setDados({ ...dados, ano: event.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="cor">
            Cor
          </label>
          <input
            id="cor"
            value={dados.cor}
            onChange={(event) => setDados({ ...dados, cor: event.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="km">
            Quilometragem
          </label>
          <input
            id="km"
            type="number"
            min="0"
            value={dados.km}
            onChange={(event) => setDados({ ...dados, km: event.target.value })}
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

function TransferirForm({ veiculo, clientes, onCancelar, onTransferido }) {
  const [novoClienteId, setNovoClienteId] = useState('');
  const [erro, setErro] = useState('');

  async function handleTransferir() {
    if (!novoClienteId) return;
    const clienteEscolhido = clientes.find((cliente) => cliente.id === novoClienteId);
    if (!window.confirm(`Transferir o veículo ${veiculo.placa} para ${clienteEscolhido?.nome}?`)) {
      return;
    }
    setErro('');
    try {
      await veiculosService.transferirProprietario(veiculo.id, novoClienteId);
      onTransferido();
    } catch (error) {
      setErro(error.response?.data?.message ?? 'Não foi possível transferir o veículo.');
    }
  }

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md bg-slate-50 p-2 text-sm">
      {erro && <span className="text-red-700">{erro}</span>}
      <select
        value={novoClienteId}
        onChange={(event) => setNovoClienteId(event.target.value)}
        className="rounded-md border border-slate-300 px-2 py-1"
        aria-label="Novo proprietário"
      >
        <option value="">Selecione o novo proprietário...</option>
        {clientes
          .filter((cliente) => cliente.id !== veiculo.clienteId)
          .map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.nome}
            </option>
          ))}
      </select>
      <button
        type="button"
        onClick={handleTransferir}
        disabled={!novoClienteId}
        className="rounded-md bg-slate-900 px-3 py-1 font-medium text-white disabled:opacity-50"
      >
        Confirmar
      </button>
      <button type="button" onClick={onCancelar} className="font-medium text-slate-600">
        Cancelar
      </button>
    </div>
  );
}

function ClienteDetalhe() {
  const { id } = useParams();
  const [cliente, setCliente] = useState(null);
  const [veiculos, setVeiculos] = useState([]);
  const [todosClientes, setTodosClientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [formVeiculoAberto, setFormVeiculoAberto] = useState(false);
  const [veiculoEmEdicao, setVeiculoEmEdicao] = useState(null);
  const [veiculoTransferindo, setVeiculoTransferindo] = useState(null);

  async function carregarVeiculos() {
    const dados = await veiculosService.listarPorCliente(id);
    setVeiculos(dados);
  }

  useEffect(() => {
    let cancelado = false;
    Promise.all([clientesService.buscarPorId(id), veiculosService.listarPorCliente(id)])
      .then(([clienteDados, veiculosDados]) => {
        if (cancelado) return;
        setCliente(clienteDados);
        setVeiculos(veiculosDados);
      })
      .finally(() => !cancelado && setCarregando(false));
    return () => {
      cancelado = true;
    };
  }, [id]);

  async function alternarAtivoCliente() {
    const acao = cliente.ativo ? 'inativar' : 'reativar';
    if (!window.confirm(`Tem certeza que deseja ${acao} ${cliente.nome}?`)) return;
    const atualizado = await clientesService.definirAtivo(cliente.id, !cliente.ativo);
    setCliente(atualizado);
  }

  async function alternarAtivoVeiculo(veiculo) {
    const acao = veiculo.ativo ? 'inativar' : 'reativar';
    if (!window.confirm(`Tem certeza que deseja ${acao} o veículo ${veiculo.placa}?`)) return;
    await veiculosService.definirAtivo(veiculo.id, !veiculo.ativo);
    await carregarVeiculos();
  }

  async function abrirTransferencia(veiculo) {
    if (todosClientes.length === 0) {
      const dados = await clientesService.listar({});
      setTodosClientes(dados);
    }
    setVeiculoTransferindo(veiculo);
  }

  if (carregando) {
    return <p className="text-slate-500">Carregando...</p>;
  }

  if (!cliente) {
    return <p className="text-slate-500">Cliente não encontrado.</p>;
  }

  return (
    <section className="space-y-6">
      <div>
        <Link to="/clientes" className="text-sm text-slate-500 hover:underline">
          ← Voltar para clientes
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">{cliente.nome}</h1>
          <button
            type="button"
            onClick={alternarAtivoCliente}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            {cliente.ativo ? 'Inativar cliente' : 'Reativar cliente'}
          </button>
        </div>
      </div>

      <ClienteInfoForm cliente={cliente} onAtualizado={setCliente} />

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Veículos</h2>
          <button
            type="button"
            onClick={() => {
              setVeiculoEmEdicao(null);
              setFormVeiculoAberto(true);
            }}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            Novo veículo
          </button>
        </div>

        {formVeiculoAberto && (
          <VeiculoForm
            clienteId={cliente.id}
            veiculo={veiculoEmEdicao}
            onCancelar={() => setFormVeiculoAberto(false)}
            onSalvo={async () => {
              setFormVeiculoAberto(false);
              await carregarVeiculos();
            }}
          />
        )}

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-2">Placa</th>
                <th className="px-4 py-2">Marca / Modelo</th>
                <th className="px-4 py-2">Ano</th>
                <th className="px-4 py-2">Km</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {veiculos.map((veiculo) => (
                <Fragment key={veiculo.id}>
                  <tr>
                    <td className="px-4 py-2 font-medium">{veiculo.placa}</td>
                    <td className="px-4 py-2">
                      {veiculo.marca} {veiculo.modelo}
                    </td>
                    <td className="px-4 py-2">{veiculo.ano}</td>
                    <td className="px-4 py-2">{veiculo.km}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          veiculo.ativo
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {veiculo.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="space-x-2 px-4 py-2">
                      <button
                        type="button"
                        onClick={() => {
                          setVeiculoEmEdicao(veiculo);
                          setFormVeiculoAberto(true);
                        }}
                        className="font-medium text-slate-700 hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirTransferencia(veiculo)}
                        className="font-medium text-slate-700 hover:underline"
                      >
                        Transferir
                      </button>
                      <button
                        type="button"
                        onClick={() => alternarAtivoVeiculo(veiculo)}
                        className="font-medium text-red-600 hover:underline"
                      >
                        {veiculo.ativo ? 'Inativar' : 'Reativar'}
                      </button>
                    </td>
                  </tr>
                  {veiculoTransferindo?.id === veiculo.id && (
                    <tr>
                      <td colSpan={6} className="px-4 pb-2">
                        <TransferirForm
                          veiculo={veiculo}
                          clientes={todosClientes}
                          onCancelar={() => setVeiculoTransferindo(null)}
                          onTransferido={async () => {
                            setVeiculoTransferindo(null);
                            await carregarVeiculos();
                          }}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {veiculos.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    Nenhum veículo cadastrado para este cliente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default ClienteDetalhe;
