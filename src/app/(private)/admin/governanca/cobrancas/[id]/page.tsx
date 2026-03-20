"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GerarReciboButton } from "@/components/documentos/recibos/GerarReciboButton";

type Pessoa = {
  nome: string | null;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
};

type MatriculaRelacionada = {
  id: number;
  status: string | null;
  data_matricula: string | null;
  relacionamento: "ORIGEM_COBRANCA" | "PESSOA_RESPONSAVEL" | "PESSOA_ALUNA";
};

type CobrancaDetalhe = {
  id: number;
  pessoa_id: number | null;
  pessoa_label: string;
  descricao: string | null;
  vencimento: string | null;
  valor_centavos: number | null;
  status: string | null;
  competencia_ano_mes: string | null;
  competencia_label: string | null;
  origem_tipo: string | null;
  origem_subtipo: string | null;
  origem_id: number | null;
  data_pagamento: string | null;
  metodo_pagamento: string | null;
  observacoes: string | null;
  neofin_charge_id: string | null;
  link_pagamento: string | null;
  linha_digitavel: string | null;
  neofin_payload: Record<string, unknown> | null;
  pagamento_exibivel?: {
    tipo_exibicao: string;
    tipo_remoto: string | null;
    status_sincronizado: string | null;
    invoice_id: string | null;
    neofin_charge_id: string | null;
    integration_identifier: string | null;
    link_pagamento: string | null;
    linha_digitavel: string | null;
    codigo_barras: string | null;
    pix_copia_cola: string | null;
    qr_code_url: string | null;
    qr_code_bruto: string | null;
    origem_dos_dados: "remoto" | "local" | "legado";
    invoice_valida: boolean;
    segunda_via_disponivel: boolean;
    charge_id_textual_legado: boolean;
  } | null;
  created_at: string | null;
  updated_at: string | null;
  pessoa: Pessoa | null;
  recebimentos_resumo: {
    quantidade: number;
    total_centavos: number;
    ultimo_pagamento: string | null;
    ultimo_recebimento_id: number | null;
  };
  matriculas_relacionadas: MatriculaRelacionada[];
  matricula_relacionada_id: number | null;
  pode_registrar_pagamento: boolean;
  pode_cancelar: boolean;
  pode_reprocessar_pessoa: boolean;
  pode_reprocessar_matricula: boolean;
};

type ApiDetalheResponse = {
  ok: boolean;
  data?: CobrancaDetalhe;
  error?: string;
  detail?: string | null;
};

type ApiActionResponse = {
  ok?: boolean;
  error?: string;
  detail?: string | null;
  message?: string | null;
  resumo?: {
    cobrancas_criadas?: number;
    cobrancas_atualizadas?: number;
    lancamentos_upsert?: number;
    faturas_afetadas?: string[];
  };
  matriculas_com_sucesso?: number;
  matriculas_com_erro?: number;
};

type FeedbackState = { tipo: "sucesso" | "erro"; mensagem: string } | null;
type ActionKey = "sincronizar" | "reprocessar_matricula" | "reprocessar_pessoa" | "registrar_pagamento" | "cancelar";

