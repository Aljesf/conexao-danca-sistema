"use client";

import { useEffect, useState } from "react";
import type { HistoricoFrequenciaTurmaResult } from "@/lib/academico/frequencia";
import { FrequenciaResumoTurmaCard } from "@/components/academico/frequencia/FrequenciaResumoTurmaCard";
import { FrequenciaHistoricoTurmaTable } from "@/components/academico/frequencia/FrequenciaHistoricoTurmaTable";

type ApiResponse =
  | ({ ok: true } & HistoricoFrequenciaTurmaResult)
  | { ok: false; message?: string; code?: string };

type Props = {
  turmaId: number;
};

function formatRangeDate(date: Date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildDefaultRange() {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);
  start.setDate(start.getDate() - 60);
  end.setDate(end.getDate() + 14);

  return {
    dataInicio: formatRangeDate(start),
    dataFim: formatRangeDate(end),
  };
}

export function FrequenciaTurmaSection({ turmaId }: Props) {
  const [data, setData] = useState<HistoricoFrequenciaTurmaResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const range = buildDefaultRange();

    async function carregar() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          data_inicio: range.dataInicio,
          data_fim: range.dataFim,
        });
        const res = await fetch(`/api/academico/turmas/${turmaId}/frequencia?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = (await res.json().catch(() => null)) as ApiResponse | null;

        if (!res.ok || !json || !json.ok) {
          throw new Error(json?.message || json?.code || "Falha ao carregar frequencia da turma.");
        }

        if (active) {
          setData(json);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        if (!active) return;
        setError(err instanceof Error ? err.message : "Falha ao carregar frequencia da turma.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void carregar();
    return () => {
      active = false;
      controller.abort();
    };
  }, [turmaId]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
        <p className="text-sm text-slate-500">Carregando frequencia da turma...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
        <p className="text-sm font-semibold text-rose-700">Nao foi possivel carregar a frequencia da turma.</p>
        <p className="mt-1 text-sm text-rose-700">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs text-slate-600">
        Recorte operacional carregado: ultimos 60 dias e proximos 14 dias.
      </div>
      <FrequenciaResumoTurmaCard data={data} />
      <FrequenciaHistoricoTurmaTable data={data} />
    </div>
  );
}

export default FrequenciaTurmaSection;
