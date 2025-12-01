import Link from "next/link";
import { notFound } from "next/navigation";

import { listarTurma } from "@/lib/academico/turmasServer";
import { listarProfessoresDaTurma } from "@/lib/academico/turmaProfessoresServer";
import { listarAvaliacoesDaTurma } from "@/lib/academico/turmaAvaliacoesServer";
import type { TurmaProfessor } from "@/types/turmaProfessores";

export const dynamic = "force-dynamic";

export default async function TurmaDetalhePage({
  params,
}: {
  params: { turmaId: string };
}) {
  const turmaId = Number(params.turmaId);
  if (Number.isNaN(turmaId)) {
    notFound();
  }

  const [turma, professores, avaliacoes] = await Promise.all([
    listarTurma(turmaId),
    listarProfessoresDaTurma(turmaId),
    listarAvaliacoesDaTurma(turmaId),
  ]);

  if (!turma) {
    notFound();
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Acadêmico
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">
              {turma.nome ?? turma.nome_turma}
            </h1>
            <p className="text-sm text-slate-500">
              {(turma.curso ?? turma.modalidade ?? "—")} {turma.nivel ? `· ${turma.nivel}` : ""}
            </p>
          </div>
          <Link href="/academico/turmas" className="text-sm text-slate-500 hover:underline">
            ← Voltar para turmas
          </Link>
        </header>

        <section className="rounded-3xl border border-violet-100 bg-white/95 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Professores da turma</h2>
              <p className="text-sm text-slate-500">
                Professores, estagiários e funções vinculadas a esta turma.
              </p>
            </div>
            <Link
              href={`/academico/turmas/${turmaId}/professores/adicionar`}
              className="inline-flex items-center rounded-full bg-violet-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-violet-700"
            >
              + Adicionar professor
            </Link>
          </div>

          {professores.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum professor vinculado a esta turma ainda.</p>
          ) : (
            <ul className="space-y-3">
              {professores.map((p: TurmaProfessor) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-slate-800">
                      {p.colaboradores?.pessoas?.nome ?? "Professor"}
                      {p.principal && (
                        <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700 uppercase">
                          Principal
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-600">
                      {p.funcao?.nome} · Desde {p.data_inicio}
                      {p.data_fim && ` · até ${p.data_fim}`}
                    </p>
                  </div>
                  {p.ativo && (
                    <form
                      action={`/academico/turmas/${turmaId}/professores/${p.id}/encerrar`}
                      method="post"
                    >
                      <button className="text-xs text-rose-600 hover:underline">
                        Encerrar vínculo
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Avaliações da turma */}
        <section className="rounded-3xl border border-violet-100/80 bg-white/95 p-6 shadow-sm backdrop-blur">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 md:text-lg">
                Avaliações da turma
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Lista de avaliações vinculadas a esta turma. Avaliações
                obrigatórias são consideradas na conclusão e no currículo.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/academico/avaliacoes/modelos/novo"
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 md:text-sm"
              >
                Criar modelo de avaliação
              </Link>
              {/* Futuro: abrir modal para adicionar avaliação existente */}
              <button
                type="button"
                className="inline-flex items-center rounded-full bg-violet-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-violet-700 md:text-sm"
              >
                Adicionar avaliação à turma
              </button>
            </div>
          </div>

          {avaliacoes.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhuma avaliação vinculada ainda. Use o botão{" "}
              <span className="font-medium">“Adicionar avaliação à turma”</span>{" "}
              para começar.
            </p>
          ) : (
            <div className="space-y-3">
              {avaliacoes.map((av) => (
                <div
                  key={av.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {av.modelo?.nome ?? "Avaliação sem modelo"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {av.obrigatoria ? "Obrigatória" : "Opcional"}
                      {av.data_prevista && (
                        <>
                          {" · Prevista para "}
                          {new Date(av.data_prevista).toLocaleDateString("pt-BR")}
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">
                      {av.data_realizada
                        ? `Realizada em ${new Date(av.data_realizada).toLocaleDateString("pt-BR")}`
                        : "Ainda não realizada"}
                    </span>
                    {/* Futuro: botão de remover / editar */}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
