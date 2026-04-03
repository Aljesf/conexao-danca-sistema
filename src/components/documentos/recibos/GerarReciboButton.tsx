"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shadcn/ui";
import { DocumentoEmissaoResultado } from "@/components/documentos/recibos/DocumentoEmissaoResultado";
import { DocumentoMetadadosCard } from "@/components/documentos/recibos/DocumentoMetadadosCard";
import { DocumentoRenderizacaoCard } from "@/components/documentos/recibos/DocumentoRenderizacaoCard";
import { DocumentoVariaveisAccordion } from "@/components/documentos/recibos/DocumentoVariaveisAccordion";
import { ReciboModal } from "@/components/documentos/ReciboModal";

type VariaveisAgrupadas = Record<string, Record<string, string>>;

type PreviewReciboResponse = {
  ok?: boolean;
  error?: string;
  operacao?: {
    codigo?: string | null;
    nome?: string | null;
  } | null;
  snapshot?: {
    recebimento_id?: number | null;
  } | null;
  modelo?: {
    id?: number | null;
    titulo?: string | null;
  } | null;
  htmlPreview?: string | null;
  html_preview?: string | null;
  preview_html?: string | null;
  cabecalho_html?: string | null;
  rodape_html?: string | null;
  variaveis_agrupadas?: VariaveisAgrupadas | null;
  variaveisAgrupadas?: VariaveisAgrupadas | null;
  metadadosRenderizacao?: {
    headerSource?: string | null;
    footerSource?: string | null;
    pageMarginMm?: number | null;
    headerHeightPx?: number | null;
    footerHeightPx?: number | null;
    usaFallbackLegado?: boolean | null;
  } | null;
  metadados_renderizacao?: {
    headerSource?: string | null;
    footerSource?: string | null;
    pageMarginMm?: number | null;
    headerHeightPx?: number | null;
    footerHeightPx?: number | null;
    usaFallbackLegado?: boolean | null;
  } | null;
};

type GerarReciboResponse = {
  ok?: boolean;
  error?: string;
  documentoEmitidoId?: number | null;
  documento_emitido_id?: number | null;
  previewUrl?: string | null;
  preview_url?: string | null;
  documentoUrl?: string | null;
  documento_url?: string | null;
  htmlPreview?: string | null;
  html_preview?: string | null;
  operacaoCodigo?: string | null;
  operacao_codigo?: string | null;
  origemTipo?: string | null;
  origem_tipo?: string | null;
  origemId?: string | null;
  origem_id?: string | null;
  modeloId?: number | null;
  modelo_id?: number | null;
  pdfDisponivel?: boolean | null;
  pdf_disponivel?: boolean | null;
  operacao?: {
    codigo?: string | null;
    nome?: string | null;
  } | null;
  metadadosRenderizacao?: PreviewReciboResponse["metadadosRenderizacao"];
  metadados_renderizacao?: PreviewReciboResponse["metadados_renderizacao"];
  variaveis_agrupadas?: VariaveisAgrupadas | null;
  variaveisAgrupadas?: VariaveisAgrupadas | null;
};

type NormalizedPreview = {
  htmlPreview: string | null;
  operacaoNome: string;
  operacaoCodigo: string;
  modeloTitulo: string;
  modeloId: string;
  origemTipo: string;
  origemId: string;
  pdfStatus: string;
  tipoRelacaoDocumental: string;
  variaveisAgrupadas: VariaveisAgrupadas;
  renderizacao: {
    headerSource: string;
    footerSource: string;
    bodySource: string;
    pageMargin: string;
    headerHeight: string;
    footerHeight: string;
    usaFallbackLegado: string;
  };
};

type NormalizedEmitResult = {
  documentoEmitidoId: string;
  documentoUrl: string | null;
  previewUrl: string | null;
  operacaoCodigo: string;
  operacaoNome: string;
  origemTipo: string;
  origemId: string;
  modeloId: string;
  pdfStatus: string;
  tipoRelacaoDocumental: string;
};

type Props = {
  recebimentoId: number | null;
  label?: string;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
};

function traduzirErro(error: string | null | undefined): string {
  switch (error) {
    case "recebimento_id_invalido":
      return "Recebimento invalido para emissao do recibo.";
    case "recebimento_nao_confirmado":
      return "O recibo so pode ser emitido para recebimento confirmado.";
    case "matricula_nao_resolvida":
      return "Nao foi possivel vincular o recibo a uma matricula com seguranca.";
    case "modelo_recibo_nao_encontrado":
    case "modelo_operacao_nao_encontrado":
      return "Nenhum modelo ativo de recibo foi encontrado.";
    case "operacao_documental_nao_encontrada":
      return "A operacao documental do recibo nao foi encontrada.";
    default:
      return error ?? "Nao foi possivel emitir o recibo agora.";
  }
}

