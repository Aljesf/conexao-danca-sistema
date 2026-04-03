import type {
  EventoDiaItem,
  EventoSessaoItem,
} from "@/components/escola/eventos/types";

type EventoAgendaCardProps = {
  dias: EventoDiaItem[];
  sessoes: EventoSessaoItem[];
};

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatTime(value: string | null): string {
  if (!value) return "—";
  return value.slice(0, 5);
}

export function EventoAgendaCard({ dias, sessoes }: EventoAgendaCardProps) {
  const diasOrdenados = [...dias].sort((a, b) =>
    a.data_evento.localeCompare(b.data_evento),
  );

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-5 space-y-1">
        <h2 className="text-xl font-semibold text-zinc-900">Agenda da edição</h2>
        <p className="text-sm text-zinc-600">
          Visão organizada por dia e sessões do evento.
        </p>
      </div>

      <div className="space-y-5">
        {diasOrdenados.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-500">
            Nenhum dia cadastrado para esta edição.
          </div>
        ) : (
          diasOrdenados.map((dia) => {
            const sessoesDia = sessoes
              .filter((sessao) => sessao.dia_id === dia.id)
              .sort((a, b) => {
                const horaA = a.hora_inicio ?? "";
                const horaB = b.hora_inicio ?? "";
                return horaA.localeCompare(horaB);
              });

            return (
              <div
                key={dia.id}
                className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4"
              >
                <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900">
                      {dia.titulo?.trim() ? dia.titulo : formatDate(dia.data_evento)}
                    </h3>
                    <p className="text-sm text-zinc-600">
                      {formatDate(dia.data_evento)}
                    </p>
                  </div>

                  <span className="inline-flex w-fit rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700">
                    {dia.status}
                  </span>
                </div>

                {sessoesDia.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500">
                    Nenhuma sessão cadastrada para este dia.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {sessoesDia.map((sessao) => (
                      <div
                        key={sessao.id}
                        className="rounded-xl border border-zinc-200 bg-white p-4"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-semibold text-zinc-900">
                                {sessao.titulo}
                              </h4>
                              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                                {sessao.tipo_sessao}
                              </span>
                            </div>

                            {sessao.subtitulo?.trim() ? (
                              <p className="text-sm text-zinc-600">{sessao.subtitulo}</p>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap gap-2 text-xs font-medium">
                            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-700">
                              {formatTime(sessao.hora_inicio)} - {formatTime(sessao.hora_fim)}
                            </span>
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                              {sessao.status}
                            </span>
                            {sessao.exige_ingresso ? (
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                                Com ingresso
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {sessao.observacoes?.trim() ? (
                          <p className="mt-3 text-sm text-zinc-600">{sessao.observacoes}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
