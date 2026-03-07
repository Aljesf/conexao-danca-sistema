"use client";

import { formatBRLFromCents } from "@/lib/formatters/money";
import {
  type CobrancaOperacionalItem,
  type CobrancasCompetenciaGrupo,
} from "@/lib/financeiro/creditoConexao/cobrancas";
import { CobrancaStatusSection } from "./CobrancaStatusSection";

type Props = {
  competencia: CobrancasCompetenciaGrupo;
  onRegistrarRecebimento?: (item: CobrancaOperacionalItem) => void;
  onVincularFatura?: (item: CobrancaOperacionalItem) => void;
};

function TotalCard({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{formatBRLFromCents(valor)}</p>
    </div>
  );
}

export function CobrancasCompetenciaCard({ competencia, onRegistrarRecebimento, onVincularFatura }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Competencia ativa</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">{competencia.competencia_label}</h2>
          <p className="text-sm text-slate-600">
            Mensalidades, avulsas, cobrancas sem NeoFin e inconsistencias operacionais reunidas no mesmo mes.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <TotalCard titulo="Previsto" valor={competencia.totais.previsto_centavos} />
          <TotalCard titulo="Pago" valor={competencia.totais.pago_centavos} />
          <TotalCard titulo="Pendente" valor={competencia.totais.pendente_centavos} />
          <TotalCard titulo="A vencer" valor={competencia.totais.a_vencer_centavos} />
          <TotalCard titulo="Vencido" valor={competencia.totais.vencido_centavos} />
          <TotalCard titulo="Em cobranca NeoFin" valor={competencia.totais.neofin_centavos} />
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <CobrancaStatusSection
          titulo="Pendente vencido"
          descricao="Risco imediato. Priorize cobranca ativa, ajuste de vinculo e saneamento da carteira."
          tipo="pendente_vencido"
          itens={competencia.grupos.pendente_vencido}
          onRegistrarRecebimento={onRegistrarRecebimento}
          onVincularFatura={onVincularFatura}
        />

        <CobrancaStatusSection
          titulo="Pendente a vencer"
          descricao="Titulos ainda dentro da janela operacional do ciclo atual."
          tipo="pendente_a_vencer"
          itens={competencia.grupos.pendente_a_vencer}
          onRegistrarRecebimento={onRegistrarRecebimento}
          onVincularFatura={onVincularFatura}
        />

        <CobrancaStatusSection
          titulo="Pago"
          descricao="Recebimentos liquidados para a competencia ativa."
          tipo="pago"
          itens={competencia.grupos.pago}
          onRegistrarRecebimento={onRegistrarRecebimento}
          onVincularFatura={onVincularFatura}
        />
      </div>
    </section>
  );
}