function formatSource(value: string | null | undefined, fallback: string): string {
  const normalized = String(value ?? "").trim().toUpperCase();
  switch (normalized) {
    case "SEMANTICO":
      return "Componente semantico";
    case "SEMANTICO_LAYOUT_TEMPLATE":
      return "Componente semantico via template";
    case "LEGADO_TEMPLATE":
      return "Template legado";
    case "LEGADO_LAYOUT":
      return "Layout legado";
    case "MODELO_INLINE":
      return "Inline do modelo";
    case "AUSENTE":
      return "Nao informado";
    default:
      return fallback;
  }
}

function toGroupedRecord(value: unknown): VariaveisAgrupadas {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const grupos: VariaveisAgrupadas = {};

  for (const [grupo, rawValores] of Object.entries(value as Record<string, unknown>)) {
    if (!rawValores || typeof rawValores !== "object" || Array.isArray(rawValores)) continue;
    const valores: Record<string, string> = {};
    for (const [chave, rawValor] of Object.entries(rawValores as Record<string, unknown>)) {
      valores[chave] = typeof rawValor === "string" ? rawValor : String(rawValor ?? "");
    }
    grupos[grupo] = valores;
  }

  return grupos;
}

function wrapHtml(fragment: string): string {
  const trimmed = fragment.trim();
  if (!trimmed) return "";
  if (trimmed.toLowerCase().includes("<html")) return fragment;
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body>${fragment}</body></html>`;
}

function buildLegacyPreviewHtml(payload: PreviewReciboResponse): string | null {
  const body = payload.preview_html ?? "";
  const header = payload.cabecalho_html ?? "";
  const footer = payload.rodape_html ?? "";
  if (!body && !header && !footer) return null;

  return wrapHtml(`
    <main style="max-width:980px;margin:0 auto;padding:24px;font-family:Arial,sans-serif;background:#f8fafc;color:#0f172a;">
      ${header ? `<section style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;box-shadow:0 10px 30px rgba(15,23,42,0.08);margin-bottom:16px;">${header}</section>` : ""}
      <section style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;box-shadow:0 10px 30px rgba(15,23,42,0.08);">${body}</section>
      ${footer ? `<section style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;box-shadow:0 10px 30px rgba(15,23,42,0.08);margin-top:16px;">${footer}</section>` : ""}
    </main>
  `);
}

function normalizePreview(payload: PreviewReciboResponse | null, recebimentoId: number): NormalizedPreview | null {
  if (!payload) return null;

  const metadados = payload.metadadosRenderizacao ?? payload.metadados_renderizacao ?? null;
  const variaveisAgrupadas = toGroupedRecord(payload.variaveis_agrupadas ?? payload.variaveisAgrupadas ?? {});
  const htmlPreview = payload.htmlPreview ?? payload.html_preview ?? buildLegacyPreviewHtml(payload);

  return {
    htmlPreview,
    operacaoNome: payload.operacao?.nome?.trim() || "Operacao nao informada",
    operacaoCodigo: payload.operacao?.codigo?.trim() || "nao informado",
    modeloTitulo: payload.modelo?.titulo?.trim() || "Modelo nao informado",
    modeloId: payload.modelo?.id ? `#${payload.modelo.id}` : "nao informado",
    origemTipo: "RECEBIMENTO",
    origemId: payload.snapshot?.recebimento_id ? `#${payload.snapshot.recebimento_id}` : `#${recebimentoId}`,
    pdfStatus: "Nao informado",
    tipoRelacaoDocumental: "ORIGINAL (previsto)",
    variaveisAgrupadas,
    renderizacao: {
      headerSource: formatSource(metadados?.headerSource, "Nao informado"),
      footerSource: formatSource(metadados?.footerSource, "Nao informado"),
      bodySource: "Modelo documental ativo",
      pageMargin: metadados?.pageMarginMm ? `${metadados.pageMarginMm} mm` : "Nao informado",
      headerHeight: metadados?.headerHeightPx ? `${metadados.headerHeightPx}px` : "Nao informado",
      footerHeight: metadados?.footerHeightPx ? `${metadados.footerHeightPx}px` : "Nao informado",
      usaFallbackLegado:
        typeof metadados?.usaFallbackLegado === "boolean"
          ? metadados.usaFallbackLegado
            ? "Sim"
            : "Nao"
          : "Nao informado",
    },
  };
}

