import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/requireUser";
import { getSupabaseServerAuth } from "@/lib/supabaseServer";
import { getAulaDetalheOperacional } from "@/lib/academico/turmas-operacional";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ turmaId: string; aulaId: string }>;
};

type PlanoBloco = {
  id?: number;
  ordem?: number | null;
  titulo?: string | null;
  objetivo?: string | null;
  observacoes?: string | null;
  plano_aula_subblocos?: Array<{
    id?: number;
    ordem?: number | null;
    titulo?: string | null;
    instrucoes?: string | null;
  }> | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Nao informado";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Nao informado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
}

function statusExecucaoTone(status: string | null | undefined) {
  const normalized = (status ?? "").toUpperCase();
  if (normalized === "VALIDADA") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalized === "ABERTA") return "border-sky-200 bg-sky-50 text-sky-700";
  if (normalized === "NAO_REALIZADA") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

function statusPresencaTone(status: string | null | undefined) {
  const normalized = (status ?? "").toUpperCase();
  if (normalized === "PRESENTE") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalized === "ATRASO") return "border-amber-200 bg-amber-50 text-amber-800";
  if (normalized === "JUSTIFICADA") return "border-sky-200 bg-sky-50 text-sky-700";
  if (normalized === "FALTA") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

export default async function EscolaTurmaAulaPage({ params }: PageProps) {
  const user = await requireUser();
  const supabase = await getSupabaseServerAuth();
  const { turmaId: turmaIdRaw, aulaId: aulaIdRaw } = await params;
  const turmaId = Number(turmaIdRaw);
  const aulaId = Number(aulaIdRaw);

  if (!Number.isInteger(turmaId) || turmaId <= 0 || !Number.isInteger(aulaId) || aulaId <= 0) {
    notFound();
  }

  try {
    const detalhe = await getAulaDetalheOperacional({
      supabase,
      userId: user.id,
      turmaId,
      aulaId,
    });

    const plano = (detalhe.plano_contexto.plano as {
      intencao_pedagogica?: string | null;
      observacoes_gerais?: string | null;
      playlist_url?: string | null;
      plano_aula_blocos?: PlanoBloco[] | null;
    } | null) ?? null;
    const blocos = [...(plano?.plano_aula_blocos ?? [])].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Escola / Aula validada</p>
                <h1 className="text-3xl font-semibold text-slate-900">
                  {detalhe.turma.nome ?? `Turma #${detalhe.turma.turma_id}`} • {formatDate(detalhe.aula.data_aula)}
                </h1>
                <p className="text-sm text-slate-600">
                  {detalhe.aula.aula_numero ? `Aula ${detalhe.aula.aula_numero} • ` : ""}
                  {detalhe.aula.hora_inicio && detalhe.aula.hora_fim
                    ? `${detalhe.aula.hora_inicio} - ${detalhe.aula.hora_fim}`
                    : "Horario nao informado"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/escola/turmas/${detalhe.turma.turma_id}`}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Voltar para turma
                </Link>
                <Link
                  href={`/escola/diario-de-classe?turmaId=${detalhe.turma.turma_id}&date=${detalhe.aula.data_aula}`}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Abrir diario
                </Link>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Status</p>
                <span
                  className={`mt-2 inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${statusExecucaoTone(detalhe.aula.status_execucao)}`}
                >
                  {detalhe.aula.status_execucao}
                </span>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Abertura</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{detalhe.aula.aberta_por_nome ?? "Nao registrada"}</p>
                <p className="text-xs text-slate-500">{formatDateTime(detalhe.aula.aberta_em)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Fechamento</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{detalhe.aula.fechada_por_nome ?? "Nao registrado"}</p>
                <p className="text-xs text-slate-500">{formatDateTime(detalhe.aula.fechada_em)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Frequencia</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{detalhe.frequencia.resumo.total_alunos} alunos</p>
                <p className="text-xs text-slate-500">
                  {detalhe.frequencia.resumo.presentes} presentes • {detalhe.frequencia.resumo.faltas} faltas
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-slate-900">Conteudo / plano executado</h2>
              <p className="text-sm text-slate-500">
                A unidade operacional completa da aula fica aqui: plano, observacoes de execucao, avaliacoes relacionadas
                e frequencia detalhada.
              </p>
            </div>

            {!plano ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                Nenhum plano de aula vinculado a esta aula.
              </div>
            ) : (
              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr),minmax(0,1fr)]">
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Intencao pedagogica</p>
                    <p className="mt-1 text-sm text-slate-800">{plano.intencao_pedagogica ?? "Nao informada."}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Observacoes gerais</p>
                    <p className="mt-1 text-sm text-slate-800">{plano.observacoes_gerais ?? "Sem observacoes gerais."}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Playlist</p>
                    {plano.playlist_url ? (
                      <Link href={plano.playlist_url} className="mt-1 block text-sm font-medium text-slate-900 hover:underline">
                        {plano.playlist_url}
                      </Link>
                    ) : (
                      <p className="mt-1 text-sm text-slate-800">Sem playlist vinculada.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Observacao de execucao</p>
                    <p className="mt-1 text-sm text-slate-800">{detalhe.aula.observacao_execucao ?? "Sem observacao de execucao."}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Notas pos-aula</p>
                    <p className="mt-1 text-sm text-slate-800">
                      {detalhe.plano_contexto.instancia?.notas_pos_aula ?? "Sem notas pos-aula registradas."}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Instancia do plano</p>
                    <p className="mt-1 text-sm text-slate-800">
                      {detalhe.plano_contexto.instancia?.status ?? "Sem instancia concluida"}
                    </p>
                    <p className="text-xs text-slate-500">
                      Concluido em {formatDateTime(detalhe.plano_contexto.instancia?.concluido_em)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {blocos.length > 0 ? (
              <div className="mt-4 space-y-3">
                {blocos.map((bloco) => (
                  <div key={bloco.id ?? bloco.ordem ?? bloco.titulo ?? "bloco"} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-sm font-semibold text-slate-900">
                      {bloco.ordem ? `${bloco.ordem}. ` : ""}
                      {bloco.titulo ?? "Bloco"}
                    </div>
                    <p className="mt-1 text-sm text-slate-700">{bloco.objetivo ?? bloco.observacoes ?? "Sem objetivo registrado."}</p>
                    {Array.isArray(bloco.plano_aula_subblocos) && bloco.plano_aula_subblocos.length > 0 ? (
                      <ul className="mt-3 space-y-2 text-sm text-slate-600">
                        {bloco.plano_aula_subblocos
                          .slice()
                          .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
                          .map((subbloco) => (
                            <li key={subbloco.id ?? subbloco.ordem ?? `${bloco.id}-sub-${subbloco.titulo ?? "item"}`}>
                              <span className="font-medium text-slate-800">{subbloco.titulo ?? "Subbloco"}:</span>{" "}
                              {subbloco.instrucoes ?? "Sem instrucoes registradas."}
                            </li>
                          ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-slate-900">Avaliacoes relacionadas</h2>
              <p className="text-sm text-slate-500">
                Relacionadas por data realizada ou prevista da avaliacao dentro desta turma.
              </p>
            </div>

            {detalhe.avaliacoes_relacionadas.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                Nenhuma avaliacao relacionada a esta aula.
              </div>
            ) : (
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {detalhe.avaliacoes_relacionadas.map((avaliacao) => (
                  <Link
                    key={avaliacao.id}
                    href={`/escola/academico/turmas/${detalhe.turma.turma_id}/avaliacoes/${avaliacao.id}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 hover:border-slate-300 hover:bg-slate-100"
                  >
                    <div className="text-sm font-semibold text-slate-900">{avaliacao.titulo}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Prevista: {formatDate(avaliacao.data_prevista)} • Realizada: {formatDate(avaliacao.data_realizada)}
                    </div>
                    <div className="mt-2 text-sm text-slate-700">{avaliacao.descricao ?? "Sem descricao."}</div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-slate-900">Frequencia detalhada da aula</h2>
              <p className="text-sm text-slate-500">Frequencia completa restrita ao contexto desta aula confirmada.</p>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Presentes</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{detalhe.frequencia.resumo.presentes}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Faltas</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{detalhe.frequencia.resumo.faltas}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Atrasos</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{detalhe.frequencia.resumo.atrasos}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Justificadas</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{detalhe.frequencia.resumo.justificadas}</p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="py-3 pr-4">Aluno</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Observacao</th>
                    <th className="py-3 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {detalhe.frequencia.alunos.map((aluno) => (
                    <tr key={aluno.aluno_pessoa_id} className="border-b border-slate-100 align-top">
                      <td className="py-4 pr-4">
                        <div className="font-medium text-slate-900">{aluno.nome ?? `Aluno ${aluno.aluno_pessoa_id}`}</div>
                        <div className="text-xs text-slate-500">{aluno.matricula_status ?? "Sem status de matricula"}</div>
                      </td>
                      <td className="py-4 pr-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${statusPresencaTone(aluno.status_presenca)}`}
                        >
                          {aluno.status_presenca ?? "PENDENTE"}
                        </span>
                        {aluno.minutos_atraso ? (
                          <div className="mt-1 text-xs text-slate-500">{aluno.minutos_atraso} min de atraso</div>
                        ) : null}
                      </td>
                      <td className="py-4 pr-4 text-sm text-slate-600">{aluno.observacao ?? "Sem observacao."}</td>
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
          </section>
        </div>
      </main>
    );
  } catch (error) {
    if (error instanceof Error && (error.name === "SEM_ACESSO_TURMA" || error.message.includes("SEM_ACESSO"))) {
      return (
        <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-6">
          <div className="mx-auto max-w-3xl rounded-[28px] border border-amber-200 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-semibold text-slate-900">Acesso restrito</h1>
            <p className="mt-2 text-sm text-slate-600">{error.message}</p>
            <Link
              href={`/escola/turmas/${turmaId}`}
              className="mt-4 inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Voltar para turma
            </Link>
          </div>
        </main>
      );
    }

    if (error instanceof Error && (error.message.includes("NAO_ENCONTRADA") || error.message === "AULA_FORA_DA_TURMA")) {
      notFound();
    }

    throw error;
  }
}
