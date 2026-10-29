import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as ordensService from '../services/ordens';

const ROTULO_STATUS = {
  ABERTA: 'Aberta',
  AGUARDANDO_APROVACAO: 'Aguardando aprovação',
  REPROVADA: 'Reprovada',
  EM_EXECUCAO: 'Em execução',
  AGUARDANDO_PECA: 'Aguardando peça',
  PRONTO_PARA_RETIRADA: 'Pronto para retirada',
  ENCERRADA: 'Encerrada',
};

function HistoricoVeiculo() {
  const [placa, setPlaca] = useState('');
  const [ordens, setOrdens] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!placa.trim()) return;
    setErro('');
    setBuscando(true);
    setOrdens(null);
    try {
      const dados = await ordensService.listarHistoricoPorPlaca(placa);
      setOrdens(dados);
    } catch (error) {
      setErro(error.response?.data?.message ?? 'Não foi possível buscar o histórico.');
    } finally {
      setBuscando(false);
    }
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Histórico do veículo</h1>

      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4"
      >
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="placa">
            Placa do veículo
          </label>
          <input
            id="placa"
            required
            placeholder="ABC1234 ou ABC1D23"
            value={placa}
            onChange={(event) => setPlaca(event.target.value)}
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
      </form>

      {erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {erro}
        </p>
      )}

      {ordens && ordens.length === 0 && (
        <p className="text-slate-500">Este veículo ainda não tem nenhuma ordem de serviço.</p>
      )}

      {ordens && ordens.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-2">Nº OS</th>
                <th className="px-4 py-2">Aberta em</th>
                <th className="px-4 py-2">Km entrada</th>
                <th className="px-4 py-2">Problema relatado</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ordens.map((ordem) => (
                <tr key={ordem.id}>
                  <td className="px-4 py-2 font-medium">
                    <Link to={`/ordens/${ordem.id}`} className="text-slate-900 hover:underline">
                      {ordem.numero}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{new Date(ordem.abertaEm).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-2">{ordem.kmEntrada}</td>
                  <td className="px-4 py-2">{ordem.problemaRelatado}</td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {ROTULO_STATUS[ordem.status] ?? ordem.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default HistoricoVeiculo;