function normalizeEmitResult(payload: GerarReciboResponse | null, recebimentoId: number): NormalizedEmitResult | null {
  if (!payload) return null;
  const documentoEmitidoId = payload.documentoEmitidoId ?? payload.documento_emitido_id;
  if (!documentoEmitidoId) return null;

  return {
    documentoEmitidoId: `#${documentoEmitidoId}`,
    documentoUrl: payload.documentoUrl ?? payload.documento_url ?? (documentoEmitidoId ? `/admin/config/documentos/emitidos/${documentoEmitidoId}` : null),
    previewUrl:
      payload.previewUrl ??
      payload.preview_url ??
      `/api/documentos/recibos/recebimento/preview?recebimento_id=${recebimentoId}&render=1`,
    operacaoCodigo:
      payload.operacaoCodigo?.trim() ??
      payload.operacao_codigo?.trim() ??
      payload.operacao?.codigo?.trim() ??
      "nao informado",
    operacaoNome: payload.operacao?.nome?.trim() || "Operacao nao informada",
    origemTipo: payload.origemTipo?.trim() ?? payload.origem_tipo?.trim() ?? "RECEBIMENTO",
    origemId: payload.origemId?.trim() ?? payload.origem_id?.trim() ?? String(recebimentoId),
    modeloId: payload.modeloId || payload.modelo_id ? `#${payload.modeloId ?? payload.modelo_id}` : "nao informado",
    pdfStatus:
      typeof (payload.pdfDisponivel ?? payload.pdf_disponivel) === "boolean"
        ? payload.pdfDisponivel ?? payload.pdf_disponivel
          ? "Disponivel"
          : "PDF ainda nao gerado"
        : "Nao informado",
    tipoRelacaoDocumental: "ORIGINAL",
  };
}

