"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";

type ColaboradorFinanceiro = {
  colaborador_id: number;
  pessoa_id: number | null;
  nome: string;
  tipo_vinculo: string | null;
  funcao_principal: string | null;
  status: string;
  conta_interna_ativa: boolean;
  saldo_em_aberto_centavos: number;
  ultima_competencia: string | null;
  status_folha: string | null;
  quantidade_faturas_abertas: number;
  quantidade_competencias_abertas: number;
  importacao_pendente: boolean;
  folha_aberta: boolean;
  ultima_fatura_id: number | null;
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

function brl(value: number) {
  return (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const EMPTY_INDICADORES: Indicadores = {
  total_colaboradores: 0,
  com_conta_interna_ativa: 0,
  com_debito_em_aberto: 0,
  com_competencia_em_aberto: 0,
  com_folha_aberta: 0,
  com_importacao_pendente: 0,
};

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

      const response = await fetch(`/api/financeiro/colaboradores?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as ApiResponse | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "falha_carregar_colaboradores_financeiros");
      }

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
                Cockpit SaaS
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                Colaboradores financeiros
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Painel gerencial para acompanhar conta interna, competencias, faturas, saldo em aberto e situacao da
                folha por colaborador. A folha geral continua existindo, mas deixa de ser a unica porta de entrada.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/financeiro/folha/colaboradores"
                className="rounded-[22px] border border-[#eadfcd] bg-[#fff8ef] px-5 py-4 text-sm text-slate-700 transition hover:border-[#c57f39] hover:bg-white"
              >
                <div className="font-semibold text-slate-900">Folha de pagamento</div>
                <div className="mt-1 text-sm text-slate-600">Abrir a visao por competencia e processamento.</div>
              </Link>
              <Link
                href="/financeiro/credito-conexao/faturas"
                className="rounded-[22px] border border-[#eadfcd] bg-[#fff8ef] px-5 py-4 text-sm text-slate-700 transition hover:border-[#c57f39] hover:bg-white"
              >
                <div className="font-semibold text-slate-900">Conta interna</div>
                <div className="mt-1 text-sm text-slate-600">Ir para faturas e cobrancas da conta interna.</div>
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Conta interna ativa</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{indicadores.com_conta_interna_ativa}</div>
            <div className="mt-2 text-sm text-slate-600">colaboradores com conta interna pronta para operacao</div>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Debito em aberto</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{indicadores.com_debito_em_aberto}</div>
            <div className="mt-2 text-sm text-slate-600">colaboradores com saldo pendente na conta interna</div>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Competencia em aberto</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{indicadores.com_competencia_em_aberto}</div>
            <div className="mt-2 text-sm text-slate-600">colaboradores com competencia aguardando fechamento</div>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Folha aberta</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{indicadores.com_folha_aberta}</div>
            <div className="mt-2 text-sm text-slate-600">colaboradores com folha em processamento</div>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Importacao pendente</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{indicadores.com_importacao_pendente}</div>
            <div className="mt-2 text-sm text-slate-600">colaboradores com conta interna aguardando importacao</div>
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
                placeholder="Nome, vinculo, funcao ou competencia"
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
                <option value="PENDENTE_IMPORTACAO">Importacao pendente</option>
              </select>
            </label>

            <div className="flex flex-wrap items-end gap-3">
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input type="checkbox" checked={somenteDebito} onChange={(event) => setSomenteDebito(event.target.checked)} />
                Somente debito
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={somenteImportacaoPendente}
                  onChange={(event) => setSomenteImportacaoPendente(event.target.checked)}
                />
                Somente importacao pendente
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
              Carregando colaboradores financeiros...
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
                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b9894d]">
                          Colaborador financeiro
                        </div>
                        <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{row.nome}</h2>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          {row.tipo_vinculo ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{row.tipo_vinculo}</span>
                          ) : null}
                          {row.funcao_principal ? (
                            <span className="rounded-full bg-[#fff3e0] px-3 py-1 text-[#9a3412]">{row.funcao_principal}</span>
                          ) : null}
                          <span
                            className={[
                              "rounded-full px-3 py-1",
                              row.status === "ATIVO" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600",
                            ].join(" ")}
                          >
                            {row.status}
                          </span>
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

                    <div className="mt-5 grid gap-3 md:grid-cols-4">
                      <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-xs text-slate-500">Conta interna</div>
                        <div className="mt-1 text-sm font-medium text-slate-900">
                          {row.conta_interna_ativa ? "Ativa" : "Nao criada"}
                        </div>
                      </div>
                      <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-xs text-slate-500">Ultima competencia</div>
                        <div className="mt-1 text-sm font-medium text-slate-900">{row.ultima_competencia ?? "-"}</div>
                      </div>
                      <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-xs text-slate-500">Situacao da folha</div>
                        <div className="mt-1 text-sm font-medium text-slate-900">{row.status_folha ?? "-"}</div>
                      </div>
                      <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-xs text-slate-500">Importacao</div>
                        <div className="mt-1 text-sm font-medium text-slate-900">
                          {row.importacao_pendente ? "Pendente" : "Em dia"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#fffdfa_0%,#fff8f0_100%)] p-4">
                    <div className="text-sm font-semibold text-slate-900">Acoes rapidas</div>
                    <Link
                      href={`/admin/config/colaboradores/${row.colaborador_id}`}
                      className="rounded-2xl border border-[#eadfcd] bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-[#c57f39] hover:bg-[#fff8ef]"
                    >
                      Abrir perfil
                    </Link>
                    <Link
                      href={
                        row.ultima_folha_id
                          ? `/admin/financeiro/folha/colaboradores/${row.ultima_folha_id}`
                          : `/financeiro/folha/colaboradores${row.ultima_competencia ? `?competencia=${row.ultima_competencia}` : ""}`
                      }
                      className="rounded-2xl border border-[#eadfcd] bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-[#c57f39] hover:bg-[#fff8ef]"
                    >
                      Abrir folha
                    </Link>
                    <Link
                      href={
                        row.ultima_fatura_id
                          ? `/admin/financeiro/credito-conexao/faturas/${row.ultima_fatura_id}`
                          : "/financeiro/credito-conexao/faturas"
                      }
                      className="rounded-2xl border border-[#eadfcd] bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-[#c57f39] hover:bg-[#fff8ef]"
                    >
                      Abrir conta interna
                    </Link>
                    <div className="rounded-2xl border border-dashed border-[#d7c3a4] px-4 py-3 text-sm text-slate-600">
                      Competencias abertas: {row.quantidade_competencias_abertas}
                    </div>
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
