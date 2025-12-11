import Link from "next/link";
import { notFound } from "next/navigation";

import { carregarDetalheAvaliacao } from "@/lib/avaliacoes/turmaAvaliacoesServer";
import { STATUS_AVALIACAO_LABEL, type StatusAvaliacao } from "@/types/avaliacoes";
import {
  concluirAvaliacaoAction,
  iniciarAvaliacaoAction,
} from "@/app/(private)/avaliacoes/turma/[avaliacaoId]/statusActions";

export const dynamic = "force-dynamic";

export default async function AvaliacaoDetalhePage({
  params,
}: {
  params: { turmaId: string; avaliacaoId: string };
}) {
  const turmaId = Number(params.turmaId);
  const avaliacaoId = Number(params.avaliacaoId);

  if (Number.isNaN(turmaId) || Number.isNaN(avaliacaoId)) {
    notFound();
  }

  const contexto = await carregarDetalheAvaliacao(turmaId, avaliacaoId);

  if (!contexto) {
    return (
      <div className="px-4 py-6">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm">
            <p className="text-sm text-rose-600">
              Não foi possível carregar as informações desta avaliação.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { avaliacao, turma, modelo, conceitos, resultados } = contexto;
  const conceitoPorId = new Map(conceitos.map((c) => [c.id, c]));

  const status = (avaliacao.status ?? "RASCUNHO") as StatusAvaliacao;

  const renderStatusBadge = () => (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold",
        status === "CONCLUIDA"
          ? "bg-emerald-100 text-emerald-800"
          : status === "EM_ANDAMENTO"
            ? "bg-blue-100 text-blue-800"
            : "bg-slate-200 text-slate-700",
      ].join(" ")}
    >
      {STATUS_AVALIACAO_LABEL[status]}
    </span>
  );

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">{avaliacao.titulo}</h1>
          <p className="text-sm text-slate-600">
            {turma?.nome ?? "Turma"} · {turma?.curso ?? "Curso"}{" "}
            {turma?.nivel ? `· ${turma.nivel}` : ""}{" "}
            {turma?.ano_referencia ? `· ${turma.ano_referencia}` : ""}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Tipo: {modelo?.tipo_avaliacao ?? "—"} · Status: {renderStatusBadge()} · Obrigatória:{" "}
            {avaliacao.obrigatoria ? "Sim" : "Não"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Data prevista: {avaliacao.data_prevista ?? "—"} · Data realizada:{" "}
            {avaliacao.data_realizada ?? "—"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {status === "RASCUNHO" && (
              <form
                action={async () => iniciarAvaliacaoAction(avaliacaoId, turmaId)}
              >
                <button
                  type="submit"
                  className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                >
                  Iniciar avaliação
                </button>
              </form>
            )}
            {status === "EM_ANDAMENTO" && (
              <form
                action={async () => concluirAvaliacaoAction(avaliacaoId, turmaId)}
              >
                <button
                  type="submit"
                  className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  Concluir avaliação
                </button>
              </form>
            )}
            {status === "CONCLUIDA" && (
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                Avaliação concluída
              </span>
            )}
            <Link
              href={`/avaliacoes/turma/${avaliacaoId}/lancamento`}
              className="inline-flex items-center rounded-full bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-violet-700"
            >
              Lançar / editar notas
            </Link>
            <Link
              href={`/academico/turmas/${turmaId}`}
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Voltar para a turma
            </Link>
          </div>
        </header>

        <section className="space-y-2 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Resultados dos alunos</h2>
          </div>

          {!resultados || resultados.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhuma nota lançada ainda para esta avaliação. Use “Lançar / editar notas” para
              registrar.
            </p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left">Aluno</th>
                  <th className="px-3 py-2 text-left">Conceito final</th>
                  <th className="px-3 py-2 text-left">Data</th>
                  <th className="px-3 py-2 text-left">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {resultados.map((r) => {
                  const conceito = r.conceito_final_id
                    ? conceitoPorId.get(r.conceito_final_id)
                    : null;
                  return (
                    <tr key={`${r.pessoa_id}-${r.conceito_final_id ?? "s"}`}>
                      <td className="px-3 py-2 text-xs">
                        <div className="flex items-center gap-2">
                          {r.aluno_foto_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={r.aluno_foto_url}
                              alt={r.aluno_nome}
                              className="h-7 w-7 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600">
                              {r.aluno_nome
                                .split(" ")
                                .slice(0, 2)
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium text-slate-800">{r.aluno_nome}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {conceito ? (
                          <span
                            className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-[11px] font-semibold"
                            style={{
                              backgroundColor: conceito.cor_hex ?? "#e5e7eb",
                              color: "#111827",
                            }}
                          >
                            {conceito.rotulo}
                          </span>
                        ) : (
                          r.conceito_final_id ?? "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">{r.data_avaliacao ?? "—"}</td>
                      <td className="px-3 py-2 text-xs">{r.observacoes_professor ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <p className="text-[11px] text-slate-400">
            TODO: detalhar conceitos por grupo em uma próxima iteração.
          </p>
        </section>
      </div>
    </div>
  );
}
