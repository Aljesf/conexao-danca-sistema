import type { EventoCoreografiaResumo } from "@/components/escola/eventos/types";

type EventoCoreografiasCardProps = {
  coreografias: EventoCoreografiaResumo[];
};

function formatCurrency(valueCentavos: number | null): string {
  if (valueCentavos === null) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueCentavos / 100);
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "-";
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}min ${String(remaining).padStart(2, "0")}s`;
}

export function EventoCoreografiasCard({
  coreografias,
}: EventoCoreografiasCardProps) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-5 space-y-1">
        <h2 className="text-xl font-semibold text-zinc-900">Coreografias</h2>
        <p className="text-sm text-zinc-600">
          Estrutura artistica da edicao com reutilizacao do cadastro mestre e
          configuracoes especificas do evento.
        </p>
      </div>

      {coreografias.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-500">
          Nenhuma coreografia vinculada a esta edicao.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {coreografias.map((vinculo) => {
            const totalParticipantes = vinculo.participantes?.length ?? 0;
            const duracao = vinculo.duracao_prevista_no_evento_segundos
              ?? vinculo.coreografia.duracao_estimada_segundos;

            return (
              <article
                key={vinculo.id}
                className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2 text-xs font-medium">
                    <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">
                      Ordem {vinculo.ordem_prevista_apresentacao ?? "-"}
                    </span>
                    <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-700">
                      {vinculo.coreografia.tipo_formacao}
                    </span>
                    <span className="rounded-full bg-zinc-200 px-2.5 py-1 text-zinc-700">
                      {vinculo.coreografia.modalidade?.trim()
                        ? vinculo.coreografia.modalidade
                        : "Sem modalidade"}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 ${
                        vinculo.ativa
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-zinc-200 text-zinc-700"
                      }`}
                    >
                      {vinculo.ativa ? "Vinculada" : "Arquivada"}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-zinc-900">
                      {vinculo.coreografia.nome}
                    </h3>
                    {vinculo.coreografia.descricao?.trim() ? (
                      <p className="mt-1 text-sm text-zinc-600">
                        {vinculo.coreografia.descricao}
                      </p>
                    ) : null}
                    <p className="text-sm text-zinc-600">
                      Estilo:{" "}
                      {vinculo.coreografia.estilo?.nome?.trim()
                        ? vinculo.coreografia.estilo.nome
                        : "Nao informado"}
                    </p>
                  </div>

                  <dl className="grid gap-3 text-sm text-zinc-600 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-zinc-400">
                        Participantes
                      </dt>
                      <dd>
                        {vinculo.coreografia.quantidade_minima_participantes} a{" "}
                        {vinculo.coreografia.quantidade_maxima_participantes}
                        {totalParticipantes > 0 ? ` · elenco ${totalParticipantes}` : ""}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-zinc-400">
                        Duracao prevista
                      </dt>
                      <dd>{formatDuration(duracao)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-zinc-400">
                        Musica
                      </dt>
                      <dd>
                        {vinculo.coreografia.sugestao_musica?.trim()
                          ? vinculo.coreografia.sugestao_musica
                          : "Nao informada"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-zinc-400">
                        Ajuste legado de valor
                      </dt>
                      <dd>
                        {formatCurrency(
                          vinculo.valor_participacao_coreografia_centavos,
                        )}
                      </dd>
                    </div>
                  </dl>

                  {vinculo.coreografia.link_musica?.trim() ? (
                    <a
                      href={vinculo.coreografia.link_musica}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex text-sm font-medium text-violet-700 hover:text-violet-800"
                    >
                      Abrir link da musica
                    </a>
                  ) : null}

                  {vinculo.observacoes_do_evento?.trim() ? (
                    <p className="text-sm text-zinc-600">
                      {vinculo.observacoes_do_evento}
                    </p>
                  ) : null}

                  {totalParticipantes > 0 ? (
                    <div className="rounded-xl border border-zinc-200 bg-white p-3">
                      <p className="mb-2 text-xs uppercase tracking-wide text-zinc-400">
                        Elenco no evento
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(vinculo.participantes ?? []).map((participante) => (
                          <span
                            key={participante.id}
                            className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                          >
                            {participante.pessoa_id
                              ? `Pessoa #${participante.pessoa_id}`
                              : participante.aluno_id
                                ? `Aluno #${participante.aluno_id}`
                                : participante.inscricao_id
                                  ? `Inscricao ${participante.inscricao_id}`
                                  : "Participante"}
                            {participante.papel?.trim()
                              ? ` - ${participante.papel}`
                              : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
