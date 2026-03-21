"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SectionCard from "@/components/layout/SectionCard";
import type { HistoricoFrequenciaAlunoResult } from "@/lib/academico/frequencia";

type ApiResponse =
  | ({ ok: true } & HistoricoFrequenciaAlunoResult)
  | { ok: false; message?: string; code?: string };

type Props = {
  pessoaId: number;
};

function getStatusBadge(percentual: number, minima?: number | null) {
  const alvo = minima ?? 75;
  if (percentual >= alvo) {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (percentual >= Math.max(alvo - 10, 0)) {
    return "border border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border border-rose-200 bg-rose-50 text-rose-700";
}

export function FrequenciaAlunoCard({ pessoaId }: Props) {
  const [data, setData] = useState<HistoricoFrequenciaAlunoResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function carregar() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/pessoas/${pessoaId}/frequencia`, {
          cache: "no-store",
        });
        const json = (await res.json().catch(() => null)) as ApiResponse | null;

        if (!res.ok || !json || !json.ok) {
          throw new Error(json?.message || json?.code || "Falha ao carregar frequencia do aluno.");
        }

        if (active) {
          setData(json);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Falha ao carregar frequencia do aluno.");
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
  }, [pessoaId]);

  return (
    <SectionCard title="Frequencia" description="Historico consolidado por turma com base apenas nas aulas validadas e nos ultimos registros de presenca.">
      {loading ? <p className="text-sm text-slate-600">Carregando frequencia...</p> : null}

      {!loading && error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {!loading && !error && data ? (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Turmas</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{data.resumo.turmas_total}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Frequencia global</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{data.resumo.percentual_frequencia}%</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Presencas</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{data.resumo.presencas}</p>
              <p className="text-xs text-slate-500">Atrasos: {data.resumo.atrasos}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Faltas</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{data.resumo.faltas}</p>
              <p className="text-xs text-slate-500">Justificadas: {data.resumo.justificadas}</p>
            </div>
          </div>

          {data.turmas.length === 0 ? (
            <p className="text-sm text-slate-600">Nenhuma turma com historico de frequencia encontrada para esta pessoa.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-3">Turma</th>
                    <th className="py-2 pr-3">Frequencia</th>
                    <th className="py-2 pr-3">Presencas</th>
                    <th className="py-2 pr-3">Faltas</th>
                    <th className="py-2 pr-3">Status consolidado</th>
                    <th className="py-2 pr-3">Ultimo registro</th>
                    <th className="py-2 text-right">Acao</th>
                  </tr>
                </thead>
                <tbody>
                  {data.turmas.map((turma) => (
                    <tr key={turma.turma_id} className="border-b border-slate-100">
                      <td className="py-3 pr-3">
                        <div className="font-semibold text-slate-900">{turma.nome ?? `Turma #${turma.turma_id}`}</div>
                        <div className="text-xs text-slate-500">
                          {[turma.curso, turma.nivel, turma.turno].filter(Boolean).join(" | ") || "Sem classificacao"}
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="font-semibold text-slate-900">{turma.percentual_frequencia}%</div>
                        <div className="text-xs text-slate-500">{turma.total_aulas} aulas validadas</div>
                      </td>
                      <td className="py-3 pr-3">
                        {turma.presencas}
                        <span className="ml-1 text-xs text-slate-500">+ {turma.atrasos} atrasos</span>
                      </td>
                      <td className="py-3 pr-3">
                        {turma.faltas}
                        <span className="ml-1 text-xs text-slate-500">+ {turma.justificadas} just.</span>
                      </td>
                      <td className="py-3 pr-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(turma.percentual_frequencia, turma.frequencia_minima_percentual)}`}>
                          {turma.percentual_frequencia >= (turma.frequencia_minima_percentual ?? 75) ? "Em dia" : "Acompanhamento"}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        {turma.ultima_presenca ? (
                          <div>
                            <div className="font-medium text-slate-900">
                              {new Date(`${turma.ultima_presenca.data_aula}T00:00:00`).toLocaleDateString("pt-BR")}
                            </div>
                            <div className="text-xs text-slate-500">{turma.ultima_presenca.status}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">Sem registro</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <Link href={`/escola/turmas/${turma.turma_id}`} className="text-xs font-medium text-violet-600 hover:underline">
                          Abrir turma
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-sm font-semibold text-slate-900">Presencas recentes</p>
            {data.ultimas_presencas.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Nenhum registro recente encontrado.</p>
            ) : (
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {data.ultimas_presencas.map((item) => (
                  <div key={`${item.aula_id}-${item.status}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.turma_nome ?? `Turma #${item.turma_id}`}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(`${item.data_aula}T00:00:00`).toLocaleDateString("pt-BR")}
                          {item.aula_numero ? ` | Aula ${item.aula_numero}` : ""}
                        </p>
                      </div>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        item.status === "PRESENTE"
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                          : item.status === "ATRASO"
                            ? "border border-amber-200 bg-amber-50 text-amber-700"
                            : "border border-rose-200 bg-rose-50 text-rose-700"
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    {item.observacao ? <p className="mt-2 text-xs text-slate-600">{item.observacao}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}

export default FrequenciaAlunoCard;
