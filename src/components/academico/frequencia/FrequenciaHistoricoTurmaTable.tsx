import type { HistoricoFrequenciaTurmaResult } from "@/lib/academico/frequencia";

type Props = {
  data: HistoricoFrequenciaTurmaResult;
};

function getStatusLabel(percentual: number, minima?: number | null) {
  const alvo = minima ?? 75;
  if (percentual >= alvo) {
    return {
      label: "Em dia",
      className: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (percentual >= Math.max(alvo - 10, 0)) {
    return {
      label: "Atencao",
      className: "border border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Critico",
    className: "border border-rose-200 bg-rose-50 text-rose-700",
  };
}

export function FrequenciaHistoricoTurmaTable({ data }: Props) {
  const alunos = data.alunos;
  const pendencias = data.execucao.pendencias_operacionais.slice(0, 8);

  return (
    <div id="frequencia-historico-completo" className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Historico completo da turma</h3>
          <p className="text-sm text-slate-500">
            Percentuais consolidados por aluno com base apenas nas aulas validadas no periodo.
          </p>
        </div>
        <div className="text-xs text-slate-500">
          Alunos com registro: {data.resumo.total_alunos_com_registro} / {data.resumo.total_alunos}
        </div>
      </div>

      {pendencias.length > 0 ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <p className="text-sm font-semibold text-amber-900">Pendencias de execucao</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {pendencias.map((item) => (
              <div key={`${item.data_aula}-${item.origem}-${item.situacao_execucao}`} className="rounded-2xl border border-amber-200 bg-white px-4 py-3">
                <div className="text-sm font-semibold text-slate-900">
                  {new Date(`${item.data_aula}T00:00:00`).toLocaleDateString("pt-BR")}
                </div>
                <div className="text-xs text-slate-500">
                  {item.hora_inicio ?? "--:--"} - {item.hora_fim ?? "--:--"} | {item.origem}
                </div>
                <span className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                  {item.situacao_execucao}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {alunos.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Nenhum aluno encontrado para os filtros informados.</p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                <th className="pb-3 pr-3">Aluno</th>
                <th className="pb-3 pr-3">Frequencia</th>
                <th className="pb-3 pr-3">Presencas</th>
                <th className="pb-3 pr-3">Atrasos</th>
                <th className="pb-3 pr-3">Faltas</th>
                <th className="pb-3 pr-3">Justificadas</th>
                <th className="pb-3 pr-3">Status</th>
                <th className="pb-3">Ultimo registro</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((aluno) => {
                const badge = getStatusLabel(
                  aluno.percentual_frequencia,
                  data.turma.frequencia_minima_percentual,
                );

                return (
                  <tr key={aluno.aluno_pessoa_id} className="border-b border-slate-100 align-top text-slate-700">
                    <td className="py-3 pr-3">
                      <div className="font-semibold text-slate-900">{aluno.nome ?? `Aluno ${aluno.aluno_pessoa_id}`}</div>
                      <div className="text-xs text-slate-500">
                        Matricula: {aluno.matricula_status ?? "--"} | Vinculo: {aluno.turma_aluno_status ?? "--"}
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="font-semibold text-slate-900">{aluno.percentual_frequencia}%</div>
                      <div className="text-xs text-slate-500">{aluno.total_registros} registros</div>
                    </td>
                    <td className="py-3 pr-3">{aluno.presentes}</td>
                    <td className="py-3 pr-3">{aluno.atrasos}</td>
                    <td className="py-3 pr-3">{aluno.faltas}</td>
                    <td className="py-3 pr-3">{aluno.justificadas}</td>
                    <td className="py-3 pr-3">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3">
                      {aluno.ultima_presenca ? (
                        <div>
                          <div className="font-medium text-slate-900">
                            {new Date(`${aluno.ultima_presenca.data_aula}T00:00:00`).toLocaleDateString("pt-BR")}
                          </div>
                          <div className="text-xs text-slate-500">
                            {aluno.ultima_presenca.status}
                            {aluno.ultima_presenca.aula_numero ? ` | Aula ${aluno.ultima_presenca.aula_numero}` : ""}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">Sem registro</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default FrequenciaHistoricoTurmaTable;
