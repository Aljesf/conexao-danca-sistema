"use client";

import { formatBRLFromCents } from "@/lib/formatters/money";
import { type ResumoCarteiraOperacionalCanonica } from "@/lib/financeiro/carteira-operacional-canonica";

type Props = {
  resumo: ResumoCarteiraOperacionalCanonica;
  totalCobrancas: number;
};

function ResumoCard({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{formatBRLFromCents(valor)}</p>
    </div>
  );
}

export function CobrancasMensaisResumo({ resumo, totalCobrancas }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Resumo geral da carteira operacional</h2>
          <p className="text-sm text-slate-600">
            Leitura consolidada da carteira canonica por cobranca oficial da conta interna, com fatura interna e NeoFin apenas como camadas derivadas.
          </p>
        </div>
        <p className="text-sm text-slate-500">{totalCobrancas} cobranca(s) elegivel(is) no filtro atual</p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <ResumoCard titulo="Previsto total" valor={resumo.previstoCentavos} />
        <ResumoCard titulo="Pago total" valor={resumo.pagoCentavos} />
        <ResumoCard titulo="Pendente total" valor={resumo.pendenteCentavos} />
        <ResumoCard titulo="Vencido total" valor={resumo.vencidoCentavos} />
        <ResumoCard titulo="Em cobranca NeoFin" valor={resumo.emCobrancaNeoFinCentavos} />
      </div>
    </section>
  );
}
