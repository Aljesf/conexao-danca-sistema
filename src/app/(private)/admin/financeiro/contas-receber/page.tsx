"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { FinanceHelpCard } from "@/components/FinanceHelpCard";
import { CobrancaAuditDetail } from "@/components/financeiro/contas-receber/CobrancaAuditDetail";
import { CobrancasTable } from "@/components/financeiro/contas-receber/CobrancasTable";
import { DevedoresTable } from "@/components/financeiro/contas-receber/DevedoresTable";
import { PerdasCancelamentoCard } from "@/components/financeiro/contas-receber/PerdasCancelamentoCard";
import { FinancePageShell } from "@/components/financeiro/FinancePageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDateISO } from "@/lib/formatters/date";
import { formatBRLFromCents } from "@/lib/formatters/money";
import type {
  CobrancaListaItem,
  ContasReceberAuditoriaPayload,
  DevedorAuditoriaItem,
  DetalheCobrancaAuditoria,
} from "@/lib/financeiro/contas-receber-auditoria";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shadcn/ui";

type ApiResponse = ContasReceberAuditoriaPayload & {
  ok: boolean;
  error?: string;
  details?: string;
};

type TituloVencido = {
  cobranca_id: number;
  pessoa_id: number;
  vencimento: string | null;
  dias_atraso: number;
  valor_centavos: number;
  saldo_aberto_centavos: number;
  origem_tipo: string | null;
  origem_id: number | null;
  status_cobranca: string | null;
  bucket_vencimento: string | null;
  situacao_saas: string | null;
};

type TitulosResponse = {
  ok?: boolean;
  error?: string;
  titulos?: TituloVencido[];
};

type ReceberResponse = {
  ok?: boolean;
  error?: string;
};

type ReceberForm = {
  data_pagamento: string;
  metodo_pagamento: "PIX" | "DINHEIRO";
};

