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

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (/^\d{4}-\d{2}$/.test(competencia)) params.set("competencia", competencia);
    if (statusFiltro) params.set("status", statusFiltro);
    return params.toString();
  }, [competencia, statusFiltro]);

  async function load() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/financeiro/folha/listar?${queryString}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as
        | { folhas?: FolhaRow[]; error?: string }
        | null;

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
        body: JSON.stringify({
          competencia,
          dia_pagamento: 5,
          pagamento_no_mes_seguinte: true,
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { folha?: { id: number }; error?: string }
        | null;

      if (!res.ok) {
        setMessage(json?.error ?? "falha_abrir_folha");
        return;
      }
      setMessage(`Folha da competencia ${competencia} aberta/garantida.`);
      await load();
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
        | { ok?: boolean; meses?: number; imported_cartao_total?: number; error?: string }
        | null;

      if (!res.ok) {
        setMessage(json?.error ?? "falha_gerar_espelho");
        return;
      }

      setMessage(
        `Espelho gerado (${json?.meses ?? 12} meses). Itens de cartao importados: ${json?.imported_cartao_total ?? 0}.`,
      );
      await load();
    } finally {
      setRunning(null);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Folha - Colaboradores</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie folhas por competencia, gere espelho e importe descontos do Cartao Conexao.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">Competencia</label>
          <input
            className="rounded border px-2 py-1 text-sm"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            placeholder="YYYY-MM"
          />

          <label className="text-sm">Status</label>
          <select
            className="rounded border px-2 py-1 text-sm"
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status || "todos"} value={status}>
                {status || "Todos"}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="rounded border px-3 py-1 text-sm"
            onClick={() => void abrirFolha()}
            disabled={running !== null}
          >
            {running === "abrir" ? "Abrindo..." : "Abrir folha"}
          </button>

          <button
            type="button"
            className="rounded border px-3 py-1 text-sm"
            onClick={() => void gerarEspelho()}
            disabled={running !== null}
          >
            {running === "espelho" ? "Gerando..." : "Gerar espelho (12 meses)"}
          </button>

          <button type="button" className="rounded border px-3 py-1 text-sm" onClick={() => void load()}>
            Atualizar
          </button>
        </div>
      </div>

      <div className="rounded border">
        <div className="flex items-center justify-between border-b p-3 text-sm">
          <span>{loading ? "Carregando..." : `Folhas encontradas: ${rows.length}`}</span>
          {message ? <span className="text-xs text-muted-foreground">{message}</span> : null}
        </div>

        <div className="p-3">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma folha encontrada com os filtros informados.</p>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded border p-3">
                  <div>
                    <div className="text-sm font-medium">Folha #{r.id}</div>
                    <div className="text-xs text-muted-foreground">
                      competencia: {r.competencia} - status: {r.status} - pagamento previsto:{" "}
                      {r.data_pagamento_prevista ?? "-"}
                    </div>
                  </div>
                  <Link className="rounded border px-3 py-1 text-sm hover:bg-muted/30" href={`/admin/financeiro/folha/colaboradores/${r.id}`}>
                    Abrir
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
