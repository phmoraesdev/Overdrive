import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/authContextBase.js';
import * as dashboardService from '../services/dashboard';
import { formatarData, formatarHorario, formatarReais } from '../utils/formatacao';
import { ROTULO_STATUS, COR_STATUS } from '../utils/statusOrdem';
import Badge from '../components/Badge';

function CartaoNumero({ titulo, valor, to }) {
  const conteudo = (
    <div className="rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300">
      <p className="text-sm text-slate-600">{titulo}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{valor}</p>
    </div>
  );

  if (!to) return conteudo;
  return (
    <Link to={to} className="block rounded-lg">
      {conteudo}
    </Link>
  );
}

function CartaoVazio({ titulo, mensagem }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="font-medium text-slate-900">{titulo}</h2>
      <p className="mt-2 text-sm text-slate-500">{mensagem}</p>
    </div>
  );
}

function GrupoOS({ titulo, itens }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="font-medium text-slate-900">
        {titulo} ({itens.length})
      </h2>
      {itens.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Nenhuma OS aqui.</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100 text-sm">
          {itens.map((os) => (
            <li key={os.id}>
              <Link
                to={`/ordens/${os.id}`}
                className="flex flex-wrap items-center justify-between gap-2 py-2 hover:underline"
              >
                <span>
                  <span className="font-medium text-slate-900">OS nº {os.numero}</span>{' '}
                  <span className="text-slate-600">
                    {os.veiculoMarcaModelo} — {os.veiculoPlaca}
                  </span>
                </span>
                <Badge cor={COR_STATUS[os.status] ?? 'slate'}>
                  {ROTULO_STATUS[os.status] ?? os.status}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Atalhos({ itens }) {
  return (
    <div className="flex flex-wrap gap-2">
      {itens.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

function SecaoRecepcionista({ dados }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <CartaoNumero
          titulo="Abertas hoje"
          valor={dados.contagens.abertasHoje}
          to="/ordens/painel?status=ABERTA"
        />
        <CartaoNumero
          titulo="Aguardando aprovação"
          valor={dados.contagens.aguardandoAprovacao}
          to="/ordens/painel?status=AGUARDANDO_APROVACAO"
        />
        <CartaoNumero
          titulo="Prontas para retirada"
          valor={dados.contagens.prontasParaRetirada}
          to="/ordens/painel?status=PRONTO_PARA_RETIRADA"
        />
      </div>

      {dados.clientesSemContato.length > 0 && (
        <div className="space-y-1 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <p className="font-medium">
            Atenção: {dados.clientesSemContato.length} cliente
            {dados.clientesSemContato.length > 1 ? 's' : ''} sem telefone nem e-mail cadastrado —
            a recepção precisa ligar para avisar.
          </p>
          <ul className="ml-4 list-disc">
            {dados.clientesSemContato.map((item) => (
              <li key={item.ordemServicoId}>
                <Link to={`/ordens/${item.ordemServicoId}`} className="hover:underline">
                  OS nº {item.numero} — {item.clienteNome} — {item.veiculoPlaca}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {dados.agendamentosHoje.length === 0 ? (
        <CartaoVazio titulo="Agendamentos de hoje" mensagem="Nenhum agendamento hoje." />
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="font-medium text-slate-900">Agendamentos de hoje</h2>
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {dados.agendamentosHoje.map((agendamento) => (
              <li key={agendamento.id} className="flex flex-wrap items-center gap-x-3 py-1.5">
                <span className="font-medium text-slate-900">
                  {formatarHorario(agendamento.dataHora)}
                </span>
                <span className="text-slate-700">{agendamento.clienteNome}</span>
                {agendamento.veiculoPlaca && (
                  <span className="text-slate-500">{agendamento.veiculoPlaca}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Atalhos
        itens={[
          { to: '/ordens/abrir', label: 'Abrir OS' },
          { to: '/clientes?novo=1', label: 'Novo cliente' },
          { to: '/agenda', label: 'Agenda' },
        ]}
      />
    </div>
  );
}

function SecaoMecanico({ dados }) {
  return (
    <div className="space-y-4">
      <GrupoOS titulo="Em diagnóstico" itens={dados.emDiagnostico} />
      <GrupoOS titulo="Em execução" itens={dados.emExecucao} />
      <GrupoOS titulo="Aguardando peça" itens={dados.aguardandoPeca} />

      <Atalhos
        itens={[
          { to: '/ordens/painel', label: 'Painel de OS' },
          { to: '/ordens/historico', label: 'Histórico por placa' },
        ]}
      />
    </div>
  );
}

function SecaoAdministrador({ dados }) {
  const periodo = dados.faturamentoMes.periodo;
  const urlRelatorio = `/relatorios?inicio=${String(periodo.inicio).slice(0, 10)}&fim=${String(
    periodo.fim,
  ).slice(0, 10)}`;

  return (
    <div className="space-y-4">
      <Link
        to={urlRelatorio}
        className="block rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300"
      >
        <p className="text-sm text-slate-600">Faturamento do mês</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">
          {formatarReais(dados.faturamentoMes.faturamentoTotal)}
        </p>
        <p className="text-sm text-slate-500">
          {dados.faturamentoMes.quantidadeOS} OS encerradas · ticket médio{' '}
          {formatarReais(dados.faturamentoMes.ticketMedio)}
        </p>
      </Link>

      <div className="grid gap-3 sm:grid-cols-2">
        <CartaoNumero
          titulo="Contas a pagar vencidas"
          valor={dados.contasVencidas.length}
          to="/financeiro?tipo=PAGAR"
        />
        <CartaoNumero
          titulo="A vencer em 7 dias"
          valor={dados.contasAVencerEm7Dias.length}
          to="/financeiro?tipo=PAGAR"
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <Link to="/pecas" className="font-medium text-slate-900 hover:underline">
          Peças em alerta de estoque ({dados.pecasEmAlerta.length})
        </Link>
        {dados.pecasEmAlerta.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Nenhuma peça em alerta.</p>
        ) : (
          <ul className="mt-2 ml-4 list-disc text-sm text-slate-700">
            {dados.pecasEmAlerta.map((peca) => (
              <li key={peca.id}>
                {peca.descricao} ({peca.codigo}) — saldo {peca.quantidade}, mínimo{' '}
                {peca.quantidadeMinima}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Atalhos itens={[{ to: '/relatorios', label: 'Relatórios' }, { to: '/financeiro', label: 'Financeiro' }]} />
    </div>
  );
}

function Home() {
  const { funcionario } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let cancelado = false;
    dashboardService
      .obter()
      .then((dados) => {
        if (!cancelado) setDashboard(dados);
      })
      .catch((error) => {
        if (!cancelado) {
          setErro(error.response?.data?.message ?? 'Não foi possível carregar o painel inicial.');
        }
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Olá, {funcionario?.nome} · <span className="font-medium">{funcionario?.perfil}</span>
        </h1>
        <p className="text-sm text-slate-500">{formatarData(new Date())}</p>
      </div>

      {carregando && <p className="text-slate-500">Carregando...</p>}

      {erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {erro}
        </p>
      )}

      {!carregando && !erro && dashboard && (
        <>
          {dashboard.recepcionista && <SecaoRecepcionista dados={dashboard.recepcionista} />}
          {dashboard.mecanico && <SecaoMecanico dados={dashboard.mecanico} />}
          {dashboard.administrador && <SecaoAdministrador dados={dashboard.administrador} />}
        </>
      )}
    </section>
  );
}

export default Home;
