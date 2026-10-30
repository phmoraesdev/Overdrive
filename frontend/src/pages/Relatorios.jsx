import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as relatoriosService from '../services/relatorios';
import { formatarReais, formatarData } from '../utils/formatacao';

const PADRAO_DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function primeiroDiaDoMesISO() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;
}

function BotoesExportar({ urlPdf, urlXlsx }) {
  return (
    <div className="flex gap-2">
      <a
        href={urlPdf}
        target="_blank"
        rel="noreferrer"
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        Exportar PDF
      </a>
      <a
        href={urlXlsx}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        Exportar XLSX
      </a>
    </div>
  );
}

function Relatorios() {
  const [searchParams] = useSearchParams();
  // Atalho vindo do dashboard (?inicio=&fim=): já preenche o período.
  const inicioUrl = searchParams.get('inicio');
  const fimUrl = searchParams.get('fim');
  const periodoValidoNaUrl = PADRAO_DATA_ISO.test(inicioUrl) && PADRAO_DATA_ISO.test(fimUrl);

  const [inicio, setInicio] = useState(() =>
    periodoValidoNaUrl ? inicioUrl : primeiroDiaDoMesISO(),
  );
  const [fim, setFim] = useState(() => (periodoValidoNaUrl ? fimUrl : hojeISO()));
  const [faturamento, setFaturamento] = useState(null);
  const [desempenho, setDesempenho] = useState(null);
  const [erro, setErro] = useState('');
  const [consultando, setConsultando] = useState(false);

  async function consultar(event) {
    event?.preventDefault();
    setErro('');
    setConsultando(true);
    try {
      const [faturamentoDados, desempenhoDados] = await Promise.all([
        relatoriosService.faturamento(inicio, fim),
        relatoriosService.desempenho(inicio, fim),
      ]);
      setFaturamento(faturamentoDados);
      setDesempenho(desempenhoDados);
    } catch (error) {
      setErro(error.response?.data?.message ?? 'Não foi possível gerar os relatórios.');
    } finally {
      setConsultando(false);
    }
  }

  useEffect(() => {
    if (periodoValidoNaUrl) {
      // consultar() só muda estado depois do await; a regra não enxerga isso.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      consultar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Relatórios</h1>

      <form
        onSubmit={consultar}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4"
      >
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="inicio">
            De
          </label>
          <input
            id="inicio"
            type="date"
            required
            value={inicio}
            onChange={(event) => setInicio(event.target.value)}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="fim">
            Até
          </label>
          <input
            id="fim"
            type="date"
            required
            value={fim}
            onChange={(event) => setFim(event.target.value)}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={consultando}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {consultando ? 'Gerando...' : 'Gerar relatórios'}
        </button>
      </form>

      {erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {erro}
        </p>
      )}

      {faturamento && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Faturamento e ticket médio</h2>
            <BotoesExportar
              urlPdf={relatoriosService.urlFaturamento(inicio, fim, 'pdf')}
              urlXlsx={relatoriosService.urlFaturamento(inicio, fim, 'xlsx')}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-slate-100 p-3">
              <p className="text-xs text-slate-600">OS encerradas</p>
              <p className="text-lg font-semibold text-slate-900">{faturamento.quantidadeOS}</p>
            </div>
            <div className="rounded-md bg-emerald-50 p-3">
              <p className="text-xs text-emerald-700">Faturamento total</p>
              <p className="text-lg font-semibold text-emerald-800">
                {formatarReais(faturamento.faturamentoTotal)}
              </p>
            </div>
            <div className="rounded-md bg-slate-100 p-3">
              <p className="text-xs text-slate-600">Ticket médio</p>
              <p className="text-lg font-semibold text-slate-900">
                {formatarReais(faturamento.ticketMedio)}
              </p>
            </div>
          </div>
          {faturamento.ordens.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-slate-600">
                  <tr>
                    <th className="py-1 pr-2">OS</th>
                    <th className="py-1 pr-2">Encerrada em</th>
                    <th className="py-1 pr-2">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {faturamento.ordens.map((os) => (
                    <tr key={os.numero}>
                      <td className="py-1 pr-2">nº {os.numero}</td>
                      <td className="py-1 pr-2">{formatarData(os.encerradaEm)}</td>
                      <td className="py-1 pr-2">{formatarReais(os.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {desempenho && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Desempenho por mecânico</h2>
            <BotoesExportar
              urlPdf={relatoriosService.urlDesempenho(inicio, fim, 'pdf')}
              urlXlsx={relatoriosService.urlDesempenho(inicio, fim, 'xlsx')}
            />
          </div>
          {desempenho.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma OS encerrada com mecânico no período.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-slate-600">
                  <tr>
                    <th className="py-1 pr-2">Mecânico</th>
                    <th className="py-1 pr-2">OS encerradas</th>
                    <th className="py-1 pr-2">Total mão de obra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {desempenho.map((linha) => (
                    <tr key={linha.mecanicoId}>
                      <td className="py-1 pr-2">{linha.mecanicoNome}</td>
                      <td className="py-1 pr-2">{linha.quantidadeOS}</td>
                      <td className="py-1 pr-2">{formatarReais(linha.totalMaoDeObra)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default Relatorios;
