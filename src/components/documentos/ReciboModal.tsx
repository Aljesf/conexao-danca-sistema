"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export type ReciboModalParams =
  | { tipo: "CONTA_INTERNA"; competencia: string; responsavel_pessoa_id: number }
  | { tipo: "COBRANCA_AVULSA"; cobranca_avulsa_id: number }
  | { tipo: "RECEBIMENTO"; recebimento_id: number };

type PreviewResp = {
  ok: boolean;
  pagamento_confirmado?: boolean;
  motivo_bloqueio?: string | null;
  html_preview?: string | null;
  htmlPreview?: string | null;
  preview_html?: string | null;
  cabecalho_html?: string | null;
  rodape_html?: string | null;
  modelo?: { id?: number | null; titulo?: string | null } | null;
};

type ModeloOpcao = {
  id: number;
  titulo: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  params: ReciboModalParams | null;
  title?: string;
};

function getParamsKey(params: ReciboModalParams | null): string {
  if (!params) return "";
  if (params.tipo === "RECEBIMENTO") return `REC_${params.recebimento_id}`;
  if (params.tipo === "CONTA_INTERNA") return `CI_${params.responsavel_pessoa_id}_${params.competencia}`;
  return `CA_${params.cobranca_avulsa_id}`;
}

function buildQuery(params: ReciboModalParams, modeloId?: number | null): string {
  const q = new URLSearchParams();

  if (params.tipo === "RECEBIMENTO") {
    q.set("recebimento_id", String(params.recebimento_id));
    if (modeloId) q.set("modelo_id", String(modeloId));
    return q.toString();
  }

  q.set("tipo", params.tipo);
  if (params.tipo === "CONTA_INTERNA") {
    q.set("competencia", params.competencia);
    q.set("responsavel_pessoa_id", String(params.responsavel_pessoa_id));
  } else {
    q.set("cobranca_avulsa_id", String(params.cobranca_avulsa_id));
  }
  return q.toString();
}

function getPreviewEndpoint(params: ReciboModalParams): string {
  if (params.tipo === "RECEBIMENTO") {
    return "/api/documentos/recibos/recebimento/preview";
  }
  return "/api/documentos/recibos/preview";
}

function extractHtml(data: PreviewResp): string {
  return data.htmlPreview ?? data.html_preview ?? "";
}

