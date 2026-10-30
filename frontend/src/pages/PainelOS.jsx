import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/authContextBase.js';
import * as ordensService from '../services/ordens';
import { COR_STATUS } from '../utils/statusOrdem';

const PONTO_POR_COR = {
  slate: 'bg-slate-400',
  amber: 'bg-amber-400',
  emerald: 'bg-emerald-400',
  red: 'bg-red-400',
  blue: 'bg-blue-400',
};

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
  const [searchParams] = useSearchParams();
  const statusDestaque = searchParams.get('status');
  const [ordens, setOrdens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const podeAtualizar = ['MECANICO', 'ADMINISTRADOR'].includes(funcionario?.perfil);
  const colunaDestacadaRef = useRef(null);

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

  useEffect(() => {
    // Vindo de um cartão do dashboard (?status=): rola até a coluna
    // correspondente — sem esconder as outras, ainda é um Kanban.
    if (!carregando && statusDestaque) {
      colunaDestacadaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [carregando, statusDestaque]);

  if (carregando) return <p className="text-slate-500">Carregando...</p>;

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Painel de Ordens de Serviço</h1>
      <div className="grid gap-4 pb-2 sm:grid-cols-3 lg:grid-cols-5">
        {COLUNAS.map((coluna) => {
          const ordensDaColuna = ordens.filter((os) => os.status === coluna.status);
          const destacada = coluna.status === statusDestaque;
          return (
            <div
              key={coluna.status}
              ref={destacada ? colunaDestacadaRef : null}
              className={`min-w-[220px] space-y-2 rounded-lg bg-slate-100 p-3 ${
                destacada ? 'ring-2 ring-slate-900' : ''
              }`}
            >
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${PONTO_POR_COR[COR_STATUS[coluna.status]] ?? 'bg-slate-400'}`}
                  aria-hidden="true"
                />
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
                  <p className="text-xs text-slate-600">Nenhuma OS aqui.</p>
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
