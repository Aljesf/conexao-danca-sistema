"use client";

import React from "react";
import { RichTextEditor } from "@/components/ui/RichTextEditor/RichTextEditor";

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
  variaveis_utilizadas_json?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string | null;
};

type ApiResp<T> = { ok?: boolean; data?: T; message?: string };

export default function DocumentoEmitidoDetalheClient({ id }: { id: string }) {
  const docId = Number(id);

  const [doc, setDoc] = React.useState<DocEmitido | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  const [modoEditar, setModoEditar] = React.useState(false);
  const [html, setHtml] = React.useState<string>("<p></p>");
  const [salvando, setSalvando] = React.useState(false);
  const [okMsg, setOkMsg] = React.useState<string | null>(null);

  async function carregar() {
    setErro(null);
    setOkMsg(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/documentos/emitidos/${docId}`, { cache: "no-store" });
      const json = (await res.json()) as ApiResp<DocEmitido>;
      if (!res.ok || !json.ok || !json.data) {
        throw new Error(json.message || "Falha ao carregar documento emitido.");
      }
      const baseHtml =
        json.data.conteudo_resolvido_html ||
        json.data.conteudo_template_html ||
        json.data.conteudo_renderizado_md ||
        "<p></p>";
      setDoc(json.data);
      setHtml(baseHtml);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
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

  function imprimirComoPdf() {
    document.body.classList.add("print-mode");
    window.print();
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
  const headerHtml = doc?.header_html ?? doc?.cabecalho_html ?? "";
  const footerHtml = doc?.footer_html ?? doc?.rodape_html ?? "";
  const headerHeightValue = Number(doc?.header_height_px);
  const footerHeightValue = Number(doc?.footer_height_px);
  const pageMarginValue = Number(doc?.page_margin_mm);
  const headerHeightPx = Number.isFinite(headerHeightValue) && headerHeightValue > 0 ? headerHeightValue : 120;
  const footerHeightPx = Number.isFinite(footerHeightValue) && footerHeightValue > 0 ? footerHeightValue : 80;
  const pageMarginMm = Number.isFinite(pageMarginValue) && pageMarginValue > 0 ? pageMarginValue : 15;
  const printVars = {
    "--header-height-px": `${headerHeightPx}px`,
    "--footer-height-px": `${footerHeightPx}px`,
    "--page-margin-mm": `${pageMarginMm}mm`,
  } as React.CSSProperties;
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
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="no-print rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Documento emitido</h1>
          <p className="mt-1 text-sm text-slate-600">
            Visualizacao, impressao em PDF e edicao manual (admin).
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
        {colecoesDetectadas.length > 0 && colecoesVazias.length > 0 ? (
          <div className="no-print rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Colecoes sem dados: {colecoesVazias.join(", ")}. Verifique se o modelo usa a colecao correta para a
            matricula.
          </div>
        ) : null}

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          {loading || !doc ? (
            <p className="text-sm text-slate-500">Carregando...</p>
          ) : (
            <div className="space-y-3">
              <div className="no-print flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-slate-700">
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
                    <strong>PDF:</strong>{" "}
                    {doc.pdf_url ? (
                      <a className="underline" href={doc.pdf_url} target="_blank" rel="noreferrer">
                        Abrir PDF
                      </a>
                    ) : (
                      "-"
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
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
                    onClick={carregar}
                  >
                    Recarregar
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
                        setHtml(
                          doc.conteudo_resolvido_html ||
                            doc.conteudo_template_html ||
                            doc.conteudo_renderizado_md ||
                            "<p></p>",
                        );
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

                  <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4">
                    <div id="print-root" style={printVars}>
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
                          __html:
                            doc.conteudo_resolvido_html ||
                            doc.conteudo_template_html ||
                            doc.conteudo_renderizado_md ||
                            "<p>(sem conteudo)</p>",
                        }}
                      />
                      <div
                        id="print-footer"
                        className="prose max-w-none"
                        dangerouslySetInnerHTML={{ __html: footerHtml }}
                      />
                    </div>
                  </div>
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
            top: var(--page-margin-mm, 15mm) !important;
            right: 0 !important;
            height: var(--header-height-px, 120px) !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          #print-footer {
            position: fixed !important;
            left: 0 !important;
            right: 0 !important;
            bottom: var(--page-margin-mm, 15mm) !important;
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
            margin-top: calc(var(--page-margin-mm, 15mm) + var(--header-height-px, 120px)) !important;
            margin-bottom: calc(var(--page-margin-mm, 15mm) + var(--footer-height-px, 80px)) !important;
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
            margin: var(--page-margin-mm, 15mm);
          }
        }

        body.print-mode .no-print {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
