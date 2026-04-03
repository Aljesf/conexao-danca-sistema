"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EventoAgendaCard } from "@/components/escola/eventos/EventoAgendaCard";
import { EventoContratacoesCard } from "@/components/escola/eventos/EventoContratacoesCard";
import { EventoCoreografiasCard } from "@/components/escola/eventos/EventoCoreografiasCard";
import { EventoFinanceiroResumoCard } from "@/components/escola/eventos/EventoFinanceiroResumoCard";
import { EventoHeaderCard } from "@/components/escola/eventos/EventoHeaderCard";
import { EventoInscricoesCard } from "@/components/escola/eventos/EventoInscricoesCard";
import type {
  EventoEdicaoAba,
  EventoEdicaoDetalheDataExpandido,
} from "@/components/escola/eventos/types";

type EventoEdicaoDetalheClientProps = {
  data: EventoEdicaoDetalheDataExpandido;
  abaInicial?: EventoEdicaoAba;
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

export function EventoEdicaoDetalheClient({
  data,
  abaInicial = "agenda",
}: EventoEdicaoDetalheClientProps) {
  const [abaAtiva, setAbaAtiva] = useState<EventoEdicaoAba>(abaInicial);

  const resumo = useMemo(() => {
    const totalDias = data.dias.length;
    const totalSessoes = data.sessoes.length;
    const sessoesComIngresso = data.sessoes.filter(
      (item) => item.exige_ingresso,
    ).length;
    const totalInscricoes = data.inscricoes.length;
    const totalCoreografias = data.coreografias.length;
    const totalContratacoes = data.contratacoes.length;

    return {
      totalDias,
      totalSessoes,
      sessoesComIngresso,
      totalInscricoes,
      totalCoreografias,
      totalContratacoes,
    };
  }, [data]);

  if (!data.edicao) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-white px-4 py-6 md:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <EventoHeaderCard
            eyebrow="Eventos da Escola"
            titulo="Edicao nao encontrada"
            descricao="Nao foi possivel localizar a edicao solicitada."
            actions={
              <Link
                href="/escola/eventos"
                className="inline-flex items-center rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
              >
                Voltar para eventos
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-white px-4 py-6 md:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <EventoHeaderCard
          eyebrow={`Evento-base: ${data.edicao.evento?.titulo ?? "Nao informado"}`}
          titulo={data.edicao.titulo_exibicao}
          descricao={
            data.edicao.descricao?.trim()
              ? data.edicao.descricao
              : data.edicao.tema?.trim()
                ? `Tema: ${data.edicao.tema}`
                : "Detalhe operacional da edicao do evento."
          }
          actions={
            <>
              <Link
                href="/escola/eventos"
                className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Voltar
              </Link>
              <Link
                href={`/escola/eventos/edicoes/${data.edicao.id}/configuracoes`}
                className="inline-flex items-center rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
              >
                Configuracoes da edicao
              </Link>
              <Link
                href={`/escola/eventos/edicoes/${data.edicao.id}/calendario`}
                className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Calendario da edicao
              </Link>
            </>
          }
        />

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Status</p>
              <p className="mt-2 text-lg font-semibold text-zinc-900">
                {formatStatus(data.edicao.status)}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Periodo</p>
              <p className="mt-2 text-sm font-medium text-zinc-900">
                {formatDate(data.edicao.data_inicio)} ate{" "}
                {formatDate(data.edicao.data_fim)}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Dias</p>
              <p className="mt-2 text-lg font-semibold text-zinc-900">
                {resumo.totalDias}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Sessoes</p>
              <p className="mt-2 text-lg font-semibold text-zinc-900">
                {resumo.totalSessoes}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-zinc-200 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Evento-base</p>
              <p className="mt-2 text-sm font-medium text-zinc-900">
                {data.edicao.evento?.titulo ?? "Nao informado"}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Tema</p>
              <p className="mt-2 text-sm font-medium text-zinc-900">
                {data.edicao.tema?.trim() ? data.edicao.tema : "Nao informado"}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">
                Inscricoes
              </p>
              <p className="mt-2 text-lg font-semibold text-zinc-900">
                {resumo.totalInscricoes}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">
                Coreografias
              </p>
              <p className="mt-2 text-lg font-semibold text-zinc-900">
                {resumo.totalCoreografias}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">
                Contratacoes
              </p>
              <p className="mt-2 text-lg font-semibold text-zinc-900">
                {resumo.totalContratacoes}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap gap-2">
            <Link
              href={`/escola/eventos/edicoes/${data.edicao.id}/configuracoes`}
              className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Configuracoes
            </Link>
            <Link
              href={`/escola/eventos/edicoes/${data.edicao.id}/calendario`}
              className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Calendario da edicao
            </Link>
            <Link
              href={`/escola/eventos/edicoes/${data.edicao.id}/inscricoes`}
              className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Inscricoes
            </Link>
            <Link
              href="/escola/eventos/producoes"
              className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Producoes
            </Link>
            <Link
              href={`/escola/eventos/edicoes/${data.edicao.id}/coreografias`}
              className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Coreografias
            </Link>
            <Link
              href="/escola/eventos/financeiro"
              className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Financeiro
            </Link>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              ["resumo", "Resumo"],
              ["agenda", "Agenda"],
              ["inscricoes", "Inscricoes"],
              ["coreografias", "Coreografias"],
              ["contratacoes", "Contratacoes"],
              ["financeiro", "Financeiro"],
            ].map(([valor, label]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setAbaAtiva(valor as EventoEdicaoAba)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  abaAtiva === valor
                    ? "bg-violet-600 text-white"
                    : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {abaAtiva === "resumo" ? (
          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">
                  Resumo da edicao
                </h2>
                <p className="text-sm text-zinc-600">
                  Leitura consolidada da edicao do evento.
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-zinc-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">Tema</p>
                  <p className="mt-2 text-sm text-zinc-700">
                    {data.edicao.tema?.trim() ? data.edicao.tema : "Nao informado"}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">
                    Local principal
                  </p>
                  <p className="mt-2 text-sm text-zinc-700">
                    {data.edicao.local_principal_nome?.trim()
                      ? data.edicao.local_principal_nome
                      : "Nao informado"}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">
                    Sessoes com ingresso
                  </p>
                  <p className="mt-2 text-sm text-zinc-700">
                    {resumo.sessoesComIngresso}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">
                    Regulamento resumido
                  </p>
                  <p className="mt-2 text-sm text-zinc-700">
                    {data.edicao.regulamento_resumo?.trim()
                      ? data.edicao.regulamento_resumo
                      : "Nao informado"}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-200 p-4 lg:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">
                    Observacoes
                  </p>
                  <p className="mt-2 text-sm text-zinc-700">
                    {data.edicao.observacoes?.trim()
                      ? data.edicao.observacoes
                      : "Sem observacoes registradas."}
                  </p>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {abaAtiva === "agenda" ? (
          <EventoAgendaCard dias={data.dias} sessoes={data.sessoes} />
        ) : null}
        {abaAtiva === "inscricoes" ? (
          <EventoInscricoesCard inscricoes={data.inscricoes} />
        ) : null}
        {abaAtiva === "coreografias" ? (
          <EventoCoreografiasCard coreografias={data.coreografias} />
        ) : null}
        {abaAtiva === "contratacoes" ? (
          <EventoContratacoesCard contratacoes={data.contratacoes} />
        ) : null}
        {abaAtiva === "financeiro" ? (
          <EventoFinanceiroResumoCard
            referencias={data.referenciasFinanceiras}
          />
        ) : null}
      </div>
    </div>
  );
}
