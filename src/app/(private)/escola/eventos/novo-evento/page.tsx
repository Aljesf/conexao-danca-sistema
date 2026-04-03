import Link from "next/link";
import { EventoHeaderCard } from "@/components/escola/eventos/EventoHeaderCard";
import { NovoEventoBaseClient } from "@/components/escola/eventos/NovoEventoBaseClient";

export const dynamic = "force-dynamic";

export default function NovoEventoBasePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-white px-4 py-6 md:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <EventoHeaderCard
          eyebrow="Eventos da Escola"
          titulo="Novo evento-base"
          descricao="Cadastre primeiro a estrutura canonica do evento e depois abra as edicoes operacionais."
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
          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <NovoEventoBaseClient />

            <section className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6">
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-zinc-900">
                  Quando usar esta tela
                </h2>
                <p className="text-sm text-zinc-600">
                  Use esta etapa apenas quando o evento ainda nao existir como base
                  institucional no modulo.
                </p>
                <p className="text-sm text-zinc-600">
                  Se o evento ja existir, siga direto para a criacao de uma nova
                  edicao operacional.
                </p>
              </div>
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}
