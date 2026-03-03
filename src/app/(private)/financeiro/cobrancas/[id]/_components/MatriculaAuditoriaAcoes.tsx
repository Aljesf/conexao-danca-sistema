"use client";

import * as React from "react";

type FinanceiroSugestoesResponse = {
  ok?: boolean;
  sugestoes?: {
    entrada?: {
      valor_centavos: number;
      pago_no_ato: boolean;
      metodo_pagamento: string;
      data_pagamento: string;
      observacoes: string;
    };
    mensalidades?: Array<{
      competencia: string;
      valor_centavos: number;
      descricao: string;
    }>;
  };
  [key: string]: unknown;
};

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function MatriculaAuditoriaAcoes({ matriculaId }: { matriculaId: number }) {
  const [motivo, setMotivo] = React.useState("Auditoria manual pela tela de cobranca");
  const [loadingAction, setLoadingAction] = React.useState<null | "diag" | "reprocessar" | "financeiro">(null);
  const [output, setOutput] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);

  async function diagnosticar() {
    try {
      setLoadingAction("diag");
      setError(null);
      const res = await fetch(`/api/escola/matriculas/${matriculaId}/reprocessar`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      setOutput(formatJson(json));
      if (!res.ok) {
        setError(`Falha no diagnostico: ${json?.error ?? `erro_http_${res.status}`}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no diagnostico");
    } finally {
      setLoadingAction(null);
    }
  }

  async function reprocessar() {
    try {
      setLoadingAction("reprocessar");
      setError(null);
      const payload = { motivo: motivo.trim() || "Reprocessamento manual via tela de cobranca" };
      const res = await fetch(`/api/escola/matriculas/${matriculaId}/reprocessar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      setOutput(formatJson(json));
      if (!res.ok) {
        setError(`Falha no reprocessamento: ${json?.error ?? `erro_http_${res.status}`}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no reprocessamento");
    } finally {
      setLoadingAction(null);
    }
  }

  async function reprocessarFinanceiro() {
    try {
      setLoadingAction("financeiro");
      setError(null);

      const sugestaoRes = await fetch(`/api/escola/matriculas/${matriculaId}/reprocessar-financeiro`, {
        cache: "no-store",
      });
      const sugestaoJson = (await sugestaoRes.json().catch(() => ({}))) as FinanceiroSugestoesResponse;
      if (!sugestaoRes.ok || !sugestaoJson?.ok || !Array.isArray(sugestaoJson?.sugestoes?.mensalidades)) {
        setOutput(formatJson(sugestaoJson));
        setError(
          `Falha ao obter sugestoes financeiras: ${String(
            (sugestaoJson as { error?: string })?.error ?? `erro_http_${sugestaoRes.status}`
          )}`
        );
        return;
      }

      const payload = {
        entrada: sugestaoJson.sugestoes?.entrada ?? undefined,
        mensalidades: sugestaoJson.sugestoes.mensalidades,
        motivo: motivo.trim() || "Reprocessamento financeiro manual via tela de cobranca",
      };

      const execRes = await fetch(`/api/escola/matriculas/${matriculaId}/reprocessar-financeiro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const execJson = await execRes.json().catch(() => ({}));
      setOutput(formatJson(execJson));
      if (!execRes.ok) {
        setError(`Falha no reprocessamento financeiro: ${execJson?.error ?? `erro_http_${execRes.status}`}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no reprocessamento financeiro");
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-sm font-semibold text-slate-800">Acoes (diagnostico e reprocessamento)</div>
      <p className="mt-1 text-xs text-slate-600">
        Executa as rotas oficiais de diagnostico e reprocessamento da matricula #{matriculaId}.
      </p>

      <label className="mt-3 block text-xs text-slate-700">
        Motivo operacional
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Informe o motivo para auditoria/reprocessamento"
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs hover:bg-slate-50 disabled:opacity-60"
          onClick={() => void diagnosticar()}
          disabled={loadingAction !== null}
        >
          {loadingAction === "diag" ? "Diagnosticando..." : "Diagnosticar matricula"}
        </button>

        <button
          type="button"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs hover:bg-slate-50 disabled:opacity-60"
          onClick={() => void reprocessar()}
          disabled={loadingAction !== null}
        >
          {loadingAction === "reprocessar" ? "Reprocessando..." : "Reprocessar matricula"}
        </button>

        <button
          type="button"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs hover:bg-slate-50 disabled:opacity-60"
          onClick={() => void reprocessarFinanceiro()}
          disabled={loadingAction !== null}
        >
          {loadingAction === "financeiro" ? "Reprocessando financeiro..." : "Reprocessar financeiro"}
        </button>
      </div>

      {error ? (
        <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>
      ) : null}

      {output ? (
        <pre className="mt-3 max-h-80 overflow-auto rounded-md border bg-slate-50 p-3 text-xs text-slate-700">
          {output}
        </pre>
      ) : null}
    </div>
  );
}

