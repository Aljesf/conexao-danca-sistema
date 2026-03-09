"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  operacaoNome: string;
  operacaoCodigo: string;
  modeloTitulo: string;
  modeloId: string;
  origemTipo: string;
  origemId: string;
  pdfStatus: string;
  tipoRelacaoDocumental: string;
  documentoEmitidoId?: string | null;
};

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

export function DocumentoMetadadosCard({
  operacaoNome,
  operacaoCodigo,
  modeloTitulo,
  modeloId,
  origemTipo,
  origemId,
  pdfStatus,
  tipoRelacaoDocumental,
  documentoEmitidoId,
}: Props) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-slate-900">Contexto documental</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {documentoEmitidoId ? <Item label="Documento emitido" value={documentoEmitidoId} /> : null}
        <Item label="Operacao" value={operacaoNome} />
        <Item label="Codigo da operacao" value={operacaoCodigo} />
        <Item label="Modelo" value={modeloTitulo} />
        <Item label="Modelo ID" value={modeloId} />
        <Item label="Origem tipo" value={origemTipo} />
        <Item label="Origem ID" value={origemId} />
        <Item label="PDF" value={pdfStatus} />
        <Item label="Relacao documental" value={tipoRelacaoDocumental} />
      </CardContent>
    </Card>
  );
}

export default DocumentoMetadadosCard;
