"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FaturaRow = { id: number; conta_conexao_id: number | null; periodo_referencia: string | null; data_fechamento: string | null; data_vencimento: string | null; status: string | null; valor_total_centavos: number | null; cobranca_id: number | null; neofin_invoice_id?: string | null; updated_at?: string | null };
type ContaRow = { id: number; tipo_conta: string | null; pessoa_titular_id: number | null; descricao_exibicao: string | null };
type PessoaRow = { id: number; nome: string | null; cpf: string | null; email: string | null };
type RecebimentosResumo = { quantidade: number; total_centavos: number; ultimo_pagamento: string | null; ultimo_recebimento_id: number | null };
type CobrancaResumo = { id: number; descricao: string | null; valor_centavos?: number | null; competencia_ano_mes?: string | null; vencimento: string | null; status: string | null; metodo_pagamento: string | null; origem_tipo: string | null; origem_subtipo: string | null; origem_id: number | null; neofin_charge_id: string | null; link_pagamento: string | null; linha_digitavel: string | null; neofin_payload?: Record<string, unknown> | null; recebimentos_resumo?: RecebimentosResumo };
type PagamentoExibivel = { cobranca_vinculada_id: number | null; cobranca_canonica_id: number | null; cobranca_exibida_id: number | null; usa_cobranca_canonica: boolean; invoice_valida: boolean; segunda_via_disponivel: boolean; tipo_exibicao: string; tipo_remoto: string | null; status_sincronizado: string | null; neofin_charge_id: string | null; invoice_id: string | null; integration_identifier: string | null; link_pagamento: string | null; link_pagamento_validado: boolean; link_pagamento_origem: "invoice_oficial_neofin" | "billing_oficial_neofin" | "parcela_oficial_neofin" | "billing_reconstruido_validado" | "link_local_validado" | "indisponivel"; correspondencia_confirmada: boolean; tipo_correspondencia: "invoice" | "billing" | "payment" | "installment" | "none"; payment_number: string | null; linha_digitavel: string | null; codigo_barras: string | null; pix_copia_cola: string | null; qr_code_url: string | null; qr_code_bruto: string | null; origem_dos_dados: "remoto" | "local" | "legado"; link_historico_informativo: boolean; charge_id_textual_legado: boolean; mensagem_operacional: string | null; observacao_validacao: string | null };
type LancamentoRow = { id: number; origem_sistema: string | null; descricao: string | null; valor_centavos: number | null; competencia: string | null; referencia_item: string | null; status: string | null; composicao_json: Record<string, unknown> | null; aluno_nome?: string | null; responsavel_financeiro_nome?: string | null; cobranca_fatura_id?: number | null };
type FaturaDetalheData = { fatura: FaturaRow; conta: ContaRow | null; pessoa: PessoaRow | null; lancamentos: LancamentoRow[]; cobranca_vinculada?: CobrancaResumo | null; cobranca_canonica?: CobrancaResumo | null; pagamento_exibivel?: PagamentoExibivel | null };
type FaturaDetalheResponse = { ok: boolean; data?: FaturaDetalheData; error?: string };
type ApiActionResponse = { ok?: boolean; error?: string; detail?: string | null; details?: { message?: string | null } | null; message?: string; cobranca_id?: number | null; neofin_charge_id?: string | null; neofin_invoice_id?: string | null; status_fatura?: string | null; vencimento_iso?: string | null };
type UltimaCobrancaState = { cobranca_id: number | null; neofin_charge_id: string | null; neofin_invoice_id: string | null; vencimento_iso: string | null; status_fatura: string | null } | null;
type ToastState = { tipo: "sucesso" | "erro"; mensagem: string } | null;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMPTY_LANCAMENTOS: LancamentoRow[] = [];
const SECONDARY_LINK_CLASS = "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 text-gray-900 hover:bg-gray-200 border";

