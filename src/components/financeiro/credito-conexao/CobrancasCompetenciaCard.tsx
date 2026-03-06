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
};

function TotalCard({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{formatBRLFromCents(valor)}</p>
    </div>
  );
}

export function CobrancasCompetenciaCard({ competencia, onRegistrarRecebimento }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Competencia</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">{competencia.competencia_label}</h2>
          <p className="text-sm text-slate-600">
            Carteira organizada por risco operacional e proxima acao da equipe.
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
          descricao="Titulos com risco imediato. Atue primeiro aqui."
          tipo="pendente_vencido"
          itens={competencia.grupos.pendente_vencido}
          onRegistrarRecebimento={onRegistrarRecebimento}
        />

        <CobrancaStatusSection
          titulo="Pendente a vencer"
          descricao="Carteira aberta ainda dentro do prazo ou em janela de cobranca."
          tipo="pendente_a_vencer"
          itens={competencia.grupos.pendente_a_vencer}
          onRegistrarRecebimento={onRegistrarRecebimento}
        />

        <CobrancaStatusSection
          titulo="Pago"
          descricao="Cobrancas liquidadas para a competencia."
          tipo="pago"
          itens={competencia.grupos.pago}
          onRegistrarRecebimento={onRegistrarRecebimento}
        />
      </div>
    </section>
  );
}
