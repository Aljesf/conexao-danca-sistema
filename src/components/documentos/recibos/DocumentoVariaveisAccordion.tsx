"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  grupos: Record<string, Record<string, string>>;
};

function formatarGrupo(nome: string): string {
  const normalized = nome.replaceAll("_", " ").trim();
  return normalized ? normalized[0]!.toUpperCase() + normalized.slice(1) : "Grupo";
}

export function DocumentoVariaveisAccordion({ grupos }: Props) {
  const entries = Object.entries(grupos);

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-slate-900">Variaveis resolvidas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            Nenhuma variavel agrupada informada.
          </div>
        ) : (
          entries.map(([grupo, valores]) => (
            <details key={grupo} className="rounded-xl border border-slate-200 bg-slate-50">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-900">
                {formatarGrupo(grupo)}
              </summary>
              <div className="border-t border-slate-200 px-4 py-3">
                <div className="grid gap-2">
                  {Object.entries(valores).map(([chave, valor]) => (
                    <div key={`${grupo}-${chave}`} className="grid gap-1 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[200px_minmax(0,1fr)]">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{chave}</div>
                      <div className="break-all text-sm text-slate-800">{valor || "-"}</div>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default DocumentoVariaveisAccordion;
