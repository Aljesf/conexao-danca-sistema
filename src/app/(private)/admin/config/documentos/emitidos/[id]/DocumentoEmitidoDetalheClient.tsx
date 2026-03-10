"use client";

import React from "react";
import Link from "next/link";
import CadeiaDocumentalCard from "@/components/documentos/emitidos/CadeiaDocumentalCard";
import ReemitirDocumentoButton, {
  type ReemissaoSuccessPayload,
} from "@/components/documentos/emitidos/ReemitirDocumentoButton";
import { RichTextEditor } from "@/components/ui/RichTextEditor/RichTextEditor";
import { decodeHtmlEntities } from "@/lib/documentos/renderHtml";

type DocEmitido = {
  id: number;
  matricula_id: number | null;
  contrato_modelo_id?: number | null;
  documento_modelo_id?: number | null;
  status_assinatura?: string | null;
  status?: string | null;
  pdf_url?: string | null;
  conteudo_renderizado_md?: string | null;
  conteudo_resolvido_html?: string | null;
  conteudo_template_html?: string | null;
  header_html?: string | null;
  footer_html?: string | null;
  header_height_px?: number | null;
  footer_height_px?: number | null;
  page_margin_mm?: number | null;
  cabecalho_html?: string | null;
  rodape_html?: string | null;
  editado_manual?: boolean;
  operacao_id?: number | null;
  origem_tipo?: string | null;
  origem_id?: string | null;
  documento_origem_id?: number | null;
  motivo_reemissao?: string | null;
  tipo_relacao_documental?: string | null;
  variaveis_utilizadas_json?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string | null;
};

type ApiResp<T> = { ok?: boolean; data?: T; message?: string; debug?: unknown; html?: string };

type ViewMode = "stored" | "raw" | "resolved";

function resolveConteudoPersistido(doc: DocEmitido | null): { html: string; source: string; usedFallback: boolean } {
  if (!doc) {
    return { html: "<p></p>", source: "nao informado", usedFallback: true };
  }

  if (typeof doc.conteudo_resolvido_html === "string" && doc.conteudo_resolvido_html.trim()) {
    return {
      html: doc.conteudo_resolvido_html,
      source: "conteudo_resolvido_html",
      usedFallback: false,
    };
  }

  if (typeof doc.conteudo_renderizado_md === "string" && doc.conteudo_renderizado_md.trim()) {
    return {
      html: doc.conteudo_renderizado_md,
      source: "conteudo_renderizado_md",
      usedFallback: false,
    };
  }

  if (typeof doc.conteudo_template_html === "string" && doc.conteudo_template_html.trim()) {
    return {
      html: doc.conteudo_template_html,
      source: "conteudo_template_html",
      usedFallback: true,
    };
  }

  return { html: "<p></p>", source: "nao informado", usedFallback: true };
}

