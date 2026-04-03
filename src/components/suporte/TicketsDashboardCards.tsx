import type { SuporteTicketsMetricas } from "@/lib/suporte/constants";

type TicketsDashboardCardsProps = {
  metrics: SuporteTicketsMetricas | null;
};

function DashboardCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string | number;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      {description ? <div className="mt-2 text-xs text-slate-500">{description}</div> : null}
    </div>
  );
}

export function TicketsDashboardCards({ metrics }: TicketsDashboardCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <DashboardCard
        title="Tickets"
        value={metrics?.total_tickets ?? 0}
      />
      <DashboardCard
        title="Em aberto"
        value={metrics?.total_abertos ?? 0}
        description={
          metrics?.tempo_medio_abertos_formatado
            ? `Tempo medio aberto: ${metrics.tempo_medio_abertos_formatado}`
            : "Nenhum ticket aberto no recorte atual"
        }
      />
      <DashboardCard
        title="Resolvidos"
        value={metrics?.total_resolvidos ?? 0}
      />
      <DashboardCard
        title="Criticos"
        value={metrics?.total_criticos ?? 0}
        description={`Erros do sistema: ${metrics?.total_erros ?? 0}`}
      />
      <DashboardCard
        title="Tempo medio de resolucao"
        value={metrics?.tempo_medio_resolucao_formatado ?? "-"}
        description="Considera apenas tickets concluido/cancelado com resolucao valida"
      />
      <DashboardCard
        title="Ticket aberto mais antigo"
        value={metrics?.ticket_aberto_mais_antigo_formatado ?? "-"}
      />
    </div>
  );
}
