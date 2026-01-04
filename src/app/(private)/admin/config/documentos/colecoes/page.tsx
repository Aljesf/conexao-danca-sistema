import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { SystemContextCard } from "@/components/system/SystemContextCard";
import { SystemHelpCard } from "@/components/system/SystemHelpCard";
import { SystemPage } from "@/components/system/SystemPage";
import { SystemSectionCard } from "@/components/system/SystemSectionCard";

type ColecaoColuna = {
  codigo: string;
  label: string;
  tipo: string;
  formato: string | null;
  ordem: number;
};

type ColecaoCatalogo = {
  codigo: string;
  nome: string;
  descricao: string | null;
  root_tipo: string;
  ordem: number;
  colunas: ColecaoColuna[];
};

const ROOT_LABELS: Record<string, string> = {
  MATRICULA: "Matricula",
  CREDITO_CONEXAO_FATURA: "Fatura (Credito Conexao)",
};

function formatRootLabel(rootTipo: string): string {
  const key = rootTipo.trim().toUpperCase();
  return ROOT_LABELS[key] ?? rootTipo;
}

function getRequestOrigin(): string {
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";

  if (!host) {
    const envBase = process.env.NEXT_PUBLIC_BASE_URL;
    if (envBase && (envBase.startsWith("http://") || envBase.startsWith("https://"))) return envBase;
    return "http://localhost:3000";
  }

  return `${proto}://${host}`;
}

async function fetchCatalogo(): Promise<ColecaoCatalogo[]> {
  const origin = getRequestOrigin();
  const res = await fetch(`${origin}/api/documentos/colecoes/catalogo`, {
    cache: "no-store",
  });

  if (!res.ok) return [];
  const json = (await res.json()) as { data?: ColecaoCatalogo[] };
  return json.data ?? [];
}

function buildExampleTable(c: ColecaoCatalogo): string {
  const headers = c.colunas.map((col) => `    <th>${col.label || col.codigo}</th>`).join("\n");
  const cells = c.colunas.map((col) => `    <td>{{${col.codigo}}}</td>`).join("\n");
  return [
    "<table>",
    "  <thead>",
    "  <tr>",
    headers,
    "  </tr>",
    "  </thead>",
    "  <tbody>",
    `  {{#${c.codigo}}}`,
    "  <tr>",
    cells,
    "  </tr>",
    `  {{/${c.codigo}}}`,
    "  </tbody>",
    "</table>",
  ].join("\n");
}

export default async function Page() {
  const catalogo = await fetchCatalogo();

  return (
    <SystemPage>
      <SystemContextCard
        title="Documentos - Colecoes de Documento"
        subtitle="Listas automaticas que o sistema preenche nos modelos de documento."
      >
        <Link className="text-sm underline text-slate-600" href="/admin/config/documentos">
          Voltar ao hub de Documentos
        </Link>
      </SystemContextCard>

      <SystemHelpCard
        items={[
          "Colecoes sao listas automaticas vinculadas a uma operacao (ex.: matricula ou fatura).",
          "Esta tela e somente leitura: use o editor de modelos para inserir colecoes.",
          "Cada colecao expoe colunas que viram linhas no documento.",
        ]}
      />

      <SystemSectionCard
        title="Colecoes cadastradas"
        description="Catalogo tecnico e auditoria (somente leitura)."
      >
        {catalogo.length === 0 ? (
          <p className="text-sm text-slate-600">
            Nenhuma colecao encontrada. Verifique se a migration foi aplicada e se o endpoint esta respondendo.
          </p>
        ) : (
          <div className="grid gap-3">
            {catalogo.map((c) => (
              <details key={c.codigo} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <summary className="cursor-pointer">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{c.nome}</div>
                      <div className="mt-1 text-xs text-slate-600">{c.descricao ?? "Sem descricao."}</div>
                      <div className="mt-1 text-xs text-slate-500">Root: {formatRootLabel(c.root_tipo)}</div>
                    </div>
                    <div className="text-xs font-mono text-slate-500">{c.codigo}</div>
                  </div>
                </summary>

                <div className="mt-3 border-t border-slate-100 pt-3">
                  <div className="text-xs font-semibold text-slate-700">Colunas disponiveis</div>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {c.colunas.map((col) => (
                      <div
                        key={col.codigo}
                        className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600"
                      >
                        <div className="font-mono text-slate-700">{col.codigo}</div>
                        <div>
                          {col.label} ({col.tipo}
                          {col.formato ? ` / ${col.formato}` : ""})
                        </div>
                      </div>
                    ))}
                  </div>

                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-slate-500">Exemplo de tabela (visual)</summary>
                    <pre className="mt-2 whitespace-pre-wrap rounded-md bg-slate-950 p-3 text-xs text-slate-100">
                      {buildExampleTable(c)}
                    </pre>
                  </details>
                </div>
              </details>
            ))}
          </div>
        )}
      </SystemSectionCard>
    </SystemPage>
  );
}
