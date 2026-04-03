import Link from "next/link";
import type { EventoEdicaoListItem } from "@/components/escola/eventos/types";

type EventoListCardProps = {
  item: EventoEdicaoListItem;
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

export function EventoListCard({ item }: EventoListCardProps) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-violet-300 hover:shadow-md">
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-500">
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-700">
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
            <h2 className="text-lg font-semibold text-zinc-900">
              {item.titulo_exibicao}
            </h2>
            <p className="text-sm text-zinc-600">
              Evento-base: {item.evento?.titulo ?? "Nao informado"}
            </p>
            {item.tema?.trim() ? (
              <p className="text-sm text-zinc-500">Tema: {item.tema}</p>
            ) : null}
            {item.descricao?.trim() ? (
              <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{item.descricao}</p>
            ) : null}
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
            href={`/escola/eventos/edicoes/${item.id}/configuracoes`}
            className="inline-flex items-center rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
          >
            Configuracoes
          </Link>
          <Link
            href={`/escola/eventos/edicoes/${item.id}/calendario`}
            className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Calendario
          </Link>
          <Link
            href={`/escola/eventos/edicoes/${item.id}/coreografias`}
            className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Coreografias
          </Link>
        </div>
      </div>
    </article>
  );
}
