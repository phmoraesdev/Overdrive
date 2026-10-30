import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/authContextBase.js';
import * as ordensService from '../services/ordens';
import * as pecasService from '../services/pecas';
import { formatarReais, formatarData, formatarDataHora } from '../utils/formatacao';
import { ROTULO_STATUS, COR_STATUS } from '../utils/statusOrdem';
import { useMensagemSucesso } from '../hooks/useMensagemSucesso';
import { useRascunho } from '../hooks/useRascunho';
import MensagemSucesso from '../components/MensagemSucesso';
import RascunhoAviso from '../components/RascunhoAviso';
import Badge from '../components/Badge';

const ROTULO_FORMA_PAGAMENTO = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  CARTAO: 'Cartão',
  BOLETO: 'Boleto',
};

const ROTULO_MEIO_CONTATO = {
  TELEFONE: 'Telefone',
  WHATSAPP: 'WhatsApp',
  PRESENCIAL: 'Presencial',
};

function CabecalhoOS({ ordemServico }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">OS nº {ordemServico.numero}</h1>
        <Badge cor={COR_STATUS[ordemServico.status] ?? 'slate'}>
          {ROTULO_STATUS[ordemServico.status] ?? ordemServico.status}
        </Badge>
      </div>
      <div className="mt-2 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
        <p>
          Cliente: {ordemServico.cliente.nome} · {ordemServico.cliente.telefone}
        </p>
        <p>
          Veículo: {ordemServico.veiculo.placa} — {ordemServico.veiculo.marca}{' '}
          {ordemServico.veiculo.modelo}
        </p>
        <p>Km de entrada: {ordemServico.kmEntrada}</p>
        <p>Aberta em: {formatarDataHora(ordemServico.abertaEm)}</p>
      </div>
      <p className="mt-2 text-sm text-slate-700">
        <span className="font-medium">Problema relatado:</span> {ordemServico.problemaRelatado}
      </p>
    </div>
  );
}

