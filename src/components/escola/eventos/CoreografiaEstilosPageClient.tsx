"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import FormCard from "@/components/FormCard";
import FormInput from "@/components/FormInput";
import { EventoHeaderCard } from "@/components/escola/eventos/EventoHeaderCard";
import type { CoreografiaEstiloResumo } from "@/components/escola/eventos/types";

type CoreografiaEstilosPageClientProps = {
  estilos: CoreografiaEstiloResumo[];
};

type EstiloFormState = {
  nome: string;
  slug: string;
  descricao: string;
  ordemExibicao: string;
  ativo: boolean;
};

function createInitialState(): EstiloFormState {
  return {
    nome: "",
    slug: "",
    descricao: "",
    ordemExibicao: "0",
    ativo: true,
  };
}

function readErrorMessage(json: unknown, fallback: string): string {
  if (typeof json === "object" && json !== null) {
    const record = json as Record<string, unknown>;
    if (typeof record.details === "string" && record.details) return record.details;
    if (typeof record.error === "string" && record.error) return record.error;
  }

  return fallback;
}

export function CoreografiaEstilosPageClient({
  estilos,
}: CoreografiaEstilosPageClientProps) {
  const [form, setForm] = useState<EstiloFormState>(createInitialState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  function resetForm() {
    setForm(createInitialState());
    setEditingId(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErro(null);
    setSucesso(null);

    try {
      const response = await fetch(
        editingId ? `/api/coreografia-estilos/${editingId}` : "/api/coreografia-estilos",
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nome: form.nome.trim(),
            slug: form.slug.trim() || null,
            descricao: form.descricao.trim() || null,
            ordemExibicao: Number(form.ordemExibicao) || 0,
            ativo: form.ativo,
          }),
        },
      );

      const json = await response.json().catch(() => null);

      if (!response.ok || !json || !(json as { ok?: boolean }).ok) {
        throw new Error(
          readErrorMessage(json, "Nao foi possivel salvar o estilo."),
        );
      }

      setSucesso(editingId ? "Estilo atualizado com sucesso." : "Estilo criado com sucesso.");
      resetForm();
      window.location.reload();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Nao foi possivel salvar o estilo.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArchive(estilo: CoreografiaEstiloResumo) {
    if (!window.confirm(`Inativar o estilo ${estilo.nome}?`)) return;

    setErro(null);
    setSucesso(null);

    try {
      const response = await fetch(`/api/coreografia-estilos/${estilo.id}`, {
        method: "DELETE",
      });
      const json = await response.json().catch(() => null);

      if (!response.ok || !json || !(json as { ok?: boolean }).ok) {
        throw new Error(
          readErrorMessage(json, "Nao foi possivel inativar o estilo."),
        );
      }

      setSucesso(`Estilo ${estilo.nome} inativado com sucesso.`);
      window.location.reload();
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Nao foi possivel inativar o estilo.",
      );
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-white px-4 py-6 md:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <EventoHeaderCard
          eyebrow="Eventos da Escola"
          titulo="Estilos de coreografia"
          descricao="Cadastre e mantenha os estilos estruturados usados no cadastro mestre de coreografias."
        />

        {sucesso ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {sucesso}
          </div>
        ) : null}

        {erro ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {erro}
          </div>
        ) : null}

        <form onSubmit={handleSubmit}>
          <FormCard
            title={editingId ? "Editar estilo" : "Novo estilo"}
            description="Use nomes reutilizaveis e mantenha uma ordenacao coerente para selecao nas coreografias."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FormInput
                label="Nome"
                value={form.nome}
                onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
              />
              <FormInput
                label="Slug"
                value={form.slug}
                onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                placeholder="Opcional. Se vazio, o sistema gera."
              />
              <FormInput
                label="Ordem"
                type="number"
                value={form.ordemExibicao}
                onChange={(event) =>
                  setForm((current) => ({ ...current, ordemExibicao: event.target.value }))
                }
              />
              <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, ativo: event.target.checked }))
                  }
                />
                Estilo ativo
              </label>
              <FormInput
                as="textarea"
                label="Descricao"
                value={form.descricao}
                onChange={(event) =>
                  setForm((current) => ({ ...current, descricao: event.target.value }))
                }
                className="md:col-span-2 xl:col-span-4"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={submitting || !form.nome.trim()}
                className="inline-flex items-center rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? "Salvando..." : editingId ? "Salvar estilo" : "Criar estilo"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Limpar
              </button>
            </div>
          </FormCard>
        </form>

        <FormCard
          title="Estilos cadastrados"
          description="Estilos ativos e inativos para uso em coreografias mestres."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {estilos.map((estilo) => (
              <article
                key={estilo.id}
                className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2 text-xs font-medium">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                      {estilo.slug}
                    </span>
                    <span className="rounded-full bg-zinc-200 px-2.5 py-1 text-zinc-700">
                      Ordem {estilo.ordem_exibicao}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 ${
                        estilo.ativo
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-zinc-200 text-zinc-700"
                      }`}
                    >
                      {estilo.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-zinc-900">{estilo.nome}</h3>
                    <p className="text-sm text-zinc-600">
                      {estilo.descricao?.trim() ? estilo.descricao : "Sem descricao cadastrada."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(estilo.id);
                        setForm({
                          nome: estilo.nome,
                          slug: estilo.slug,
                          descricao: estilo.descricao ?? "",
                          ordemExibicao: String(estilo.ordem_exibicao),
                          ativo: estilo.ativo,
                        });
                      }}
                      className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleArchive(estilo)}
                      className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                    >
                      Inativar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </FormCard>
      </div>
    </div>
  );
}