const brl = (v: number | null | undefined) => (Number(v ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const todayIso = () => { const now = new Date(); const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000); return local.toISOString().slice(0, 10); };
const addDaysIso = (days: number) => { const base = new Date(); base.setDate(base.getDate() + days); const local = new Date(base.getTime() - base.getTimezoneOffset() * 60_000); return local.toISOString().slice(0, 10); };
const isIsoDate = (value: string) => ISO_DATE_RE.test(value) && new Date(`${value}T00:00:00`).toISOString().slice(0, 10) === value;
const formatDate = (value: string | null | undefined) => !value ? "-" : /^\d{4}-\d{2}-\d{2}/.test(value) ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR") : value;
const formatDateTime = (value: string | null | undefined) => !value ? "-" : Number.isNaN(new Date(value).getTime()) ? value : new Date(value).toLocaleString("pt-BR");
const formatCompetencia = (value: string | null | undefined) => !value || !/^\d{4}-\d{2}$/.test(value) ? value ?? "-" : new Date(Number(value.slice(0, 4)), Number(value.slice(5)) - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
const defaultVencimento = (atual: string | null | undefined) => atual && isIsoDate(atual) && atual >= todayIso() ? atual : addDaysIso(2);
const badgeClass = (status: string | null | undefined) => { const s = String(status ?? "").trim().toUpperCase(); if (["PAGA","PAGO","RECEBIDO","RECEBIDA"].includes(s)) return "border-emerald-200 bg-emerald-50 text-emerald-700"; if (s === "FECHADA") return "border-sky-200 bg-sky-50 text-sky-700"; if (s === "ABERTA") return "border-amber-200 bg-amber-50 text-amber-700"; if (s === "CANCELADA") return "border-slate-200 bg-slate-100 text-slate-700"; return "border-slate-200 bg-slate-50 text-slate-700"; };
const paymentOrigin = (value: "remoto" | "local" | "legado" | null | undefined) => value === "remoto" ? "NeoFin remoto" : value === "local" ? "Payload/local" : "Legado";
const paymentLinkOriginLabel = (value: PagamentoExibivel["link_pagamento_origem"] | null | undefined) => value === "invoice_oficial_neofin" ? "Oficial da invoice" : value === "billing_oficial_neofin" ? "Oficial do billing" : value === "parcela_oficial_neofin" ? "Oficial da parcela" : value === "billing_reconstruido_validado" ? "Billing reconstruido validado" : value === "link_local_validado" ? "Fallback local validado" : "Indisponivel";
const paymentLinkActionLabel = (value: PagamentoExibivel | null | undefined) => !value?.link_pagamento_validado ? "Abrir no NeoFin indisponivel" : value.link_historico_informativo ? "Abrir historico no NeoFin" : value.tipo_correspondencia === "payment" || value.tipo_correspondencia === "installment" ? "Abrir parcela no NeoFin" : "Abrir segunda via";
const previewPayload = (payload: Record<string, unknown> | null | undefined) => payload ? (JSON.stringify(payload, null, 2).slice(0, 4000) + (JSON.stringify(payload, null, 2).length > 4000 ? "..." : "")) : "Sem payload tecnico.";
const copyable = (value: string | null | undefined) => { const t = String(value ?? "").trim(); return t || null; };

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div><div className="mt-1 text-sm text-slate-900">{value}</div></div>;
}

function Box({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <Card className="border-slate-200 bg-white shadow-sm"><CardHeader className="pb-4"><CardTitle className="text-base text-slate-950">{title}</CardTitle>{subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}</CardHeader><CardContent className="space-y-4">{children}</CardContent></Card>;
}

async function copy(value: string, message: string, setToast: React.Dispatch<React.SetStateAction<ToastState>>) {
  try { await navigator.clipboard.writeText(value); setToast({ tipo: "sucesso", mensagem: message }); } catch (error) { setToast({ tipo: "erro", mensagem: error instanceof Error ? error.message : "Nao foi possivel copiar agora." }); }
}

export default function FaturaDetalhePage() {
  const params = useParams<{ id?: string | string[] }>();
  const router = useRouter();
  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const faturaId = Number(rawId);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FaturaDetalheData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalCobrancaOpen, setModalCobrancaOpen] = useState(false);
  const [modalFecharOpen, setModalFecharOpen] = useState(false);
  const [vencimentoGerar, setVencimentoGerar] = useState("");
  const [vencimentoFechar, setVencimentoFechar] = useState("");
  const [salvarPreferenciaGerar, setSalvarPreferenciaGerar] = useState(true);
  const [salvarPreferenciaFechar, setSalvarPreferenciaFechar] = useState(true);
  const [gerandoCobranca, setGerandoCobranca] = useState(false);
  const [fechandoFatura, setFechandoFatura] = useState(false);
  const [sincronizandoPagamento, setSincronizandoPagamento] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [ultimaCobranca, setUltimaCobranca] = useState<UltimaCobrancaState>(null);

  useEffect(() => { if (!toast) return; const timeout = window.setTimeout(() => setToast(null), 7000); return () => window.clearTimeout(timeout); }, [toast]);

  const carregarFatura = useCallback(async () => {
    if (!Number.isFinite(faturaId)) { setError("fatura_id_invalido"); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/credito-conexao/faturas/${faturaId}`, { cache: "no-store" });
      const json = (await res.json()) as FaturaDetalheResponse;
      if (!res.ok || !json?.ok) { setError(json?.error ?? "falha_carregar_fatura"); setData(null); return; }
      setData(json.data ?? null);
      if (json.data?.fatura?.cobranca_id && !ultimaCobranca) setUltimaCobranca({ cobranca_id: json.data.fatura.cobranca_id, neofin_charge_id: null, neofin_invoice_id: json.data.fatura.neofin_invoice_id ?? null, vencimento_iso: json.data.fatura.data_vencimento ?? null, status_fatura: json.data.fatura.status ?? null });
    } catch { setError("falha_inesperada"); setData(null); } finally { setLoading(false); }
  }, [faturaId, ultimaCobranca]);

  useEffect(() => { void carregarFatura(); }, [carregarFatura]);

  const fatura = data?.fatura ?? null;
  const lancamentos = data?.lancamentos ?? EMPTY_LANCAMENTOS;
  const pagamento = data?.pagamento_exibivel ?? null;
  const cobrancaCanonica = data?.cobranca_canonica ?? null;
  const cobrancaVinculada = data?.cobranca_vinculada ?? null;
  const invoiceValida = pagamento?.invoice_valida === true;
  const podeFechar = fatura?.status === "ABERTA";
  const somaLancamentos = useMemo(() => lancamentos.reduce((acc, row) => acc + Number(row.valor_centavos ?? 0), 0), [lancamentos]);
  const cobrancaId = pagamento?.cobranca_exibida_id ?? ultimaCobranca?.cobranca_id ?? fatura?.cobranca_id ?? null;

  async function sincronizarNeofin() {
    if (!cobrancaId) return;
    setSincronizandoPagamento(true); setToast(null);
    try {
      const res = await fetch(`/api/governanca/cobrancas/${cobrancaId}/sincronizar-neofin`, { method: "POST" });
      const json = (await res.json().catch(() => null)) as ApiActionResponse | null;
      if (!res.ok || !json?.ok) { setToast({ tipo: "erro", mensagem: json?.detail ?? json?.message ?? json?.error ?? "Nao foi possivel sincronizar agora." }); return; }
      setToast({ tipo: "sucesso", mensagem: `Sincronizacao concluida para a cobranca #${cobrancaId}.` }); await carregarFatura();
    } catch (e) { setToast({ tipo: "erro", mensagem: e instanceof Error ? e.message : "Falha inesperada ao sincronizar." }); } finally { setSincronizandoPagamento(false); }
  }

  async function executarAcao(tipo: "fechar" | "gerar") {
    if (!Number.isFinite(faturaId)) return;
    const vencimento = tipo === "fechar" ? vencimentoFechar : vencimentoGerar;
    const salvar = tipo === "fechar" ? salvarPreferenciaFechar : salvarPreferenciaGerar;
    if (!isIsoDate(vencimento) || vencimento < todayIso()) { setToast({ tipo: "erro", mensagem: "Informe um vencimento valido de hoje em diante." }); return; }
    const dia = Number(vencimento.split("-")[2] ?? 0);
    if (salvar && dia > 28) { setToast({ tipo: "erro", mensagem: "Para salvar preferencia, o dia deve ficar entre 1 e 28." }); return; }
    if (tipo === "fechar") setFechandoFatura(true); else setGerandoCobranca(true);
    try {
      const res = await fetch(`/api/financeiro/credito-conexao/faturas/${faturaId}/${tipo === "fechar" ? "fechar" : "gerar-cobranca"}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ vencimento_iso: vencimento, salvar_preferencia: salvar, dia_vencimento: salvar ? dia : undefined, force: false }) });
      const json = (await res.json().catch(() => null)) as ApiActionResponse | null;
      if (!res.ok || !json?.ok) { setToast({ tipo: "erro", mensagem: `[${res.status}] ${json?.detail ?? json?.message ?? json?.error ?? "Falha na operacao."}` }); return; }
      setUltimaCobranca({ cobranca_id: json.cobranca_id ?? null, neofin_charge_id: json.neofin_charge_id ?? null, neofin_invoice_id: json.neofin_invoice_id ?? null, vencimento_iso: json.vencimento_iso ?? null, status_fatura: json.status_fatura ?? null });
      setToast({ tipo: "sucesso", mensagem: json.message ?? `Operacao concluida para a cobranca #${json.cobranca_id ?? "-"}.` });
      if (tipo === "fechar") setModalFecharOpen(false); else setModalCobrancaOpen(false);
      router.refresh(); await carregarFatura();
    } catch (e) { setToast({ tipo: "erro", mensagem: e instanceof Error ? e.message : "Falha inesperada." }); } finally { if (tipo === "fechar") setFechandoFatura(false); else setGerandoCobranca(false); }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(226,232,240,0.8),_transparent_45%),linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <Card className="border-slate-200 bg-white/95 shadow-sm"><CardContent className="space-y-6 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Conta interna do aluno</p><h1 className="mt-2 text-3xl font-semibold text-slate-950">Fatura da conta interna</h1><p className="mt-2 text-sm text-slate-600">Leitura operacional da fatura, do pagamento NeoFin e da cobranca oficial vinculada.</p></div>
            <div className="flex flex-wrap gap-2">{podeFechar && !invoiceValida ? <Button onClick={() => { setVencimentoFechar(defaultVencimento(fatura?.data_vencimento)); setModalFecharOpen(true); }}>Fechar fatura</Button> : null}{!invoiceValida ? <Button variant="secondary" onClick={() => { setVencimentoGerar(defaultVencimento(fatura?.data_vencimento)); setModalCobrancaOpen(true); }}>Gerar cobranca agora</Button> : null}{pagamento?.link_pagamento_validado && pagamento.link_pagamento ? <a href={pagamento.link_pagamento} target="_blank" rel="noreferrer" className={SECONDARY_LINK_CLASS}>{paymentLinkActionLabel(pagamento)}</a> : pagamento ? <Button variant="secondary" disabled>{paymentLinkActionLabel(pagamento)}</Button> : null}{cobrancaId ? <Button variant="secondary" onClick={() => void sincronizarNeofin()} disabled={sincronizandoPagamento}>{sincronizandoPagamento ? "Sincronizando..." : "Sincronizar NeoFin"}</Button> : null}<Button variant="secondary" onClick={() => router.back()}>Voltar</Button><Button variant="secondary" onClick={() => void carregarFatura()}>Recarregar</Button></div>
          </div>
          {toast ? <div className={`rounded-2xl border px-4 py-3 text-sm ${toast.tipo === "erro" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{toast.mensagem}</div> : null}
          {loading ? <div className="text-sm text-slate-500">Carregando detalhes da fatura...</div> : error ? <div className="text-sm text-rose-700">{error}</div> : !fatura ? <div className="text-sm text-slate-500">Fatura nao encontrada.</div> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">ID da fatura</div><div className="mt-2 text-2xl font-semibold text-slate-950">#{fatura.id}</div><div className="mt-1 text-sm text-slate-500">{formatCompetencia(fatura.periodo_referencia)}</div></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Titular</div><div className="mt-2 text-lg font-semibold text-slate-950">{data?.pessoa?.nome ?? "-"}</div><div className="mt-1 text-sm text-slate-500">Conta interna do aluno: {data?.conta?.descricao_exibicao ?? "-"}</div></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</div><div className="mt-2"><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(fatura.status)}`}>{fatura.status ?? "SEM STATUS"}</span></div><div className="mt-2 text-sm text-slate-500">Fechamento: {formatDate(fatura.data_fechamento)}</div></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Valor</div><div className="mt-2 text-2xl font-semibold text-slate-950">{brl(fatura.valor_total_centavos)}</div><div className="mt-1 text-sm text-slate-500">Soma dos lancamentos: {brl(somaLancamentos)}</div></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Tipo de pagamento exibido</div><div className="mt-2 text-lg font-semibold text-slate-950">{pagamento?.tipo_exibicao ?? "Nao informado"}</div><div className="mt-1 text-sm text-slate-500">Vencimento: {formatDate(ultimaCobranca?.vencimento_iso ?? fatura.data_vencimento)}</div></div></div>}
        </CardContent></Card>

        {!loading && !error && fatura ? <>
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Box title="Pagamento" subtitle="Dados resolvidos da invoice NeoFin ou do payload local.">
              <div className="grid gap-4 md:grid-cols-2">
                <Info label="Tipo exibicao" value={pagamento?.tipo_exibicao ?? "-"} />
                <Info label="Status sincronizado" value={<span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(pagamento?.status_sincronizado)}`}>{pagamento?.status_sincronizado ?? "-"}</span>} />
                <Info label="Invoice NeoFin" value={pagamento?.invoice_id ?? "-"} />
                <Info label="Charge resolvido" value={pagamento?.neofin_charge_id ?? "-"} />
                <Info label="Origem dos dados" value={paymentOrigin(pagamento?.origem_dos_dados)} />
                <Info label="Origem do link" value={paymentLinkOriginLabel(pagamento?.link_pagamento_origem)} />
                <Info label="Correspondencia confirmada" value={pagamento?.correspondencia_confirmada ? "Sim" : "Nao"} />
                <Info label="Tipo de correspondencia" value={pagamento?.tipo_correspondencia ?? "-"} />
                <Info label="Payment number" value={pagamento?.payment_number ?? "-"} />
                <Info label="Segunda via disponivel" value={pagamento?.segunda_via_disponivel ? "Sim" : pagamento?.link_historico_informativo ? "Historico" : "Nao"} />
              </div>
              <div className="flex flex-wrap gap-2">
                {pagamento?.link_pagamento_validado && pagamento.link_pagamento ? <a href={pagamento.link_pagamento} target="_blank" rel="noreferrer" className={SECONDARY_LINK_CLASS}>{paymentLinkActionLabel(pagamento)}</a> : <Button variant="secondary" disabled>Abrir no NeoFin indisponivel</Button>}
                {copyable(pagamento?.linha_digitavel) ? <Button variant="secondary" onClick={() => void copy(pagamento?.linha_digitavel as string, "Linha digitavel copiada.", setToast)}>Copiar linha digitavel</Button> : null}
                {copyable(pagamento?.pix_copia_cola) ? <Button variant="secondary" onClick={() => void copy(pagamento?.pix_copia_cola as string, "Pix copia e cola copiado.", setToast)}>Copiar Pix</Button> : null}
                {pagamento?.qr_code_url ? <a href={pagamento.qr_code_url} target="_blank" rel="noreferrer" className={SECONDARY_LINK_CLASS}>Abrir QR Pix</a> : null}
              </div>
              {pagamento?.mensagem_operacional ? <div className={`rounded-2xl border px-4 py-3 text-sm ${pagamento.correspondencia_confirmada ? pagamento.link_historico_informativo ? "border-amber-200 bg-amber-50 text-amber-800" : "border-sky-200 bg-sky-50 text-sky-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{pagamento.mensagem_operacional}</div> : null}
              <div className="grid gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Link de pagamento validado</div><div className="mt-2 break-all text-sm text-slate-900">{pagamento?.link_pagamento ?? "-"}</div></div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Linha digitavel</div><div className="mt-2 break-all font-mono text-sm text-slate-900">{pagamento?.linha_digitavel ?? "-"}</div></div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Codigo de barras</div><div className="mt-2 break-all font-mono text-sm text-slate-900">{pagamento?.codigo_barras ?? "-"}</div></div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Pix copia e cola</div><div className="mt-2 break-all font-mono text-sm text-slate-900">{pagamento?.pix_copia_cola ?? "-"}</div></div>
                {pagamento?.qr_code_url ? <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">QR Pix</div><div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3"><Image src={pagamento.qr_code_url} alt="QR Pix da fatura" width={320} height={320} unoptimized loader={() => pagamento.qr_code_url ?? ""} className="mx-auto max-h-72 w-full max-w-xs object-contain" /></div></div> : null}
              </div>
              {invoiceValida ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">A cobranca oficial da fatura ja possui invoice valida. A geracao manual fica bloqueada para evitar duplicidade externa.</div> : null}
            </Box>

            <Box title="Cobranca oficial da fatura" subtitle="Fonte oficial vinculada a fatura para pagamento e recebimentos.">
              <div className="grid gap-4 md:grid-cols-2"><Info label="ID da cobranca" value={cobrancaCanonica ? `#${cobrancaCanonica.id}` : "-"} /><Info label="Competencia" value={formatCompetencia(cobrancaCanonica?.competencia_ano_mes ?? fatura.periodo_referencia)} /><Info label="Descricao" value={cobrancaCanonica?.descricao ?? "-"} /><Info label="Metodo pagamento" value={cobrancaCanonica?.metodo_pagamento ?? "-"} /><Info label="Origem tipo" value={cobrancaCanonica?.origem_tipo ?? "-"} /><Info label="Origem ID" value={cobrancaCanonica?.origem_id ? `#${cobrancaCanonica.origem_id}` : "-"} /><Info label="Status local" value={cobrancaCanonica?.status ?? "-"} /><Info label="Status remoto" value={pagamento?.status_sincronizado ?? "-"} /><Info label="Recebimentos vinculados" value={cobrancaCanonica?.recebimentos_resumo?.quantidade ?? 0} /><Info label="Total recebido" value={brl(cobrancaCanonica?.recebimentos_resumo?.total_centavos)} /></div>
              {pagamento?.usa_cobranca_canonica && pagamento.cobranca_vinculada_id && pagamento.cobranca_vinculada_id !== pagamento.cobranca_canonica_id ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">A fatura ainda aponta localmente para a cobranca #{pagamento.cobranca_vinculada_id}, mas a tela prioriza a cobranca oficial #{pagamento.cobranca_canonica_id}.</div> : null}
              {cobrancaId ? <div className="flex flex-wrap gap-2"><Link className={SECONDARY_LINK_CLASS} href={`/admin/governanca/cobrancas/${cobrancaId}`}>Abrir detalhe da cobranca</Link></div> : null}
            </Box>
          </div>

          <Box title="Lancamentos vinculados a fatura" subtitle="Leitura humana da composicao, com JSON tecnico apenas em modo expandido.">
            {lancamentos.length === 0 ? <div className="text-sm text-slate-500">Nenhum lancamento vinculado a esta fatura.</div> : <div className="space-y-4">{lancamentos.map((l) => { const itens = Array.isArray(l.composicao_json?.itens) ? l.composicao_json.itens.filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item)) : []; return <div key={l.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-base font-semibold text-slate-950">{l.descricao ?? "Lancamento"}</div><div className="mt-1 text-sm text-slate-600">{formatCompetencia(l.competencia)} | {l.aluno_nome ?? "Aluno nao identificado"} | {l.responsavel_financeiro_nome ?? "Responsavel nao identificado"}</div><div className="text-xs text-slate-500">ID #{l.id} | Origem: {l.origem_sistema ?? "-"} | Status: {l.status ?? "-"}</div></div><div className="text-right"><div className="text-lg font-semibold text-slate-950">{brl(l.valor_centavos)}</div><div className="text-xs text-slate-500">Ref. {l.cobranca_fatura_id ? `cobranca #${l.cobranca_fatura_id}` : l.referencia_item ?? "-"}</div></div></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Info label="Fonte" value={typeof l.composicao_json?.fonte === "string" ? l.composicao_json.fonte : "-"} /><Info label="Competencia" value={formatCompetencia(l.competencia)} /><Info label="Aluno" value={l.aluno_nome ?? "-"} /><Info label="Responsavel" value={l.responsavel_financeiro_nome ?? "-"} /></div>{itens.length > 0 ? <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Itens da composicao</div><div className="mt-3 space-y-3">{itens.map((item, index) => <div key={`${l.id}-${index}`} className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3"><div><div className="font-medium text-slate-950">{typeof item.descricao === "string" ? item.descricao : l.descricao ?? "Item"}</div><div className="text-xs text-slate-500">{typeof item.turma_id === "number" ? `Turma #${item.turma_id}` : "Sem turma vinculada"}</div></div><div className="text-sm font-semibold text-slate-950">{brl(typeof item.valor_centavos === "number" ? item.valor_centavos : 0)}</div></div>)}</div></div> : null}<details className="mt-4 rounded-2xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer text-sm font-medium text-slate-900">Ver JSON tecnico</summary><pre className="mt-3 max-h-80 overflow-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-700">{JSON.stringify(l.composicao_json ?? {}, null, 2)}</pre></details></div>; })}</div>}
          </Box>

          <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><summary className="cursor-pointer text-base font-semibold text-slate-950">Auditoria tecnica</summary><div className="mt-5 space-y-5"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Info label="Conta interna" value={fatura.conta_conexao_id ? `#${fatura.conta_conexao_id}` : "-"} /><Info label="Cobranca vinculada legada" value={cobrancaVinculada ? `#${cobrancaVinculada.id}` : "-"} /><Info label="Integration identifier" value={pagamento?.integration_identifier ?? "-"} /><Info label="Charge textual legado" value={pagamento?.charge_id_textual_legado ? "Sim" : "Nao"} /></div><div className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Payload da cobranca canonica</div><pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-white p-3 text-xs text-slate-700">{previewPayload(cobrancaCanonica?.neofin_payload)}</pre></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Payload da cobranca vinculada</div><pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-white p-3 text-xs text-slate-700">{previewPayload(cobrancaVinculada?.neofin_payload)}</pre></div></div><div className="text-sm text-slate-600">Atualizado em {formatDateTime(fatura.updated_at)}. Origem de exibicao do pagamento: {paymentOrigin(pagamento?.origem_dos_dados)}. Origem do link: {paymentLinkOriginLabel(pagamento?.link_pagamento_origem)}.</div></div></details>
        </> : null}
      </div>

      {modalFecharOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"><div className="w-full max-w-md rounded-xl border bg-white p-4 shadow-lg"><h2 className="text-base font-semibold">Fechar fatura</h2><p className="mt-1 text-sm text-muted-foreground">Defina um vencimento futuro para fechar a fatura e tratar a cobranca oficial vinculada.</p><div className="mt-4 space-y-3"><label className="block text-sm"><span className="mb-1 block">Data de vencimento</span><input type="date" className="w-full rounded-md border px-3 py-2" value={vencimentoFechar} min={todayIso()} onChange={(e) => setVencimentoFechar(e.target.value)} disabled={fechandoFatura} /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={salvarPreferenciaFechar} onChange={(e) => setSalvarPreferenciaFechar(e.target.checked)} disabled={fechandoFatura} />Salvar como preferencia (dia)</label></div><div className="mt-4 flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalFecharOpen(false)} disabled={fechandoFatura}>Cancelar</Button><Button onClick={() => void executarAcao("fechar")} disabled={fechandoFatura}>{fechandoFatura ? "Fechando..." : "Confirmar fechamento"}</Button></div></div></div> : null}
      {modalCobrancaOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"><div className="w-full max-w-md rounded-xl border bg-white p-4 shadow-lg"><h2 className="text-base font-semibold">Gerar cobranca agora</h2><p className="mt-1 text-sm text-muted-foreground">Defina a data de vencimento manual para esta operacao.</p><div className="mt-4 space-y-3"><label className="block text-sm"><span className="mb-1 block">Data de vencimento</span><input type="date" className="w-full rounded-md border px-3 py-2" value={vencimentoGerar} min={todayIso()} onChange={(e) => setVencimentoGerar(e.target.value)} disabled={gerandoCobranca} /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={salvarPreferenciaGerar} onChange={(e) => setSalvarPreferenciaGerar(e.target.checked)} disabled={gerandoCobranca} />Salvar como preferencia (dia)</label></div><div className="mt-4 flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalCobrancaOpen(false)} disabled={gerandoCobranca}>Cancelar</Button><Button onClick={() => void executarAcao("gerar")} disabled={gerandoCobranca}>{gerandoCobranca ? "Gerando..." : "Confirmar"}</Button></div></div></div> : null}
    </div>
  );
}
