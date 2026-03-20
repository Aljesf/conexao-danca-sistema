import Link from "next/link";
import { notFound } from "next/navigation";

import { EditarTurmaDialog } from "./_components/EditarTurmaDialog";
import { EditarGradeHorariosDialog } from "./_components/EditarGradeHorariosDialog";
import { EncontrosCard } from "./_components/EncontrosCard";
import { NovaAvaliacaoDialog } from "./_components/NovaAvaliacaoDialog";
import { VincularProfessorDialog } from "./_components/VincularProfessorDialog";
import { FrequenciaTurmaSection } from "@/components/academico/frequencia/FrequenciaTurmaSection";
import { listarAvaliacoesDaTurma } from "@/lib/academico/turmaAvaliacoesServer";
import { listarProfessoresDaTurma, type TurmaProfessor } from "@/lib/academico/turmaProfessoresServer";
import { listarHorariosDaTurma, obterTurmaPorId } from "@/lib/academico/turmasServer";
import { getSupabaseServer } from "@/lib/supabaseServer";
import type { Turma, TurmaHorario } from "@/types/turmas";

export const dynamic = "force-dynamic";

type TurmaProfessorDetalhe = TurmaProfessor & {
  nome: string;
  funcao_nome: string;
};

type AlunoMatriculado = {
  id: number;
  pessoa_id: number;
  status: string | null;
  data_matricula: string | null;
  nome: string;
};

type TurmaHistoricoItem = {
  id: number;
  turma_id: number;
  ocorrida_em: string | null;
  actor_user_id: string | null;
  evento: string;
  resumo: string | null;
  diff: Record<string, unknown> | null;
  snapshot: Record<string, unknown> | null;
};

function diaSemanaLabel(dia: number) {
  const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  return labels[dia] ?? `Dia ${dia}`;
}

function formatHorario(horario: TurmaHorario) {
  const inicio = horario.inicio?.slice(0, 5) ?? "--:--";
  const fim = horario.fim?.slice(0, 5) ?? "--:--";
  return `${diaSemanaLabel(horario.day_of_week)} ${inicio} - ${fim}`;
}

async function carregarAlunosMatriculados(turmaId: number): Promise<AlunoMatriculado[]> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("matriculas")
    .select(
      `
        id,
        pessoa_id,
        status,
        data_matricula,
        aluno:pessoas!matriculas_pessoa_id_fkey (
          id,
          nome
        )
      `,
    )
    .eq("vinculo_id", turmaId)
    .order("id", { ascending: false });

  if (error) {
    console.error("Erro ao carregar alunos da turma:", error);
    return [];
  }

  return (
    data?.map((row) => {
      if (!row || typeof row !== "object") {
        return { id: 0, pessoa_id: 0, status: null, data_matricula: null, nome: "Aluno" };
      }

      const r = row as {
        id?: number;
        pessoa_id?: number;
        status?: string | null;
        data_matricula?: string | null;
        aluno?: { nome?: string | null };
      };

      return {
        id: r.id ?? 0,
        pessoa_id: r.pessoa_id ?? 0,
        status: r.status ?? null,
        data_matricula: r.data_matricula ?? null,
        nome: r.aluno?.nome ?? "Aluno",
      };
    }) ?? []
  );
}

