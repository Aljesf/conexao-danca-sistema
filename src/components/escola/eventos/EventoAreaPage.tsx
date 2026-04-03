import Link from "next/link";
import { EventoHeaderCard } from "@/components/escola/eventos/EventoHeaderCard";
import type {
  EventoEdicaoAba,
  EventoEdicaoListItem,
} from "@/components/escola/eventos/types";

type EventoAreaPageProps = {
  titulo: string;
  descricao: string;
  areaLabel: string;
  abaFoco: EventoEdicaoAba;
  modoNavegacaoEdicao?: "aba" | "calendario" | "coreografias" | "inscricoes";
  edicoes: EventoEdicaoListItem[];
  observacao: string;
  semItensMensagem: string;
};

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function formatStatus(value: string): string {
  return value.replaceAll("_", " ");
}

export function EventoAreaPage({
  titulo,
  descricao,
  areaLabel,
  abaFoco,
  modoNavegacaoEdicao = "aba",
  edicoes,
  observacao,
  semItensMensagem,
}: EventoAreaPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-white px-4 py-6 md:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <EventoHeaderCard
          eyebrow="Eventos da Escola"
          titulo={titulo}
          descricao={descricao}
          actions={
            <>
              <Link
                href="/escola/eventos"
                className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Visao geral
              </Link>
              <Link
                href="/escola/eventos/nova"
                className="inline-flex items-center rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
              >
                Nova edicao
              </Link>
            </>
          }
        />

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <h2 className="text-lg font-semibold text-zinc-900">
                Navegacao da area
              </h2>
              <p className="mt-1 text-sm text-zinc-600">{observacao}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Link
                href="/escola/eventos/coreografias"
                className="rounded-2xl border border-zinc-200 p-4 text-sm font-medium text-zinc-700 transition hover:border-violet-300 hover:bg-violet-50"
              >
                Coreografias e elencos
              </Link>
              <Link
                href="/escola/eventos/agenda"
                className="rounded-2xl border border-zinc-200 p-4 text-sm font-medium text-zinc-700 transition hover:border-violet-300 hover:bg-violet-50"
              >
                Agenda do evento
              </Link>
              <Link
                href="/escola/eventos/inscricoes"
                className="rounded-2xl border border-zinc-200 p-4 text-sm font-medium text-zinc-700 transition hover:border-violet-300 hover:bg-violet-50"
              >
                Inscricoes
              </Link>
              <Link
                href="/escola/eventos/producoes"
                className="rounded-2xl border border-zinc-200 p-4 text-sm font-medium text-zinc-700 transition hover:border-violet-300 hover:bg-violet-50"
              >
                Producoes e contratacoes
              </Link>
              <Link
                href="/escola/eventos/financeiro"
                className="rounded-2xl border border-zinc-200 p-4 text-sm font-medium text-zinc-700 transition hover:border-violet-300 hover:bg-violet-50"
              >
                Financeiro
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-5 space-y-1">
            <h2 className="text-xl font-semibold text-zinc-900">
              Edicoes disponiveis
            </h2>
            <p className="text-sm text-zinc-600">
              Selecione uma edicao para abrir diretamente a area de {areaLabel}.
            </p>
          </div>

          {edicoes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-500">
              {semItensMensagem}
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {edicoes.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-5"
                >
                  <div className="flex flex-col gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-500">
                        <span className="rounded-full bg-zinc-200 px-2.5 py-1 text-zinc-700">
                          {formatStatus(item.status)}
                        </span>
                        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">
                          {item.evento?.tipo_evento ?? "EVENTO"}
                        </span>
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                          {item.ano_referencia}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-zinc-900">
                          {item.titulo_exibicao}
                        </h3>
                        <p className="text-sm text-zinc-600">
                          {item.tema?.trim()
                            ? item.tema
                            : item.evento?.titulo ?? "Sem tema informado"}
                        </p>
                      </div>
                    </div>

                    <dl className="grid gap-3 text-sm text-zinc-600 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-zinc-400">
                          Periodo
                        </dt>
                        <dd>
                          {formatDate(item.data_inicio)} ate {formatDate(item.data_fim)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-zinc-400">
                          Local principal
                        </dt>
                        <dd>
                          {item.local_principal_nome?.trim()
                            ? item.local_principal_nome
                            : "Nao informado"}
                        </dd>
                      </div>
                    </dl>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={
                          modoNavegacaoEdicao === "calendario"
                            ? `/escola/eventos/edicoes/${item.id}/calendario`
                            : modoNavegacaoEdicao === "coreografias"
                              ? `/escola/eventos/edicoes/${item.id}/coreografias`
                              : modoNavegacaoEdicao === "inscricoes"
                                ? `/escola/eventos/edicoes/${item.id}/inscricoes`
                              : `/escola/eventos/${item.id}?aba=${abaFoco}`
                        }
                        className="inline-flex items-center rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
                      >
                        Abrir {areaLabel}
                      </Link>
                      <Link
                        href={`/escola/eventos/edicoes/${item.id}/configuracoes`}
                        className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                      >
                        Configurar edição
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
