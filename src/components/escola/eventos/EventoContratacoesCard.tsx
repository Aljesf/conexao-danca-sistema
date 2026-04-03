import type { EventoContratacaoResumo } from "@/components/escola/eventos/types";

type EventoContratacoesCardProps = {
  contratacoes: EventoContratacaoResumo[];
};

function formatCurrency(valueCentavos: number | null): string {
  const value = valueCentavos ?? 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

export function EventoContratacoesCard({
  contratacoes,
}: EventoContratacoesCardProps) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-5 space-y-1">
        <h2 className="text-xl font-semibold text-zinc-900">Contratacoes</h2>
        <p className="text-sm text-zinc-600">
          Servicos e custos operacionais vinculados a edicao.
        </p>
      </div>

      {contratacoes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-500">
          Nenhuma contratacao cadastrada para esta edicao.
        </div>
      ) : (
        <div className="grid gap-4">
          {contratacoes.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs font-medium">
                    <span className="rounded-full bg-zinc-200 px-2.5 py-1 text-zinc-700">
                      {item.status}
                    </span>
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
                      {item.tipo_servico}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">
                      {item.descricao?.trim()
                        ? item.descricao
                        : "Servico sem descricao"}
                    </h3>
                    <p className="text-sm text-zinc-600">
                      Prestador: {item.prestador_pessoa_id ?? "-"} | Conta a
                      pagar: {item.conta_pagar_id ?? "-"}
                    </p>
                  </div>
                </div>

                <div className="grid gap-2 text-sm lg:text-right">
                  <p className="text-zinc-600">
                    Previsto:{" "}
                    <span className="font-medium text-zinc-900">
                      {formatCurrency(item.valor_previsto_centavos)}
                    </span>
                  </p>
                  <p className="text-zinc-600">
                    Contratado:{" "}
                    <span className="font-medium text-zinc-900">
                      {formatCurrency(item.valor_contratado_centavos)}
                    </span>
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
