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

export function FrequenciaTurmaSection({ turmaId }: Props) {
  const [data, setData] = useState<HistoricoFrequenciaTurmaResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function carregar() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/academico/turmas/${turmaId}/frequencia`, {
          cache: "no-store",
        });
        const json = (await res.json().catch(() => null)) as ApiResponse | null;

        if (!res.ok || !json || !json.ok) {
          throw new Error(json?.message || json?.code || "Falha ao carregar frequencia da turma.");
        }

        if (active) {
          setData(json);
        }
      } catch (err) {
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
      <FrequenciaResumoTurmaCard data={data} />
      <FrequenciaHistoricoTurmaTable data={data} />
    </div>
  );
}

export default FrequenciaTurmaSection;
