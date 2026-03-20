import type { HistoricoFrequenciaTurmaResult } from "@/lib/academico/frequencia";

type Props = {
  data: HistoricoFrequenciaTurmaResult;
};

function Metric(props: { label: string; value: string | number; helper?: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{props.label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{props.value}</p>
      {props.helper ? <p className="text-xs text-slate-500">{props.helper}</p> : null}
    </div>
  );
}

export function FrequenciaResumoTurmaCard({ data }: Props) {
  const ultimasAulas = data.aulas.slice(0, 5);
  const resumo = data.resumo;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Frequencia da turma</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Historico consolidado</h2>
          <p className="text-sm text-slate-500">
            Aulas fechadas, status de presenca e composicao operacional da turma.
          </p>
        </div>
        <a
          href="#frequencia-historico-completo"
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300"
        >
          Ver historico completo
        </a>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <Metric label="Media da turma" value={`${resumo.percentual_medio_turma}%`} helper={`${resumo.aulas_fechadas} aulas fechadas`} />
        <Metric label="Presencas" value={resumo.presentes} helper={`Atrasos: ${resumo.atrasos}`} />
        <Metric label="Faltas" value={resumo.faltas} helper={`Justificadas: ${resumo.justificadas}`} />
        <Metric
          label="Ocupacao"
          value={resumo.ocupacao_percentual == null ? "--" : `${resumo.ocupacao_percentual}%`}
          helper={`Capacidade ${resumo.capacidade ?? "--"} | Vagas ${resumo.vagas ?? "--"}`}
        />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <Metric label="Pagantes" value={resumo.pagantes} />
        <Metric label="Concessao integral" value={resumo.concessao_integral} />
        <Metric label="Concessao parcial" value={resumo.concessao_parcial} />
      </div>

      <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Ultimas aulas registradas</p>
            <p className="text-xs text-slate-500">As aulas abertas continuam visiveis, mas so contam como validas quando fechadas.</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
            {data.turma.nome ?? `Turma #${data.turma.turma_id}`}
          </span>
        </div>

        {ultimasAulas.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Nenhuma aula encontrada para o periodo consultado.</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {ultimasAulas.map((aula) => (
              <div key={aula.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {aula.aula_numero ? `Aula ${aula.aula_numero}` : "Sessao"}
                  </p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      aula.status_chamada === "FECHADA"
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                  >
                    {aula.status_chamada}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{new Date(`${aula.data_aula}T00:00:00`).toLocaleDateString("pt-BR")}</p>
                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  <div>Presencas: {aula.presentes}</div>
                  <div>Atrasos: {aula.atrasos}</div>
                  <div>Faltas: {aula.faltas}</div>
                  <div>Justificadas: {aula.justificadas}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FrequenciaResumoTurmaCard;
