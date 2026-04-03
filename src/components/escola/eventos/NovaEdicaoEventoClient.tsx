"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import FormCard from "@/components/FormCard";
import FormInput from "@/components/FormInput";
import type { EventoBaseOption } from "@/components/escola/eventos/types";

const STATUS_OPTIONS = [
  "EM_PLANEJAMENTO",
  "INSCRICOES_ABERTAS",
  "EM_ANDAMENTO",
  "ENCERRADO",
  "CANCELADO",
] as const;

type ApiResponse =
  | {
      ok: true;
      data: {
        id: string;
      };
    }
  | {
      ok: false;
      error: string;
      details?: string;
    };

type NovaEdicaoEventoClientProps = {
  eventos: EventoBaseOption[];
  initialEventoId?: string | null;
};

export function NovaEdicaoEventoClient({
  eventos,
  initialEventoId,
}: NovaEdicaoEventoClientProps) {
  const router = useRouter();
  const eventoCriadoRecente = useMemo(
    () => eventos.find((evento) => evento.id === initialEventoId) ?? null,
    [eventos, initialEventoId],
  );
  const eventoInicialValido = useMemo(
    () =>
      initialEventoId && eventos.some((evento) => evento.id === initialEventoId)
        ? initialEventoId
        : eventos[0]?.id ?? "",
    [eventos, initialEventoId],
  );

  const [eventoId, setEventoId] = useState(eventoInicialValido);
  const [tituloExibicao, setTituloExibicao] = useState("");
  const [tema, setTema] = useState("");
  const [descricao, setDescricao] = useState("");
  const [anoReferencia, setAnoReferencia] = useState(String(new Date().getFullYear()));
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>(
    "EM_PLANEJAMENTO",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/eventos/escola/edicoes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventoId,
          tituloExibicao,
          tema: tema.trim() || null,
          descricao: descricao.trim() || null,
          anoReferencia: Number(anoReferencia),
          status,
        }),
      });

      const json = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok || !json?.ok) {
        setError(json?.details ?? json?.error ?? "Nao foi possivel criar a edicao.");
        return;
      }

      router.push(
        `/escola/eventos/edicoes/${json.data.id}/configuracoes?origem=nova-edicao`,
      );
      router.refresh();
    } catch {
      setError("Nao foi possivel criar a edicao.");
    } finally {
      setSubmitting(false);
    }
  }

  if (eventos.length === 0) {
    return (
      <FormCard
        title="Nenhum evento-base disponivel"
        description="Cadastre primeiro o evento-base para entao abrir uma nova edicao."
      >
        <div className="flex flex-wrap gap-2">
          <Link
            href="/escola/eventos/novo-evento"
            className="inline-flex items-center rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
          >
            Criar evento-base
          </Link>
          <Link
            href="/escola/eventos"
            className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Voltar para eventos
          </Link>
        </div>
      </FormCard>
    );
  }

  return (
    <FormCard
      title="Criar nova edicao"
      description="Use apenas os campos essenciais para abrir a operacao inicial do evento."
    >
      {eventoCriadoRecente ? (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Evento-base criado com sucesso:{" "}
          <span className="font-medium">{eventoCriadoRecente.titulo}</span>. Agora
          complete a abertura da primeira edicao operacional.
        </div>
      ) : null}

      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 lg:grid-cols-2">
          <FormInput
            as="select"
            label="Evento-base"
            value={eventoId}
            onChange={(event) => setEventoId(event.target.value)}
          >
            {eventos.map((evento) => (
              <option key={evento.id} value={evento.id}>
                {evento.titulo} ({evento.tipo_evento})
              </option>
            ))}
          </FormInput>
          <FormInput
            label="Titulo da edicao"
            value={tituloExibicao}
            onChange={(event) => setTituloExibicao(event.target.value)}
            placeholder="Ex.: Brasilidades 2026"
            required
          />
          <FormInput
            label="Tema"
            value={tema}
            onChange={(event) => setTema(event.target.value)}
            placeholder="Tema artistico ou institucional da edicao"
          />
          <FormInput
            as="textarea"
            label="Descricao da edicao"
            value={descricao}
            onChange={(event) => setDescricao(event.target.value)}
            placeholder="Resumo editorial, curatorial ou operacional desta edicao"
            className="lg:col-span-2"
          />
          <FormInput
            label="Ano de referencia"
            type="number"
            value={anoReferencia}
            onChange={(event) => setAnoReferencia(event.target.value)}
            min={2000}
            max={2100}
            required
          />
          <FormInput
            as="select"
            label="Status inicial"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as (typeof STATUS_OPTIONS)[number])
            }
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </FormInput>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={
              submitting ||
              !eventoId ||
              !tituloExibicao.trim() ||
              !Number.isFinite(Number(anoReferencia))
            }
            className="inline-flex items-center rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Criando..." : "Criar edicao"}
          </button>
          <Link
            href="/escola/eventos/novo-evento"
            className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Criar novo evento-base
          </Link>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          Depois de criar a edição, o sistema abre automaticamente a tela de
          configurações para definir cobrança, participação e itens adicionais antes
          da agenda.
        </div>
      </form>
    </FormCard>
  );
}
