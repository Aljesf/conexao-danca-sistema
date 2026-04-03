"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type ContaInternaResponse = {
  ok: boolean;
  data?: {
    colaborador: {
      id: number;
      nome: string;
      status_vinculo: string;
      tipo_vinculo: string | null;
      funcao_principal: string | null;
    };
    conta_interna: {
      existe: boolean;
      id: number | null;
      situacao_atual: string;
      saldo_em_aberto_centavos: number;
      quantidade_faturas: number;
      competencias_abertas: string[];
      quantidade_competencias_abertas: number;
      ultima_fatura_id: number | null;
      ultima_importacao_folha: {
        referencia_id: number | null;
        competencia: string | null;
        status: string | null;
      } | null;
      importacao_pendente: boolean;
    };
    resumo: {
      saldo_em_aberto_centavos: number;
      quantidade_faturas: number;
      competencias_abertas: string[];
      ultima_fatura_id: number | null;
    };
    faturas: Array<{
      id: number;
      competencia: string;
      valor_total_centavos: number;
      valor_taxas_centavos: number;
      status: string;
      data_fechamento: string | null;
      data_vencimento: string | null;
      folha_pagamento_id: number | null;
      folha_pagamento_colaborador_id: number | null;
      status_importacao_folha: string;
      cobranca_id: number | null;
    }>;
  };
  error?: string;
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

