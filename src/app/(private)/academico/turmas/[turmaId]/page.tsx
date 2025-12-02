import Link from "next/link";

import {
  listarProfessoresDaTurma,
  type TurmaProfessor,
} from "@/lib/academico/turmaProfessoresServer";
import {
  listarAvaliacoesDaTurma,
  type TurmaAvaliacao,
} from "@/lib/academico/turmaAvaliacoesServer";

type TurmaPageProps = {
  params: {
    turmaId: string;
  };
};

/**
 * Página de detalhes da Turma (versão mínima, sem acesso ao banco).
 *
 * OBS: Este arquivo foi reescrito para corrigir erro de encoding (UTF-8) que
 * impedia o Next de ler o source. Depois que o projeto estiver estável,
 * podemos reintroduzir a lógica de carregamento de dados (turma, professores,
 * avaliações etc.) em cima desta base limpa.
 */
export default async function TurmaDetalhePage({ params }: TurmaPageProps) {
  const turmaId = Number(params.turmaId);

  // Carrega vínculos de professores da turma (versão simples, sem joins)
  let professores: TurmaProfessor[] = [];
  // Carrega avaliações vinculadas à turma
  let avaliacoes: TurmaAvaliacao[] = [];

  if (!Number.isNaN(turmaId)) {
    professores = await listarProfessoresDaTurma(turmaId);
    avaliacoes = await listarAvaliacoesDaTurma(turmaId);
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 via-white to-slate-50 px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {/* Breadcrumb / topo simples */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 md:text-xs">
          <div className="flex items-center gap-1">
            <span className="font-semibold uppercase tracking-[0.18em] text-slate-400">
              Acadêmico
            </span>
            <span className="text-slate-300">/</span>
            <span className="font-medium text-slate-500">Turmas</span>
            <span className="text-slate-300">/</span>
            <span className="font-medium text-slate-700">
              Turma #{Number.isNaN(turmaId) ? "—" : turmaId}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/academico/turmas"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm backdrop-blur hover:bg-slate-50 md:text-xs"
            >
              Voltar para lista de turmas
            </Link>
          </div>
        </div>

        {/* Card principal (placeholder) */}
        <section className="rounded-3xl border border-violet-100/80 bg-white/95 p-6 shadow-sm backdrop-blur">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
            Detalhes da Turma #{Number.isNaN(turmaId) ? "—" : turmaId}
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-600 md:text-[15px]">
            Esta é uma versão mínima da página de turma, criada para corrigir um
            erro de encoding no arquivo original. Assim que o projeto estiver
            estável, podemos reativar aqui:
          </p>

          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>Carregamento dos dados da turma a partir do Supabase.</li>
            <li>Listagem de professores da turma (principal e auxiliares).</li>
            <li>Seção de avaliações vinculadas à turma.</li>
            <li>Horários, status, datas de início/fim e outras informações.</li>
          </ul>

          <p className="mt-4 text-xs text-slate-400">
            (Arquivo limpo de caracteres inválidos em UTF-8. Layout definitivo
            será reimplementado depois.)
          </p>
        </section>

        {/* Professores da turma (versão simples, baseada em turma_professores) */}
        <section className="rounded-3xl border border-slate-100 bg-white/95 p-6 shadow-sm backdrop-blur">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 md:text-lg">
                Professores da turma
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Lista dos vínculos cadastrados na tabela{" "}
                <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">
                  turma_professores
                </code>
                . Em breve vamos substituir os IDs por nomes de colaboradores
                e funções.
              </p>
            </div>
          </div>

          {Number.isNaN(turmaId) ? (
            <p className="text-sm text-slate-500">
              ID da turma inválido. Verifique a URL.
            </p>
          ) : professores.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum professor vinculado a esta turma ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {professores.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Colaborador #{v.colaborador_id}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Função #{v.funcao_id}
                      {v.principal && " · Professor principal"}
                    </p>
                  </div>

                  <div className="text-xs text-slate-400">
                    {v.data_inicio
                      ? `Desde ${new Date(v.data_inicio).toLocaleDateString("pt-BR")}`
                      : "Data de início não informada"}
                    {v.data_fim &&
                      ` · Até ${new Date(v.data_fim).toLocaleDateString("pt-BR")}`}
                    {!v.ativo && " · (Vínculo inativado)"}
                  </div>
                </div>
              ))}
            </div>
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
                Lista das avaliações cadastradas em{" "}
                <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">
                  turma_avaliacoes
                </code>{" "}
                para esta turma. Em breve, será possível adicionar e remover
                avaliações diretamente por aqui.
              </p>
            </div>
          </div>

          {Number.isNaN(turmaId) ? (
            <p className="text-sm text-slate-500">
              ID da turma inválido. Verifique a URL.
            </p>
          ) : avaliacoes.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhuma avaliação vinculada a esta turma ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {avaliacoes.map((av) => {
                const dataPrevista = av.data_prevista
                  ? new Date(av.data_prevista).toLocaleDateString("pt-BR")
                  : null;
                const dataRealizada = av.data_realizada
                  ? new Date(av.data_realizada).toLocaleDateString("pt-BR")
                  : null;

                return (
                  <div
                    key={av.id}
                    className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {av.titulo}
                      </p>
                      {av.modelo && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          Modelo: {av.modelo.nome} · Tipo: {av.modelo.tipo_avaliacao}
                        </p>
                      )}
                      {av.descricao && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                          {av.descricao}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs md:justify-end">
                      <span
                        className={
                          "inline-flex items-center rounded-full px-3 py-1 font-semibold " +
                          (av.status === "CONCLUIDA"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : av.status === "EM_ANDAMENTO"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-50 text-slate-700 border border-slate-200")
                        }
                      >
                        {av.status}
                      </span>

                      {av.obrigatoria && (
                        <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 font-medium text-violet-700">
                          Obrigatória
                        </span>
                      )}

                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">
                        {dataPrevista ? `Prevista: ${dataPrevista}` : "Sem data prevista"}
                        {dataRealizada ? ` · Realizada: ${dataRealizada}` : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
