"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Turma = {
  turma_id: number;
  nome?: string | null;
  curso?: string | null;
  nivel?: string | null;
  dias_semana?: string[] | null;
  hora_inicio?: string | null;
  hora_fim?: string | null;
};

async function fetchJson<T>(
  url: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      json = null;
    }
  }

  if (!res.ok) {
    const msg =
      json &&
      typeof json === "object" &&
      typeof (json as { message?: unknown }).message === "string"
        ? (json as { message: string }).message
        : json &&
            typeof json === "object" &&
            typeof (json as { code?: unknown }).code === "string"
          ? (json as { code: string }).code
          : `Erro HTTP ${res.status}`;
    return { ok: false, status: res.status, message: msg };
  }

  return { ok: true, data: json as T };
}

export default function PlanejamentoPage() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErro("");

      const r = await fetchJson<{ ok: boolean; turmas: Turma[] }>(
        "/api/professor/diario-de-classe/turmas"
      );

      if (!alive) return;

      if (!r.ok) {
        setErro(r.message);
        setTurmas([]);
        setLoading(false);
        return;
      }

      setTurmas(Array.isArray(r.data.turmas) ? r.data.turmas : []);
      setLoading(false);
    })().catch((e: unknown) => {
      if (!alive) return;
      setErro(e instanceof Error ? e.message : "Erro ao carregar turmas.");
      setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Academico</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Planejamento pedagogico</h1>
            <p className="mt-1 text-sm text-slate-500">
              Selecione uma turma para criar ciclos e planos de aula.
            </p>
          </div>
        </header>

        <section className="rounded-3xl border border-violet-100 bg-white/95 p-4 shadow-sm">
          {loading ? (
            <div className="text-sm text-slate-500">Carregando turmas...</div>
          ) : erro ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {erro}
            </div>
          ) : turmas.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma turma encontrada.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {turmas.map((turma) => {
                const dias = Array.isArray(turma.dias_semana) ? turma.dias_semana.join(", ") : "--";
                const horario =
                  turma.hora_inicio && turma.hora_fim
                    ? `${turma.hora_inicio.slice(0, 5)} - ${turma.hora_fim.slice(0, 5)}`
                    : "--";
                return (
                  <Link
                    key={turma.turma_id}
                    href={`/academico/planejamento/turmas/${turma.turma_id}`}
                    className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-violet-200 hover:shadow-md"
                  >
                    <div className="text-sm font-semibold text-slate-900">
                      {turma.nome ?? `Turma ${turma.turma_id}`}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {turma.curso ?? "Curso"} • {turma.nivel ?? "Nivel"}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      Dias: {dias} • Horario: {horario}
                    </div>
                    <div className="mt-3 text-xs font-semibold text-violet-600 group-hover:underline">
                      Abrir planejamento →
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