function badgeClass(status: string | null | undefined) {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (["ABERTA", "EM_ABERTO", "PENDENTE"].includes(normalized)) return "border-amber-200 bg-amber-50 text-amber-700";
  if (["FECHADA"].includes(normalized)) return "border-sky-200 bg-sky-50 text-sky-700";
  if (["PAGA", "PAGO", "IMPORTADA", "IMPORTADA_EM_FOLHA"].includes(normalized)) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["PENDENTE_IMPORTACAO"].includes(normalized)) return "border-orange-200 bg-orange-50 text-orange-700";
  if (["CANCELADA", "CANCELADO"].includes(normalized)) return "border-slate-200 bg-slate-100 text-slate-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function ContaInternaColaboradorPage() {
  const params = useParams<{ id: string }>();
  const colaboradorId = Number(params?.id);
  const [data, setData] = useState<ContaInternaResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function carregar() {
      if (!Number.isFinite(colaboradorId) || colaboradorId <= 0) return;
      setLoading(true);
      setMessage(null);
      try {
        const response = await fetch(`/api/financeiro/colaboradores/${colaboradorId}/conta-interna`, {
          cache: "no-store",
        });
        const json = (await response.json().catch(() => null)) as ContaInternaResponse | null;
        if (!response.ok) throw new Error(json?.error ?? "falha_carregar_conta_interna");
        if (active) setData(json?.data ?? null);
      } catch (error) {
        if (active) {
          setData(null);
          setMessage(error instanceof Error ? error.message : "falha_carregar_conta_interna");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void carregar();
    return () => {
      active = false;
    };
  }, [colaboradorId]);

  if (!Number.isFinite(colaboradorId) || colaboradorId <= 0) {
    return <div className="p-6 text-sm text-red-600">Colaborador invalido.</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b9894d]">
                Conta interna individual
              </div>
              <h1 className="mt-2 text-3xl font-semibold text-slate-950">{data?.colaborador.nome ?? "Conta interna"}</h1>
              <p className="mt-3 max-w-3xl text-sm text-slate-600">
                Painel dedicado da conta interna do colaborador, com historico completo de faturas, saldo em aberto,
                situacao de importacao em folha e atalho direto para cada fatura.
              </p>
              {data?.conta_interna.id ? (
                <div className="mt-3 inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
                  Conta interna #{data.conta_interna.id} - Tipo: COLABORADOR
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" href={`/financeiro/colaboradores/${colaboradorId}`}>
                Voltar ao financeiro do colaborador
              </Link>
              <Link className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" href="/financeiro/colaboradores">
                Lista principal
              </Link>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
            Carregando conta interna...
          </div>
        ) : message ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700">{message}</div>
        ) : !data ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
            Conta interna nao encontrada.
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Situacao atual</div>
                <div className="mt-2 text-xl font-semibold text-slate-950">{data.conta_interna.situacao_atual}</div>
                <div className="mt-1 text-sm text-slate-600">
                  {data.conta_interna.id ? `Conta interna #${data.conta_interna.id}` : "Conta interna do colaborador"}
                </div>
              </div>
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Saldo em aberto</div>
                <div className="mt-2 text-xl font-semibold text-slate-950">{brl(data.resumo.saldo_em_aberto_centavos)}</div>
                <div className="mt-1 text-sm text-slate-600">Total ainda pendente de desconto ou liquidacao</div>
              </div>
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Faturas</div>
                <div className="mt-2 text-xl font-semibold text-slate-950">{data.resumo.quantidade_faturas}</div>
                <div className="mt-1 text-sm text-slate-600">Historico completo de faturas do colaborador</div>
              </div>
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Competencias abertas</div>
                <div className="mt-2 text-xl font-semibold text-slate-950">{data.conta_interna.quantidade_competencias_abertas}</div>
                <div className="mt-1 text-sm text-slate-600">
                  {data.resumo.competencias_abertas.length > 0
                    ? data.resumo.competencias_abertas.map((item) => competenciaLabel(item)).join(", ")
                    : "Nenhuma competencia aberta"}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Faturas do colaborador</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Todas as faturas da conta interna individual, da mais recente para a mais antiga.
                  </p>
                </div>
                {data.conta_interna.ultima_importacao_folha ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    Ultima importacao: {competenciaLabel(data.conta_interna.ultima_importacao_folha.competencia)} •{" "}
                    {data.conta_interna.ultima_importacao_folha.status ?? "Sem status"}
                  </div>
                ) : null}
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-left">Competencia</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Importacao folha</th>
                      <th className="px-3 py-2 text-left">Fechamento / vencimento</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-right">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.faturas.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                          Nenhuma fatura encontrada para esta conta interna.
                        </td>
                      </tr>
                    ) : (
                      data.faturas.map((fatura) => (
                        <tr key={fatura.id} className="border-t">
                          <td className="px-3 py-2">
                            <div className="font-medium text-slate-950">{competenciaLabel(fatura.competencia)}</div>
                            <div className="text-xs text-slate-500">Fatura #{fatura.id}</div>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${badgeClass(fatura.status)}`}>
                              {fatura.status}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <div>
                              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${badgeClass(fatura.status_importacao_folha)}`}>
                                {fatura.status_importacao_folha}
                              </span>
                            </div>
                            {fatura.folha_pagamento_colaborador_id ? (
                              <div className="text-xs text-slate-500">Folha colaborador #{fatura.folha_pagamento_colaborador_id}</div>
                            ) : null}
                          </td>
                          <td className="px-3 py-2">
                            <div>{fatura.data_fechamento ?? "-"}</div>
                            <div className="text-xs text-slate-500">Venc.: {fatura.data_vencimento ?? "-"}</div>
                          </td>
                          <td className="px-3 py-2 text-right">{brl(fatura.valor_total_centavos)}</td>
                          <td className="px-3 py-2 text-right">
                            <div className="inline-flex flex-wrap justify-end gap-2">
                              <Link
                                href={`/admin/financeiro/credito-conexao/faturas/${fatura.id}`}
                                className="rounded border px-3 py-1 text-xs hover:bg-slate-50"
                              >
                                Abrir fatura
                              </Link>
                              {fatura.folha_pagamento_colaborador_id ? (
                                <Link
                                  href={`/admin/financeiro/folha/colaboradores/${fatura.folha_pagamento_colaborador_id}`}
                                  className="rounded border px-3 py-1 text-xs hover:bg-slate-50"
                                >
                                  Abrir folha
                                </Link>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
