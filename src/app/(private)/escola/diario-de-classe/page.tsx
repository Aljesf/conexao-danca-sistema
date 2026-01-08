"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SectionCard, StatCard, pillAccent, pillNeutral } from "@/components/ui/conexao-cards";

type TabKey = "frequencia" | "plano" | "conteudo" | "observacoes" | "avaliacoes";

const tabs: { key: TabKey; label: string }[] = [
  { key: "frequencia", label: "Frequência" },
  { key: "plano", label: "Plano de aula" },
  { key: "conteudo", label: "Conteúdo do curso" },
  { key: "observacoes", label: "Observações" },
  { key: "avaliacoes", label: "Avaliações" },
];

export default function DiarioDeClassePage() {
  const [tab, setTab] = useState<TabKey>("frequencia");

  // MVP UI: placeholders para futura integração
  const [professor, setProfessor] = useState<string>("");
  const [turma, setTurma] = useState<string>("");
  const [data, setData] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const prontoParaAPI = useMemo(() => Boolean(professor && turma && data), [professor, turma, data]);

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-violet-100/70 bg-white/95 px-6 py-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Acadêmico</p>
            <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">Diário de classe</h1>
            <p className="mt-1 text-sm text-slate-600">
              Selecione a turma e registre a aula do dia: frequência, plano, observações e avaliações.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link className={pillNeutral} href="/escola/academico/turmas">
              Turmas
            </Link>
            <Link className={pillNeutral} href="/escola/academico/turmas/grade">
              Grade
            </Link>
            <button className={pillAccent} onClick={() => setTab("frequencia")}>
              Ir para frequência
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard
          label="Status"
          value={prontoParaAPI ? "Pronto" : "Pendente"}
          description="seleção mínima para API"
          tone={prontoParaAPI ? "violet" : "amber"}
        />
        <StatCard label="Professor" value={professor ? "Selecionado" : "—"} description="fase API" />
        <StatCard label="Turma" value={turma ? "Selecionada" : "—"} description="fase API" />
        <StatCard label="Data" value={data} description="aula do dia" tone="rose" />
      </div>

      <SectionCard
        title="Contexto da aula"
        subtitle="Seleção"
        description="Nesta etapa, os campos ainda são placeholders. Na fase API, serão conectados à seleção real de professor e turma."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-slate-500">Professor</div>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="(seleção será conectada na fase API)"
              value={professor}
              onChange={(e) => setProfessor(e.target.value)}
            />
          </div>

          <div>
            <div className="text-xs text-slate-500">Turma</div>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="(seleção será conectada na fase API)"
              value={turma}
              onChange={(e) => setTurma(e.target.value)}
            />
          </div>

          <div>
            <div className="text-xs text-slate-500">Data</div>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Registro da aula"
        subtitle="Diário"
        description="As funcionalidades abaixo serão conectadas na fase de API (turma_aulas, turma_aula_presencas, etc.)."
        actions={
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                className={t.key === tab ? pillAccent : pillNeutral}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        }
      >
        {tab === "frequencia" ? (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-900">Frequência</div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm">
              <ul className="list-disc pl-6 text-sm text-slate-600 space-y-1">
                <li>criar/abrir aula do dia (turma_aulas)</li>
                <li>listar alunos da turma</li>
                <li>registrar presença (turma_aula_presencas)</li>
                <li>justificativa e auditoria</li>
              </ul>
            </div>
          </div>
        ) : null}

        {tab === "plano" ? (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-900">Plano de aula</div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm text-sm text-slate-600">
              Placeholder: o professor registra o plano do dia, objetivos e atividades.
            </div>
          </div>
        ) : null}

        {tab === "conteudo" ? (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-900">Conteúdo do curso</div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm text-sm text-slate-600">
              Placeholder: vínculo com módulos/aulas previstas e progresso do conteúdo.
            </div>
          </div>
        ) : null}

        {tab === "observacoes" ? (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-900">Observações</div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm text-sm text-slate-600">
              Placeholder: observações pedagógicas, comportamentais e registros internos.
            </div>
          </div>
        ) : null}

        {tab === "avaliacoes" ? (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-900">Avaliações</div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm text-sm text-slate-600">
              Placeholder: notas/avaliações por aula e por ciclo (quando o módulo de avaliações estiver integrado).
            </div>
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}
