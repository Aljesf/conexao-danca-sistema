import { notFound } from "next/navigation";

import { NovaAvaliacaoDialog } from "./_components/NovaAvaliacaoDialog";
import { EditarTurmaDialog } from "./_components/EditarTurmaDialog";
import { VincularProfessorDialog } from "./_components/VincularProfessorDialog";
import { listarAvaliacoesDaTurma } from "@/lib/academico/turmaAvaliacoesServer";
import { getSupabaseServer } from "@/lib/supabaseServer";
import type { Turma } from "@/types/turmas";

export const dynamic = "force-dynamic";

type TurmaProfessorDetalhe = {
  id: number;
  colaborador_id: number;
  funcao_id: number | null;
  principal: boolean;
  data_inicio: string | null;
  data_fim: string | null;
  ativo: boolean;
  observacoes: string | null;
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

async function carregarTurma(turmaId: number) {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("turmas")
    .select(
      `
        turma_id,
        nome,
        curso,
        nivel,
        tipo_turma,
        turno,
        ano_referencia,
        status,
        data_inicio,
        data_fim,
        carga_horaria_prevista,
        frequencia_minima_percentual,
        observacoes
      `,
    )
    .eq("turma_id", turmaId)
    .single();

  if (error || !data) {
    console.error("Erro ao carregar turma:", error);
    return null;
  }

  return data as Turma;
}

async function carregarProfessores(turmaId: number): Promise<TurmaProfessorDetalhe[]> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("turma_professores")
    .select(
      `
        id,
        turma_id,
        colaborador_id,
        funcao_id,
        principal,
        data_inicio,
        data_fim,
        ativo,
        observacoes,
        colaborador:colaboradores!turma_professores_colaborador_id_fkey (
          id,
          pessoa_id,
          pessoa:pessoas!colaboradores_pessoa_id_fkey (
            id,
            nome
          )
        ),
        funcao:funcoes_colaborador!turma_professores_funcao_id_fkey (
          id,
          nome,
          codigo
        )
      `,
    )
    .eq("turma_id", turmaId)
    .order("principal", { ascending: false })
    .order("data_inicio", { ascending: true });

  if (error) {
    console.error("Erro ao carregar professores da turma:", error);
    return [];
  }

  return (
    data?.map((row: any) => ({
      id: row.id,
      colaborador_id: row.colaborador_id,
      funcao_id: row.funcao_id ?? null,
      principal: row.principal ?? false,
      data_inicio: row.data_inicio ?? null,
      data_fim: row.data_fim ?? null,
      ativo: row.ativo ?? false,
      observacoes: row.observacoes ?? null,
      nome: row.colaborador?.pessoa?.nome ?? "Colaborador",
      funcao_nome: row.funcao?.nome ?? "Professor",
    })) ?? []
  );
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
    data?.map((row: any) => ({
      id: row.id,
      pessoa_id: row.pessoa_id,
      status: row.status ?? null,
      data_matricula: row.data_matricula ?? null,
      nome: row.aluno?.nome ?? "Aluno",
    })) ?? []
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Não informado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

type TurmaPageProps = {
  params: { turmaId: string };
};

export default async function TurmaDetalhePage({ params }: TurmaPageProps) {
  const turmaId = Number(params.turmaId);
  if (Number.isNaN(turmaId)) {
    notFound();
  }

  const [turma, professores, avaliacoes, alunos] = await Promise.all([
    carregarTurma(turmaId),
    carregarProfessores(turmaId),
    listarAvaliacoesDaTurma(turmaId),
    carregarAlunosMatriculados(turmaId),
  ]);

  if (!turma) {
    notFound();
  }

  const turmaKey = turma.turma_id ?? turma.id ?? turmaId;
  const cursoNivel = [turma.curso, turma.nivel].filter(Boolean).join(" / ") || "Curso não informado";

  return (
    <main className="p-8 space-y-10">
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Acadêmico</p>
          <h1 className="text-3xl font-semibold leading-tight text-slate-900">
            {turma.nome ?? turma.nome_turma ?? `Turma #${turmaKey}`}
          </h1>
          <p className="text-sm text-slate-500">{cursoNivel}</p>
        </div>
        <EditarTurmaDialog turma={turma} />
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Status</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{turma.status ?? "Sem status"}</p>
            <p className="text-xs text-slate-500">Tipo: {turma.tipo_turma ?? "REGULAR"}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Calendário</p>
            <p className="mt-1 text-sm text-slate-900">
              Início: {formatDate(turma.data_inicio)} | Fim: {formatDate(turma.data_fim)}
            </p>
            <p className="text-xs text-slate-500">Turno: {turma.turno ?? "Sem turno"} </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Carga e frequência</p>
            <p className="mt-1 text-sm text-slate-900">
              {turma.carga_horaria_prevista ?? "--"}h • Freq. mínima{" "}
              {turma.frequencia_minima_percentual ? `${turma.frequencia_minima_percentual}%` : "--"}
            </p>
            <p className="text-xs text-slate-500">Ano ref.: {turma.ano_referencia ?? "Não informado"}</p>
          </div>
        </div>
        {turma.observacoes && (
          <p className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
            {turma.observacoes}
          </p>
        )}
      </section>

      <section className="space-y-3">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Professores da turma</h2>
            <p className="text-sm text-slate-500">Vínculos ativos e históricos em turma_professores.</p>
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
                      {prof.funcao_nome} • {prof.principal ? "Principal" : "Auxiliar"}
                    </p>
                    {prof.observacoes && <p className="text-xs text-slate-500">{prof.observacoes}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
                      Início {formatDate(prof.data_inicio)}
                      {prof.data_fim ? ` • Fim ${formatDate(prof.data_fim)}` : ""}
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
            <h2 className="text-xl font-semibold text-slate-900">Avaliações da turma</h2>
            <p className="text-sm text-slate-500">Baseadas na tabela turma_avaliacoes.</p>
          </div>
          <NovaAvaliacaoDialog turmaId={turmaKey} />
        </header>
        <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
          {avaliacoes.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma avaliação cadastrada.</p>
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
                          Modelo: {av.modelo.nome} • Tipo: {av.modelo.tipo_avaliacao}
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
                          Obrigatória
                        </span>
                      )}
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">
                        Prevista: {av.data_prevista ? formatDate(av.data_prevista) : "Não definida"}
                        {av.data_realizada ? ` • Realizada: ${formatDate(av.data_realizada)}` : ""}
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
          <p className="text-sm text-slate-500">Lista de matrículas (tabela matriculas).</p>
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
                      Matrícula #{aluno.id}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-indigo-700">
                      Status: {aluno.status ?? "Sem status"}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">
                      Início: {aluno.data_matricula ? formatDate(aluno.data_matricula) : "Não informado"}
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
