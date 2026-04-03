import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/requireUser";
import { TurmaDetalheHeaderCard } from "@/components/turmas/TurmaDetalheHeaderCard";
import { getSupabaseServerAuth } from "@/lib/supabaseServer";
import {
  getTurmaDetalheOperacional,
  type FaixaStatusFrequenciaTurma,
} from "@/lib/academico/turmas-operacional";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ turmaId: string }>;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Nao informado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
}

function faixaTone(value: FaixaStatusFrequenciaTurma) {
  if (value === "OK") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value === "ATENCAO") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

export default async function EscolaTurmaDetalhePage({ params }: PageProps) {
  const user = await requireUser();
  const supabase = await getSupabaseServerAuth();
  const { turmaId: turmaIdRaw } = await params;
  const turmaId = Number(turmaIdRaw);

  if (!Number.isInteger(turmaId) || turmaId <= 0) {
    notFound();
  }

  try {
    const detalhe = await getTurmaDetalheOperacional({
      supabase,
      userId: user.id,
      turmaId,
    });

    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <TurmaDetalheHeaderCard initialTurma={detalhe.turma} aulasConfirmadasCount={detalhe.aulas_confirmadas.length} />

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold text-slate-900">Alunos da turma</h2>
              <p className="text-sm text-slate-500">
                Resumo contextual de frequencia por aluno. A chamada completa continua restrita ao detalhe da aula
                validada.
              </p>
            </div>

            {detalhe.alunos.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                Nenhum aluno ativo encontrado nesta turma.
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="py-3 pr-4">Aluno</th>
                      <th className="py-3 pr-4">Status</th>
                      <th className="py-3 pr-4">Resumo</th>
                      <th className="py-3 pr-4">Percentual</th>
                      <th className="py-3 text-right">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalhe.alunos.map((aluno) => (
                      <tr key={aluno.aluno_pessoa_id} className="border-b border-slate-100 align-top">
                        <td className="py-4 pr-4">
                          <div className="font-medium text-slate-900">{aluno.nome ?? `Aluno ${aluno.aluno_pessoa_id}`}</div>
                          <div className="text-xs text-slate-500">
                            Matricula {aluno.matricula_id ?? "sem vinculo"} • {aluno.matricula_status ?? "sem status"}
                          </div>
                        </td>
                        <td className="py-4 pr-4 text-xs text-slate-600">{aluno.turma_aluno_status ?? "Sem status"}</td>
                        <td className="py-4 pr-4 text-xs text-slate-600">
                          <div>Total confirmadas: {aluno.total_aulas_confirmadas}</div>
                          <div>Presencas: {aluno.presencas_confirmadas}</div>
                          <div>Faltas: {aluno.faltas_confirmadas}</div>
                        </td>
                        <td className="py-4 pr-4">
                          <div className="font-medium text-slate-900">{aluno.percentual_frequencia.toFixed(1)}%</div>
                          <span
                            className={`mt-2 inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${faixaTone(aluno.faixa_status)}`}
                          >
                            {aluno.total_aulas_confirmadas > 0 ? aluno.faixa_status : "SEM_BASE"}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <Link
                            href={`/pessoas/${aluno.aluno_pessoa_id}`}
                            className="text-xs font-medium text-slate-700 hover:text-slate-900 hover:underline"
                          >
                            Abrir aluno
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold text-slate-900">Aulas confirmadas / validadas</h2>
              <p className="text-sm text-slate-500">
                Aqui ficam apenas os metadados essenciais das aulas realizadas. Frequencia detalhada, plano e
                observacoes aparecem somente na aula especifica.
              </p>
            </div>

            {detalhe.aulas_confirmadas.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                Nenhuma aula validada encontrada para esta turma.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {detalhe.aulas_confirmadas.map((aula) => (
                  <div key={aula.aula_id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-slate-900">
                          {new Date(`${aula.data_aula}T00:00:00`).toLocaleDateString("pt-BR")}
                          {aula.aula_numero ? ` • Aula ${aula.aula_numero}` : ""}
                        </div>
                        <div className="text-xs text-slate-500">
                          {aula.hora_inicio && aula.hora_fim ? `${aula.hora_inicio} - ${aula.hora_fim}` : "Horario nao informado"}
                        </div>
                        <div className="text-xs text-slate-500">
                          Fechada por {aula.fechada_por_nome ?? "Nao identificado"} em {formatDateTime(aula.fechada_em)}
                        </div>
                        {aula.observacao_execucao ? <p className="pt-1 text-sm text-slate-700">{aula.observacao_execucao}</p> : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/escola/diario-de-classe?turmaId=${detalhe.turma.turma_id}&date=${aula.data_aula}`}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Abrir diario
                        </Link>
                        <Link
                          href={`/escola/turmas/${detalhe.turma.turma_id}/aulas/${aula.aula_id}`}
                          className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                        >
                          Abrir aula
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    );
  } catch (error) {
    if (error instanceof Error && error.name === "SEM_ACESSO_TURMA") {
      return (
        <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-6">
          <div className="mx-auto max-w-3xl rounded-[28px] border border-amber-200 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-semibold text-slate-900">Acesso restrito</h1>
            <p className="mt-2 text-sm text-slate-600">{error.message}</p>
            <Link
              href="/escola/turmas"
              className="mt-4 inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Voltar para turmas
            </Link>
          </div>
        </main>
      );
    }

    if (error instanceof Error && error.message.includes("TURMA_NAO_ENCONTRADA")) {
      notFound();
    }

    throw error;
  }
}
