import CafePanel from "@/components/cafe/CafePanel";
import { formatBRLFromCentavos } from "@/lib/formatters";
import type { CafeDashboardEstoqueAlerta } from "@/lib/cafe/dashboard";

type CafeDashboardEstoqueAlertasProps = {
  alertas: CafeDashboardEstoqueAlerta[];
  quantidadeAlertas: number;
  quantidadeReporAgora: number;
  quantidadeZerado: number;
};

const STATUS_STYLES: Record<string, string> = {
  ZERADO: "border-rose-200 bg-rose-50 text-rose-700",
  REPOR_AGORA: "border-amber-200 bg-amber-50 text-amber-700",
  ATENCAO: "border-yellow-200 bg-yellow-50 text-yellow-700",
  OK: "border-emerald-200 bg-emerald-50 text-emerald-700",
  SEM_PARAMETRO: "border-slate-200 bg-slate-50 text-slate-600",
};

export default function CafeDashboardEstoqueAlertas({
  alertas,
  quantidadeAlertas,
  quantidadeReporAgora,
  quantidadeZerado,
}: CafeDashboardEstoqueAlertasProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <CafePanel>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Alertas ativos
          </p>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {quantidadeAlertas}
          </div>
          <p className="mt-1 text-sm text-slate-600">Itens com reposicao imediata ou atencao.</p>
        </CafePanel>
        <CafePanel>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Repor agora
          </p>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {quantidadeReporAgora}
          </div>
          <p className="mt-1 text-sm text-slate-600">Insumos que ja exigem providencia operacional.</p>
        </CafePanel>
        <CafePanel>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Zerados
          </p>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {quantidadeZerado}
          </div>
          <p className="mt-1 text-sm text-slate-600">Itens sem saldo atual registrado no modulo.</p>
        </CafePanel>
      </div>

      {alertas.length === 0 ? (
        <CafePanel className="border-dashed">
          <p className="text-sm font-medium text-slate-900">Sem alertas de estoque no momento.</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            O dashboard continua pronto para destacar itens zerados, abaixo do minimo e em atencao
            conforme os parametros do modulo evoluirem.
          </p>
        </CafePanel>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {alertas.slice(0, 8).map((alerta) => (
            <CafePanel key={alerta.insumo_id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{alerta.nome}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Saldo atual: {alerta.estoque_atual}
                    {alerta.estoque_minimo !== null ? ` • Minimo: ${alerta.estoque_minimo}` : ""}
                  </p>
                </div>
                <span
                  className={[
                    "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                    STATUS_STYLES[alerta.status_reposicao] ?? STATUS_STYLES.SEM_PARAMETRO,
                  ].join(" ")}
                >
                  {alerta.status_reposicao.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Custo medio: {formatBRLFromCentavos(alerta.custo_medio_centavos ?? 0)}
              </p>
            </CafePanel>
          ))}
        </div>
      )}
    </div>
  );
}
