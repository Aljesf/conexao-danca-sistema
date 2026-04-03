"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TurmaEditarDadosModal } from "@/components/turmas/TurmaEditarDadosModal";
import { TurmaHorariosModal } from "@/components/turmas/TurmaHorariosModal";
import { TurmaProfessoresModal } from "@/components/turmas/TurmaProfessoresModal";
import type { TurmaResumoEditable } from "@/components/turmas/turma-config-types";

type Props = {
  initialTurma: TurmaResumoEditable;
  aulasConfirmadasCount: number;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Nao informado";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

export function TurmaDetalheHeaderCard({ initialTurma, aulasConfirmadasCount }: Props) {
  const [turma, setTurma] = useState<TurmaResumoEditable>(initialTurma);
  const [loadingResumo, setLoadingResumo] = useState(false);
  const [erroResumo, setErroResumo] = useState<string | null>(null);
  const [editarDadosOpen, setEditarDadosOpen] = useState(false);
  const [horariosOpen, setHorariosOpen] = useState(false);
  const [professoresOpen, setProfessoresOpen] = useState(false);

  async function refreshResumo() {
    setLoadingResumo(true);
    setErroResumo(null);
    try {
      const response = await fetch(`/api/escola/turmas/${turma.turma_id}`, { method: "GET" });
      const payload = (await response.json().catch(() => null)) as { turma?: TurmaResumoEditable; message?: string; error?: string } | null;
      if (!response.ok || !payload?.turma) {
        throw new Error(payload?.message ?? payload?.error ?? "Nao foi possivel recarregar o resumo da turma.");
      }
      setTurma(payload.turma);
    } catch (error) {
      setErroResumo(error instanceof Error ? error.message : "Nao foi possivel recarregar o resumo da turma.");
    } finally {
      setLoadingResumo(false);
    }
  }

  return (
    <>
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Escola / Turmas</p>
            <h1 className="text-3xl font-semibold text-slate-900">{turma.nome ?? `Turma #${turma.turma_id}`}</h1>
            <p className="text-sm text-slate-600">
              {[turma.curso, turma.nivel, turma.turno].filter(Boolean).join(" • ") || "Turma sem classificacao"}
            </p>
            <p className="text-sm text-slate-500">
              Professor principal: {turma.professor_principal ?? "Nao vinculado"} • {turma.grade_horario}
            </p>
            {erroResumo ? <p className="text-xs font-medium text-amber-700">{erroResumo}</p> : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/escola/turmas"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Voltar
            </Link>
            <Link
              href={`/escola/diario-de-classe?turmaId=${turma.turma_id}`}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Abrir diario
            </Link>
            <Link
              href={`/escola/turmas/${turma.turma_id}/servicos`}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Servicos
            </Link>
            <Button type="button" variant="outline" onClick={() => setEditarDadosOpen(true)} disabled={loadingResumo}>
              Editar dados da turma
            </Button>
            <Button type="button" variant="outline" onClick={() => setHorariosOpen(true)} disabled={loadingResumo}>
              Editar horarios
            </Button>
            <Button type="button" variant="outline" onClick={() => setProfessoresOpen(true)} disabled={loadingResumo}>
              Professores da turma
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Status</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{turma.status ?? "Sem status"}</p>
            <p className="text-xs text-slate-500">{turma.tipo_turma ?? "Tipo nao informado"}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Alunos</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{turma.total_alunos}</p>
            <p className="text-xs text-slate-500">Resumo de frequencia por aluno</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Aulas confirmadas</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{aulasConfirmadasCount}</p>
            <p className="text-xs text-slate-500">{loadingResumo ? "Recarregando resumo..." : turma.grade_horario}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Calendario</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {formatDate(turma.data_inicio)} - {formatDate(turma.data_fim)}
            </p>
            <p className="text-xs text-slate-500">
              {turma.local_nome ?? "Sem local"} • {turma.espaco_nome ?? "Sem espaco"}
            </p>
          </div>
        </div>

        {turma.observacoes ? (
          <p className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {turma.observacoes}
          </p>
        ) : null}
      </section>

      <TurmaEditarDadosModal open={editarDadosOpen} onOpenChange={setEditarDadosOpen} turma={turma} onSaved={refreshResumo} />
      <TurmaHorariosModal open={horariosOpen} onOpenChange={setHorariosOpen} turmaId={turma.turma_id} onSaved={refreshResumo} />
      <TurmaProfessoresModal open={professoresOpen} onOpenChange={setProfessoresOpen} turmaId={turma.turma_id} onSaved={refreshResumo} />
    </>
  );
}
