import { getResumoAlunosTurma, type ResumoAlunosTurma } from "@/lib/turmas";

type Props = {
  resumo?: Partial<ResumoAlunosTurma> | null;
  compact?: boolean;
};

type MetricProps = {
  label: string;
  value: number | string;
};

function Metric({ label, value }: MetricProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

export function TurmaResumoOperacional({ resumo, compact = false }: Props) {
  const dados = getResumoAlunosTurma(resumo);
  const ocupacao =
    dados.capacidade && dados.capacidade > 0
      ? `${Math.round((dados.total_alunos / dados.capacidade) * 100)}%`
      : "-";

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
      <div className={compact ? "space-y-3" : "space-y-4"}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_minmax(0,1fr)]">
          <div className="flex min-h-[88px] items-center justify-center rounded-full border border-slate-200 bg-white text-center shadow-sm">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Pagantes</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{dados.pagantes}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-sky-800">Concessoes</div>
                <div className="text-xs text-slate-500">
                  Alunos com oportunidade artistica ativa
                </div>
              </div>

              <div className="text-2xl font-semibold text-sky-900">{dados.concessao_total}</div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                Integrais: {dados.concessao_integral}
              </span>

              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
                Parciais: {dados.concessao_parcial}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Metric label="Total" value={dados.total_alunos} />
          <Metric label="Capacidade" value={dados.capacidade ?? "-"} />
          <Metric label="Vagas" value={dados.vagas_disponiveis ?? "-"} />
          <Metric label="Ocupacao" value={ocupacao} />
        </div>
      </div>
    </div>
  );
}

export default TurmaResumoOperacional;
