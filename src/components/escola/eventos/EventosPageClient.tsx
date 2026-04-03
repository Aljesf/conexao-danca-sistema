"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EventoHeaderCard } from "@/components/escola/eventos/EventoHeaderCard";
import { EventoListCard } from "@/components/escola/eventos/EventoListCard";
import type { EventoEdicaoListItem } from "@/components/escola/eventos/types";

type EventosPageClientProps = {
  edicoes: EventoEdicaoListItem[];
};

export function EventosPageClient({ edicoes }: EventosPageClientProps) {
  const [busca, setBusca] = useState("");

  const itens = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    if (!termo) return edicoes;

    return edicoes.filter((item) => {
      const alvo = [
        item.titulo_exibicao,
        item.tema ?? "",
        item.status,
        item.evento?.titulo ?? "",
        item.evento?.tipo_evento ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return alvo.includes(termo);
    });
  }, [busca, edicoes]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-white px-4 py-6 md:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <EventoHeaderCard
          eyebrow="Eventos da Escola"
          titulo="Eventos e producoes"
          descricao="Gerencie edicoes, agenda, inscricoes e a operacao principal dos eventos artisticos, institucionais e pedagogicos da escola."
          actions={
            <>
              <Link
                href="/escola/eventos/nova"
                className="inline-flex items-center rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
              >
                Nova edicao
              </Link>
              <Link
                href="/escola/eventos/novo-evento"
                className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Novo evento-base
              </Link>
            </>
          }
        />

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-5 space-y-1">
            <h2 className="text-xl font-semibold text-zinc-900">
              Fluxos do modulo
            </h2>
            <p className="text-sm text-zinc-600">
              Acesse diretamente as areas principais do modulo de eventos.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {[
              {
                href: "/escola/eventos/novo-evento",
                titulo: "Novo evento-base",
                descricao: "Cadastrar a estrutura canonica do evento.",
              },
              {
                href: "/escola/eventos/nova",
                titulo: "Nova edicao",
                descricao: "Abrir a realizacao operacional da temporada.",
              },
              {
                href: "/escola/eventos",
                titulo: "Configurar edicoes",
                descricao: "Abrir uma edição e seguir para configurações.",
              },
              {
                href: "/escola/eventos/agenda",
                titulo: "Calendario",
                descricao: "Organizar dias, sessões e marcos do evento.",
              },
              {
                href: "/escola/eventos/inscricoes",
                titulo: "Inscricoes",
                descricao: "Consultar a operação de participação da edição.",
              },
              {
                href: "/escola/eventos/coreografias",
                titulo: "Coreografias",
                descricao: "Abrir elencos, participações e ordem artística.",
              },
              {
                href: "/escola/eventos/producoes",
                titulo: "Producoes",
                descricao: "Acompanhar contratacoes e produção operacional.",
              },
              {
                href: "/escola/eventos/financeiro",
                titulo: "Financeiro",
                descricao: "Ler o resumo financeiro por edição.",
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 transition hover:border-violet-300 hover:bg-violet-50"
              >
                <h3 className="text-sm font-semibold text-zinc-900">{item.titulo}</h3>
                <p className="mt-1 text-sm text-zinc-600">{item.descricao}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-4 space-y-1">
            <h2 className="text-xl font-semibold text-zinc-900">Buscar edicoes</h2>
            <p className="text-sm text-zinc-600">
              Use a busca para localizar rapidamente uma edicao de evento.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-2">
              <label
                htmlFor="busca-eventos"
                className="text-sm font-medium text-zinc-700"
              >
                Busca
              </label>
              <input
                id="busca-eventos"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Ex.: Brasilidades, mostra, festival..."
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>

            <div className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              {itens.length} edicao(oes) encontrada(s)
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-5 space-y-1">
            <h2 className="text-xl font-semibold text-zinc-900">
              Edicoes cadastradas
            </h2>
            <p className="text-sm text-zinc-600">
              Lista principal das edicoes do modulo de eventos.
            </p>
          </div>

          {itens.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-500">
              Nenhuma edicao encontrada com os filtros atuais.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {itens.map((item) => (
                <EventoListCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
