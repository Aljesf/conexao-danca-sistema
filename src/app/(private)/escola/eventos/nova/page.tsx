import Link from "next/link";
import { carregarEventosBase } from "@/app/(private)/escola/eventos/_queries";
import { EventoHeaderCard } from "@/components/escola/eventos/EventoHeaderCard";
import { NovaEdicaoEventoClient } from "@/components/escola/eventos/NovaEdicaoEventoClient";

export const dynamic = "force-dynamic";

type NovaEdicaoPageProps = {
  searchParams?: Promise<{
    eventoId?: string | string[];
  }>;
};

export default async function NovaEdicaoPage({
  searchParams,
}: NovaEdicaoPageProps) {
  const eventos = await carregarEventosBase();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const eventoId = Array.isArray(resolvedSearchParams?.eventoId)
    ? resolvedSearchParams?.eventoId[0]
    : resolvedSearchParams?.eventoId;

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-white px-4 py-6 md:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <EventoHeaderCard
          eyebrow="Eventos da Escola"
          titulo="Nova edicao de evento"
          descricao="Abra uma nova edicao operacional usando o evento-base ja cadastrado."
          actions={
            <>
              <Link
                href="/escola/eventos"
                className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Visao geral
              </Link>
              <Link
                href="/escola/eventos/novo-evento"
                className="inline-flex items-center rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
              >
                Criar evento-base
              </Link>
            </>
          }
        />

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <NovaEdicaoEventoClient eventos={eventos} initialEventoId={eventoId} />

            <section className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6">
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-zinc-900">
                  Fluxo recomendado
                </h2>
                <ol className="space-y-3 text-sm text-zinc-600">
                  <li>1. Escolha o evento-base correto.</li>
                  <li>2. Abra a edição com título, ano e status inicial.</li>
                  <li>3. Configure cobrança, participação e itens adicionais.</li>
                  <li>4. Depois avance para calendário, inscrições e financeiro.</li>
                </ol>
              </div>
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}
