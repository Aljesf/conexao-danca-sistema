"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type FolhaRow = {
  id: number;
  competencia: string;
  status: string;
  data_pagamento_prevista: string | null;
};

const STATUS_OPTIONS = ["", "ABERTA", "FECHADA", "PAGA", "CANCELADA"] as const;

export default function FolhaColaboradoresPage() {
  const [competencia, setCompetencia] = useState<string>(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${mm}`;
  });
  const [statusFiltro, setStatusFiltro] = useState<string>("");
  const [rows, setRows] = useState<FolhaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [running, setRunning] = useState<"abrir" | "espelho" | null>(null);
  const [importingFolhaId, setImportingFolhaId] = useState<number | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (/^\d{4}-\d{2}$/.test(competencia)) params.set("competencia", competencia);
    if (statusFiltro) params.set("status", statusFiltro);
    return params.toString();
  }, [competencia, statusFiltro]);

  async function fetchList() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/financeiro/folha/listar?${queryString}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as { folhas?: FolhaRow[]; error?: string } | null;
      if (!res.ok) {
        setRows([]);
        setMessage(json?.error ?? "falha_listar_folhas");
        return;
      }
      setRows(Array.isArray(json?.folhas) ? json.folhas : []);
    } finally {
      setLoading(false);
    }
  }

  async function abrirFolha() {
    if (!/^\d{4}-\d{2}$/.test(competencia)) {
      setMessage("Informe competencia valida (YYYY-MM).");
      return;
    }

    setRunning("abrir");
    setMessage(null);
    try {
      const res = await fetch("/api/financeiro/folha/abrir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competencia }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setMessage(json?.error ?? "falha_abrir_folha");
        return;
      }
      setMessage(`Folha da competencia ${competencia} aberta/garantida.`);
      await fetchList();
    } finally {
      setRunning(null);
    }
  }

  async function gerarEspelho() {
    if (!/^\d{4}-\d{2}$/.test(competencia)) {
      setMessage("Informe competencia valida (YYYY-MM).");
      return;
    }

    setRunning("espelho");
    setMessage(null);
    try {
      const res = await fetch("/api/financeiro/folha/gerar-espelho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competencia_base: competencia,
          meses: 12,
          importar_cartao: true,
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { meses?: number; imported_cartao_total?: number; error?: string }
        | null;
      if (!res.ok) {
        setMessage(json?.error ?? "falha_gerar_espelho");
        return;
      }
      setMessage(
        `Espelho gerado (${json?.meses ?? 12} meses). Itens de cartao importados: ${json?.imported_cartao_total ?? 0}.`,
      );
      await fetchList();
    } finally {
      setRunning(null);
    }
  }

  async function importarCartao(folhaId: number) {
    setImportingFolhaId(folhaId);
    setMessage(null);
    try {
      const res = await fetch(`/api/financeiro/folha/${folhaId}/importar-cartao-conexao`, {
        method: "POST",
      });
      const json = (await res.json().catch(() => null)) as { imported?: number; error?: string } | null;
      if (!res.ok) {
        setMessage(json?.error ?? "falha_importar_cartao");
        return;
      }
      setMessage(`Folha #${folhaId}: ${json?.imported ?? 0} itens importados.`);
      await fetchList();
    } finally {
      setImportingFolhaId(null);
    }
  }

  useEffect(() => {
    void fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Folha de Pagamento - Colaboradores</h1>
          <p className="mt-1 text-sm text-slate-600">
            Visualize as folhas por competencia, abra novas folhas e acompanhe importacoes do Cartao Conexao.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold">Entenda esta tela</h2>
          <p className="mt-1 text-sm text-slate-600">
            Cada linha representa uma folha da competencia. Voce pode gerar espelho, importar descontos de faturas e
            abrir o detalhe para ajustar rubricas por colaborador.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-1 text-sm">
                <span>Competencia</span>
                <input
                  className="w-full rounded-md border px-3 py-2"
                  value={competencia}
                  onChange={(e) => setCompetencia(e.target.value)}
                  placeholder="YYYY-MM"
                />
              </label>

              <label className="space-y-1 text-sm">
                <span>Status</span>
                <select
                  className="w-full rounded-md border px-3 py-2"
                  value={statusFiltro}
                  onChange={(e) => setStatusFiltro(e.target.value)}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status || "todos"} value={status}>
                      {status || "Todos"}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md border px-3 py-2 text-sm"
                onClick={() => void abrirFolha()}
                disabled={running !== null}
              >
                {running === "abrir" ? "Abrindo..." : "Abrir folha"}
              </button>
              <button
                type="button"
                className="rounded-md border px-3 py-2 text-sm"
                onClick={() => void gerarEspelho()}
                disabled={running !== null}
              >
                {running === "espelho" ? "Gerando..." : "Gerar espelho (12 meses)"}
              </button>
              <button type="button" className="rounded-md border px-3 py-2 text-sm" onClick={() => void fetchList()}>
                Atualizar
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-xl border">
            <div className="flex items-center justify-between border-b p-3 text-sm">
              <span>{loading ? "Carregando..." : `Folhas encontradas: ${rows.length}`}</span>
              {message ? <span className="text-xs text-slate-600">{message}</span> : null}
            </div>

            <div className="overflow-x-auto p-3">
              {rows.length === 0 ? (
                <p className="text-sm text-slate-600">Nenhuma folha encontrada com os filtros informados.</p>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-left">ID</th>
                      <th className="px-3 py-2 text-left">Competencia</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Pagamento previsto</th>
                      <th className="px-3 py-2 text-right">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="px-3 py-2">{r.id}</td>
                        <td className="px-3 py-2">{r.competencia}</td>
                        <td className="px-3 py-2">{r.status}</td>
                        <td className="px-3 py-2">{r.data_pagamento_prevista ?? "-"}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex gap-2">
                            <button
                              type="button"
                              className="rounded border px-3 py-1 text-xs hover:bg-slate-50 disabled:opacity-60"
                              onClick={() => void importarCartao(r.id)}
                              disabled={importingFolhaId === r.id}
                            >
                              {importingFolhaId === r.id ? "Importando..." : "Importar Cartao"}
                            </button>
                            <Link
                              className="rounded border px-3 py-1 text-xs hover:bg-slate-50"
                              href={`/admin/financeiro/folha/colaboradores/${r.id}`}
                            >
                              Abrir
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
