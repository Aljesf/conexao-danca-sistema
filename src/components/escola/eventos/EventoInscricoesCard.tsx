import type { EventoInscricaoResumo } from "@/components/escola/eventos/types";

type EventoInscricoesCardProps = {
  inscricoes: EventoInscricaoResumo[];
};

function formatCurrency(valueCentavos: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueCentavos / 100);
}

function calcularTotalInscricao(inscricao: EventoInscricaoResumo): number {
  return (inscricao.itens ?? []).reduce(
    (acc, item) => acc + item.valor_total_centavos,
    0,
  );
}

export function EventoInscricoesCard({
  inscricoes,
}: EventoInscricoesCardProps) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-5 space-y-1">
        <h2 className="text-xl font-semibold text-zinc-900">
          Inscricoes da edicao
        </h2>
        <p className="text-sm text-zinc-600">
          Visao inicial das inscricoes cadastradas e seus itens financeiros.
        </p>
      </div>

      {inscricoes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-500">
          Nenhuma inscricao cadastrada para esta edicao.
        </div>
      ) : (
        <div className="grid gap-4">
          {inscricoes.map((inscricao) => {
            const total = calcularTotalInscricao(inscricao);
            const totalItens = inscricao.itens?.length ?? 0;

            return (
              <article
                key={inscricao.id}
                className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2 text-xs font-medium">
                      <span className="rounded-full bg-zinc-200 px-2.5 py-1 text-zinc-700">
                        {inscricao.status_inscricao}
                      </span>
                      <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">
                        {inscricao.status_financeiro}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900">
                        Pessoa #{inscricao.pessoa_id}
                      </h3>
                      <p className="text-sm text-zinc-600">
                        Aluno: {inscricao.aluno_pessoa_id ?? "-"} | Conta interna:{" "}
                        {inscricao.conta_interna_id ?? "-"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm lg:text-right">
                    <p className="font-medium text-zinc-900">
                      {formatCurrency(total)}
                    </p>
                    <p className="text-zinc-600">{totalItens} item(ns)</p>
                  </div>
                </div>

                {totalItens > 0 ? (
                  <div className="mt-4 grid gap-2">
                    {(inscricao.itens ?? []).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-zinc-200 bg-white p-3"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-sm font-medium text-zinc-900">
                              {item.descricao?.trim()
                                ? item.descricao
                                : "Item sem descricao"}
                            </p>
                            <p className="text-xs text-zinc-500">
                              Quantidade: {item.quantidade} | Status:{" "}
                              {item.status}
                            </p>
                          </div>

                          <p className="text-sm font-medium text-zinc-900">
                            {formatCurrency(item.valor_total_centavos)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
