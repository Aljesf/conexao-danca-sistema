"use client";

import React from "react";

export type ColecaoColuna = {
  codigo: string;
  label: string;
  tipo: string;
  formato: string | null;
  ordem: number;
};

export type ColecaoCatalogo = {
  codigo: string;
  nome: string;
  descricao: string | null;
  root_tipo: string;
  ordem: number;
  colunas: ColecaoColuna[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  onInsert: (colecao: ColecaoCatalogo) => void;
};

type ApiResp<T> = { ok?: boolean; data?: T; message?: string };

const ROOT_LABELS: Record<string, string> = {
  MATRICULA: "Matricula",
  CREDITO_CONEXAO_FATURA: "Fatura (Credito Conexao)",
};

function formatRootLabel(rootTipo: string): string {
  const key = rootTipo.trim().toUpperCase();
  return ROOT_LABELS[key] ?? rootTipo;
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

export function ColecaoPickerModal({ open, onClose, onInsert }: Props) {
  const [catalogo, setCatalogo] = React.useState<ColecaoCatalogo[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [busca, setBusca] = React.useState("");

  const carregar = React.useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/documentos/colecoes/catalogo", { cache: "no-store" });
      const json = (await res.json()) as ApiResp<ColecaoCatalogo[]>;
      if (!res.ok || json.ok === false) {
        throw new Error(json.message || "Falha ao carregar colecoes.");
      }
      setCatalogo(json.data ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar colecoes.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!open) return;
    void carregar();
  }, [open, carregar]);

  const filtradas = React.useMemo(() => {
    const term = busca.trim().toLowerCase();
    if (!term) return catalogo;
    return catalogo.filter((c) => {
      const nomeOk = c.nome.toLowerCase().includes(term);
      const codigoOk = c.codigo.toLowerCase().includes(term);
      const rootOk = c.root_tipo.toLowerCase().includes(term);
      const descOk = (c.descricao ?? "").toLowerCase().includes(term);
      return nomeOk || codigoOk || rootOk || descOk;
    });
  }, [catalogo, busca]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 flex h-full w-full max-w-[520px] flex-col border-l border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Variaveis de colecao</h2>
            <p className="text-xs text-slate-500">
              Escolha uma colecao para inserir uma tabela pronta no modelo.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
              onClick={() => void carregar()}
              disabled={loading}
            >
              {loading ? "Carregando..." : "Recarregar"}
            </button>
            <button
              type="button"
              className="rounded-md border px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
              onClick={onClose}
            >
              Fechar
            </button>
          </div>
        </div>

        <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Variaveis de colecao representam listas automaticas vinculadas a operacao. O sistema renderiza
          automaticamente todas as linhas existentes.
        </div>

        {erro ? (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {erro}
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            className="w-full max-w-sm rounded-md border px-3 py-2 text-sm"
            placeholder="Buscar por nome, codigo ou root"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="mt-4 flex-1 overflow-auto">
          {loading ? (
            <p className="text-sm text-slate-500">Carregando colecoes...</p>
          ) : filtradas.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma colecao encontrada.</p>
          ) : (
            <div className="grid gap-3">
              {filtradas.map((c) => (
                <div key={c.codigo} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{c.nome}</div>
                      <div className="mt-1 text-xs text-slate-500">{c.descricao ?? "Sem descricao."}</div>
                      <div className="mt-1 text-xs text-slate-500">Root: {formatRootLabel(c.root_tipo)}</div>
                    </div>
                    <div className="text-xs font-mono text-slate-500">{c.codigo}</div>
                  </div>

                  <div className="mt-3 grid gap-2 md:grid-cols-2">
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

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      className="rounded-md bg-slate-800 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700"
                      onClick={() => {
                        onInsert(c);
                        onClose();
                      }}
                      disabled={c.colunas.length === 0}
                    >
                      Inserir tabela padrao
                    </button>

                    <details>
                      <summary className="cursor-pointer text-xs text-slate-500">Ver exemplo</summary>
                      <pre className="mt-2 whitespace-pre-wrap rounded-md bg-slate-950 p-3 text-xs text-slate-100">
                        {buildExampleTable(c)}
                      </pre>
                    </details>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
