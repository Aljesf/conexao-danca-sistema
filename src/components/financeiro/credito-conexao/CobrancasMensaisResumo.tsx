"use client";

import { formatBRLFromCents } from "@/lib/formatters/money";
import { type CobrancasMensaisResponse } from "@/lib/financeiro/creditoConexao/cobrancas";

type Props = {
  resumo: CobrancasMensaisResponse["resumo_geral"];
};

function ResumoCard({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{formatBRLFromCents(valor)}</p>
    </div>
  );
}

export function CobrancasMensaisResumo({ resumo }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Resumo geral da carteira operacional</h2>
          <p className="text-sm text-slate-600">
            Leitura consolidada da mesma carteira real de contas a receber, organizada por competencia, fatura e cobranca
            vinculada.
          </p>
        </div>
        <p className="text-sm text-slate-500">{resumo.total_registros} cobranca(s) elegivel(is) no filtro atual</p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <ResumoCard titulo="Previsto total" valor={resumo.total_valor_centavos} />
        <ResumoCard titulo="Pago total" valor={resumo.total_pago_centavos} />
        <ResumoCard titulo="Pendente total" valor={resumo.total_pendente_centavos} />
        <ResumoCard titulo="Vencido total" valor={resumo.total_vencido_centavos} />
        <ResumoCard titulo="Em cobranca NeoFin" valor={resumo.total_neofin_centavos} />
      </div>
    </section>
  );
}
