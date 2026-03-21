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
  day_of_week: number;
  inicio: string;
  fim: string;
};

type ExecucaoHoje = {
  turma_id: number;
  situacao: "PREVISTA" | "PENDENTE" | "ABERTA" | "VALIDADA" | "NAO_REALIZADA";
};

type GradePayload = {
  espacos: Espaco[];
  turmas: Turma[];
  horarios: TurmaHorario[];
  execucao_hoje: ExecucaoHoje[];
};

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
  if (dow === 0) return 7;
  return dow;
}

function compactMeta(t: Turma): string {
  const parts = [t.curso, t.nivel, t.turno].filter(Boolean);
  return parts.length ? parts.join(" | ") : "--";
}

function situacaoTone(situacao: ExecucaoHoje["situacao"]) {
  switch (situacao) {
    case "VALIDADA":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "ABERTA":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "NAO_REALIZADA":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "PENDENTE":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

export default function TurmasGradePage() {
  const [data, setData] = useState<GradePayload>({ espacos: [], turmas: [], horarios: [], execucao_hoje: [] });
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
            execucao_hoje: Array.isArray(json.execucao_hoje) ? json.execucao_hoje : [],
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
    const map = new Map<number, Turma>();
    for (const turma of data.turmas) map.set(turma.turma_id, turma);
    return map;
  }, [data.turmas]);

  const execucaoHojeMap = useMemo(() => {
    const map = new Map<number, ExecucaoHoje["situacao"]>();
    for (const item of data.execucao_hoje) map.set(item.turma_id, item.situacao);
    return map;
  }, [data.execucao_hoje]);

  const horariosUteis = useMemo(() => {
    return data.horarios
      .map((h) => ({ ...h, day_of_week: normalizeDow(h.day_of_week) }))
      .filter((h) => WEEKDAYS.some((weekday) => weekday.key === h.day_of_week));
  }, [data.horarios]);

  const slots = useMemo(() => {
    const set = new Set<string>();
    for (const horario of horariosUteis) set.add(slotKey(horario.inicio, horario.fim));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [horariosUteis]);

  const grid = useMemo(() => {
    const map = new Map<string, Turma[]>();

    for (const horario of horariosUteis) {
      const turma = turmaById.get(horario.turma_id);
      if (!turma) continue;

      const espaco = String(turma.espaco_id ?? "SEM_ESPACO");
      const key = `${espaco}|${horario.day_of_week}|${slotKey(horario.inicio, horario.fim)}`;
      const current = map.get(key) ?? [];
      current.push(turma);
      map.set(key, current);
    }

    return map;
  }, [horariosUteis, turmaById]);

  const espacosOrdenados = useMemo(() => {
    if (data.espacos.length > 0) return data.espacos;
    return [{ id: "SEM_ESPACO", nome: "Sem espaco", codigo: null, local: null }];
  }, [data.espacos]);

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-violet-100/70 bg-white/95 px-6 py-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Academico</p>
            <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">Grade de horarios</h1>
            <p className="mt-1 text-sm text-slate-600">
              Grade semanal por sala com sinalizacao operacional do que esta pendente, aberto ou validado hoje.
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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <StatCard label="Turmas" value={data.turmas.length} description="regulares carregadas" tone="violet" />
        <StatCard label="Horarios" value={data.horarios.length} description="registros em turmas_horarios" tone="amber" />
        <StatCard label="Slots" value={slots.length} description="intervalos unicos" tone="slate" />
        <StatCard label="Filtro" value={espacoId === "ALL" ? "Todas" : espacoId} description="espaco selecionado" tone="rose" />
      </div>

      {err ? (
        <SectionCard
          title="Falha ao carregar"
          subtitle="Status"
          description="Nao foi possivel recuperar a grade."
          className="border-rose-200 bg-rose-50/70"
        >
          <div className="text-sm text-rose-700">{err}</div>
        </SectionCard>
      ) : null}

      {loading ? (
        <SectionCard title="Carregando" subtitle="Status" description="Buscando turmas e horarios.">
          <div className="text-sm text-slate-600">Carregando...</div>
        </SectionCard>
      ) : null}

      <SectionCard
        title="Filtro por espaco"
        subtitle="Controle"
        description="Selecione uma sala para visualizar apenas os horarios daquele espaco."
        actions={
          <select
            className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm shadow-sm"
            value={espacoId}
            onChange={(e) => setEspacoId(e.target.value)}
          >
            <option value="ALL">Todos</option>
            {espacosOrdenados.map((espaco) => (
              <option key={String(espaco.id)} value={String(espaco.id)}>
                {espaco.nome}
              </option>
            ))}
          </select>
        }
      >
        <div className="text-xs text-slate-500">
          Dica: para ajustar o espaco de uma turma, edite a turma e selecione a sala correta.
        </div>
      </SectionCard>

      <div className="space-y-6">
        {espacosOrdenados.map((espaco) => {
          const espacoKey = String(espaco.id);

          return (
            <SectionCard
              key={espacoKey}
              title={espaco.nome}
              subtitle="Espaco"
              description={espaco.local ?? "--"}
              className="bg-white/90"
            >
              {slots.length === 0 ? (
                <div className="text-sm text-slate-600">Nenhum horario cadastrado para turmas regulares.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="text-xs uppercase text-slate-400">
                        <th className="py-3 pr-4 text-left">Horario</th>
                        {WEEKDAYS.map((weekday) => (
                          <th key={weekday.key} className="py-3 pr-4 text-left">
                            {weekday.label}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {slots.map((slot) => (
                        <tr key={`${espacoKey}-${slot}`} className="border-t border-slate-200/70">
                          <td className="whitespace-nowrap py-3 pr-4">
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 shadow-sm">
                              {slot}
                            </span>
                          </td>

                          {WEEKDAYS.map((weekday) => {
                            const key = `${espacoKey}|${weekday.key}|${slot}`;
                            const turmas = grid.get(key) ?? [];

                            return (
                              <td key={`${espacoKey}-${weekday.key}-${slot}`} className="py-3 pr-4 align-top">
                                {turmas.length === 0 ? (
                                  <div className="text-xs text-slate-400">--</div>
                                ) : (
                                  <div className="flex flex-col gap-2">
                                    {turmas.map((turma) => {
                                      const situacao = execucaoHojeMap.get(turma.turma_id) ?? "PENDENTE";
                                      return (
                                        <div
                                          key={`${turma.turma_id}-${weekday.key}-${slot}`}
                                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
                                        >
                                          <div className="text-xs font-semibold text-slate-900">{turma.nome}</div>
                                          <div className="text-[11px] text-slate-500">{compactMeta(turma)}</div>
                                          <div className="mt-1 flex flex-wrap items-center gap-2">
                                            <span className="text-[11px] text-slate-400">Status: {turma.status ?? "--"}</span>
                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${situacaoTone(situacao)}`}>
                                              {situacao}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
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
