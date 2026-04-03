"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

type ColaboradorFinanceiro = {
  colaborador_id: number;
  pessoa_id: number | null;
  nome: string;
  tipo_vinculo: string | null;
  funcao_principal: string | null;
  status: string;
  conta_interna_ativa: boolean;
  conta_interna_id: number | null;
  saldo_em_aberto_centavos: number;
  competencia_atual: string;
  ultima_competencia: string | null;
  status_folha: string | null;
  quantidade_faturas_abertas: number;
  quantidade_competencias_abertas: number;
  importacao_pendente: boolean;
  folha_aberta: boolean;
  total_adiantamentos_mes_centavos: number;
  total_importado_conta_interna_mes_centavos: number;
  saldo_liquido_estimado_centavos: number;
  ultima_fatura_id: number | null;
  ultima_fatura_status: string | null;
  ultima_folha_id: number | null;
};

type Indicadores = {
  total_colaboradores: number;
  com_conta_interna_ativa: number;
  com_debito_em_aberto: number;
  com_competencia_em_aberto: number;
  com_folha_aberta: number;
  com_importacao_pendente: number;
};

type ApiResponse = {
  data?: ColaboradorFinanceiro[];
  indicadores?: Indicadores;
  error?: string;
};

const EMPTY_INDICADORES: Indicadores = {
  total_colaboradores: 0,
  com_conta_interna_ativa: 0,
  com_debito_em_aberto: 0,
  com_competencia_em_aberto: 0,
  com_folha_aberta: 0,
  com_importacao_pendente: 0,
};