function ChecklistResumo({ checklist }) {
  if (!checklist) return null;
  const avarias = JSON.parse(checklist.avarias || '[]');
  const itensPresentes = JSON.parse(checklist.itensPresentes || '[]');

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="font-medium text-slate-900">Checklist de entrada</h2>
      <p className="mt-2 text-sm text-slate-700">
        Combustível: <span className="font-medium">{checklist.nivelCombustivel}</span>
      </p>
      <p className="mt-1 text-sm text-slate-700">
        Itens presentes: {itensPresentes.length > 0 ? itensPresentes.join(', ') : 'Nenhum'}
      </p>
      {avarias.length > 0 && (
        <div className="mt-1 text-sm text-slate-700">
          Avarias:
          <ul className="ml-4 list-disc">
            {avarias.map((avaria, indice) => (
              <li key={indice}>
                {avaria.regiao}: {avaria.descricao}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const ITEM_ORCAMENTO_INICIAL = {
  modo: 'PECA',
  pecaId: '',
  descricao: '',
  quantidade: '1',
  valorUnitario: '',
};

function NovoItemOrcamentoForm({ ordemServicoId, numeroOS, pecas, onAdicionado }) {
  const { rascunhoEncontrado, salvarRascunho, descartarRascunho } = useRascunho(
    `overdrive:rascunho-orcamento-${numeroOS}`,
  );
  const [modo, setModo] = useState(() => rascunhoEncontrado?.modo ?? ITEM_ORCAMENTO_INICIAL.modo);
  const [pecaId, setPecaId] = useState(() => rascunhoEncontrado?.pecaId ?? '');
  const [descricao, setDescricao] = useState(() => rascunhoEncontrado?.descricao ?? '');
  const [quantidade, setQuantidade] = useState(
    () => rascunhoEncontrado?.quantidade ?? ITEM_ORCAMENTO_INICIAL.quantidade,
  );
  const [valorUnitario, setValorUnitario] = useState(() => rascunhoEncontrado?.valorUnitario ?? '');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Atualiza um campo e persiste o rascunho junto (RNF09) — só grava quando
  // há algo digitado de fato, pra não encher o localStorage com o formulário
  // em branco assim que a tela abre.
  function atualizarCampo(patch) {
    const novo = { modo, pecaId, descricao, quantidade, valorUnitario, ...patch };
    setModo(novo.modo);
    setPecaId(novo.pecaId);
    setDescricao(novo.descricao);
    setQuantidade(novo.quantidade);
    setValorUnitario(novo.valorUnitario);
    if (novo.pecaId || novo.descricao.trim() || novo.valorUnitario) {
      salvarRascunho(novo);
    }
  }

  function limparFormulario() {
    setModo(ITEM_ORCAMENTO_INICIAL.modo);
    setPecaId(ITEM_ORCAMENTO_INICIAL.pecaId);
    setDescricao(ITEM_ORCAMENTO_INICIAL.descricao);
    setQuantidade(ITEM_ORCAMENTO_INICIAL.quantidade);
    setValorUnitario(ITEM_ORCAMENTO_INICIAL.valorUnitario);
  }

  function handleDescartarRascunho() {
    descartarRascunho();
    limparFormulario();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');
    setAviso('');
    setEnviando(true);
    try {
      const dados =
        modo === 'PECA'
          ? { tipo: 'PECA', pecaId, quantidade: Number(quantidade) }
          : {
              tipo: 'MAO_DE_OBRA',
              descricao,
              quantidade: Number(quantidade),
              valorUnitario: Number(valorUnitario),
            };
      const resultado = await ordensService.adicionarItemOrcamento(ordemServicoId, dados);
      if (resultado.aviso) {
        setAviso(resultado.aviso.mensagem);
      }
      limparFormulario();
      descartarRascunho();
      await onAdicionado();
    } catch (error) {
      setErro(error.response?.data?.message ?? 'Não foi possível adicionar o item.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-dashed border-slate-300 p-3">
      {rascunhoEncontrado && <RascunhoAviso onDescartar={handleDescartarRascunho} />}

      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => atualizarCampo({ modo: 'PECA' })}
          className={`rounded-md px-3 py-1 font-medium ${modo === 'PECA' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
        >
          Peça
        </button>
        <button
          type="button"
          onClick={() => atualizarCampo({ modo: 'MAO_DE_OBRA' })}
          className={`rounded-md px-3 py-1 font-medium ${modo === 'MAO_DE_OBRA' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
        >
          Mão de obra
        </button>
      </div>

      {erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {erro}
        </p>
      )}
      {aviso && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Atenção: {aviso}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-4">
        {modo === 'PECA' ? (
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-500" htmlFor="pecaId">
              Peça
            </label>
            <select
              id="pecaId"
              required
              value={pecaId}
              onChange={(event) => atualizarCampo({ pecaId: event.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="">Selecione...</option>
              {pecas.map((peca) => (
                <option key={peca.id} value={peca.id}>
                  {peca.codigo} — {peca.descricao} ({formatarReais(peca.precoVenda)}, saldo{' '}
                  {peca.quantidade})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-500" htmlFor="descricaoMaoDeObra">
              Descrição do serviço
            </label>
            <input
              id="descricaoMaoDeObra"
              required
              value={descricao}
              onChange={(event) => atualizarCampo({ descricao: event.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
        )}

        <div>
          <label className="block text-xs text-slate-500" htmlFor="quantidade">
            Quantidade
          </label>
          <input
            id="quantidade"
            type="number"
            min="0.01"
            step="0.01"
            required
            value={quantidade}
            onChange={(event) => atualizarCampo({ quantidade: event.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>

        {modo === 'MAO_DE_OBRA' && (
          <div>
            <label className="block text-xs text-slate-500" htmlFor="valorUnitario">
              Valor unitário (R$)
            </label>
            <input
              id="valorUnitario"
              type="number"
              min="0.01"
              step="0.01"
              required
              value={valorUnitario}
              onChange={(event) => atualizarCampo({ valorUnitario: event.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={enviando}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {enviando ? 'Adicionando...' : 'Adicionar item'}
      </button>
    </form>
  );
}

function OrcamentoSecao({ ordemServico, orcamento, podeEditar, onAtualizar }) {
  const [pecas, setPecas] = useState([]);
  const [erroFinalizar, setErroFinalizar] = useState('');
  const [finalizando, setFinalizando] = useState(false);
  const [mensagemSucesso, mostrarSucesso] = useMensagemSucesso();
  const editavel = podeEditar && ordemServico.status === 'ABERTA';

  useEffect(() => {
    if (editavel) {
      pecasService.listar({}).then(setPecas);
    }
  }, [editavel]);

  async function remover(itemId) {
    if (!window.confirm('Remover este item do orçamento?')) return;
    await ordensService.removerItemOrcamento(ordemServico.id, itemId);
    await onAtualizar();
    mostrarSucesso('Item removido com sucesso.');
  }

  async function finalizar() {
    setErroFinalizar('');
    setFinalizando(true);
    try {
      await ordensService.finalizarOrcamento(ordemServico.id);
      await onAtualizar();
      mostrarSucesso('Orçamento finalizado e enviado para aprovação.');
    } catch (error) {
      setErroFinalizar(error.response?.data?.message ?? 'Não foi possível finalizar o orçamento.');
    } finally {
      setFinalizando(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="font-medium text-slate-900">Orçamento</h2>

      <MensagemSucesso mensagem={mensagemSucesso} />

      {orcamento.itens.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum item no orçamento ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-600">
              <tr>
                <th className="py-1 pr-2">Item</th>
                <th className="py-1 pr-2">Qtd</th>
                <th className="py-1 pr-2">Valor un.</th>
                <th className="py-1 pr-2">Total</th>
                {ordemServico.status !== 'ABERTA' && <th className="py-1 pr-2">Aprovado</th>}
                {editavel && <th className="py-1 pr-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orcamento.itens.map((item) => (
                <tr key={item.id}>
                  <td className="py-1 pr-2">{item.descricao}</td>
                  <td className="py-1 pr-2">{item.quantidade}</td>
                  <td className="py-1 pr-2">{formatarReais(item.valorUnitario)}</td>
                  <td className="py-1 pr-2 font-medium">{formatarReais(item.total)}</td>
                  {ordemServico.status !== 'ABERTA' && (
                    <td className="py-1 pr-2">
                      <Badge cor={item.aprovado ? 'emerald' : 'slate'}>
                        {item.aprovado ? 'Sim' : 'Não'}
                      </Badge>
                    </td>
                  )}
                  {editavel && (
                    <td className="py-1 pr-2">
                      <button
                        type="button"
                        onClick={() => remover(item.id)}
                        className="font-medium text-red-600 hover:underline"
                      >
                        Remover
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-right font-semibold text-slate-900">Total: {formatarReais(orcamento.total)}</p>

      {editavel && (
        <>
          <NovoItemOrcamentoForm
            ordemServicoId={ordemServico.id}
            numeroOS={ordemServico.numero}
            pecas={pecas}
            onAdicionado={async () => {
              await onAtualizar();
              mostrarSucesso('Item adicionado com sucesso.');
            }}
          />
          {erroFinalizar && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {erroFinalizar}
            </p>
          )}
          <button
            type="button"
            onClick={finalizar}
            disabled={finalizando}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {finalizando ? 'Enviando...' : 'Finalizar orçamento e enviar para aprovação'}
          </button>
        </>
      )}
    </div>
  );
}

function DecisaoSecao({ ordemServico, podeDecidir, onAtualizar }) {
  const [decisao, setDecisao] = useState('APROVADO');
  const [meioContato, setMeioContato] = useState('TELEFONE');
  const [motivo, setMotivo] = useState('');
  const [itensSelecionados, setItensSelecionados] = useState([]);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensagemSucesso, mostrarSucesso] = useMensagemSucesso();

  function alternarItem(itemId) {
    setItensSelecionados((atual) =>
      atual.includes(itemId) ? atual.filter((id) => id !== itemId) : [...atual, itemId],
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await ordensService.registrarDecisao(ordemServico.id, {
        decisao,
        meioContato,
        motivo: decisao === 'REPROVADO' ? motivo : undefined,
        itensAprovadosIds: decisao === 'APROVADO_PARCIAL' ? itensSelecionados : undefined,
      });
      await onAtualizar();
      mostrarSucesso('Decisão registrada com sucesso.');
    } catch (error) {
      setErro(error.response?.data?.message ?? 'Não foi possível registrar a decisão.');
    } finally {
      setEnviando(false);
    }
  }

  if (ordemServico.decisaoOrcamento) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <h2 className="font-medium text-slate-900">Decisão do orçamento</h2>
        <MensagemSucesso mensagem={mensagemSucesso} />
        <p className="mt-1">
          {ordemServico.decisaoOrcamento === 'APROVADO' && 'Aprovado integralmente'}
          {ordemServico.decisaoOrcamento === 'APROVADO_PARCIAL' && 'Aprovado parcialmente'}
          {ordemServico.decisaoOrcamento === 'REPROVADO' && 'Reprovado'}
          {' · '}
          Contato: {ROTULO_MEIO_CONTATO[ordemServico.meioContatoDecisao]}
          {' · '}
          {formatarDataHora(ordemServico.decisaoRegistradaEm)}
        </p>
        {ordemServico.motivoReprovacao && (
          <p className="mt-1">Motivo: {ordemServico.motivoReprovacao}</p>
        )}
      </div>
    );
  }

  if (!podeDecidir || ordemServico.status !== 'AGUARDANDO_APROVACAO') {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="font-medium text-slate-900">Decisão do cliente sobre o orçamento</h2>
      <MensagemSucesso mensagem={mensagemSucesso} />
      {erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {erro}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="decisao">
            Decisão
          </label>
          <select
            id="decisao"
            value={decisao}
            onChange={(event) => setDecisao(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="APROVADO">Aprovado integralmente</option>
            <option value="APROVADO_PARCIAL">Aprovado parcialmente</option>
            <option value="REPROVADO">Reprovado</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="meioContato">
            Meio de contato
          </label>
          <select
            id="meioContato"
            value={meioContato}
            onChange={(event) => setMeioContato(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="TELEFONE">Telefone</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="PRESENCIAL">Presencial</option>
          </select>
        </div>
      </div>

      {decisao === 'REPROVADO' && (
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="motivo">
            Motivo da reprovação
          </label>
          <input
            id="motivo"
            required
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      )}

      {decisao === 'APROVADO_PARCIAL' && (
        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">Itens aprovados pelo cliente</p>
          <div className="space-y-1">
            {ordemServico.itensOrcamento.map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={itensSelecionados.includes(item.id)}
                  onChange={() => alternarItem(item.id)}
                />
                {item.descricao} — {formatarReais(item.valorUnitario)} x {item.quantidade}
              </label>
            ))}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {enviando ? 'Registrando...' : 'Registrar decisão'}
      </button>
    </form>
  );
}

const TRANSICOES_POR_STATUS = {
  EM_EXECUCAO: [
    { status: 'AGUARDANDO_PECA', rotulo: 'Marcar aguardando peça' },
    { status: 'PRONTO_PARA_RETIRADA', rotulo: 'Marcar pronto para retirada' },
  ],
  AGUARDANDO_PECA: [{ status: 'EM_EXECUCAO', rotulo: 'Peça chegou — voltar para execução' }],
};

function StatusSecao({ ordemServico, podeAtualizar, onAtualizar }) {
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [alertaRecepcao, setAlertaRecepcao] = useState(false);
  const [mensagemSucesso, mostrarSucesso] = useMensagemSucesso();
  const transicoes = TRANSICOES_POR_STATUS[ordemServico.status] ?? [];

  if (!podeAtualizar || transicoes.length === 0) return null;

  async function mudarStatus(novoStatus) {
    setErro('');
    setEnviando(true);
    try {
      const resultado = await ordensService.atualizarStatus(ordemServico.id, novoStatus);
      setAlertaRecepcao(Boolean(resultado.alertaRecepcao));
      await onAtualizar();
      mostrarSucesso('Status atualizado com sucesso.');
    } catch (error) {
      setErro(error.response?.data?.message ?? 'Não foi possível atualizar o status.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="font-medium text-slate-900">Status da OS</h2>
      <MensagemSucesso mensagem={mensagemSucesso} />
      {erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {erro}
        </p>
      )}
      {alertaRecepcao && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Atenção: este cliente não tem e-mail nem telefone cadastrado — a recepção precisa ligar
          para avisar que o veículo está pronto.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {transicoes.map((transicao) => (
          <button
            key={transicao.status}
            type="button"
            disabled={enviando}
            onClick={() => mudarStatus(transicao.status)}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {transicao.rotulo}
          </button>
        ))}
      </div>
    </div>
  );
}

function HistoricoSecao({ historicosStatus }) {
  if (!historicosStatus || historicosStatus.length === 0) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="font-medium text-slate-900">Histórico de status</h2>
      <ul className="mt-2 space-y-1 text-sm text-slate-700">
        {historicosStatus.map((registro) => (
          <li key={registro.id}>
            {formatarDataHora(registro.alteradoEm)} —{' '}
            {registro.statusAnterior ? `${ROTULO_STATUS[registro.statusAnterior]} → ` : ''}
            {ROTULO_STATUS[registro.statusNovo]}
            {registro.funcionario && ` (${registro.funcionario.nome})`}
          </li>
        ))}
      </ul>
    </div>
  );
}

const ROTULO_CANAL = { EMAIL: 'E-mail', WHATSAPP: 'WhatsApp' };

function NotificacoesSecao({ notificacoes }) {
  if (!notificacoes || notificacoes.length === 0) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="font-medium text-slate-900">Notificações ao cliente</h2>
      <ul className="mt-2 space-y-1 text-sm text-slate-700">
        {notificacoes.map((notificacao) => (
          <li key={notificacao.id}>
            {formatarDataHora(notificacao.enviadaEm)} — {ROTULO_CANAL[notificacao.canal]} para{' '}
            {notificacao.destinatario}:{' '}
            <Badge cor={notificacao.status === 'ENVIADA' ? 'emerald' : 'red'}>
              {notificacao.status === 'ENVIADA' ? 'Enviada' : 'Falhou'}
            </Badge>
            {notificacao.erro && <span className="text-red-700"> — {notificacao.erro}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EncerramentoSecao({ ordemServico, podeEncerrar, onAtualizar }) {
  const [formaPagamento, setFormaPagamento] = useState('DINHEIRO');
  const [parcelado, setParcelado] = useState(false);
  const [numeroParcelas, setNumeroParcelas] = useState('2');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await ordensService.encerrar(ordemServico.id, {
        formaPagamento,
        parcelado,
        numeroParcelas: parcelado ? Number(numeroParcelas) : undefined,
      });
      await onAtualizar();
    } catch (error) {
      setErro(error.response?.data?.message ?? 'Não foi possível encerrar a OS.');
    } finally {
      setEnviando(false);
    }
  }

  const conta = ordemServico.contas?.[0];

  if (ordemServico.status === 'ENCERRADA' && conta) {
    return (
      <div className="space-y-2 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
        <h2 className="font-medium">Pagamento</h2>
        <p>
          Forma: {ROTULO_FORMA_PAGAMENTO[conta.formaPagamento]} · Total: {formatarReais(conta.valor)}
          {' · '}
          {conta.status === 'PAGA' ? 'Pago à vista' : `Parcelado em ${conta.parcelas.length}x`}
        </p>
        {conta.parcelas.length > 1 && (
          <ul className="ml-4 list-disc">
            {conta.parcelas.map((parcela) => (
              <li key={parcela.id}>
                Parcela {parcela.numero}: {formatarReais(parcela.valor)} — vence em{' '}
                {formatarData(parcela.vencimento)}
              </li>
            ))}
          </ul>
        )}
        <a
          href={ordensService.urlRecibo(ordemServico.id)}
          target="_blank"
          rel="noreferrer"
          className="inline-block rounded-md bg-emerald-700 px-3 py-1.5 font-medium text-white hover:bg-emerald-800"
        >
          Ver recibo em PDF
        </a>
      </div>
    );
  }

  if (!podeEncerrar || ordemServico.status !== 'PRONTO_PARA_RETIRADA') return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="font-medium text-slate-900">Encerrar OS e registrar pagamento</h2>
      {erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {erro}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="formaPagamento">
            Forma de pagamento
          </label>
          <select
            id="formaPagamento"
            value={formaPagamento}
            onChange={(event) => setFormaPagamento(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="DINHEIRO">Dinheiro</option>
            <option value="PIX">Pix</option>
            <option value="CARTAO">Cartão</option>
            <option value="BOLETO">Boleto</option>
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={parcelado}
              onChange={(event) => setParcelado(event.target.checked)}
            />
            Parcelado
          </label>
        </div>
        {parcelado && (
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="numeroParcelas">
              Número de parcelas
            </label>
            <input
              id="numeroParcelas"
              type="number"
              min="2"
              max="24"
              value={numeroParcelas}
              onChange={(event) => setNumeroParcelas(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>
      <button
        type="submit"
        disabled={enviando}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {enviando ? 'Encerrando...' : 'Encerrar OS'}
      </button>
    </form>
  );
}

function OrdemDetalhe() {
  const { id } = useParams();
  const { funcionario } = useAuth();
  const [ordemServico, setOrdemServico] = useState(null);
  const [orcamento, setOrcamento] = useState(null);
  const [notificacoes, setNotificacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  async function carregar() {
    const [osDados, orcamentoDados, notificacoesDados] = await Promise.all([
      ordensService.buscarPorId(id),
      ordensService.listarOrcamento(id),
      ordensService.listarNotificacoes(id),
    ]);
    setOrdemServico(osDados);
    setOrcamento(orcamentoDados);
    setNotificacoes(notificacoesDados);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCarregando(true);
    carregar()
      .catch((error) => setErro(error.response?.data?.message ?? 'Não foi possível carregar a OS.'))
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (carregando) return <p className="text-slate-500">Carregando...</p>;
  if (erro) return <p className="text-red-700">{erro}</p>;
  if (!ordemServico) return null;

  const podeOrcar = ['MECANICO', 'ADMINISTRADOR'].includes(funcionario?.perfil);
  const podeDecidir = ['RECEPCIONISTA', 'ADMINISTRADOR'].includes(funcionario?.perfil);
  const podeEncerrar = podeDecidir;

  return (
    <section className="space-y-4">
      <CabecalhoOS ordemServico={ordemServico} />
      <ChecklistResumo checklist={ordemServico.checklistEntrada} />
      <OrcamentoSecao
        ordemServico={ordemServico}
        orcamento={orcamento}
        podeEditar={podeOrcar}
        onAtualizar={carregar}
      />
      <DecisaoSecao ordemServico={ordemServico} podeDecidir={podeDecidir} onAtualizar={carregar} />
      <StatusSecao ordemServico={ordemServico} podeAtualizar={podeOrcar} onAtualizar={carregar} />
      <EncerramentoSecao
        ordemServico={ordemServico}
        podeEncerrar={podeEncerrar}
        onAtualizar={carregar}
      />
      <HistoricoSecao historicosStatus={ordemServico.historicosStatus} />
      <NotificacoesSecao notificacoes={notificacoes} />
    </section>
  );
}

export default OrdemDetalhe;
