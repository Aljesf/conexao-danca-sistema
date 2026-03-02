"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export type ReciboModalParams =
  | { tipo: "CONTA_INTERNA"; competencia: string; responsavel_pessoa_id: number }
  | { tipo: "COBRANCA_AVULSA"; cobranca_avulsa_id: number };

type PreviewResp = {
  ok: boolean;
  pagamento_confirmado: boolean;
  motivo_bloqueio: string | null;
  html_preview: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  params: ReciboModalParams | null;
  title?: string;
};

function buildQuery(params: ReciboModalParams): string {
  const q = new URLSearchParams();
  q.set("tipo", params.tipo);
  if (params.tipo === "CONTA_INTERNA") {
    q.set("competencia", params.competencia);
    q.set("responsavel_pessoa_id", String(params.responsavel_pessoa_id));
  } else {
    q.set("cobranca_avulsa_id", String(params.cobranca_avulsa_id));
  }
  return q.toString();
}

export function ReciboModal({ open, onClose, params, title = "Pre-visualizacao de recibo" }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<PreviewResp | null>(null);
  const [pdfLoading, setPdfLoading] = React.useState(false);
  const [pdfMsg, setPdfMsg] = React.useState<string | null>(null);

  const query = React.useMemo(() => (params ? buildQuery(params) : ""), [params]);

  const carregarPreview = React.useCallback(async () => {
    if (!params) return;
    setLoading(true);
    setError(null);
    setPdfMsg(null);
    try {
      const res = await fetch(`/api/documentos/recibos/preview?${query}`, { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as Partial<PreviewResp> & { error?: string };
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `erro_http_${res.status}`);
      }
      setPreview({
        ok: true,
        pagamento_confirmado: Boolean(json.pagamento_confirmado),
        motivo_bloqueio: (json.motivo_bloqueio ?? null) as string | null,
        html_preview: String(json.html_preview ?? ""),
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "falha_preview_recibo";
      setError(message);
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [params, query]);

  React.useEffect(() => {
    if (!open || !params) return;
    void carregarPreview();
  }, [open, params, carregarPreview]);

  async function gerarPdf() {
    if (!params) return;
    setPdfLoading(true);
    setError(null);
    setPdfMsg(null);
    try {
      const res = await fetch(`/api/documentos/recibos/gerar-pdf?${query}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        motivo?: string | null;
      };
      if (!res.ok || !json?.ok) {
        const detail = json?.motivo ? `${json.error}: ${json.motivo}` : json?.error;
        throw new Error(detail || `erro_http_${res.status}`);
      }
      setPdfMsg("Fluxo validado: pagamento confirmado e emissao liberada.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "falha_gerar_pdf";
      setError(message);
    } finally {
      setPdfLoading(false);
    }
  }

  if (!open || !params) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-4 shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>

        {loading ? <div className="mt-4 text-sm text-slate-600">Carregando preview...</div> : null}

        {error ? (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
        ) : null}

        {preview ? (
          <>
            {!preview.pagamento_confirmado ? (
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {preview.motivo_bloqueio ?? "Pagamento ainda nao confirmado."}
              </div>
            ) : (
              <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                Pagamento confirmado. Geracao de PDF liberada.
              </div>
            )}

            <div className="mt-4 max-h-[55vh] overflow-auto rounded-md border bg-slate-50 p-4 text-sm">
              <div dangerouslySetInnerHTML={{ __html: preview.html_preview }} />
            </div>
          </>
        ) : null}

        {pdfMsg ? (
          <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {pdfMsg}
          </div>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => void carregarPreview()} disabled={loading || pdfLoading}>
            Atualizar preview
          </Button>
          <Button
            onClick={() => void gerarPdf()}
            disabled={loading || pdfLoading || !preview || !preview.pagamento_confirmado}
          >
            {pdfLoading ? "Gerando..." : "Gerar PDF"}
          </Button>
        </div>
      </div>
    </div>
  );
}
