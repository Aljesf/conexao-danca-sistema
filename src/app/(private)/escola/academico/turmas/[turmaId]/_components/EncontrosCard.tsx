"use client";

import { useEffect, useState } from "react";

type Encontro = {
  id: number;
  data: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  ordem: number;
  observacao: string | null;
};

type Props = {
  turmaId: number;
};

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

export function EncontrosCard({ turmaId }: Props) {
  const [encontros, setEncontros] = useState<Encontro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/escola/turmas/${turmaId}/encontros`, { cache: "no-store" });
      const json = (await res.json()) as { encontros?: Encontro[]; error?: string; details?: string };
      if (!res.ok) {
        throw new Error(json.details ?? json.error ?? "Falha ao carregar encontros.");
      }
      setEncontros(json.encontros ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar encontros.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [turmaId]);

  async function onAdd() {
    if (!data) {
      setError("Informe a data do encontro.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/escola/turmas/${turmaId}/encontros`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data,
          hora_inicio: horaInicio || null,
          hora_fim: horaFim || null,
          observacao: observacao || null,
        }),
      });
      const json = (await res.json()) as { id?: number; error?: string; details?: string };
      if (!res.ok) {
        throw new Error(json.details ?? json.error ?? "Falha ao criar encontro.");
      }
      setData("");
      setHoraInicio("");
      setHoraFim("");
      setObservacao("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar encontro.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(encontroId: number) {
    setError(null);
    try {
      const res = await fetch(`/api/escola/turmas/${turmaId}/encontros/${encontroId}`, { method: "DELETE" });
      const json = (await res.json()) as { ok?: boolean; error?: string; details?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.details ?? json.error ?? "Falha ao remover encontro.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao remover encontro.");
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Data</label>
          <input
            type="date"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Hora inicio</label>
          <input
            type="time"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            value={horaInicio}
            onChange={(e) => setHoraInicio(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Hora fim</label>
          <input
            type="time"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            value={horaFim}
            onChange={(e) => setHoraFim(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Observacao</label>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Opcional"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-rose-600">{error ?? ""}</p>
        <button
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          onClick={onAdd}
          disabled={saving}
        >
          {saving ? "Salvando..." : "Adicionar encontro"}
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">Carregando encontros...</p>
        ) : encontros.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum encontro cadastrado.</p>
        ) : (
          encontros.map((e) => (
            <div
              key={e.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm text-slate-700"
            >
              <div className="space-y-1">
                <div className="font-semibold">{formatDate(e.data)}</div>
                <div className="text-xs text-slate-500">
                  {e.hora_inicio ?? "--:--"} - {e.hora_fim ?? "--:--"}
                  {e.observacao ? ` | ${e.observacao}` : ""}
                </div>
              </div>
              <button className="rounded-md border px-3 py-1 text-xs" onClick={() => onDelete(e.id)}>
                Remover
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