function buildLegacyHtml(data: PreviewResp): string {
  const body = data.preview_html ?? "";
  const header = data.cabecalho_html ?? "";
  const footer = data.rodape_html ?? "";
  if (!body && !header && !footer) return extractHtml(data);

  return `
    <main style="max-width:980px;margin:0 auto;padding:24px;font-family:Arial,sans-serif;background:#f8fafc;color:#0f172a;">
      ${header ? `<section style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;margin-bottom:16px;">${header}</section>` : ""}
      <section style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;">${body}</section>
      ${footer ? `<section style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;margin-top:16px;">${footer}</section>` : ""}
    </main>
  `;
}

function getResolvedHtml(data: PreviewResp): string {
  const direct = extractHtml(data);
  if (direct) return direct;
  return buildLegacyHtml(data);
}

export function ReciboModal({ open, onClose, params, title = "Recibo de pagamento" }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [htmlContent, setHtmlContent] = React.useState<string>("");
  const [pagamentoConfirmado, setPagamentoConfirmado] = React.useState(true);
  const [motivoBloqueio, setMotivoBloqueio] = React.useState<string | null>(null);
  const [modelos, setModelos] = React.useState<ModeloOpcao[]>([]);
  const [modeloSelecionadoId, setModeloSelecionadoId] = React.useState<number | null>(null);
  const [modeloAtualId, setModeloAtualId] = React.useState<number | null>(null);
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const printRef = React.useRef<HTMLDivElement>(null);
  const paramsRef = React.useRef(params);
  paramsRef.current = params;

  const paramsKey = getParamsKey(params);

  async function fetchModelos() {
    try {
      const res = await fetch("/api/documentos/modelos?tipo=RECIBO&ativo=true", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; modelos?: ModeloOpcao[] } | null;
      if (res.ok && json?.ok && json.modelos) {
        setModelos(json.modelos);
      }
    } catch {
      // Seletor de modelo é opcional — falha silenciosa
    }
  }

  async function fetchPreview(modeloIdOverride?: number | null) {
    const currentParams = paramsRef.current;
    if (!currentParams) return;
    setLoading(true);
    setError(null);

    try {
      const endpoint = getPreviewEndpoint(currentParams);
      const query = buildQuery(currentParams, modeloIdOverride);
      const res = await fetch(`${endpoint}?${query}`, { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as Partial<PreviewResp> & { error?: string };

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `erro_http_${res.status}`);
      }

      setHtmlContent(getResolvedHtml(json as PreviewResp));

      // Para tipo RECEBIMENTO: se o preview retornou com sucesso, o pagamento está confirmado
      // (a rota lança erro "recebimento_nao_confirmado" se não estiver)
      const isRecebimento = currentParams.tipo === "RECEBIMENTO";
      if (isRecebimento) {
        setPagamentoConfirmado(true);
      } else {
        setPagamentoConfirmado(json.pagamento_confirmado !== false);
      }
      setMotivoBloqueio((json.motivo_bloqueio ?? null) as string | null);

      const modeloRetornado = json.modelo?.id ?? null;
      if (modeloRetornado) {
        setModeloAtualId(modeloRetornado);
      }

      setHasLoaded(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Nao foi possivel carregar o recibo.";
      if (message === "recebimento_nao_confirmado") {
        setPagamentoConfirmado(false);
        setMotivoBloqueio("Pagamento ainda nao confirmado.");
      }
      setError(message);
      setHtmlContent("");
    } finally {
      setLoading(false);
    }
  }

  // Carrega preview apenas quando o modal abre ou quando o paramsKey muda (novo recebimento)
  React.useEffect(() => {
    if (!open || !params) return;

    // Reset ao abrir com novos params
    setHtmlContent("");
    setError(null);
    setModeloSelecionadoId(null);
    setModeloAtualId(null);
    setHasLoaded(false);
    setPagamentoConfirmado(true);

    void fetchModelos();
    void fetchPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, paramsKey]);

  function handleModeloChange(novoModeloId: number | null) {
    setModeloSelecionadoId(novoModeloId);
    void fetchPreview(novoModeloId);
  }

  function handleImprimir() {
    const el = printRef.current;
    if (!el) return;

    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @media print { body { margin: 0; } }
          body { font-family: Arial, sans-serif; }
        </style>
      </head>
      <body>${el.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  if (!open || !params) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="flex w-full max-w-4xl flex-col rounded-2xl bg-white shadow-xl" style={{ maxHeight: "90vh" }}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-[linear-gradient(135deg,#fff2e2_0%,#ffffff_52%,#edf8f8_100%)] px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            {modeloAtualId ? (
              <p className="text-xs text-slate-500">Modelo #{modeloAtualId}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {modelos.length > 1 ? (
              <select
                value={modeloSelecionadoId ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  handleModeloChange(val ? Number(val) : null);
                }}
                className="h-9 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              >
                <option value="">Modelo padrao</option>
                {modelos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.titulo ?? `Modelo #${m.id}`}
                  </option>
                ))}
              </select>
            ) : null}
            <Button variant="secondary" onClick={handleImprimir} disabled={!htmlContent || loading}>
              Imprimir
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-slate-500">
              Carregando recibo...
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          ) : null}

          {!loading && !error && htmlContent ? (
            <>
              {!pagamentoConfirmado ? (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {motivoBloqueio ?? "Pagamento ainda nao confirmado."}
                </div>
              ) : null}

              <div
                ref={printRef}
                className="rounded-xl border border-slate-200 bg-white"
              >
                <iframe
                  title="Preview do recibo"
                  className="h-[60vh] w-full rounded-xl border-0 bg-white"
                  srcDoc={htmlContent}
                />
              </div>
            </>
          ) : null}

          {!loading && !error && !htmlContent && hasLoaded ? (
            <div className="flex items-center justify-center py-12 text-sm text-slate-500">
              Nenhum conteudo de recibo disponivel.
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-3">
          <Button variant="secondary" onClick={() => void fetchPreview(modeloSelecionadoId)} disabled={loading}>
            Atualizar preview
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
