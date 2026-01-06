"use client";

import { useEffect, useMemo, useState } from "react";

type Espaco = {
  id: number | string;
  local_id?: number | null;
  nome: string;
  tipo?: string | null;
  capacidade?: number | null;
  local_nome?: string | null;
  local_tipo?: string | null;
};

type Turma = {
  turma_id: number;
  nome: string;
  curso: string | null;
  nivel: string | null;
  turno: string | null;
  ano_referencia: number | null;
  status: string | null;
  espaco_id?: number | null;
};

type TurmaHorario = {
  id: number;
  turma_id: number;
  day_of_week: number;
  inicio: string;
  fim: string;
};

type GradePayload = {
  espacos: Espaco[];
  turmas: Turma[];
  horarios: TurmaHorario[];
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
    const map = new Map<number, Turma>();
    for (const t of data.turmas) map.set(t.turma_id, t);
    return map;
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

  const grid = useMemo(() => {
    const map = new Map<string, Turma[]>();

    for (const h of horariosUteis) {
      const turma = turmaById.get(h.turma_id);
      if (!turma) continue;

      const esp = String(turma.espaco_id ?? "SEM_ESPACO");
      const key = `${esp}|${h.day_of_week}|${slotKey(h.inicio, h.fim)}`;

      const prev = map.get(key) ?? [];
      map.set(key, [...prev, turma]);
    }

    return map;
  }, [horariosUteis, turmaById]);

  const espacosOrdenados = useMemo(() => {
    if (data.espacos.length) return data.espacos;
    return [{ id: "SEM_ESPACO", nome: "Sem espaco", local_nome: null, local_tipo: null }];
  }, [data.espacos]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Academico - Grade de horarios (REGULAR)</h1>
        <p className="text-sm text-muted-foreground">
          Grade semanal por sala (Segunda a Sexta), preenchida automaticamente a partir das turmas e seus horarios.
        </p>
      </div>

      <div className="rounded-lg border p-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="text-sm font-medium">Espaco</div>
          <select
            className="border rounded-md px-3 py-2 text-sm min-w-[240px]"
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
        </div>

        <div className="text-xs text-muted-foreground">
          {loading ? "Carregando..." : `${data.turmas.length} turmas • ${data.horarios.length} horarios`}
        </div>
      </div>

      {err ? <div className="rounded-lg border p-4 text-sm text-red-600">{err}</div> : null}

      <div className="space-y-6">
        {espacosOrdenados.map((esp) => {
          const espId = String(esp.id);

          return (
            <div key={espId} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-medium">{esp.nome}</h2>
                <div className="text-xs text-muted-foreground">
                  {esp.local_nome ? `${esp.local_nome}${esp.local_tipo ? ` (${esp.local_tipo})` : ""}` : ""}
                </div>
              </div>

              {slots.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum horario cadastrado para turmas REGULAR.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="text-xs uppercase text-muted-foreground">
                        <th className="text-left py-2 pr-3">Horario</th>
                        {WEEKDAYS.map((d) => (
                          <th key={d.key} className="text-left py-2 pr-3">
                            {d.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {slots.map((slot) => (
                        <tr key={slot} className="border-t">
                          <td className="py-2 pr-3 whitespace-nowrap font-medium">{slot}</td>

                          {WEEKDAYS.map((d) => {
                            const key = `${espId}|${d.key}|${slot}`;
                            const turmas = grid.get(key) ?? [];

                            return (
                              <td key={key} className="py-2 pr-3 align-top">
                                {turmas.length === 0 ? (
                                  <span className="text-xs text-muted-foreground">-</span>
                                ) : (
                                  <div className="space-y-2">
                                    {turmas.map((t) => (
                                      <div key={t.turma_id} className="rounded-md border px-2 py-1">
                                        <div className="text-sm font-medium">{t.nome}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {t.curso ?? "-"} • {t.nivel ?? "-"} • {t.turno ?? "-"}
                                        </div>
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

              <div className="text-xs text-muted-foreground">
                Observacao: esta grade considera apenas turmas REGULAR.
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
