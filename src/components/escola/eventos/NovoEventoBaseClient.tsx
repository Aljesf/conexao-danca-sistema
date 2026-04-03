"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import FormCard from "@/components/FormCard";
import FormInput from "@/components/FormInput";

const TIPO_EVENTO_OPTIONS = [
  "REUNIAO",
  "FESTIVAL",
  "MOSTRA",
  "ESPETACULO",
  "WORKSHOP",
  "FESTA",
  "AUDICAO",
  "AULA_ABERTA",
  "APRESENTACAO_EXTERNA",
  "OUTRO",
] as const;

const NATUREZA_OPTIONS = [
  "PEDAGOGICO",
  "ARTISTICO",
  "INSTITUCIONAL",
  "COMERCIAL",
  "SOCIAL",
] as const;

const ABRANGENCIA_OPTIONS = ["INTERNO", "EXTERNO", "HIBRIDO"] as const;

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
      message?: string;
      details?: string;
    };

export function NovoEventoBaseClient() {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipoEvento, setTipoEvento] = useState<(typeof TIPO_EVENTO_OPTIONS)[number]>(
    "FESTIVAL",
  );
  const [naturezaEvento, setNaturezaEvento] = useState<
    (typeof NATUREZA_OPTIONS)[number]
  >("ARTISTICO");
  const [abrangenciaEvento, setAbrangenciaEvento] = useState<
    (typeof ABRANGENCIA_OPTIONS)[number]
  >("INTERNO");
  const [publicoAlvo, setPublicoAlvo] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/eventos/escola/eventos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          titulo,
          tipo_evento: tipoEvento,
          natureza: naturezaEvento,
          abrangencia: abrangenciaEvento,
          publico_alvo: publicoAlvo.trim() || null,
          descricao: descricao.trim() || null,
          ativo,
        }),
      });

      const json = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok) {
        console.error("Erro API evento:", json);
        throw new Error(
          json?.message ??
            json?.details ??
            json?.error ??
            "Erro ao criar evento",
        );
      }

      if (!json?.ok) {
        throw new Error(
          json?.message ??
            json?.details ??
            json?.error ??
            "Erro ao criar evento",
        );
      }

      router.push(`/escola/eventos/nova?eventoId=${json.data.id}`);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel criar o evento-base.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormCard
      title="Criar evento-base"
      description="Cadastre a estrutura canonica do evento para depois abrir edicoes operacionais."
    >
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 lg:grid-cols-2">
          <FormInput
            label="Nome do evento-base"
            value={titulo}
            onChange={(event) => setTitulo(event.target.value)}
            placeholder="Ex.: Festival Cultural de Meio de Ano"
            required
          />
          <FormInput
            as="select"
            label="Tipo do evento"
            value={tipoEvento}
            onChange={(event) =>
              setTipoEvento(event.target.value as (typeof TIPO_EVENTO_OPTIONS)[number])
            }
          >
            {TIPO_EVENTO_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </FormInput>
          <FormInput
            as="select"
            label="Natureza"
            value={naturezaEvento}
            onChange={(event) =>
              setNaturezaEvento(event.target.value as (typeof NATUREZA_OPTIONS)[number])
            }
          >
            {NATUREZA_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </FormInput>
          <FormInput
            as="select"
            label="Abrangencia"
            value={abrangenciaEvento}
            onChange={(event) =>
              setAbrangenciaEvento(
                event.target.value as (typeof ABRANGENCIA_OPTIONS)[number],
              )
            }
          >
            {ABRANGENCIA_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </FormInput>
          <FormInput
            label="Publico-alvo"
            value={publicoAlvo}
            onChange={(event) => setPublicoAlvo(event.target.value)}
            placeholder="Ex.: alunos, familias, publico externo"
            className="lg:col-span-2"
          />
          <FormInput
            as="textarea"
            label="Descricao"
            value={descricao}
            onChange={(event) => setDescricao(event.target.value)}
            placeholder="Resumo institucional do evento-base."
            rows={4}
            className="lg:col-span-2"
          />
        </div>

        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={ativo}
            onChange={(event) => setAtivo(event.target.checked)}
          />
          Evento-base ativo
        </label>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={submitting || !titulo.trim()}
            className="inline-flex items-center rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Criando..." : "Criar evento-base"}
          </button>
        </div>
      </form>
    </FormCard>
  );
}
