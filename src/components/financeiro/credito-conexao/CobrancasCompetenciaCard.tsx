"use client";

import { formatBRLFromCents } from "@/lib/formatters/money";
import {
  type GrupoCarteiraPorCompetencia,
  type LinhaCarteiraCanonica,
} from "@/lib/financeiro/carteira-operacional-canonica";
import { CobrancaStatusSection } from "./CobrancaStatusSection";

type Props = {
  competencia: GrupoCarteiraPorCompetencia;
  onRegistrarRecebimento?: (item: LinhaCarteiraCanonica) => void;
  onVincularFatura?: (item: LinhaCarteiraCanonica) => void;
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
  const pago = competencia.itens.filter((item) => item.statusOperacional === "PAGO");
  const pendente = competencia.itens.filter((item) => item.statusOperacional === "PENDENTE");
  const vencido = competencia.itens.filter((item) => item.statusOperacional === "VENCIDO");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Competencia ativa</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">{competencia.competenciaLabel}</h2>
          <p className="text-sm text-slate-600">
            Cada linha abaixo representa uma cobranca oficial da conta interna, com a composicao economica detalhada por itens.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <TotalCard titulo="Previsto" valor={competencia.resumo.previstoCentavos} />
          <TotalCard titulo="Pago" valor={competencia.resumo.pagoCentavos} />
          <TotalCard titulo="Pendente" valor={competencia.resumo.pendenteCentavos} />
          <TotalCard titulo="Vencido" valor={competencia.resumo.vencidoCentavos} />
          <TotalCard titulo="Em cobranca NeoFin" valor={competencia.resumo.emCobrancaNeoFinCentavos} />
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <CobrancaStatusSection
          titulo="Vencido"
          descricao="Cobrancas oficiais da conta interna com saldo aberto e vencimento ja ultrapassado."
          tipo="pendente_vencido"
          itens={vencido}
          onRegistrarRecebimento={onRegistrarRecebimento}
          onVincularFatura={onVincularFatura}
        />

        <CobrancaStatusSection
          titulo="Pendente"
          descricao="Cobrancas oficiais da conta interna ainda abertas, mas nao vencidas."
          tipo="pendente_a_vencer"
          itens={pendente}
          onRegistrarRecebimento={onRegistrarRecebimento}
          onVincularFatura={onVincularFatura}
        />

        <CobrancaStatusSection
          titulo="Pago"
          descricao="Cobrancas oficiais da conta interna com saldo zerado pela leitura canonica."
          tipo="pago"
          itens={pago}
          onRegistrarRecebimento={onRegistrarRecebimento}
          onVincularFatura={onVincularFatura}
        />
      </div>
    </section>
  );
}