function brl(value: number) {
  return (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function competenciaLabel(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return value ?? "-";
  const [ano, mes] = value.split("-");
  return new Date(Number(ano), Number(mes) - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function statusClass(status: string | null | undefined) {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (["ATIVO", "IMPORTADA", "PAGA", "PAGO", "EM_DIA"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (["ABERTA", "PENDENTE_IMPORTACAO", "PENDENTE", "EM_ABERTO"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (["INATIVO", "CANCELADA"].includes(normalized)) {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function FinanceiroColaboradoresPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [contaInterna, setContaInterna] = useState("");
  const [folha, setFolha] = useState("");
  const [somenteDebito, setSomenteDebito] = useState(false);
  const [somenteImportacaoPendente, setSomenteImportacaoPendente] = useState(false);
  const [rows, setRows] = useState<ColaboradorFinanceiro[]>([]);
  const [indicadores, setIndicadores] = useState<Indicadores>(EMPTY_INDICADORES);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  const competenciaAtualResumo = useMemo(
    () => competenciaLabel(rows[0]?.competencia_atual ?? null),
    [rows],
  );

  async function carregar() {
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams();
      if (deferredQuery.trim()) params.set("q", deferredQuery.trim());
      if (status) params.set("status", status);
      if (contaInterna) params.set("conta_interna", contaInterna);
      if (folha) params.set("folha", folha);
      if (somenteDebito) params.set("somente_debito", "1");
      if (somenteImportacaoPendente) params.set("somente_importacao_pendente", "1");

      const response = await fetch(`/api/financeiro/colaboradores?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as ApiResponse | null;
      if (!response.ok) throw new Error(payload?.error ?? "falha_carregar_colaboradores_financeiros");

      setRows(Array.isArray(payload?.data) ? payload.data : []);
      setIndicadores(payload?.indicadores ?? EMPTY_INDICADORES);
    } catch (error) {
      setRows([]);
      setIndicadores(EMPTY_INDICADORES);
      setMessage(error instanceof Error ? error.message : "falha_carregar_colaboradores_financeiros");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredQuery, status, contaInterna, folha, somenteDebito, somenteImportacaoPendente]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff7ec,transparent_32%),linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[28px] border border-[#eadfcd] bg-white shadow-[0_18px_45px_-32px_rgba(148,91,31,0.35)]">
          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b9894d]">
                Financeiro dos colaboradores
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                Fichas financeiras dos colaboradores
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                A navegação principal parte do colaborador. Daqui você abre a ficha financeira, a conta interna
                individual e a última fatura sem cair em listagens globais.
              </p>
              <div className="mt-4 inline-flex rounded-full border border-[#eadfcd] bg-[#fff8ef] px-4 py-2 text-sm text-slate-700">
                Competência operacional atual: <span className="ml-2 font-semibold text-slate-950">{competenciaAtualResumo}</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/admin/financeiro/folha/colaboradores"
                className="rounded-[22px] border border-[#eadfcd] bg-[#fff8ef] px-5 py-4 text-sm text-slate-700 transition hover:border-[#c57f39] hover:bg-white"
              >
                <div className="font-semibold text-slate-900">Folha geral por competência</div>
                <div className="mt-1 text-sm text-slate-600">Visão administrativa mensal de abertura, espelho e atualização.</div>
              </Link>
              <Link
                href="/financeiro/credito-conexao/faturas"
                className="rounded-[22px] border border-[#eadfcd] bg-[#fff8ef] px-5 py-4 text-sm text-slate-700 transition hover:border-[#c57f39] hover:bg-white"
              >
                <div className="font-semibold text-slate-900">Faturas globais da conta interna</div>
                <div className="mt-1 text-sm text-slate-600">Painel transversal para auditoria ampla quando necessário.</div>
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Conta interna ativa</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{indicadores.com_conta_interna_ativa}</div>
            <div className="mt-2 text-sm text-slate-600">colaboradores com conta interna pronta para operação</div>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Débito em aberto</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{indicadores.com_debito_em_aberto}</div>
            <div className="mt-2 text-sm text-slate-600">colaboradores com saldo pendente em conta interna</div>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Competência em aberto</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{indicadores.com_competencia_em_aberto}</div>
            <div className="mt-2 text-sm text-slate-600">colaboradores com competência aguardando fechamento</div>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Folha aberta</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{indicadores.com_folha_aberta}</div>
            <div className="mt-2 text-sm text-slate-600">colaboradores com folha em processamento</div>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Importação pendente</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{indicadores.com_importacao_pendente}</div>
            <div className="mt-2 text-sm text-slate-600">conta interna aguardando desconto em folha</div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 xl:grid-cols-[1.2fr_repeat(4,minmax(0,1fr))]">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">Buscar colaborador</span>
              <input
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#c57f39]"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nome, vínculo, função ou competência"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">Status</span>
              <select
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#c57f39]"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="">Todos</option>
                <option value="ATIVO">Ativos</option>
                <option value="INATIVO">Inativos</option>
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">Conta interna</span>
              <select
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#c57f39]"
                value={contaInterna}
                onChange={(event) => setContaInterna(event.target.value)}
              >
                <option value="">Todas</option>
                <option value="ATIVA">Ativa</option>
                <option value="SEM_CONTA">Sem conta</option>
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">Folha</span>
              <select
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#c57f39]"
                value={folha}
                onChange={(event) => setFolha(event.target.value)}
              >
                <option value="">Todas</option>
                <option value="ABERTA">Folha aberta</option>
                <option value="PENDENTE_IMPORTACAO">Importação pendente</option>
              </select>
            </label>

            <div className="flex flex-wrap items-end gap-3">
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input type="checkbox" checked={somenteDebito} onChange={(event) => setSomenteDebito(event.target.checked)} />
                Somente débito
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={somenteImportacaoPendente}
                  onChange={(event) => setSomenteImportacaoPendente(event.target.checked)}
                />
                Somente importação pendente
              </label>
              <button
                type="button"
                className="rounded-full border border-[#d7c3a4] bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-[#fff8ef]"
                onClick={() => void carregar()}
              >
                Atualizar
              </button>
            </div>
          </div>

          {message ? <div className="mt-4 text-sm text-red-600">{message}</div> : null}
        </section>

        <section className="grid gap-4">
          {loading ? (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
              Carregando fichas financeiras...
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
              Nenhum colaborador encontrado com os filtros atuais.
            </div>
          ) : (
            rows.map((row) => (
              <article
                key={row.colaborador_id}
                className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.28)]"
              >
                <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b9894d]">
                          Ficha financeira
                        </div>
                        <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{row.nome}</h2>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          {row.tipo_vinculo ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{row.tipo_vinculo}</span>
                          ) : null}
                          {row.funcao_principal ? (
                            <span className="rounded-full bg-[#fff3e0] px-3 py-1 text-[#9a3412]">{row.funcao_principal}</span>
                          ) : null}
                          <span className={`rounded-full border px-3 py-1 ${statusClass(row.status)}`}>{row.status}</span>
                        </div>
                      </div>

                      <div className="rounded-[22px] border border-[#eadfcd] bg-[#fff8ef] px-4 py-3 text-right">
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Saldo em aberto</div>
                        <div className="mt-2 text-2xl font-semibold text-slate-950">{brl(row.saldo_em_aberto_centavos)}</div>
                        <div className="mt-1 text-sm text-slate-600">
                          {row.quantidade_faturas_abertas} fatura{row.quantidade_faturas_abertas === 1 ? "" : "s"} aberta{row.quantidade_faturas_abertas === 1 ? "" : "s"}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-[#eadfcd] bg-[linear-gradient(180deg,#fffdfa_0%,#fff8ef_100%)] p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Ficha financeira do mês</div>
                          <div className="mt-1 text-lg font-semibold text-slate-950">{competenciaLabel(row.competencia_atual)}</div>
                        </div>
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClass(row.status_folha)}`}>
                          {row.status_folha ?? "Sem leitura"}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3">
                          <div className="text-xs text-slate-500">Adiantamentos do mês</div>
                          <div className="mt-1 text-base font-semibold text-slate-950">{brl(row.total_adiantamentos_mes_centavos)}</div>
                        </div>
                        <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3">
                          <div className="text-xs text-slate-500">Desconto da conta interna</div>
                          <div className="mt-1 text-base font-semibold text-slate-950">
                            {brl(row.total_importado_conta_interna_mes_centavos)}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3">
                          <div className="text-xs text-slate-500">Saldo líquido estimado</div>
                          <div className="mt-1 text-base font-semibold text-slate-950">
                            {brl(row.saldo_liquido_estimado_centavos)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-4">
                      <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-xs text-slate-500">Conta interna vinculada</div>
                        <div className="mt-1 text-sm font-medium text-slate-900">
                          {row.conta_interna_ativa
                            ? row.conta_interna_id
                              ? `Conta interna #${row.conta_interna_id}`
                              : "Ativa"
                            : "Não criada"}
                        </div>
                      </div>
                      <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-xs text-slate-500">Última competência</div>
                        <div className="mt-1 text-sm font-medium text-slate-900">{competenciaLabel(row.ultima_competencia)}</div>
                      </div>
                      <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-xs text-slate-500">Importação em folha</div>
                        <div className="mt-1 text-sm font-medium text-slate-900">
                          {row.importacao_pendente ? "Pendente" : "Em dia"}
                        </div>
                      </div>
                      <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-xs text-slate-500">Competências abertas</div>
                        <div className="mt-1 text-sm font-medium text-slate-900">{row.quantidade_competencias_abertas}</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#fffdfa_0%,#fff8f0_100%)] p-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Ações rápidas</div>
                      <div className="mt-1 text-sm text-slate-600">
                        Perfil, ficha financeira do mês, conta interna individual e última fatura.
                      </div>
                    </div>

                    <Link
                      href={`/admin/config/colaboradores/${row.colaborador_id}`}
                      className="rounded-2xl border border-[#eadfcd] bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-[#c57f39] hover:bg-[#fff8ef]"
                    >
                      Abrir perfil
                    </Link>
                    <Link
                      href={`/financeiro/colaboradores/${row.colaborador_id}?competencia=${row.competencia_atual}`}
                      className="rounded-2xl border border-[#eadfcd] bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-[#c57f39] hover:bg-[#fff8ef]"
                    >
                      Abrir ficha financeira
                    </Link>
                    <Link
                      href={`/financeiro/colaboradores/${row.colaborador_id}/conta-interna`}
                      className="rounded-2xl border border-[#eadfcd] bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-[#c57f39] hover:bg-[#fff8ef]"
                    >
                      Abrir conta interna
                    </Link>
                    {row.ultima_fatura_id ? (
                      <Link
                        href={`/admin/financeiro/credito-conexao/faturas/${row.ultima_fatura_id}`}
                        className="rounded-2xl border border-[#eadfcd] bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-[#c57f39] hover:bg-[#fff8ef]"
                      >
                        Abrir última fatura
                      </Link>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-[#d7c3a4] px-4 py-3 text-sm text-slate-600">
                        Nenhuma fatura disponível no momento.
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
