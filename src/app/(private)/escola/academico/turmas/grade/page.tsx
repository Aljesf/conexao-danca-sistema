"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SectionCard, StatCard, pillAccent, pillNeutral } from "@/components/ui/conexao-cards";

type Espaco = { id: number | string; codigo?: string | null; nome: string; local?: string | null };

type Turma = {
  turma_id: number;
  nome: string;
  curso: string | null;
  nivel: string | null;
  turno: string | null;
  ano_referencia: number | null;
  status: string | null;
  espaco_id?: number | null;
  local?: string | null;
};

type TurmaHorario = {
  id: number;
  turma_id: number;
  day_of_week: number; // esperado: 1..5 (Seg..Sex). Se vier 0..6, normaliza abaixo.
  inicio: string; // "HH:MM:SS"
  fim: string; // "HH:MM:SS"
};

type GradePayload = { espacos: Espaco[]; turmas: Turma[]; horarios: TurmaHorario[] };

const WEEKDAYS = [
  { key: 1, label: "Seg" },
  { key: 2, label: "Ter" },
  { key: 3, label: "Qua" },
  { key: 4, label: "Qui" },
  { key: 5, label: "Sex" },
];

function hhmm(t: string): string {
  return (t ?? "").slice(0, 5);
}

function slotKey(inicio: string, fim: string): string {
  return `${hhmm(inicio)}-${hhmm(fim)}`;
}

function normalizeDow(dow: number): number {
  if (dow === 0) return 7; // Dom -> 7
  return dow;
}

function compactMeta(t: Turma): string {
  const parts = [t.curso, t.nivel, t.turno].filter(Boolean);
  return parts.length ? parts.join(" • ") : "—";
}