const VISOES = ["VENCIDAS", "AVENCER", "RECEBIDAS", "INCONSISTENCIAS"] as const;
const SITUACOES = ["TODAS", "VENCIDA", "EM_ABERTO", "QUITADA"] as const;
const STATUS = ["TODOS", "PENDENTE", "RECEBIDO", "CANCELADA"] as const;
const BUCKETS = ["", "VENCIDA", "A_VENCER_7", "A_VENCER_30", "FUTURA", "SEM_VENCIMENTO"] as const;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function KpiCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <Card className="border-slate-200 bg-white">
      <CardContent className="space-y-1 py-5">
        <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        <p className="text-sm text-slate-600">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminContasReceberPage() {
  const [q, setQ] = useState("");
  const [visao, setVisao] = useState<(typeof VISOES)[number]>("VENCIDAS");
  const [situacao, setSituacao] = useState<(typeof SITUACOES)[number]>("TODAS");
  const [status, setStatus] = useState<(typeof STATUS)[number]>("TODOS");
  const [bucket, setBucket] = useState<string>("");
  const [competencia, setCompetencia] = useState("");
  const [vencimentoInicio, setVencimentoInicio] = useState("");
  const [vencimentoFim, setVencimentoFim] = useState("");
  const [page, setPage] = useState(1);
  const [payload, setPayload] = useState<ContasReceberAuditoriaPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllDevedores, setShowAllDevedores] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<DetalheCobrancaAuditoria | null>(null);
  const [receberOpen, setReceberOpen] = useState(false);
  const [receberItem, setReceberItem] = useState<CobrancaListaItem | null>(null);
  const [receberForm, setReceberForm] = useState<ReceberForm>({ data_pagamento: todayIso(), metodo_pagamento: "PIX" });
  const [receberLoading, setReceberLoading] = useState(false);
  const [titulosOpen, setTitulosOpen] = useState(false);
  const [titulosPessoa, setTitulosPessoa] = useState<DevedorAuditoriaItem | null>(null);
  const [titulos, setTitulos] = useState<TituloVencido[]>([]);
  const [titulosLoading, setTitulosLoading] = useState(false);
  const [titulosError, setTitulosError] = useState<string | null>(null);

  const qDeferred = useDeferredValue(q);
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("visao", visao);
    if (situacao !== "TODAS") params.set("situacao", situacao);
    if (status !== "TODOS") params.set("status", status);
    if (bucket) params.set("bucket", bucket);
    if (competencia) params.set("competencia", competencia);
    if (vencimentoInicio) params.set("vencimento_inicio", vencimentoInicio);
    if (vencimentoFim) params.set("vencimento_fim", vencimentoFim);
    if (qDeferred.trim()) params.set("q", qDeferred.trim());
    params.set("page", String(page));
    params.set("page_size", "50");
    return params.toString();
  }, [bucket, competencia, page, qDeferred, situacao, status, vencimentoFim, vencimentoInicio, visao]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/financeiro/contas-a-receber?${queryString}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = (await response.json().catch(() => null)) as ApiResponse | null;
        if (!response.ok || !json?.ok) {
          throw new Error(json?.error ?? "erro_carregar_contas_receber");
        }
        setPayload(json);
      } catch (loadError: unknown) {
        if ((loadError as { name?: string }).name === "AbortError") return;
        setPayload(null);
        setError(loadError instanceof Error ? loadError.message : "erro_carregar_contas_receber");
      } finally {
        setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [queryString]);

  useEffect(() => {
    setPage(1);
  }, [bucket, competencia, qDeferred, situacao, status, vencimentoFim, vencimentoInicio, visao]);

  async function abrirTitulos(item: DevedorAuditoriaItem) {
    setTitulosPessoa(item);
    setTitulosOpen(true);
    setTitulosLoading(true);
    setTitulosError(null);
    setTitulos([]);
    try {
      const response = await fetch(`/api/financeiro/contas-a-receber/vencidas/por-pessoa?pessoa_id=${item.pessoa_id}`, {
        cache: "no-store",
      });
      const json = (await response.json().catch(() => null)) as TitulosResponse | null;
      if (!response.ok || !json?.ok) {
        throw new Error(json?.error ?? "erro_carregar_titulos");
      }
      setTitulos(json.titulos ?? []);
    } catch (loadError: unknown) {
      setTitulosError(loadError instanceof Error ? loadError.message : "erro_carregar_titulos");
    } finally {
      setTitulosLoading(false);
    }
  }

  async function abrirAuditoria(item: CobrancaListaItem) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetailData(null);
    try {
      const response = await fetch(`/api/financeiro/contas-a-receber?${queryString}&detalhe_cobranca_id=${item.cobranca_id}`, {
        cache: "no-store",
      });
      const json = (await response.json().catch(() => null)) as ApiResponse | null;
      if (!response.ok || !json?.ok) {
        throw new Error(json?.error ?? "erro_carregar_detalhe");
      }
      setDetailData(json.detalhe_cobranca);
    } catch (loadError: unknown) {
      setDetailError(loadError instanceof Error ? loadError.message : "erro_carregar_detalhe");
    } finally {
      setDetailLoading(false);
    }
  }

  function abrirRecebimento(item: CobrancaListaItem) {
    setReceberItem(item);
    setReceberForm({ data_pagamento: todayIso(), metodo_pagamento: "PIX" });
    setReceberOpen(true);
  }

  async function confirmarRecebimento() {
    if (!receberItem) return;
    setReceberLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/financeiro/contas-receber/receber", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cobranca_id: receberItem.cobranca_id,
          valor_centavos: receberItem.valor_aberto_centavos,
          data_pagamento: receberForm.data_pagamento,
          metodo_pagamento: receberForm.metodo_pagamento,
        }),
      });
      const json = (await response.json().catch(() => null)) as ReceberResponse | null;
      if (!response.ok || !json?.ok) {
        throw new Error(json?.error ?? "erro_registrar_recebimento");
      }
      setReceberOpen(false);
      setReceberItem(null);
      setPage(1);
      const refreshed = await fetch(`/api/financeiro/contas-a-receber?${queryString}`, { cache: "no-store" });
      const refreshedJson = (await refreshed.json().catch(() => null)) as ApiResponse | null;
      if (refreshed.ok && refreshedJson?.ok) setPayload(refreshedJson);
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : "erro_registrar_recebimento");
    } finally {
      setReceberLoading(false);
    }
  }

  const resumo = payload?.resumo;

  return (
    <FinancePageShell
      title="Contas a Receber"
      subtitle="Saúde financeira, auditoria por devedor e origem operacional das dívidas."
      actions={
        <Button type="button" variant="secondary" onClick={() => { setQ(""); setBucket(""); setCompetencia(""); setSituacao("TODAS"); setStatus("TODOS"); setVencimentoInicio(""); setVencimentoFim(""); setVisao("VENCIDAS"); }}>
          Limpar filtros
        </Button>
      }
    >
      <FinanceHelpCard
        items={[
          "Use os cards de contexto para entender onde o saldo aberto realmente nasce.",
          "A lista de devedores sempre considera títulos vencidos com saldo em aberto.",
          "A coluna de origem detalhada mostra a leitura operacional mais próxima da dívida real.",
          "Cobranças de fatura do Cartão Conexão podem abrir a composição completa no detalhe auditável.",
        ]}
      />

      <Card className="border-slate-200 bg-white">
        <CardHeader className="border-slate-100">
          <CardTitle className="text-slate-900">Filtros e leitura</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 text-sm text-slate-700">
            <span>Busca</span>
            <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Pessoa, origem, contexto..." />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>Visão</span>
            <select className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm" value={visao} onChange={(event) => setVisao(event.target.value as (typeof VISOES)[number])}>
              {VISOES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>Situação</span>
            <select className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm" value={situacao} onChange={(event) => setSituacao(event.target.value as (typeof SITUACOES)[number])}>
              {SITUACOES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>Status bruto</span>
            <select className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value as (typeof STATUS)[number])}>
              {STATUS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>Bucket</span>
            <select className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm" value={bucket} onChange={(event) => setBucket(event.target.value)}>
              {BUCKETS.map((item) => <option key={item || "todos"} value={item}>{item || "Todos"}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>Competência</span>
            <Input type="month" value={competencia} onChange={(event) => setCompetencia(event.target.value)} />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>Vencimento inicial</span>
            <Input type="date" value={vencimentoInicio} onChange={(event) => setVencimentoInicio(event.target.value)} />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>Vencimento final</span>
            <Input type="date" value={vencimentoFim} onChange={(event) => setVencimentoFim(event.target.value)} />
          </label>
        </CardContent>
      </Card>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Total aberto" value={formatBRLFromCents(resumo?.total_aberto_centavos ?? 0)} subtitle={loading ? "Atualizando..." : "Saldo aberto nos filtros atuais"} />
        <KpiCard title="Total vencido" value={formatBRLFromCents(resumo?.total_vencido_centavos ?? 0)} subtitle="Saldo vencido em aberto" />
        <KpiCard title="Total a vencer" value={formatBRLFromCents(resumo?.total_a_vencer_centavos ?? 0)} subtitle="Saldo ainda dentro do prazo" />
        <KpiCard title="Cobranças listadas" value={String(payload?.paginacao.total ?? 0)} subtitle={`Página ${payload?.paginacao.page ?? 1} de ${payload?.paginacao.total_paginas ?? 1}`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Escola" value={formatBRLFromCents(resumo?.total_por_contexto.escola ?? 0)} subtitle="Saldo aberto da Escola" />
        <KpiCard title="Café" value={formatBRLFromCents(resumo?.total_por_contexto.cafe ?? 0)} subtitle="Saldo aberto do Café" />
        <KpiCard title="Loja" value={formatBRLFromCents(resumo?.total_por_contexto.loja ?? 0)} subtitle="Saldo aberto da Loja" />
        <KpiCard title="Outro" value={formatBRLFromCents(resumo?.total_por_contexto.outro ?? 0)} subtitle="Fallback técnico / origem mista" />
      </div>

      <DevedoresTable
        items={payload?.devedores_lista ?? []}
        showAll={showAllDevedores}
        onToggleAll={() => setShowAllDevedores((current) => !current)}
        onVerTitulos={abrirTitulos}
      />

      <CobrancasTable
        items={payload?.cobrancas_lista ?? []}
        page={payload?.paginacao.page ?? 1}
        totalPages={payload?.paginacao.total_paginas ?? 1}
        total={payload?.paginacao.total ?? 0}
        onPageChange={(nextPage) => setPage(nextPage)}
        onAuditar={abrirAuditoria}
        onReceber={abrirRecebimento}
      />

      <PerdasCancelamentoCard items={payload?.perdas_cancelamento ?? []} />

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-5xl p-0">
          <DialogHeader>
            <div className="border-b border-slate-100 px-6 py-5">
              <DialogTitle>Detalhe da cobrança / auditoria</DialogTitle>
              <DialogDescription>Trilha financeira, contexto real e composição de fatura quando aplicável.</DialogDescription>
            </div>
          </DialogHeader>
          <CobrancaAuditDetail detalhe={detailData} loading={detailLoading} error={detailError} />
        </DialogContent>
      </Dialog>

      <Dialog open={titulosOpen} onOpenChange={setTitulosOpen}>
        <DialogContent className="max-w-4xl p-0">
          <DialogHeader>
            <div className="border-b border-slate-100 px-6 py-5">
              <DialogTitle>Títulos vencidos</DialogTitle>
              <DialogDescription>{titulosPessoa ? titulosPessoa.pessoa_nome : "Pessoa selecionada"}</DialogDescription>
            </div>
          </DialogHeader>
          <div className="p-6">
            {titulosLoading ? (
              <div className="text-sm text-slate-500">Carregando títulos...</div>
            ) : titulosError ? (
              <div className="text-sm text-rose-700">{titulosError}</div>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3 font-medium">Cobrança</th>
                    <th className="px-3 py-3 font-medium">Vencimento</th>
                    <th className="px-3 py-3 font-medium">Atraso</th>
                    <th className="px-3 py-3 font-medium">Origem</th>
                    <th className="px-3 py-3 font-medium">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {titulos.map((item) => (
                    <tr key={item.cobranca_id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3 py-3 text-slate-700">#{item.cobranca_id}</td>
                      <td className="px-3 py-3 text-slate-700">{formatDateISO(item.vencimento)}</td>
                      <td className="px-3 py-3 text-slate-700">{item.dias_atraso} dias</td>
                      <td className="px-3 py-3 text-slate-700">
                        {item.origem_tipo ?? "--"}
                        {item.origem_id ? ` #${item.origem_id}` : ""}
                      </td>
                      <td className="px-3 py-3 text-slate-700">{formatBRLFromCents(item.saldo_aberto_centavos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={receberOpen} onOpenChange={setReceberOpen}>
        <DialogContent className="max-w-xl p-0">
          <div className="border-b border-slate-100 px-6 py-5">
            <DialogTitle>Registrar recebimento</DialogTitle>
            <DialogDescription>{receberItem?.pessoa_nome ?? "Cobrança selecionada"}</DialogDescription>
          </div>
          <div className="space-y-4 p-6">
            <LinhaFormulario label="Cobrança" value={receberItem ? `#${receberItem.cobranca_id} · ${receberItem.origem_label}` : "--"} />
            <LinhaFormulario label="Saldo aberto" value={formatBRLFromCents(receberItem?.valor_aberto_centavos ?? 0)} />
            <label className="space-y-1 text-sm text-slate-700">
              <span>Data do pagamento</span>
              <Input
                type="date"
                value={receberForm.data_pagamento}
                onChange={(event) => setReceberForm((current) => ({ ...current, data_pagamento: event.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span>Método</span>
              <select
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
                value={receberForm.metodo_pagamento}
                onChange={(event) =>
                  setReceberForm((current) => ({
                    ...current,
                    metodo_pagamento: event.target.value === "DINHEIRO" ? "DINHEIRO" : "PIX",
                  }))
                }
              >
                <option value="PIX">PIX</option>
                <option value="DINHEIRO">Dinheiro</option>
              </select>
            </label>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="secondary">Cancelar</Button>
              </DialogClose>
              <Button type="button" onClick={() => void confirmarRecebimento()} disabled={receberLoading || !receberItem}>
                {receberLoading ? "Registrando..." : "Confirmar recebimento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </FinancePageShell>
  );
}

function LinhaFormulario({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}