export function GerarReciboButton({
  recebimentoId,
  label = "Gerar recibo",
  className,
  variant = "secondary",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [documentoId, setDocumentoId] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [documentoUrl, setDocumentoUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<NormalizedPreview | null>(null);
  const [resultadoEmissao, setResultadoEmissao] = useState<NormalizedEmitResult | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [reciboModalOpen, setReciboModalOpen] = useState(false);

  const disabled = !recebimentoId || loading;
  const previewHref = useMemo(() => {
    if (previewUrl) return previewUrl;
    return recebimentoId ? `/api/documentos/recibos/recebimento/preview?recebimento_id=${recebimentoId}&render=1` : null;
  }, [previewUrl, recebimentoId]);

  async function carregarPreview() {
    if (!recebimentoId) return;
    setPreviewLoading(true);
    setPreviewError(null);

    try {
      const res = await fetch(`/api/documentos/recibos/recebimento/preview?recebimento_id=${recebimentoId}`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as PreviewReciboResponse | null;
      if (!res.ok || !json?.ok) {
        setPreviewError(traduzirErro(json?.error));
        return;
      }

      setPreviewData(normalizePreview(json, recebimentoId));
      setPreviewOpen(true);
    } catch (requestError) {
      setPreviewError(requestError instanceof Error ? requestError.message : "Nao foi possivel carregar o preview agora.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function copiarIdDocumental() {
    if (!resultadoEmissao?.documentoEmitidoId) return;
    try {
      await navigator.clipboard.writeText(resultadoEmissao.documentoEmitidoId.replace("#", ""));
      setCopyMessage("ID documental copiado.");
      window.setTimeout(() => setCopyMessage(null), 2200);
    } catch {
      setCopyMessage("Nao foi possivel copiar o ID documental.");
      window.setTimeout(() => setCopyMessage(null), 2200);
    }
  }

  async function emitir() {
    if (!recebimentoId) return;
    setLoading(true);
    setError(null);
    setCopyMessage(null);

    try {
      const res = await fetch("/api/documentos/recibos/recebimento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recebimento_id: recebimentoId }),
      });
      const json = (await res.json().catch(() => null)) as GerarReciboResponse | null;
      if (!res.ok || !json?.ok) {
        setError(traduzirErro(json?.error));
        return;
      }

      const normalized = normalizeEmitResult(json, recebimentoId);
      setDocumentoId(json.documentoEmitidoId ?? json.documento_emitido_id ?? null);
      setPreviewUrl(json.previewUrl ?? json.preview_url ?? null);
      setDocumentoUrl(json.documentoUrl ?? json.documento_url ?? null);
      setResultadoEmissao(normalized);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Nao foi possivel emitir o recibo agora.");
    } finally {
      setLoading(false);
    }
  }

  if (!recebimentoId) return null;

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant={variant} disabled={disabled} onClick={() => void emitir()}>
          {loading ? "Gerando recibo..." : label}
        </Button>
        <Button type="button" variant="ghost" disabled={previewLoading} onClick={() => void carregarPreview()}>
          {previewLoading ? "Carregando preview..." : "Conferir preview"}
        </Button>
        {recebimentoId ? (
          <Button
            type="button"
            variant="ghost"
            className="text-xs"
            onClick={() => setReciboModalOpen(true)}
          >
            Ver recibo
          </Button>
        ) : null}
        {documentoId && documentoUrl ? (
          <Link
            className="text-xs font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-900"
            href={documentoUrl}
            target="_blank"
            rel="noreferrer"
          >
            Abrir documento #{documentoId}
          </Link>
        ) : null}
      </div>

      {error ? <div className="mt-2 text-xs text-rose-700">{error}</div> : null}
      {previewError ? <div className="mt-2 text-xs text-rose-700">{previewError}</div> : null}
      {copyMessage ? <div className="mt-2 text-xs text-slate-600">{copyMessage}</div> : null}

      {resultadoEmissao ? (
        <div className="mt-3">
          <DocumentoEmissaoResultado
            documentoEmitidoId={resultadoEmissao.documentoEmitidoId}
            operacaoCodigo={resultadoEmissao.operacaoCodigo}
            modeloId={resultadoEmissao.modeloId}
            origemTipo={resultadoEmissao.origemTipo}
            origemId={resultadoEmissao.origemId}
            pdfStatus={resultadoEmissao.pdfStatus}
            tipoRelacaoDocumental={resultadoEmissao.tipoRelacaoDocumental}
            documentoUrl={resultadoEmissao.documentoUrl}
            previewUrl={resultadoEmissao.previewUrl}
            onCopiarId={() => void copiarIdDocumental()}
            onAbrirPreviewInterno={() => void carregarPreview()}
          />
        </div>
      ) : null}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-6xl p-0">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle>Preview autenticado do recibo</DialogTitle>
              <DialogDescription>
                Visualizacao administrativa do documento final com operacao, modelo, origem e metadados de renderizacao.
              </DialogDescription>
            </DialogHeader>

            {!previewData ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Nenhum preview carregado.
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.9fr)]">
                  <Card className="border-slate-200 bg-white shadow-sm">
                    <CardContent className="p-0">
                      {previewData.htmlPreview ? (
                        <iframe
                          title="Preview do recibo"
                          className="h-[720px] w-full rounded-xl border-0 bg-white"
                          srcDoc={previewData.htmlPreview}
                        />
                      ) : (
                        <div className="p-6 text-sm text-slate-500">HTML final nao informado.</div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    <DocumentoMetadadosCard
                      operacaoNome={previewData.operacaoNome}
                      operacaoCodigo={previewData.operacaoCodigo}
                      modeloTitulo={previewData.modeloTitulo}
                      modeloId={previewData.modeloId}
                      origemTipo={previewData.origemTipo}
                      origemId={previewData.origemId}
                      pdfStatus={previewData.pdfStatus}
                      tipoRelacaoDocumental={previewData.tipoRelacaoDocumental}
                    />
                    <DocumentoRenderizacaoCard
                      headerSource={previewData.renderizacao.headerSource}
                      footerSource={previewData.renderizacao.footerSource}
                      bodySource={previewData.renderizacao.bodySource}
                      pageMargin={previewData.renderizacao.pageMargin}
                      headerHeight={previewData.renderizacao.headerHeight}
                      footerHeight={previewData.renderizacao.footerHeight}
                      usaFallbackLegado={previewData.renderizacao.usaFallbackLegado}
                    />
                  </div>
                </div>

                <DocumentoVariaveisAccordion grupos={previewData.variaveisAgrupadas} />

                <div className="flex flex-wrap justify-end gap-2">
                  {recebimentoId ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setPreviewOpen(false);
                        setReciboModalOpen(true);
                      }}
                    >
                      Ver recibo formatado
                    </Button>
                  ) : null}
                  <Button type="button" variant="secondary" disabled>
                    Reemissao na proxima etapa
                  </Button>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">
                      Fechar
                    </Button>
                  </DialogClose>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ReciboModal
        open={reciboModalOpen}
        onClose={() => setReciboModalOpen(false)}
        params={recebimentoId ? { tipo: "RECEBIMENTO", recebimento_id: recebimentoId } : null}
        title="Recibo de pagamento"
      />
    </div>
  );
}

export default GerarReciboButton;
