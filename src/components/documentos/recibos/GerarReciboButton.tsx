"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type GerarReciboResponse = {
  ok?: boolean;
  error?: string;
  documentoEmitidoId?: number;
  documento_emitido_id?: number;
  previewUrl?: string;
  preview_url?: string;
  documentoUrl?: string;
  documento_url?: string;
  htmlPreview?: string;
  operacaoCodigo?: string;
  origemTipo?: string;
  origemId?: string;
};

type Props = {
  recebimentoId: number | null;
  label?: string;
  className?: string;
  variant?: "default" | "secondary" | "outline";
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
      return "Nenhum modelo ativo de recibo foi encontrado.";
    default:
      return error ?? "Nao foi possivel emitir o recibo agora.";
  }
}

export function GerarReciboButton({
  recebimentoId,
  label = "Gerar recibo",
  className,
  variant = "secondary",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentoId, setDocumentoId] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [documentoUrl, setDocumentoUrl] = useState<string | null>(null);

  const disabled = !recebimentoId || loading;
  const previewHref = useMemo(() => {
    if (previewUrl) return previewUrl;
    return recebimentoId ? `/api/documentos/recibos/recebimento/preview?recebimento_id=${recebimentoId}&render=1` : null;
  }, [previewUrl, recebimentoId]);

  async function emitir() {
    if (!recebimentoId) return;
    setLoading(true);
    setError(null);

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

      setDocumentoId(json.documentoEmitidoId ?? json.documento_emitido_id ?? null);
      setPreviewUrl(json.previewUrl ?? json.preview_url ?? null);
      setDocumentoUrl(json.documentoUrl ?? json.documento_url ?? null);
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
        {previewHref ? (
          <a
            className="text-xs font-medium text-slate-600 underline underline-offset-4 hover:text-slate-900"
            href={previewHref}
            target="_blank"
            rel="noreferrer"
          >
            Abrir preview
          </a>
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
    </div>
  );
}

export default GerarReciboButton;