function localTodayIso(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function formatBRL(centavos: number | null | undefined): string {
  return (Number(centavos ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const iso = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR") : value;
}

function previewPayload(payload: Record<string, unknown> | null): string {
  if (!payload) return "Sem payload NeoFin registrado.";
  const raw = JSON.stringify(payload);
  if (!raw) return "Sem payload NeoFin registrado.";
  return raw.length <= 2200 ? JSON.stringify(payload, null, 2) : `${raw.slice(0, 2200)}...`;
}

function neofinUrl(item: CobrancaDetalhe | null): string | null {
  if (!item) return null;
  if (item.pagamento_exibivel?.link_pagamento) return item.pagamento_exibivel.link_pagamento;
  if (item.link_pagamento) return item.link_pagamento;
  const chargeId = item.pagamento_exibivel?.neofin_charge_id ?? item.neofin_charge_id;
  if (!chargeId) return null;
  return `https://api.sandbox.neofin.services/billing/${encodeURIComponent(chargeId)}`;
}

function statusClasses(status: string | null | undefined): string {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (normalized === "PAGO" || normalized === "RECEBIDO") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalized === "CANCELADA" || normalized === "CANCELADO") return "border-slate-200 bg-slate-100 text-slate-700";
  if (normalized === "PENDENTE") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function relacaoLabel(relacao: MatriculaRelacionada["relacionamento"]): string {
  if (relacao === "ORIGEM_COBRANCA") return "Origem da cobranca";
  if (relacao === "PESSOA_RESPONSAVEL") return "Pessoa responsavel";
  return "Pessoa aluna";
}

function resumoMatricula(response: ApiActionResponse, matriculaId: number): string {
  const resumo = response.resumo;
  if (!resumo) return `Matricula #${matriculaId} reprocessada com sucesso.`;
  const faturas =
    Array.isArray(resumo.faturas_afetadas) && resumo.faturas_afetadas.length > 0
      ? ` Faturas/competencias afetadas: ${resumo.faturas_afetadas.join(", ")}.`
      : "";
  return `Matricula #${matriculaId} reprocessada. ${resumo.cobrancas_criadas ?? 0} cobrancas criadas, ${resumo.cobrancas_atualizadas ?? 0} atualizadas e ${resumo.lancamentos_upsert ?? 0} lancamentos ajustados.${faturas}`;
}

function resumoPessoa(response: ApiActionResponse, pessoaId: number): string {
  return `Pessoa #${pessoaId} processada. ${response.matriculas_com_sucesso ?? 0} matriculas com sucesso e ${response.matriculas_com_erro ?? 0} com ajuste manual pendente.`;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-slate-900">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-700">{children}</CardContent>
    </Card>
  );
}

function Field({ label, value, className = "" }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-1">{value}</div>
    </div>
  );
}

export default function GovernancaCobrancaDetalhePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const [item, setItem] = useState<CobrancaDetalhe | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [loadingAction, setLoadingAction] = useState<ActionKey | null>(null);
  const [pagamentoOpen, setPagamentoOpen] = useState(false);
  const [dataPagamento, setDataPagamento] = useState(localTodayIso());
  const [metodoPagamento, setMetodoPagamento] = useState<"PIX" | "DINHEIRO">("PIX");

  const carregar = useCallback(async () => {
    if (!Number.isFinite(id) || id <= 0) return;
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch(`/api/governanca/cobrancas/${id}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as ApiDetalheResponse | null;
      if (!res.ok || !json?.ok || !json.data) {
        setItem(null);
        setErro(json?.detail ?? json?.error ?? "falha_carregar_cobranca");
        return;
      }
      setItem(json.data);
    } catch (error: unknown) {
      setItem(null);
      setErro(error instanceof Error ? error.message : "falha_inesperada");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function executarAcao(action: ActionKey, url: string, body: Record<string, unknown> | null) {
    setLoadingAction(action);
    setFeedback(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = (await res.json().catch(() => null)) as ApiActionResponse | null;
      if (!res.ok || !json?.ok) {
        setFeedback({ tipo: "erro", mensagem: json?.detail ?? json?.message ?? json?.error ?? "Nao foi possivel concluir a acao agora." });
        return null;
      }
      await carregar();
      return json;
    } catch (error: unknown) {
      setFeedback({ tipo: "erro", mensagem: error instanceof Error ? error.message : "Nao foi possivel concluir a acao agora." });
      return null;
    } finally {
      setLoadingAction(null);
    }
  }

  const titulo = useMemo(() => (item?.id ? `Cobranca #${item.id}` : `Cobranca #${Number.isFinite(id) ? id : "-"}`), [id, item]);
  const linkNeofin = neofinUrl(item);
  const pagamentoExibivel = item?.pagamento_exibivel ?? null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(226,232,240,0.8),_transparent_48%),linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <Card className="border-slate-200 bg-white/95 shadow-sm">
          <CardContent className="space-y-5 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Governanca financeira</p>
                <h1 className="mt-2 text-3xl font-semibold text-slate-950">{titulo}</h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-600">Painel SaaS de auditoria com leitura rapida da cobranca, da pessoa, da integracao NeoFin e das acoes administrativas.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" href="/admin/governanca/cobrancas">Voltar</Link>
                <Link className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" href="/admin/governanca/boletos-neofin">Cobrancas (Provedor)</Link>
              </div>
            </div>

            {feedback ? <div className={`rounded-2xl border px-4 py-3 text-sm ${feedback.tipo === "sucesso" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{feedback.mensagem}</div> : null}
            {loading ? <div className="text-sm text-slate-500">Carregando detalhes da cobranca...</div> : null}
            {erro && !loading ? <div className="text-sm text-rose-700">{erro}</div> : null}

            {!loading && !erro && item ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {[
                  ["Competencia", item.competencia_label ?? "-", item.competencia_ano_mes ?? "Sem competencia canonica"],
                  ["Status", <span key="status-badge" className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(item.status)}`}>{item.status ?? "SEM STATUS"}</span>, null],
                  ["Valor", formatBRL(item.valor_centavos), `Recebido: ${formatBRL(item.recebimentos_resumo.total_centavos)}`],
                  ["Vencimento", formatDate(item.vencimento), `Ultimo pagamento: ${formatDate(item.recebimentos_resumo.ultimo_pagamento)}`],
                  ["Atualizacao", formatDate(item.updated_at), `Criada em ${formatDate(item.created_at)}`],
                ].map(([label, value, extra]) => (
                  <div key={String(label)} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
                    <div className="mt-2 text-lg font-semibold text-slate-950">{value}</div>
                    {extra ? <div className="mt-1 text-sm text-slate-500">{extra}</div> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {!loading && !erro && item ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Pessoa">
              <Field label="Pagador" value={<div className="text-lg font-semibold text-slate-950">{item.pessoa_label}</div>} />
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="CPF" value={item.pessoa?.cpf ?? "-"} />
                <Field label="Telefone" value={item.pessoa?.telefone ?? "-"} />
                <Field label="E-mail" value={item.pessoa?.email ?? "-"} className="md:col-span-2" />
              </div>
              {item.pessoa_id ? <div className="flex flex-wrap gap-3 text-xs"><Link className="text-slate-600 underline hover:text-slate-900" href={`/pessoas/${item.pessoa_id}`}>Abrir pessoa</Link><Link className="text-slate-600 underline hover:text-slate-900" href={`/pessoas/${item.pessoa_id}`} target="_blank" rel="noreferrer">Abrir resumo financeiro</Link></div> : null}
            </Section>

            <Section title="Financeiro">
              <Field label="Descricao" value={<div className="text-base font-semibold text-slate-950">{item.descricao ?? "Sem descricao operacional"}</div>} />
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Valor" value={formatBRL(item.valor_centavos)} />
                <Field label="Vencimento" value={formatDate(item.vencimento)} />
                <Field label="Status local" value={item.status ?? "-"} />
                <Field label="Competencia" value={item.competencia_label ?? item.competencia_ano_mes ?? "-"} />
                <Field label="Origem" value={item.origem_tipo ?? "-"} />
                <Field label="Origem ID" value={item.origem_id ? `#${item.origem_id}` : "-"} />
                <Field label="Subtipo" value={item.origem_subtipo ?? "-"} />
                <Field label="Metodo pagamento" value={item.metodo_pagamento ?? "-"} />
                <Field label="Tipo exibicao" value={pagamentoExibivel?.tipo_exibicao ?? "-"} />
                <Field label="Origem dados" value={pagamentoExibivel?.origem_dos_dados ?? "legado"} />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="Recebimentos" value={item.recebimentos_resumo.quantidade} />
                  <Field label="Total recebido" value={formatBRL(item.recebimentos_resumo.total_centavos)} />
                  <Field label="Ultimo pagamento" value={formatDate(item.recebimentos_resumo.ultimo_pagamento)} />
                </div>
              </div>
              {item.recebimentos_resumo.ultimo_recebimento_id ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Recibo financeiro</div>
                  <div className="mt-2 text-sm text-emerald-800">
                    O recibo oficial agora e emitido a partir do ultimo recebimento confirmado da cobranca.
                  </div>
                  <div className="mt-3">
                    <GerarReciboButton
                      recebimentoId={item.recebimentos_resumo.ultimo_recebimento_id}
                      label="Gerar recibo"
                    />
                  </div>
                </div>
              ) : null}
              {item.observacoes ? <Field label="Observacoes" value={<div className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4">{item.observacoes}</div>} /> : null}
            </Section>

            <Section title="Integracao NeoFin">
              <Field label="Charge ID" value={pagamentoExibivel?.neofin_charge_id ?? item.neofin_charge_id ?? "-"} />
              <Field label="Invoice" value={pagamentoExibivel?.invoice_id ?? "-"} />
              <Field label="Status remoto" value={pagamentoExibivel?.status_sincronizado ?? "-"} />
              <Field label="Tipo remoto" value={pagamentoExibivel?.tipo_remoto ?? "-"} />
              <Field label="Link de pagamento" value={pagamentoExibivel?.link_pagamento ?? item.link_pagamento ?? "-"} />
              <Field label="Linha digitavel" value={pagamentoExibivel?.linha_digitavel ?? item.linha_digitavel ?? "-"} />
              <Field label="Codigo de barras" value={pagamentoExibivel?.codigo_barras ?? "-"} />
              <Field label="Pix copia e cola" value={pagamentoExibivel?.pix_copia_cola ?? "-"} />
              <Field label="QR Pix" value={pagamentoExibivel?.qr_code_url ?? pagamentoExibivel?.qr_code_bruto ?? "-"} />
              <div className="flex flex-wrap gap-2">
                {linkNeofin ? <a className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" href={linkNeofin} target="_blank" rel="noreferrer">Abrir no NeoFin</a> : null}
                {item.neofin_charge_id ? <Button type="button" variant="secondary" disabled={loadingAction !== null} onClick={() => void executarAcao("sincronizar", `/api/governanca/cobrancas/${item.id}/sincronizar-neofin`, null).then((response) => response && setFeedback({ tipo: "sucesso", mensagem: `Sincronizacao NeoFin concluida para a cobranca #${item.id}.` }))}>{loadingAction === "sincronizar" ? "Sincronizando..." : "Sincronizar com NeoFin"}</Button> : null}
              </div>
              <Field label="Payload resumo" value={<pre className="max-h-80 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">{previewPayload(item.neofin_payload)}</pre>} />
            </Section>

            <Section title="Acoes">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Contexto de matriculas</div>
                {item.matriculas_relacionadas.length === 0 ? <p className="mt-2 text-sm text-slate-600">Nenhuma matricula relacionada foi inferida com seguranca.</p> : <div className="mt-3 space-y-2">{item.matriculas_relacionadas.map((matricula) => <div key={matricula.id} className={`rounded-xl border px-3 py-3 ${item.matricula_relacionada_id === matricula.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"}`}><div className="flex flex-wrap items-center justify-between gap-2"><div className="font-medium">Matricula #{matricula.id}</div><div className="text-xs uppercase tracking-[0.16em] opacity-80">{relacaoLabel(matricula.relacionamento)}</div></div><div className="mt-1 text-xs opacity-80">Status: {matricula.status ?? "-"} | Data: {formatDate(matricula.data_matricula)}</div></div>)}</div>}
              </div>

              <div className="grid gap-2">
                {item.pode_reprocessar_matricula && item.matricula_relacionada_id ? <Button type="button" disabled={loadingAction !== null} onClick={() => void executarAcao("reprocessar_matricula", `/api/admin/governanca/matriculas/${item.matricula_relacionada_id}/reprocessar-financeiro`, null).then((response) => response && setFeedback({ tipo: "sucesso", mensagem: resumoMatricula(response, item.matricula_relacionada_id as number) }))}>{loadingAction === "reprocessar_matricula" ? "Reprocessando..." : "Reprocessar matricula"}</Button> : null}
                {item.pode_reprocessar_pessoa && item.pessoa_id ? <Button type="button" variant="secondary" disabled={loadingAction !== null} onClick={() => void executarAcao("reprocessar_pessoa", `/api/admin/governanca/pessoas/${item.pessoa_id}/reprocessar-financeiro`, null).then((response) => response && setFeedback({ tipo: "sucesso", mensagem: resumoPessoa(response, item.pessoa_id as number) }))}>{loadingAction === "reprocessar_pessoa" ? "Processando matriculas..." : "Reprocessar matriculas da pessoa"}</Button> : null}
                <Button type="button" variant="secondary" disabled={!item.pode_registrar_pagamento || loadingAction !== null} onClick={() => { setDataPagamento(localTodayIso()); setMetodoPagamento("PIX"); setPagamentoOpen(true); }}>{loadingAction === "registrar_pagamento" ? "Registrando..." : "Registrar pagamento"}</Button>
                <button type="button" disabled={!item.pode_cancelar || loadingAction !== null} className="inline-flex items-center justify-center rounded-lg border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => { if (!window.confirm("Cancelar esta cobranca localmente?")) return; void executarAcao("cancelar", `/api/governanca/cobrancas/${item.id}/cancelar`, null).then((response) => response && setFeedback({ tipo: "sucesso", mensagem: `Cobranca #${item.id} cancelada localmente.` })); }}>{loadingAction === "cancelar" ? "Cancelando..." : "Cancelar cobranca"}</button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                {item.pode_cancelar ? "Cancelamento local liberado apenas porque nao ha NeoFin vinculado e nao ha recebimentos associados." : "Cancelamento local fica bloqueado quando existe pagamento, recebimento ou charge NeoFin vinculada."}
              </div>
            </Section>
          </div>
        ) : null}
      </div>

      {pagamentoOpen && item ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="text-base font-semibold text-slate-900">Registrar pagamento</h2><p className="mt-1 text-sm text-slate-600">{item.pessoa_label}</p><p className="text-sm text-slate-500">{item.descricao ?? item.origem_tipo ?? "Cobranca"}</p></div>
              <Button type="button" variant="secondary" onClick={() => setPagamentoOpen(false)} disabled={loadingAction === "registrar_pagamento"}>Fechar</Button>
            </div>
            <div className="mt-5 space-y-4">
              <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">Data do pagamento</span><input type="date" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10" value={dataPagamento} onChange={(event) => setDataPagamento(event.target.value)} disabled={loadingAction === "registrar_pagamento"} /></label>
              <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">Metodo</span><select className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" value={metodoPagamento} onChange={(event) => setMetodoPagamento(event.target.value === "DINHEIRO" ? "DINHEIRO" : "PIX")} disabled={loadingAction === "registrar_pagamento"}><option value="PIX">PIX</option><option value="DINHEIRO">Dinheiro</option></select></label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setPagamentoOpen(false)} disabled={loadingAction === "registrar_pagamento"}>Cancelar</Button>
              <Button type="button" disabled={loadingAction === "registrar_pagamento"} onClick={() => void executarAcao("registrar_pagamento", "/api/financeiro/cobrancas/registrar-pagamento-presencial", { cobranca_id: item.id, data_pagamento: dataPagamento, metodo_pagamento: metodoPagamento }).then((response) => { if (!response) return; setPagamentoOpen(false); setFeedback({ tipo: "sucesso", mensagem: `Pagamento registrado para a cobranca #${item.id}.` }); })}>{loadingAction === "registrar_pagamento" ? "Registrando..." : "Confirmar pagamento"}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