export default function TurmasGradePage() {
  const [data, setData] = useState<GradePayload>({ espacos: [], turmas: [], horarios: [] });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [espacoId, setEspacoId] = useState<string>("ALL");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const url =
          espacoId === "ALL"
            ? "/api/academico/turmas/grade"
            : `/api/academico/turmas/grade?espaco=${encodeURIComponent(espacoId)}`;

        const res = await fetch(url);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Falha ao carregar grade de turmas");

        if (active) {
          setData({
            espacos: Array.isArray(json.espacos) ? json.espacos : [],
            turmas: Array.isArray(json.turmas) ? json.turmas : [],
            horarios: Array.isArray(json.horarios) ? json.horarios : [],
          });
        }
      } catch (e) {
        if (active) setErr(e instanceof Error ? e.message : "Erro inesperado");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [espacoId]);

  const turmaById = useMemo(() => {
    const m = new Map<number, Turma>();
    for (const t of data.turmas) m.set(t.turma_id, t);
    return m;
  }, [data.turmas]);

  const horariosUteis = useMemo(() => {
    return data.horarios
      .map((h) => ({ ...h, day_of_week: normalizeDow(h.day_of_week) }))
      .filter((h) => WEEKDAYS.some((w) => w.key === h.day_of_week));
  }, [data.horarios]);

  const slots = useMemo(() => {
    const set = new Set<string>();
    for (const h of horariosUteis) set.add(slotKey(h.inicio, h.fim));
    const arr = Array.from(set);
    arr.sort((a, b) => a.localeCompare(b));
    return arr;
  }, [horariosUteis]);

  // grid: (espaco|day|slot) -> Turma[]
  const grid = useMemo(() => {
    const m = new Map<string, Turma[]>();

    for (const h of horariosUteis) {
      const t = turmaById.get(h.turma_id);
      if (!t) continue;

      const esp = String(t.espaco_id ?? "SEM_ESPACO");
      const k = `${esp}|${h.day_of_week}|${slotKey(h.inicio, h.fim)}`;

      const prev = m.get(k) ?? [];
      m.set(k, [...prev, t]);
    }

    return m;
  }, [horariosUteis, turmaById]);

  const espacosOrdenados = useMemo(() => {
    if (data.espacos.length) return data.espacos;
    return [{ id: "SEM_ESPACO", nome: "Sem espaço", codigo: null, local: null }];
  }, [data.espacos]);

  const totalTurmas = data.turmas.length;
  const totalHorarios = data.horarios.length;
  const totalSlots = slots.length;

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-violet-100/70 bg-white/95 px-6 py-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Acadêmico</p>
            <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">Grade de horários (REGULAR)</h1>
            <p className="mt-1 text-sm text-slate-600">
              Grade semanal por sala (Segunda a Sexta), preenchida automaticamente a partir das turmas e seus horários.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link className={pillNeutral} href="/escola/academico/turmas/nova">
              Nova turma
            </Link>
            <button className={pillAccent} onClick={() => setEspacoId("ALL")}>
              Ver todas as salas
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard label="Turmas" value={totalTurmas} description="regulares carregadas" tone="violet" />
        <StatCard label="Horários" value={totalHorarios} description="registros em turmas_horarios" tone="amber" />
        <StatCard label="Slots" value={totalSlots} description="intervalos únicos" tone="slate" />
        <StatCard
          label="Filtro"
          value={espacoId === "ALL" ? "Todas" : espacoId}
          description="espaço selecionado"
          tone="rose"
        />
      </div>

      {err ? (
        <SectionCard
          title="Falha ao carregar"
          subtitle="Status"
          description="Não foi possível recuperar a grade."
          className="border-rose-200 bg-rose-50/70"
        >
          <div className="text-sm text-rose-700">{err}</div>
        </SectionCard>
      ) : null}

      {loading ? (
        <SectionCard title="Carregando" subtitle="Status" description="Buscando turmas e horários.">
          <div className="text-sm text-slate-600">Carregando…</div>
        </SectionCard>
      ) : null}

      <SectionCard
        title="Filtro por espaço"
        subtitle="Controle"
        description="Selecione uma sala para visualizar apenas os horários daquele espaço."
        actions={
          <select
            className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm shadow-sm"
            value={espacoId}
            onChange={(e) => setEspacoId(e.target.value)}
          >
            <option value="ALL">Todos</option>
            {espacosOrdenados.map((e) => (
              <option key={String(e.id)} value={String(e.id)}>
                {e.nome}
              </option>
            ))}
          </select>
        }
      >
        <div className="text-xs text-slate-500">
          Dica: para ajustar o espaço de uma turma, edite a turma e selecione a sala correta.
        </div>
      </SectionCard>

      <div className="space-y-6">
        {espacosOrdenados.map((esp) => {
          const espId = String(esp.id);

          return (
            <SectionCard
              key={espId}
              title={esp.nome}
              subtitle="Espaço"
              description={esp.local ?? "—"}
              className="bg-white/90"
            >
              {slots.length === 0 ? (
                <div className="text-sm text-slate-600">Nenhum horário cadastrado para turmas REGULAR.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="text-xs uppercase text-slate-400">
                        <th className="py-3 pr-4 text-left">Horário</th>
                        {WEEKDAYS.map((d) => (
                          <th key={d.key} className="py-3 pr-4 text-left">
                            {d.label}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {slots.map((slot) => (
                        <tr key={`${espId}-${slot}`} className="border-t border-slate-200/70">
                          <td className="py-3 pr-4 whitespace-nowrap">
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 shadow-sm">
                              {slot}
                            </span>
                          </td>

                          {WEEKDAYS.map((d) => {
                            const k = `${espId}|${d.key}|${slot}`;
                            const turmas = grid.get(k) ?? [];

                            return (
                              <td key={`${espId}-${d.key}-${slot}`} className="py-3 pr-4 align-top">
                                {turmas.length === 0 ? (
                                  <div className="text-xs text-slate-400">—</div>
                                ) : (
                                  <div className="flex flex-col gap-2">
                                    {turmas.map((t) => (
                                      <div
                                        key={`${t.turma_id}-${d.key}-${slot}`}
                                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
                                      >
                                        <div className="text-xs font-semibold text-slate-900">{t.nome}</div>
                                        <div className="text-[11px] text-slate-500">{compactMeta(t)}</div>
                                        <div className="text-[11px] text-slate-400">Status: {t.status ?? "—"}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
}
