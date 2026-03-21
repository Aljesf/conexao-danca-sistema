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

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

function getSituacaoTone(value: string) {
  switch (value) {
    case "VALIDADA":
      return "border border-emerald-200 bg-emerald-50 text-emerald-700";
    case "ABERTA":
      return "border border-sky-200 bg-sky-50 text-sky-700";
    case "PENDENTE":
      return "border border-amber-200 bg-amber-50 text-amber-700";
    case "NAO_REALIZADA":
      return "border border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border border-slate-200 bg-slate-100 text-slate-700";
  }
}

export function FrequenciaResumoTurmaCard({ data }: Props) {
  const resumo = data.resumo;
  const ultimasAulas = data.execucao.ultimas_aulas_registradas.slice(0, 5);
  const proximasAulas = data.execucao.proximas_aulas_previstas.slice(0, 5);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Execucao da turma</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Previsto x realizado</h2>
          <p className="text-sm text-slate-500">
            Aulas previstas, abertas, validadas e lacunas operacionais do periodo consultado.
          </p>
        </div>
        <a
          href="#frequencia-historico-completo"
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300"
        >
          Ver historico completo
        </a>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-5">
        <Metric
          label="Media da turma"
          value={`${resumo.percentual_medio_turma}%`}
          helper={`${resumo.aulas_fechadas} aulas validadas`}
        />
        <Metric
          label="Previstas"
          value={resumo.aulas_previstas_periodo}
          helper={`Pendentes: ${resumo.aulas_pendentes}`}
        />
        <Metric
          label="Validadas"
          value={resumo.aulas_fechadas}
          helper={`Abertas: ${resumo.aulas_abertas}`}
        />
        <Metric
          label="Nao realizadas"
          value={resumo.aulas_nao_realizadas}
          helper="Aulas previstas sem validacao"
        />
        <Metric
          label="Ocupacao"
          value={resumo.ocupacao_percentual == null ? "--" : `${resumo.ocupacao_percentual}%`}
          helper={`Capacidade ${resumo.capacidade ?? "--"} | Vagas ${resumo.vagas ?? "--"}`}
        />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <Metric label="Presencas" value={resumo.presentes} helper={`Atrasos: ${resumo.atrasos}`} />
        <Metric label="Faltas" value={resumo.faltas} helper={`Justificadas: ${resumo.justificadas}`} />
        <Metric label="Pagantes" value={resumo.pagantes} />
        <Metric
          label="Concessoes"
          value={resumo.concessao_integral + resumo.concessao_parcial}
          helper={`Integral ${resumo.concessao_integral} | Parcial ${resumo.concessao_parcial}`}
        />
      </div>

      {resumo.alertas_operacionais.length > 0 ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
          <p className="text-sm font-semibold text-amber-900">Alertas operacionais</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {resumo.alertas_operacionais.map((alerta) => (
              <span
                key={alerta}
                className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-800"
              >
                {alerta}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Ultimas aulas registradas</p>
              <p className="text-xs text-slate-500">Abertas ainda aparecem aqui, mas so contam na frequencia quando validadas.</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              {data.turma.nome ?? `Turma #${data.turma.turma_id}`}
            </span>
          </div>

          {ultimasAulas.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Nenhuma aula registrada no periodo.</p>
          ) : (
            <div className="mt-4 grid gap-3">
              {ultimasAulas.map((aula) => (
                <div key={aula.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {aula.aula_numero ? `Aula ${aula.aula_numero}` : "Sessao registrada"}
                      </p>
                      <p className="text-xs text-slate-500">{formatDate(aula.data_aula)}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getSituacaoTone(aula.situacao_execucao)}`}>
                      {aula.situacao_execucao}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-1 text-xs text-slate-600">
                    <div>Frequencia: {aula.presentes} presentes, {aula.faltas} faltas, {aula.atrasos} atrasos</div>
                    <div>Aberta por: {aula.aberta_por_nome ?? "nao informado"}</div>
                    <div>Fechada por: {aula.fechada_por_nome ?? "pendente"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
          <p className="text-sm font-semibold text-slate-900">Proximas aulas previstas</p>
          <p className="text-xs text-slate-500">Calendario operacional derivado da grade e dos encontros especificos.</p>

          {proximasAulas.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Nao ha aulas previstas para o recorte atual.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {proximasAulas.map((aula) => (
                <div key={`${aula.data_aula}-${aula.origem}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{formatDate(aula.data_aula)}</p>
                      <p className="text-xs text-slate-500">
                        {aula.hora_inicio ?? "--:--"} - {aula.hora_fim ?? "--:--"} | {aula.origem}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getSituacaoTone(aula.situacao_execucao)}`}>
                      {aula.situacao_execucao}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FrequenciaResumoTurmaCard;
