import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/authContextBase.js';
import * as ordensService from '../services/ordens';

const COLUNAS = [
  { status: 'ABERTA', titulo: 'Aberta' },
  { status: 'AGUARDANDO_APROVACAO', titulo: 'Aguardando aprovação' },
  { status: 'EM_EXECUCAO', titulo: 'Em execução' },
  { status: 'AGUARDANDO_PECA', titulo: 'Aguardando peça' },
  { status: 'PRONTO_PARA_RETIRADA', titulo: 'Pronto para retirada' },
];

const TRANSICOES_POR_STATUS = {
  EM_EXECUCAO: [
    { status: 'AGUARDANDO_PECA', rotulo: 'Aguardando peça' },
    { status: 'PRONTO_PARA_RETIRADA', rotulo: 'Pronto' },
  ],
  AGUARDANDO_PECA: [{ status: 'EM_EXECUCAO', rotulo: 'Peça chegou' }],
};

function CartaoOS({ ordemServico, podeAtualizar, onAtualizado }) {
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const transicoes = TRANSICOES_POR_STATUS[ordemServico.status] ?? [];

  async function mudarStatus(novoStatus) {
    setErro('');
    setEnviando(true);
    try {
      await ordensService.atualizarStatus(ordemServico.id, novoStatus);
      await onAtualizado();
    } catch (error) {
      setErro(error.response?.data?.message ?? 'Não foi possível atualizar.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-slate-200 bg-white p-3 text-sm shadow-sm">
      <Link to={`/ordens/${ordemServico.id}`} className="font-medium text-slate-900 hover:underline">
        OS nº {ordemServico.numero}
      </Link>
      <p className="text-slate-600">{ordemServico.veiculo.placa}</p>
      <p className="text-slate-600">
        {ordemServico.veiculo.marca} {ordemServico.veiculo.modelo}
      </p>
      <p className="text-slate-500">{ordemServico.cliente.nome}</p>
      {erro && <p className="text-red-700">{erro}</p>}
      {podeAtualizar && transicoes.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {transicoes.map((transicao) => (
            <button
              key={transicao.status}
              type="button"
              disabled={enviando}
              onClick={() => mudarStatus(transicao.status)}
              className="rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {transicao.rotulo}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PainelOS() {
  const { funcionario } = useAuth();
  const [ordens, setOrdens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const podeAtualizar = ['MECANICO', 'ADMINISTRADOR'].includes(funcionario?.perfil);

  async function carregar() {
    const dados = await ordensService.listarPainel();
    setOrdens(dados);
    setCarregando(false);
  }

  useEffect(() => {
    // carregar() só muda estado depois do await; a regra não enxerga isso.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
  }, []);

  if (carregando) return <p className="text-slate-500">Carregando...</p>;

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Painel de Ordens de Serviço</h1>
      <div className="grid gap-4 overflow-x-auto pb-2 sm:grid-cols-3 lg:grid-cols-5">
        {COLUNAS.map((coluna) => {
          const ordensDaColuna = ordens.filter((os) => os.status === coluna.status);
          return (
            <div key={coluna.status} className="min-w-[220px] space-y-2 rounded-lg bg-slate-100 p-3">
              <h2 className="text-sm font-semibold text-slate-700">
                {coluna.titulo} ({ordensDaColuna.length})
              </h2>
              <div className="space-y-2">
                {ordensDaColuna.map((os) => (
                  <CartaoOS
                    key={os.id}
                    ordemServico={os}
                    podeAtualizar={podeAtualizar}
                    onAtualizado={carregar}
                  />
                ))}
                {ordensDaColuna.length === 0 && (
                  <p className="text-xs text-slate-400">Nenhuma OS aqui.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default PainelOS;