async function carregarHistoricoTurma(turmaId: number): Promise<TurmaHistoricoItem[]> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("turmas_historico")
    .select("id,turma_id,ocorrida_em,actor_user_id,evento,resumo,diff,snapshot")
    .eq("turma_id", turmaId)
    .order("ocorrida_em", { ascending: false })
    .limit(30);

  if (error) {
    console.error("Erro ao carregar historico da turma:", error);
    return [];
  }

  return (
    data?.map((row) => {
      if (!row || typeof row !== "object") {
        return {
          id: 0,
          turma_id: turmaId,
          ocorrida_em: null,
          actor_user_id: null,
          evento: "UPDATE",
          resumo: null,
          diff: null,
          snapshot: null,
        };
      }

      const r = row as Record<string, unknown>;

      return {
        id: Number(r.id ?? 0),
        turma_id: Number(r.turma_id ?? turmaId),
        ocorrida_em: (r.ocorrida_em as string | null) ?? null,
        actor_user_id: (r.actor_user_id as string | null) ?? null,
        evento: String(r.evento ?? "UPDATE"),
        resumo: (r.resumo as string | null) ?? null,
        diff: (r.diff as Record<string, unknown> | null) ?? null,
        snapshot: (r.snapshot as Record<string, unknown> | null) ?? null,
      };
    }) ?? []
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Nao informado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Nao informado";
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

type TurmaPageProps = {
  params: Promise<{ turmaId: string }>;
};

export default async function TurmaDetalhePage({ params }: TurmaPageProps) {
  const { turmaId: turmaIdRaw } = await params;
  const turmaId = Number(turmaIdRaw);
  if (Number.isNaN(turmaId)) {
    notFound();
  }

  const [turma, professoresBase, avaliacoes, alunos, historico, horarios] = await Promise.all([
    obterTurmaPorId(turmaId),
    listarProfessoresDaTurma(turmaId),
    listarAvaliacoesDaTurma(turmaId),
    carregarAlunosMatriculados(turmaId),
    carregarHistoricoTurma(turmaId),
    listarHorariosDaTurma(turmaId),
  ]);

  if (!turma) {
    notFound();
  }

  const turmaKey = turma.turma_id ?? turmaId;
  const professores: TurmaProfessorDetalhe[] =
    professoresBase.map((p) => ({
      ...p,
      nome: p.nome_pessoa ?? "Colaborador",
      funcao_nome: p.funcao_nome ?? "Professor",
    })) ?? [];
  const cursoNivel = [turma.curso, turma.nivel].filter(Boolean).join(" / ") || "Curso nao informado";
  const localNome = turma.espaco?.local?.nome ?? "-";
  const espacoNome = turma.espaco?.nome ?? (turma.espaco_id ? `Espaco #${turma.espaco_id}` : "-");

  return (
    <main className="p-8 space-y-10">
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Academico</p>
          <h1 className="text-3xl font-semibold leading-tight text-slate-900">
            📚 {turma.nome ?? turma.nome_turma ?? `Turma #${turmaKey}`}
          </h1>
          <p className="text-sm text-slate-500">{cursoNivel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/escola/academico/turmas"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:border-slate-300"
          >
            Voltar
          </Link>
          <Link
            href={`/escola/turmas/${turmaKey}/servicos`}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:border-slate-300"
          >
            Servicos
          </Link>
          <EditarTurmaDialog turma={turma as Turma} />
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Status</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{turma.status ?? "Sem status"}</p>
            <p className="text-xs text-slate-500">Tipo: {turma.tipo_turma ?? "REGULAR"}</p>
            <p className="text-xs text-slate-500">Local: {localNome}</p>
            <p className="text-xs text-slate-500">Espaco: {espacoNome}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Calendario</p>
            <p className="mt-1 text-sm text-slate-900">
              Inicio: {formatDate(turma.data_inicio)} | Fim: {formatDate(turma.data_fim)}
            </p>
            <p className="text-xs text-slate-500">Turno: {turma.turno ?? "Sem turno"} </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Carga e frequencia</p>
            <p className="mt-1 text-sm text-slate-900">
              {turma.carga_horaria_prevista ?? "--"}h | Freq. minima{" "}
              {turma.frequencia_minima_percentual ? `${turma.frequencia_minima_percentual}%` : "--"}
            </p>
            <p className="text-xs text-slate-500">Ano ref.: {turma.ano_referencia ?? "Nao informado"}</p>
          </div>
        </div>
        {turma.observacoes && (
          <p className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
            {turma.observacoes}
          </p>
        )}
      </section>

      <section className="space-y-3">
        <header>
          <h2 className="text-xl font-semibold text-slate-900">Frequencia da turma</h2>
          <p className="text-sm text-slate-500">Historico reutilizavel do diario de classe para turma e aluno.</p>
        </header>
        <FrequenciaTurmaSection turmaId={turmaKey} />
      </section>

      <section className="space-y-3">
        <header>
          <h2 className="text-xl font-semibold text-slate-900">Encontros (datas especificas)</h2>
          <p className="text-sm text-slate-500">Cadastre encontros por data, sem depender do horario semanal.</p>
        </header>
        <EncontrosCard turmaId={turmaKey} />
      </section>

      <section className="space-y-3">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Horarios definidos</h2>
            <p className="text-sm text-slate-500">Horarios cadastrados para a turma.</p>
          </div>
          <EditarGradeHorariosDialog turmaId={turmaKey} />
        </header>
        <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
          {horarios.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum horario registrado.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {horarios.map((h) => (
                <div
                  key={h.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm text-slate-700"
                >
                  {formatHorario(h)}
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
                    className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 shadow-[0_1px_0_rgba(0,0,0,0.02)]"
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

      <section className="space-y-3">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Professores da turma</h2>
            <p className="text-sm text-slate-500">Vinculos ativos e historicos em turma_professores.</p>
          </div>
          <VincularProfessorDialog turmaId={turmaKey} />
        </header>
        <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
          {professores.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum professor vinculado.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {professores.map((prof) => (
                <div key={prof.id} className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">{prof.nome}</p>
                    <p className="text-xs text-slate-500">
                      {prof.funcao_nome} | {prof.principal ? "Principal" : "Auxiliar"}
                    </p>
                    {prof.observacoes && <p className="text-xs text-slate-500">{prof.observacoes}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
                      Inicio {formatDate(prof.data_inicio)}
                      {prof.data_fim ? ` | Fim ${formatDate(prof.data_fim)}` : ""}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 font-semibold ${
                        prof.ativo
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {prof.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="avaliacoes" className="space-y-3">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Avaliacoes da turma</h2>
            <p className="text-sm text-slate-500">Baseadas na tabela turma_avaliacoes.</p>
          </div>
          <NovaAvaliacaoDialog turmaId={turmaKey} />
        </header>
        <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
          {avaliacoes.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma avaliacao cadastrada.</p>
          ) : (
            <div className="space-y-3">
              {avaliacoes.map((av) => (
                <div
                  key={av.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 shadow-[0_1px_0_rgba(0,0,0,0.02)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">{av.titulo}</p>
                      {av.modelo && (
                        <p className="text-xs text-slate-500">
                          Modelo: {av.modelo.nome} | Tipo: {av.modelo.tipo_avaliacao}
                        </p>
                      )}
                      {av.descricao && <p className="text-xs text-slate-500">{av.descricao}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2 text-xs">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 font-semibold ${
                          av.status === "CONCLUIDA"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : av.status === "EM_ANDAMENTO"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        {av.status}
                      </span>
                      {av.obrigatoria && (
                        <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 font-medium text-violet-700">
                          Obrigatoria
                        </span>
                      )}
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">
                        Prevista: {av.data_prevista ? formatDate(av.data_prevista) : "Nao definida"}
                        {av.data_realizada ? ` | Realizada: ${formatDate(av.data_realizada)}` : ""}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <header>
          <h2 className="text-xl font-semibold text-slate-900">Alunos da turma</h2>
          <p className="text-sm text-slate-500">Lista de matriculas (tabela matriculas).</p>
        </header>
        <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
          {alunos.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum aluno matriculado.</p>
          ) : (
            <div className="space-y-2">
              {alunos.map((aluno) => (
                <div
                  key={aluno.id}
                  className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{aluno.nome}</p>
                    <p className="text-xs text-slate-500">Pessoa #{aluno.pessoa_id}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700">
                      Matricula #{aluno.id}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-indigo-700">
                      Status: {aluno.status ?? "Sem status"}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">
                      Inicio: {aluno.data_matricula ? formatDate(aluno.data_matricula) : "Nao informado"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
