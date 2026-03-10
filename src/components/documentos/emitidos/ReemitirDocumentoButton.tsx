"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shadcn/ui";

type TipoRelacaoDocumental = "REEMISSAO" | "SUBSTITUICAO";

type ReemissaoResponse = {
  ok?: boolean;
  error?: string;
  documentoEmitidoIdOriginal?: number;
  documento_emitido_id_original?: number;
  novoDocumentoEmitidoId?: number;
  novo_documento_emitido_id?: number;
  tipoRelacaoDocumental?: string;
  tipo_relacao_documental?: string;
  motivoReemissao?: string;
  motivo_reemissao?: string;
  pdfDisponivel?: boolean;
  pdf_disponivel?: boolean;
  documentoUrl?: string | null;
  documento_url?: string | null;
  pdfUrl?: string | null;
  pdf_url?: string | null;
};

export type ReemissaoSuccessPayload = {
  documentoEmitidoIdOriginal: number;
  novoDocumentoEmitidoId: number;
  tipoRelacaoDocumental: TipoRelacaoDocumental;
  motivoReemissao: string;
  pdfDisponivel: boolean;
  documentoUrl: string | null;
  pdfUrl: string | null;
};

type Props = {
  documentoEmitidoId: number;
  onSuccess?: (payload: ReemissaoSuccessPayload) => void;
};

function normalizeSuccessPayload(json: ReemissaoResponse): ReemissaoSuccessPayload | null {
  const original = Number(json.documentoEmitidoIdOriginal ?? json.documento_emitido_id_original);
  const novo = Number(json.novoDocumentoEmitidoId ?? json.novo_documento_emitido_id);
  const tipo = String(json.tipoRelacaoDocumental ?? json.tipo_relacao_documental ?? "").toUpperCase();
  const motivo = String(json.motivoReemissao ?? json.motivo_reemissao ?? "").trim();

  if (!Number.isFinite(original) || !Number.isFinite(novo)) return null;
  if (tipo !== "REEMISSAO" && tipo !== "SUBSTITUICAO") return null;
  if (!motivo) return null;

  return {
    documentoEmitidoIdOriginal: original,
    novoDocumentoEmitidoId: novo,
    tipoRelacaoDocumental: tipo,
    motivoReemissao: motivo,
    pdfDisponivel: Boolean(json.pdfDisponivel ?? json.pdf_disponivel),
    documentoUrl: (json.documentoUrl ?? json.documento_url ?? null) as string | null,
    pdfUrl: (json.pdfUrl ?? json.pdf_url ?? null) as string | null,
  };
}

export default function ReemitirDocumentoButton({ documentoEmitidoId, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [tipoRelacaoDocumental, setTipoRelacaoDocumental] = useState<TipoRelacaoDocumental>("REEMISSAO");
  const [motivoReemissao, setMotivoReemissao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [resultado, setResultado] = useState<ReemissaoSuccessPayload | null>(null);

  const motivoInvalido = useMemo(() => motivoReemissao.trim().length < 8, [motivoReemissao]);
  const acaoLabel = tipoRelacaoDocumental === "SUBSTITUICAO" ? "substituicao" : "reemissao";
  const acaoDescricao =
    tipoRelacaoDocumental === "SUBSTITUICAO"
      ? "Use substituicao quando o novo emitido deve assumir o lugar operacional do anterior."
      : "Use reemissao quando o novo emitido apenas reproduz o documento com novo registro historico.";

  async function handleSubmit() {
    if (motivoInvalido || salvando) return;

    setErro(null);
    setSalvando(true);
    try {
      const response = await fetch(`/api/documentos/emitidos/${documentoEmitidoId}/reemitir`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tipoRelacaoDocumental,
          motivoReemissao: motivoReemissao.trim(),
        }),
      });

      const json = (await response.json().catch(() => null)) as ReemissaoResponse | null;
      if (!response.ok || !json?.ok) {
        throw new Error(json?.error ?? "Falha ao reemitir documento.");
      }

      const normalized = normalizeSuccessPayload(json);
      if (!normalized) {
        throw new Error("Resposta de reemissao incompleta.");
      }

      setResultado(normalized);
      onSuccess?.(normalized);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha ao reemitir documento.");
    } finally {
      setSalvando(false);
    }
  }

  function resetState(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setTipoRelacaoDocumental("REEMISSAO");
      setMotivoReemissao("");
      setErro(null);
      setSalvando(false);
      setResultado(null);
    }
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Reemitir documento
      </Button>

      <Dialog open={open} onOpenChange={resetState}>
        <DialogContent className="max-w-2xl p-0">
          <div className="space-y-5 p-6">
            <DialogHeader>
              <DialogTitle>Reemissao / substituicao administrativa</DialogTitle>
              <DialogDescription>
                Cria um novo documento emitido preservando o original e registrando a relacao historica.
              </DialogDescription>
            </DialogHeader>

            {resultado ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  <div className="font-semibold">Reemissao concluida</div>
                  <div className="mt-2 space-y-1 text-emerald-800">
                    <p>Original: #{resultado.documentoEmitidoIdOriginal}</p>
                    <p>Novo emitido: #{resultado.novoDocumentoEmitidoId}</p>
                    <p>Relacao: {resultado.tipoRelacaoDocumental}</p>
                    <p>PDF: {resultado.pdfDisponivel ? "Disponivel" : "Ainda nao gerado"}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {resultado.documentoUrl ? (
                    <Link
                      className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                      href={resultado.documentoUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir novo documento emitido
                    </Link>
                  ) : null}
                  {resultado.pdfUrl ? (
                    <Link
                      className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                      href={resultado.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir PDF do novo emitido
                    </Link>
                  ) : null}
                  <DialogClose asChild>
                    <Button type="button">Fechar</Button>
                  </DialogClose>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-700">
                    <span className="font-medium">Tipo de relacao documental</span>
                    <select
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                      value={tipoRelacaoDocumental}
                      onChange={(event) => setTipoRelacaoDocumental(event.target.value as TipoRelacaoDocumental)}
                    >
                      <option value="REEMISSAO">REEMISSAO</option>
                      <option value="SUBSTITUICAO">SUBSTITUICAO</option>
                    </select>
                  </label>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Documento atual
                    </div>
                    <div className="mt-1 font-medium text-slate-900">#{documentoEmitidoId}</div>
                    <p className="mt-2 text-xs">
                      O original permanece intacto. A nova emissao aponta para ele por `documento_origem_id`.
                    </p>
                  </div>
                </div>

                <label className="block space-y-2 text-sm text-slate-700">
                  <span className="font-medium">Motivo da {acaoLabel}</span>
                  <textarea
                    className="min-h-28 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    placeholder={`Explique por que este documento esta passando por ${acaoLabel}.`}
                    value={motivoReemissao}
                    onChange={(event) => setMotivoReemissao(event.target.value)}
                  />
                  <span className="text-xs text-slate-500">
                    {acaoDescricao} Motivo operacional minimo de 8 caracteres.
                  </span>
                </label>

                {erro ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erro}</div>
                ) : null}

                <div className="flex flex-wrap justify-end gap-2">
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">
                      Cancelar
                    </Button>
                  </DialogClose>
                  <Button type="button" onClick={handleSubmit} disabled={salvando || motivoInvalido}>
                    {salvando ? "Reemitindo..." : "Confirmar reemissao"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
