"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type TurmaDetalhe = {
  turma_id?: number;
  id?: number;
  nome?: string | null;
  curso?: string | null;
  nivel?: string | null;
  status?: string | null;
  tipo_turma?: string | null;
  turno?: string | null;
  ano_referencia?: number | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  dias_semana?: string[] | string | null;
  observacoes?: string | null;
};

type HorarioPorDia = {
  dia_semana: string;
  inicio: string;
  fim: string;
};

type HistoricoItem = {
  id: number;
  ocorrida_em: string | null;
  actor_user_id: string | null;
  evento: string;
  resumo: string | null;
  diff: Record<string, unknown> | null;
};

type TurmaDetalheResponse = {
  turma: TurmaDetalhe;
  horarios_por_dia?: HorarioPorDia[];
};

type HistoricoResponse = {
  data: HistoricoItem[];
};

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
}

function formatValor(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (Array.isArray(value)) return value.map(formatValor).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg =
      typeof data === "object" && data && "error" in data
        ? String((data as Record<string, unknown>).error)
        : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export default function EscolaTurmaDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const idParam = params?.id;
  const turmaId = useMemo(() => Number(idParam), [idParam]);

  const [turma, setTurma] = useState<TurmaDetalhe | null>(null);
  const [horarios, setHorarios] = useState<HorarioPorDia[]>([]);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(turmaId)) return;
    let alive = true;
    (async () => {
      try {
        setErro(null);
        const detalhe = await fetchJSON<TurmaDetalheResponse>(`/api/turmas/${turmaId}`);
        const hist = await fetchJSON<HistoricoResponse>(`/api/turmas/${turmaId}/historico`);
        if (!alive) return;
        setTurma(detalhe.turma);
        setHorarios(detalhe.horarios_por_dia ?? []);
        setHistorico(hist.data ?? []);
      } catch (e: unknown) {
        if (!alive) return;
        setErro(e instanceof Error ? e.message : "Erro ao carregar turma.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [turmaId]);

  if (!Number.isFinite(turmaId)) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-600">ID de turma invalido.</p>
      </div>
    );
  }

  const cursoNivel = [turma?.curso, turma?.nivel].filter(Boolean).join(" / ") || "-";
  const diasTexto = Array.isArray(turma?.dias_semana)
    ? turma?.dias_semana.join(", ")
    : turma?.dias_semana ?? "-";

  return (
    <div className="p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Academico</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">
              {turma?.nome ?? `Turma #${turmaId}`}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{cursoNivel}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
              onClick={() => router.push("/escola/academico/turmas")}
            >
              Voltar
            </button>
            <Link
              href={`/academico/turmas/${turmaId}`}
              className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700"
            >
              Editar
            </Link>
          </div>
        </header>

        {erro && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-700">
            {erro}
          </div>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
              <p className="mt-1 text-sm text-slate-900">{turma?.status ?? "-"}</p>
              <p className="text-xs text-slate-500">Tipo: {turma?.tipo_turma ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Calendario</p>
              <p className="mt-1 text-sm text-slate-900">
                Inicio: {formatDate(turma?.data_inicio)} | Fim: {formatDate(turma?.data_fim)}
              </p>
              <p className="text-xs text-slate-500">Turno: {turma?.turno ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ano referencia</p>
              <p className="mt-1 text-sm text-slate-900">{turma?.ano_referencia ?? "-"}</p>
              <p className="text-xs text-slate-500">Dias: {diasTexto}</p>
            </div>
          </div>

          {turma?.observacoes && (
            <p className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
              {turma.observacoes}
            </p>
          )}
        </section>

        <section className="space-y-3">
          <header>
            <h2 className="text-xl font-semibold text-slate-900">Horarios definidos</h2>
            <p className="text-sm text-slate-500">Horario por dia conforme cadastro da turma.</p>
          </header>
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
            {horarios.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum horario registrado.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {horarios.map((h, idx) => (
                  <div
                    key={`${h.dia_semana}-${idx}`}
                    className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm text-slate-700"
                  >
                    <span className="font-semibold">{h.dia_semana}</span> — {h.inicio} a {h.fim}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <header>
            <h2 className="text-xl font-semibold text-slate-900">Historico</h2>
            <p className="text-sm text-slate-500">Registro automatico de alteracoes na turma.</p>
          </header>
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
            {historico.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum historico registrado.</p>
            ) : (
              <div className="space-y-3">
                {historico.map((item) => {
                  const diffObj =
                    item.diff && typeof item.diff === "object" && !Array.isArray(item.diff)
                      ? (item.diff as Record<string, unknown>)
                      : null;
                  const diffEntries = diffObj ? Object.entries(diffObj) : [];

                  return (
                    <div
                      key={`hist-${item.id}`}
                      className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.resumo ?? item.evento}</p>
                          <p className="text-xs text-slate-500">
                            {formatDateTime(item.ocorrida_em)} | Actor: {item.actor_user_id ?? "sistema"}
                          </p>
                        </div>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                          {item.evento}
                        </span>
                      </div>
                      {diffEntries.length === 0 ? (
                        <p className="mt-2 text-xs text-slate-500">Sem detalhes registrados.</p>
                      ) : (
                        <ul className="mt-2 space-y-1 text-xs text-slate-600">
                          {diffEntries.map(([campo, valores]) => {
                            const valueObj =
                              valores && typeof valores === "object" && !Array.isArray(valores)
                                ? (valores as Record<string, unknown>)
                                : null;
                            const hasOldNew = Boolean(valueObj && ("old" in valueObj || "new" in valueObj));
                            const oldVal = hasOldNew ? formatValor(valueObj?.old) : formatValor(valores);
                            const newVal = hasOldNew ? formatValor(valueObj?.new) : "";

                            return (
                              <li key={`${item.id}-${campo}`}>
                                <span className="font-medium text-slate-700">{campo}:</span>{" "}
                                {hasOldNew ? `${oldVal} -> ${newVal}` : oldVal}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