export default function DocumentoEmitidoDetalheClient({ id }: { id: string }) {
  const docId = Number(id);

  const [doc, setDoc] = React.useState<DocEmitido | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  const [modoEditar, setModoEditar] = React.useState(false);
  const [html, setHtml] = React.useState<string>("");
  const [rawHtml, setRawHtml] = React.useState<string>("");
  const [resolvedHtml, setResolvedHtml] = React.useState<string>("");
  const [viewMode, setViewMode] = React.useState<ViewMode>("stored");
  const [previewLoadingMode, setPreviewLoadingMode] = React.useState<"raw" | "resolved" | null>(null);
  const [salvando, setSalvando] = React.useState(false);
  const [okMsg, setOkMsg] = React.useState<string | null>(null);
  const [debug, setDebug] = React.useState<unknown>(null);
  const [fonteVisualizacao, setFonteVisualizacao] = React.useState<string>("nao informado");
  const [visualizacaoEmFallback, setVisualizacaoEmFallback] = React.useState(false);
  const [reemissaoResult, setReemissaoResult] = React.useState<ReemissaoSuccessPayload | null>(null);

  type LoadOptions = {
    preserveDraftHtml?: boolean;
    preserveRawHtml?: boolean;
    preserveResolvedHtml?: boolean;
  };
  const shouldDecodeHtml = React.useCallback((raw: string) => {
    const trimmed = raw.trimStart();
    return trimmed.startsWith("&lt;") || raw.includes("&lt;h");
  }, []);
  const maybeDecodeHtml = React.useCallback(
    (raw: string) => (shouldDecodeHtml(raw) ? decodeHtmlEntities(raw) : raw),
    [shouldDecodeHtml],
  );
  const previewLoading = previewLoadingMode !== null;

  async function carregar(options?: LoadOptions) {
    setErro(null);
    setOkMsg(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/documentos/emitidos/${docId}`, { cache: "no-store" });
      const json = (await res.json()) as ApiResp<DocEmitido>;
      if (!res.ok || !json.ok || !json.data) {
        throw new Error(json.message || "Falha ao carregar documento emitido.");
      }
      const persisted = resolveConteudoPersistido(json.data);
      const baseHtml = maybeDecodeHtml(persisted.html) ?? "<p></p>";
      setDoc(json.data);
      setFonteVisualizacao(persisted.source);
      setVisualizacaoEmFallback(persisted.usedFallback);
      if (!options?.preserveDraftHtml) {
        setHtml(baseHtml);
      }
      if (!options?.preserveRawHtml) {
        setRawHtml("");
      }
      if (!options?.preserveResolvedHtml) {
        setResolvedHtml("");
        setViewMode(persisted.usedFallback ? "raw" : "stored");
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  async function verModeloSemDados(): Promise<boolean> {
    setErro(null);
    setOkMsg(null);
    setDebug(null);
    setPreviewLoadingMode("raw");
    try {
      const res = await fetch(`/api/documentos/emitidos/${docId}?mode=raw`, { cache: "no-store" });
      const json = (await res.json()) as ApiResp<DocEmitido>;
      if (!res.ok || !json.ok || !json.data) {
        throw new Error(json.message || "Falha ao carregar modelo sem dados.");
      }
      const fallbackRaw =
        typeof json.html === "string"
          ? json.html
          : json.data.conteudo_template_html ||
            json.data.conteudo_renderizado_md ||
            json.data.conteudo_resolvido_html ||
            "<p></p>";
      const rawDecoded = maybeDecodeHtml(fallbackRaw) ?? "";
      setRawHtml(rawDecoded);
      setDoc(json.data);
      setFonteVisualizacao("conteudo_template_html");
      setVisualizacaoEmFallback(true);
      setViewMode("raw");
      return true;
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
      return false;
    } finally {
      setPreviewLoadingMode(null);
    }
  }

  async function verComDadosResolver(): Promise<boolean> {
    setErro(null);
    setOkMsg(null);
    setDebug(null);
    setPreviewLoadingMode("resolved");
    try {
      const res = await fetch(`/api/documentos/emitidos/${docId}?mode=resolved`, { cache: "no-store" });
      const json = (await res.json()) as ApiResp<DocEmitido>;
      if (!res.ok || !json.ok) {
        throw new Error(json.message || "Falha ao resolver documento.");
      }
      const resolvedDecoded = typeof json.html === "string" ? maybeDecodeHtml(json.html) ?? "" : "";
      setResolvedHtml(resolvedDecoded);
      if (json.data) {
        setDoc(json.data);
      }
      setFonteVisualizacao("reconstrucao em tempo real");
      setVisualizacaoEmFallback(false);
      setViewMode("resolved");
      if (json.debug) {
        setDebug(json.debug);
      }
      return true;
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
      return false;
    } finally {
      setPreviewLoadingMode(null);
    }
  }

  React.useEffect(() => {
    if (!Number.isFinite(docId) || docId <= 0) {
      setErro("ID invalido.");
      return;
    }
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  async function salvarEdicao() {
    setErro(null);
    setOkMsg(null);
    setSalvando(true);
    try {
      const res = await fetch(`/api/documentos/emitidos/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conteudo_resolvido_html: html }),
      });
      const json = (await res.json()) as ApiResp<unknown>;
      if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao salvar edicao.");
      setOkMsg("Documento atualizado (edicao manual).");
      setModoEditar(false);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setSalvando(false);
    }
  }

  async function imprimirComoPdf() {
    const precisaResolver = !(viewMode === "resolved" && resolvedHtml.trim());
    if (precisaResolver) {
      const ok = await verComDadosResolver();
      if (!ok) return;
    }
    requestAnimationFrame(() => {
      document.body.classList.add("print-mode");
      window.print();
    });
  }

  React.useEffect(() => {
    function onAfterPrint() {
      document.body.classList.remove("print-mode");
    }
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, []);

  const modeloId = doc?.documento_modelo_id ?? doc?.contrato_modelo_id ?? "-";
  const status = doc?.status_assinatura ?? doc?.status ?? "-";
  const pdfUrl = doc?.pdf_url?.trim() ? doc.pdf_url : doc ? `/api/documentos/emitidos/${doc.id}/pdf` : null;
  const headerHtml = maybeDecodeHtml(doc?.header_html ?? doc?.cabecalho_html ?? "");
  const footerHtml = maybeDecodeHtml(doc?.footer_html ?? doc?.rodape_html ?? "");
  const headerHeightValue = Number(doc?.header_height_px);
  const footerHeightValue = Number(doc?.footer_height_px);
  const pageMarginValue = Number(doc?.page_margin_mm);
  const headerHeightPx = Number.isFinite(headerHeightValue) && headerHeightValue > 0 ? headerHeightValue : 120;
  const footerHeightPx = Number.isFinite(footerHeightValue) && footerHeightValue > 0 ? footerHeightValue : 80;
  const pageMarginMm = Number.isFinite(pageMarginValue) && pageMarginValue > 0 ? pageMarginValue : 10;
  const headerTrimmed = headerHtml.trim();
  const footerTrimmed = footerHtml.trim();
  const hasHeader = headerTrimmed.length > 0 && headerTrimmed.toLowerCase() !== "sem header";
  const hasFooter = footerTrimmed.length > 0 && footerTrimmed.toLowerCase() !== "sem footer";
  const headerEffectivePx = hasHeader ? headerHeightPx : 0;
  const footerEffectivePx = hasFooter ? footerHeightPx : 0;
  const printVars = {
    "--header-height-px": `${headerEffectivePx}px`,
    "--footer-height-px": `${footerEffectivePx}px`,
    "--page-margin-mm": `${pageMarginMm}mm`,
  } as React.CSSProperties;
  const previewConteudoRaw =
    (rawHtml && rawHtml.trim().length > 0 ? rawHtml : "") ||
    doc?.conteudo_template_html ||
    html ||
    doc?.conteudo_renderizado_md ||
    doc?.conteudo_resolvido_html ||
    "<p>(sem conteudo)</p>";
  const previewConteudoStored =
    (html && html.trim().length > 0 ? html : "") ||
    doc?.conteudo_resolvido_html ||
    doc?.conteudo_renderizado_md ||
    previewConteudoRaw;
  const previewConteudoResolved =
    resolvedHtml && resolvedHtml.trim().length > 0 ? resolvedHtml : previewConteudoStored;
  const previewConteudo =
    viewMode === "raw" ? previewConteudoRaw : viewMode === "resolved" ? previewConteudoResolved : previewConteudoStored;
  const resolvedHasPlaceholders =
    viewMode !== "raw" && previewConteudo.includes("{{");
  const colecoesVazias = React.useMemo(() => {
    const raw = doc?.variaveis_utilizadas_json;
    if (!raw || typeof raw !== "object") return [];
    const rec = raw as Record<string, unknown>;
    const list = rec.__colecoes_vazias;
    if (!Array.isArray(list)) return [];
    return list.map((item) => String(item)).filter(Boolean);
  }, [doc]);
  const colecoesDetectadas = React.useMemo(() => {
    const raw = doc?.variaveis_utilizadas_json;
    if (!raw || typeof raw !== "object") return [];
    const rec = raw as Record<string, unknown>;
    const list = rec.__colecoes_detectadas;
    if (!Array.isArray(list)) return [];
    return list.map((item) => String(item)).filter(Boolean);
  }, [doc]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="doc-print-shell mx-auto flex max-w-6xl flex-col gap-6">
        <div className="no-print rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Documento emitido #{docId}</h1>
          <p className="mt-1 text-sm text-slate-600">
            Visualizacao final do emitido, com acoes administrativas e resumo documental consolidado logo abaixo.
          </p>
        </div>

        {erro ? (
          <div className="no-print rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{erro}</div>
        ) : null}
        {okMsg ? (
          <div className="no-print rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {okMsg}
          </div>
        ) : null}
        {debug ? (
          <details className="no-print rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <summary className="cursor-pointer font-medium">Debug (recarregar)</summary>
            <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
              {JSON.stringify(debug, null, 2)}
            </pre>
            <div className="mt-3 text-xs text-slate-200">
              <div className="font-semibold text-slate-100">Preview (primeiros 300 chars)</div>
              <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
                {previewConteudo.slice(0, 300)}
              </pre>
            </div>
          </details>
        ) : null}
        {colecoesDetectadas.length > 0 && colecoesVazias.length > 0 ? (
          <div className="no-print rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Colecoes sem dados: {colecoesVazias.join(", ")}. Verifique se o modelo usa a colecao correta para a
            matricula.
          </div>
        ) : null}
        {resolvedHasPlaceholders ? (
          <div className="no-print rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Algumas variaveis nao foram resolvidas.
          </div>
        ) : null}

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          {loading || !doc ? (
            <p className="text-sm text-slate-500">Carregando...</p>
          ) : (
            <div className="space-y-3">
              <CadeiaDocumentalCard
                documentoEmitidoId={doc.id}
                tipoRelacaoDocumental={doc.tipo_relacao_documental}
                documentoOrigemId={doc.documento_origem_id}
                motivoReemissao={doc.motivo_reemissao}
                operacaoId={doc.operacao_id}
                origemTipo={doc.origem_tipo}
                origemId={doc.origem_id}
                pdfUrl={pdfUrl}
              />

              {reemissaoResult ? (
                <div className="no-print rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  <div className="font-semibold">Novo documento reemitido com sucesso</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-emerald-800">
                    <span>Documento #{reemissaoResult.novoDocumentoEmitidoId}</span>
                    <span>•</span>
                    <span>{reemissaoResult.tipoRelacaoDocumental}</span>
                    <span>•</span>
                    <span>{reemissaoResult.pdfDisponivel ? "PDF disponivel" : "PDF ainda nao gerado"}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {reemissaoResult.documentoUrl ? (
                      <Link
                        className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                        href={reemissaoResult.documentoUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir novo emitido
                      </Link>
                    ) : null}
                    {reemissaoResult.pdfUrl ? (
                      <Link
                        className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                        href={reemissaoResult.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir PDF do novo emitido
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="no-print flex flex-wrap items-center justify-between gap-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Identificacao
                    </div>
                    <div className="mt-1 font-medium">Documento #{doc.id}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Matricula e modelo
                    </div>
                    <div className="mt-1 font-medium">
                      Matricula {doc.matricula_id ?? "-"} | Modelo {modeloId}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Estado atual
                    </div>
                    <div className="mt-1 font-medium">
                      {status} | Editado manualmente: {doc.editado_manual ? "Sim" : "Nao"}
                    </div>
                  </div>
                </div>

                <div className="hidden text-sm text-slate-700">
                  <p>
                    <strong>ID:</strong> {doc.id}
                  </p>
                  <p>
                    <strong>Matricula:</strong> {doc.matricula_id ?? "-"} • <strong>Modelo:</strong>{" "}
                    {modeloId}
                  </p>
                  <p>
                    <strong>Status:</strong> {status} • <strong>Editado manual:</strong>{" "}
                    {doc.editado_manual ? "Sim" : "Nao"}
                  </p>
                  <p>
                    <strong>Relacao documental:</strong> {doc.tipo_relacao_documental ?? "ORIGINAL"}
                    {doc.documento_origem_id ? (
                      <>
                        {" "}â€¢ <strong>Origem:</strong> #{doc.documento_origem_id}
                      </>
                    ) : null}
                  </p>
                  {doc.motivo_reemissao ? (
                    <p>
                      <strong>Motivo da reemissao:</strong> {doc.motivo_reemissao}
                    </p>
                  ) : null}
                  <p>
                    <strong>PDF:</strong>{" "}
                    {pdfUrl ? (
                      <a className="underline" href={pdfUrl} target="_blank" rel="noreferrer">
                        Abrir PDF
                      </a>
                    ) : (
                      "-"
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <ReemitirDocumentoButton documentoEmitidoId={doc.id} onSuccess={setReemissaoResult} />

                  {pdfUrl ? (
                    <a
                      className="inline-flex items-center justify-center rounded-md border bg-white px-3 py-2 text-sm hover:bg-slate-50"
                      href={pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir PDF
                    </a>
                  ) : null}

                  <button
                    type="button"
                    className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-slate-50"
                    onClick={imprimirComoPdf}
                  >
                    Imprimir / Salvar PDF
                  </button>

                  <button
                    type="button"
                    className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-slate-50"
                    onClick={() => setModoEditar((v) => !v)}
                  >
                    {modoEditar ? "Voltar para visualizacao" : "Editar manualmente"}
                  </button>

                  <button
                    type="button"
                    className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-slate-50"
                    onClick={verModeloSemDados}
                    disabled={previewLoading || viewMode === "raw"}
                  >
                    {previewLoadingMode === "raw" ? "Carregando..." : "Ver modelo (sem dados)"}
                  </button>

                  <button
                    type="button"
                    className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-slate-50"
                    onClick={verComDadosResolver}
                    disabled={previewLoading || viewMode === "resolved"}
                  >
                    {previewLoadingMode === "resolved" ? "Carregando..." : "Ver com dados (resolver)"}
                  </button>
                </div>
              </div>

              <hr className="no-print" />

              {modoEditar ? (
                <div>
                  <h2 className="text-sm font-semibold">Editor (conteudo emitido)</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Use apenas para correcoes pontuais. Este documento ja foi emitido.
                  </p>
                  <div className="mt-3">
                    <RichTextEditor
                      valueHtml={html}
                      onChangeHtml={setHtml}
                      minHeightPx={240}
                      enableVariables={false}
                    />
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-slate-50"
                      onClick={() => {
                        const nextHtml =
                          doc.conteudo_resolvido_html ||
                          doc.conteudo_template_html ||
                          doc.conteudo_renderizado_md ||
                          "<p></p>";
                        setHtml(maybeDecodeHtml(nextHtml));
                        setModoEditar(false);
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                      onClick={salvarEdicao}
                      disabled={salvando}
                    >
                      {salvando ? "Salvando..." : "Salvar edicao"}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-sm font-semibold">Pre-visualizacao</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Para gerar PDF, use &quot;Imprimir / Salvar PDF&quot;.
                  </p>
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    <strong>Fonte oficial da visualizacao:</strong> {fonteVisualizacao}
                    {visualizacaoEmFallback ? " (fallback legado/controlado)" : " (persistido na emissao)"}
                  </div>

                  <div className="documento-preview mt-3 rounded-lg border border-slate-200 bg-white p-4">
                    <div id="print-root" className="doc-print-root" style={printVars}>
                      <div
                        id="print-header"
                        className="prose max-w-none"
                        dangerouslySetInnerHTML={{ __html: headerHtml }}
                      />
                      <div
                        id="print-body"
                        className="prose max-w-none"
                        // Conteudo emitido e gerado internamente.
                        dangerouslySetInnerHTML={{
                          __html: previewConteudo,
                        }}
                      />
                      <div
                        id="print-footer"
                        className="prose max-w-none"
                        dangerouslySetInnerHTML={{ __html: footerHtml }}
                      />
                    </div>
                  </div>
                  {debug ? (
                    <div className="mt-2 text-xs text-slate-500">
                      HTML len (raw): {previewConteudoRaw.length} | HTML len (resolved):{" "}
                      {previewConteudoResolved.length}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }

          #print-header,
          #print-header *,
          #print-body,
          #print-body *,
          #print-footer,
          #print-footer * {
            visibility: visible !important;
          }

          #print-root {
            position: relative !important;
            width: 100% !important;
          }

          #print-header {
            position: fixed !important;
            left: 0 !important;
            top: var(--page-margin-mm, 10mm) !important;
            right: 0 !important;
            height: var(--header-height-px, 120px) !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          #print-footer {
            position: fixed !important;
            left: 0 !important;
            right: 0 !important;
            bottom: var(--page-margin-mm, 10mm) !important;
            height: var(--footer-height-px, 80px) !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          #print-body {
            position: relative !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin-top: calc(var(--page-margin-mm, 10mm) + var(--header-height-px, 120px)) !important;
            margin-bottom: calc(var(--page-margin-mm, 10mm) + var(--footer-height-px, 80px)) !important;
          }

          .rounded-lg,
          .rounded-2xl,
          .shadow-sm,
          .border {
            border: none !important;
            box-shadow: none !important;
          }

          #print-body {
            font-size: 12pt;
            line-height: 1.4;
          }

          @page {
            margin: var(--page-margin-mm, 10mm);
          }
        }

        body.print-mode .no-print {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
