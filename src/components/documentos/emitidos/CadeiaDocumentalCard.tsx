"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  documentoEmitidoId: number;
  tipoRelacaoDocumental?: string | null;
  documentoOrigemId?: number | null;
  motivoReemissao?: string | null;
  operacaoId?: number | null;
  origemTipo?: string | null;
  origemId?: string | null;
  pdfUrl?: string | null;
};

type DocumentoResumo = {
  id: number;
  tipo_relacao_documental?: string | null;
  documento_origem_id?: number | null;
};

function badgeClass(tipo: string) {
  switch (tipo) {
    case "REEMISSAO":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "SUBSTITUICAO":
      return "border-rose-200 bg-rose-50 text-rose-800";
    case "DERIVADO":
      return "border-sky-200 bg-sky-50 text-sky-800";
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-900">{value}</div>
    </div>
  );
}

export default function CadeiaDocumentalCard({
  documentoEmitidoId,
  tipoRelacaoDocumental,
  documentoOrigemId,
  motivoReemissao,
  operacaoId,
  origemTipo,
  origemId,
  pdfUrl,
}: Props) {
  const tipo = (tipoRelacaoDocumental ?? "ORIGINAL").trim().toUpperCase();
  const motivoLabel = tipo === "SUBSTITUICAO" ? "Motivo da substituicao" : "Motivo da reemissao";
  const [cadeia, setCadeia] = useState<DocumentoResumo[]>([]);
  const origemNegocio = origemTipo?.trim()
    ? `${origemTipo}${origemId?.trim() ? ` #${origemId}` : ""}`
    : origemId?.trim() || "-";

  useEffect(() => {
    let cancelled = false;

    async function carregarCadeia() {
      if (!documentoOrigemId) {
        setCadeia([]);
        return;
      }

      const itens: DocumentoResumo[] = [];
      let atual = documentoOrigemId;
      let depth = 0;

      while (atual && depth < 5) {
        const response = await fetch(`/api/documentos/emitidos/${atual}`, { cache: "no-store" });
        const json = (await response.json().catch(() => null)) as { data?: DocumentoResumo } | null;
        if (!response.ok || !json?.data) {
          break;
        }

        itens.push(json.data);
        atual = json.data.documento_origem_id ?? null;
        depth += 1;
      }

      if (!cancelled) {
        setCadeia(itens);
      }
    }

    void carregarCadeia();

    return () => {
      cancelled = true;
    };
  }, [documentoOrigemId]);

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Cadeia documental
            </div>
            <CardTitle className="mt-1 text-base text-slate-900">Documento #{documentoEmitidoId}</CardTitle>
            <p className="mt-1 text-sm text-slate-600">Resumo administrativo principal do vinculo documental.</p>
          </div>
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(tipo)}`}>
            {tipo}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetaItem label="Relacao atual" value={tipo} />
          <MetaItem label="Operacao documental" value={operacaoId ? `#${operacaoId}` : "-"} />
          <MetaItem label="Origem de negocio" value={origemNegocio} />
          <MetaItem label="Status do PDF" value={pdfUrl ? "Disponivel" : "Ainda nao gerado"} />
        </div>

        {motivoReemissao ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
              {motivoLabel}
            </div>
            <p className="mt-1">{motivoReemissao}</p>
          </div>
        ) : null}

        {cadeia.length > 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Cadeia historica
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-700">
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(tipo)}`}>
                #{documentoEmitidoId} {tipo}
              </span>
              {cadeia.map((item) => {
                const itemTipo = (item.tipo_relacao_documental ?? "ORIGINAL").toUpperCase();
                return (
                  <div key={item.id} className="flex items-center gap-2">
                    <span className="text-slate-400">←</span>
                    <Link
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(itemTipo)}`}
                      href={`/admin/config/documentos/emitidos/${item.id}`}
                    >
                      #{item.id} {itemTipo}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {documentoOrigemId ? (
            <Link
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              href={`/admin/config/documentos/emitidos/${documentoOrigemId}`}
            >
              Abrir origem imediata #{documentoOrigemId}
            </Link>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-500">
              Documento original da cadeia
            </div>
          )}

          {pdfUrl ? (
            <Link
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
            >
              Abrir PDF atual
            </Link>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-500">
              PDF ainda nao gerado
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
