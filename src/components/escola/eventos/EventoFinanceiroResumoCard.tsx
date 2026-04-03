import type { EventoFinanceiroReferenciaResumo } from "@/components/escola/eventos/types";

type EventoFinanceiroResumoCardProps = {
  referencias: EventoFinanceiroReferenciaResumo[];
};

function formatCurrency(valueCentavos: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueCentavos / 100);
}

export function EventoFinanceiroResumoCard({
  referencias,
}: EventoFinanceiroResumoCardProps) {
  const receitasPrevistas = referencias
    .filter((item) => item.natureza === "RECEITA")
    .reduce((acc, item) => acc + (item.valor_previsto_centavos ?? 0), 0);

  const receitasReais = referencias
    .filter((item) => item.natureza === "RECEITA")
    .reduce((acc, item) => acc + (item.valor_real_centavos ?? 0), 0);

  const despesasPrevistas = referencias
    .filter((item) => item.natureza === "DESPESA")
    .reduce((acc, item) => acc + (item.valor_previsto_centavos ?? 0), 0);

  const despesasReais = referencias
    .filter((item) => item.natureza === "DESPESA")
    .reduce((acc, item) => acc + (item.valor_real_centavos ?? 0), 0);

  const resultadoPrevisto = receitasPrevistas - despesasPrevistas;
  const resultadoReal = receitasReais - despesasReais;

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-5 space-y-1">
        <h2 className="text-xl font-semibold text-zinc-900">
          Financeiro basico
        </h2>
        <p className="text-sm text-zinc-600">
          Leitura inicial de receita, despesa e resultado da edicao.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            Receitas previstas
          </p>
          <p className="mt-2 text-xl font-semibold text-zinc-900">
            {formatCurrency(receitasPrevistas)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            Receitas reais
          </p>
          <p className="mt-2 text-xl font-semibold text-zinc-900">
            {formatCurrency(receitasReais)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            Despesas previstas
          </p>
          <p className="mt-2 text-xl font-semibold text-zinc-900">
            {formatCurrency(despesasPrevistas)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            Despesas reais
          </p>
          <p className="mt-2 text-xl font-semibold text-zinc-900">
            {formatCurrency(despesasReais)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-emerald-50 p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-700">
            Resultado previsto
          </p>
          <p className="mt-2 text-xl font-semibold text-emerald-900">
            {formatCurrency(resultadoPrevisto)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-blue-50 p-4">
          <p className="text-xs uppercase tracking-wide text-blue-700">
            Resultado real
          </p>
          <p className="mt-2 text-xl font-semibold text-blue-900">
            {formatCurrency(resultadoReal)}
          </p>
        </div>
      </div>
    </section>
  );
}
