import Link from "next/link";
import { notFound } from "next/navigation";

import { listarTurma } from "@/lib/academico/turmasServer";
import { listarProfessoresDaTurma } from "@/lib/academico/turmaProfessoresServer";
import { listarAvaliacoesDaTurma } from "@/lib/avaliacoes/turmaAvaliacoesServer";
import { STATUS_AVALIACAO_LABEL, type StatusAvaliacao } from "@/types/avaliacoes";
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

        <section className="rounded-3xl border border-violet-100 bg-white/95 p-6 shadow-sm space-y-3">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Avaliações da turma</h2>
              <p className="text-sm text-slate-500">
                Modelos aplicados e avaliações previstas para esta turma.
              </p>
            </div>
            <Link
              href={`/academico/turmas/${turmaId}/avaliacoes/nova`}
              className="inline-flex items-center rounded-full bg-violet-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-violet-700"
            >
              + Nova avaliação
            </Link>
          </div>

          {(!avaliacoes || avaliacoes.length === 0) ? (
            <p className="text-sm text-slate-500">
              Nenhuma avaliação cadastrada para esta turma ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs uppercase tracking-[0.12em] text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left">Título</th>
                    <th className="px-3 py-2 text-left">Modelo</th>
                    <th className="px-3 py-2 text-left">Tipo</th>
                    <th className="px-3 py-2 text-left">Obrigatória</th>
                    <th className="px-3 py-2 text-left">Data prevista</th>
                    <th className="px-3 py-2 text-left">Data realizada</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {avaliacoes.map((a: any) => (
                    <tr key={a.id}>
                      <td className="px-3 py-2 font-medium">{a.titulo}</td>
                      <td className="px-3 py-2 text-xs">
                        {a.avaliacoes_modelo?.nome ?? "Modelo"}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {a.avaliacoes_modelo?.tipo_avaliacao ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-xs">{a.obrigatoria ? "Sim" : "Não"}</td>
                      <td className="px-3 py-2 text-xs">{a.data_prevista ?? "—"}</td>
                      <td className="px-3 py-2 text-xs">{a.data_realizada ?? "—"}</td>
                      <td className="px-3 py-2 text-xs">
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold",
                            a.status === "CONCLUIDA"
                              ? "bg-emerald-100 text-emerald-800"
                              : a.status === "EM_ANDAMENTO"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-slate-200 text-slate-700",
                          ].join(" ")}
                        >
                          {STATUS_AVALIACAO_LABEL[(a.status ?? "RASCUNHO") as StatusAvaliacao]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-xs">
                        <div className="flex justify-end gap-3">
                          <Link
                            href={`/academico/turmas/${turmaId}/avaliacoes/${a.id}`}
                            className="text-slate-600 hover:underline"
                          >
                            Ver detalhes
                          </Link>
                          <Link
                            href={`/avaliacoes/turma/${a.id}/lancamento`}
                            className="text-violet-600 hover:underline"
                          >
                            Lançar notas
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
