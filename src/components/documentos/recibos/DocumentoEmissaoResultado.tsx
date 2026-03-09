"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  documentoEmitidoId: string;
  operacaoCodigo: string;
  modeloId: string;
  origemTipo: string;
  origemId: string;
  pdfStatus: string;
  tipoRelacaoDocumental: string;
  documentoUrl: string | null;
  previewUrl: string | null;
  onCopiarId: () => void;
  onAbrirPreviewInterno: () => void;
};

function Badge({ label, tone }: { label: string; tone: "neutral" | "success" | "warning" }) {
  const className =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-100 text-slate-700";
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

export function DocumentoEmissaoResultado({
  documentoEmitidoId,
  operacaoCodigo,
  modeloId,
  origemTipo,
  origemId,
  pdfStatus,
  tipoRelacaoDocumental,
  documentoUrl,
  previewUrl,
  onCopiarId,
  onAbrirPreviewInterno,
}: Props) {
  const pdfDisponivel = pdfStatus === "Disponivel";
  const pdfTone = pdfDisponivel ? "success" : "warning";
  const abrirDocumentoLabel = pdfDisponivel ? "Abrir PDF / documento" : "Abrir documento emitido (sem PDF)";

  return (
    <Card className="border-emerald-200 bg-emerald-50/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-emerald-900">Emissao concluida</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-xl border border-emerald-200 bg-white p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Documento</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{documentoEmitidoId}</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-white p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Operacao</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{operacaoCodigo}</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-white p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Modelo</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{modeloId}</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-white p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Origem</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {origemTipo} {origemId}
            </div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-white p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">PDF</div>
            <div className="mt-2">
              <Badge label={pdfStatus} tone={pdfTone} />
            </div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-white p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Relacao documental</div>
            <div className="mt-2">
              <Badge label={tipoRelacaoDocumental} tone="neutral" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          {pdfDisponivel
            ? "PDF final disponivel para abertura no documento emitido."
            : "PDF final ainda nao foi gerado nesta emissao. O documento HTML segue disponivel para conferencia e reemissao futura."}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={onAbrirPreviewInterno}>
            Conferir preview
          </Button>
          {previewUrl ? (
            <a
              className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
            >
              Abrir preview bruto
            </a>
          ) : null}
          {documentoUrl ? (
            <Link
              className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              href={documentoUrl}
              target="_blank"
              rel="noreferrer"
            >
              {abrirDocumentoLabel}
            </Link>
          ) : null}
          <Button type="button" variant="secondary" onClick={onCopiarId}>
            Copiar ID documental
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default DocumentoEmissaoResultado;
