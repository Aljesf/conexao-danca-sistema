"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import FormCard from "@/components/FormCard";
import FormInput from "@/components/FormInput";
import { EventoHeaderCard } from "@/components/escola/eventos/EventoHeaderCard";
import type {
  EventoEdicaoCalendarioData,
  EventoEdicaoCalendarioItem,
  EventoEdicaoCalendarioTipo,
} from "@/components/escola/eventos/types";

type EventoEdicaoCalendarioClientProps = {
  data: EventoEdicaoCalendarioData;
};

type ApiResponse =
  | {
      ok: true;
      data: EventoEdicaoCalendarioItem;
    }
  | {
      ok: false;
      error?: string;
      details?: string;
    };

const TIPO_OPTIONS: Array<{
  value: EventoEdicaoCalendarioTipo;
  label: string;
  accent: string;
}> = [
  { value: "INSCRICAO", label: "Inscricao", accent: "bg-blue-50 text-blue-700" },
  { value: "ENSAIO", label: "Ensaio", accent: "bg-amber-50 text-amber-700" },
  {
    value: "APRESENTACAO",
    label: "Apresentacao",
    accent: "bg-violet-50 text-violet-700",
  },
  { value: "REUNIAO", label: "Reuniao", accent: "bg-zinc-100 text-zinc-700" },
  {
    value: "PRAZO_INTERNO",
    label: "Prazo interno",
    accent: "bg-rose-50 text-rose-700",
  },
  { value: "OUTRO", label: "Outro", accent: "bg-emerald-50 text-emerald-700" },
];

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatDateRange(start: string, end: string | null): string {
  return end
    ? `${formatDateTime(start)} ate ${formatDateTime(end)}`
    : formatDateTime(start);
}

function formatStatusDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function toInputDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toIsoDateTime(value: string): string {
  return new Date(value).toISOString();
}

function buildInitialState() {
  return {
    tipo: "INSCRICAO" as EventoEdicaoCalendarioTipo,
    titulo: "",
    descricao: "",
    inicio: "",
    fim: "",
    diaInteiro: false,
    localNome: "",
    cidade: "",
    endereco: "",
    refleteNoCalendarioEscola: false,
    turmaId: "",
    grupoId: "",
    ordem: "",
  };
}

export function EventoEdicaoCalendarioClient({
  data,
}: EventoEdicaoCalendarioClientProps) {
  const router = useRouter();
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [form, setForm] = useState(buildInitialState);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const turmaNomeById = useMemo(
    () => new Map(data.turmas.map((item) => [item.turma_id, item.nome])),
    [data.turmas],
  );
  const grupoNomeById = useMemo(
    () => new Map(data.grupos.map((item) => [item.id, item.nome])),
    [data.grupos],
  );

  const resumo = useMemo(() => {
    const itensAtivos = data.itens.filter((item) => item.ativo);
    const itensInscricao = itensAtivos.filter((item) => item.tipo === "INSCRICAO");
    const ensaios = itensAtivos.filter((item) => item.tipo === "ENSAIO");
    const proximasApresentacoes = itensAtivos
      .filter(
        (item) =>
          item.tipo === "APRESENTACAO" && new Date(item.inicio).getTime() >= Date.now(),
      )
      .sort((a, b) => a.inicio.localeCompare(b.inicio));

    const inscricaoInicio =
      itensInscricao.sort((a, b) => a.inicio.localeCompare(b.inicio))[0] ?? null;
    const inscricaoFim =
      [...itensInscricao].sort((a, b) => {
        const fimA = a.fim ?? a.inicio;
        const fimB = b.fim ?? b.inicio;
        return fimB.localeCompare(fimA);
      })[0] ?? null;

    return {
      periodoInscricao:
        inscricaoInicio && inscricaoFim
          ? `${formatStatusDate(inscricaoInicio.inicio)} ate ${formatStatusDate(
              inscricaoFim.fim ?? inscricaoFim.inicio,
            )}`
          : "Nao definido",
      proximaApresentacao:
        proximasApresentacoes[0]
          ? formatDateTime(proximasApresentacoes[0].inicio)
          : "Nenhuma apresentacao futura",
      quantidadeEnsaios: ensaios.length,
      quantidadeItens: itensAtivos.length,
    };
  }, [data.itens]);

  const itensAgrupados = useMemo(() => {
    const grouped = new Map<EventoEdicaoCalendarioTipo, EventoEdicaoCalendarioItem[]>();

    for (const option of TIPO_OPTIONS) {
      grouped.set(option.value, []);
    }

    for (const item of data.itens.filter((entry) => entry.ativo)) {
      const lista = grouped.get(item.tipo) ?? [];
      lista.push(item);
      grouped.set(item.tipo, lista);
    }

    return grouped;
  }, [data.itens]);

  function resetForm() {
    setForm(buildInitialState());
    setEditingItemId(null);
  }

  function handleEdit(item: EventoEdicaoCalendarioItem) {
    setEditingItemId(item.id);
    setFeedback(null);
    setError(null);
    setForm({
      tipo: item.tipo,
      titulo: item.titulo,
      descricao: item.descricao ?? "",
      inicio: toInputDateTime(item.inicio),
      fim: toInputDateTime(item.fim),
      diaInteiro: item.dia_inteiro,
      localNome: item.local_nome ?? "",
      cidade: item.cidade ?? "",
      endereco: item.endereco ?? "",
      refleteNoCalendarioEscola: item.reflete_no_calendario_escola,
      turmaId: item.turma_id ? String(item.turma_id) : "",
      grupoId: item.grupo_id ? String(item.grupo_id) : "",
      ordem: item.ordem !== null ? String(item.ordem) : "",
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!data.edicao) return;

    setSubmitting(true);
    setFeedback(null);
    setError(null);

    const payload = {
      tipo: form.tipo,
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      inicio: toIsoDateTime(form.inicio),
      fim: form.fim ? toIsoDateTime(form.fim) : null,
      diaInteiro: form.diaInteiro,
      localNome: form.localNome.trim() || null,
      cidade: form.cidade.trim() || null,
      endereco: form.endereco.trim() || null,
      refleteNoCalendarioEscola: form.refleteNoCalendarioEscola,
      turmaId: form.turmaId ? Number(form.turmaId) : null,
      grupoId: form.grupoId ? Number(form.grupoId) : null,
      ordem: form.ordem ? Number(form.ordem) : null,
      ativo: true,
    };

    try {
      const url = editingItemId
        ? `/api/eventos/escola/edicoes/${data.edicao.id}/calendario/${editingItemId}`
        : `/api/eventos/escola/edicoes/${data.edicao.id}/calendario`;
      const method = editingItemId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok || !json?.ok) {
        throw new Error(
          json?.details ?? json?.error ?? "Nao foi possivel salvar o item do calendario.",
        );
      }

      setFeedback(
        editingItemId
          ? `Item atualizado: ${json.data.titulo}.`
          : `Item criado: ${json.data.titulo}.`,
      );
      resetForm();
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Nao foi possivel salvar o item do calendario.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item: EventoEdicaoCalendarioItem) {
    if (!data.edicao) return;
    if (!window.confirm(`Arquivar "${item.titulo}" do calendario?`)) return;

    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(
        `/api/eventos/escola/edicoes/${data.edicao.id}/calendario/${item.id}`,
        { method: "DELETE" },
      );
      const json = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok || !json?.ok) {
        throw new Error(
          json?.details ?? json?.error ?? "Nao foi possivel arquivar o item.",
        );
      }

      if (editingItemId === item.id) {
        resetForm();
      }

      setFeedback(`Item arquivado: ${item.titulo}.`);
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Nao foi possivel arquivar o item.",
      );
    }
  }

  async function handleToggleReflection(item: EventoEdicaoCalendarioItem) {
    if (!data.edicao) return;

    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(
        `/api/eventos/escola/edicoes/${data.edicao.id}/calendario/${item.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            refleteNoCalendarioEscola: !item.reflete_no_calendario_escola,
          }),
        },
      );
      const json = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok || !json?.ok) {
        throw new Error(
          json?.details ??
            json?.error ??
            "Nao foi possivel atualizar o reflexo no calendario da escola.",
        );
      }

      setFeedback(
        json.data.reflete_no_calendario_escola
          ? `Item marcado para aparecer no calendario geral: ${json.data.titulo}.`
          : `Item removido do calendario geral: ${json.data.titulo}.`,
      );
      router.refresh();
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Nao foi possivel atualizar o reflexo no calendario da escola.",
      );
    }
  }

  if (!data.edicao) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-white px-4 py-6 md:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <EventoHeaderCard
            eyebrow="Eventos da Escola"
            titulo="Edicao nao encontrada"
            descricao="Nao foi possivel localizar a edicao para abrir o calendario."
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
          eyebrow="Eventos da Escola"
          titulo={`Calendario da edicao · ${data.edicao.titulo_exibicao}`}
          descricao="Organize inscricoes, ensaios, apresentacoes, reunioes e prazos internos sem misturar essa operacao com o calendario generico."
          actions={
            <>
              <Link
                href={`/escola/eventos/edicoes/${data.edicao.id}/configuracoes`}
                className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Configuracoes
              </Link>
              <Link
                href={`/escola/eventos/${data.edicao.id}?aba=agenda`}
                className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Agenda interna
              </Link>
              <Link
                href={`/escola/eventos/edicoes/${data.edicao.id}/inscricoes`}
                className="inline-flex items-center rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
              >
                Ir para inscricoes
              </Link>
            </>
          }
        />
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Evento-base</p>
              <p className="mt-2 text-sm font-medium text-zinc-900">
                {data.edicao.evento?.titulo ?? "Nao informado"}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Ano</p>
              <p className="mt-2 text-sm font-medium text-zinc-900">
                {data.edicao.ano_referencia}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Tema</p>
              <p className="mt-2 text-sm font-medium text-zinc-900">
                {data.edicao.tema?.trim() ? data.edicao.tema : "Nao informado"}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Status</p>
              <p className="mt-2 text-sm font-medium text-zinc-900">
                {data.edicao.status.replaceAll("_", " ")}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-zinc-400">
              Periodo de inscricao
            </p>
            <p className="mt-2 text-sm font-semibold text-zinc-900">
              {resumo.periodoInscricao}
            </p>
          </div>
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-zinc-400">
              Proxima apresentacao
            </p>
            <p className="mt-2 text-sm font-semibold text-zinc-900">
              {resumo.proximaApresentacao}
            </p>
          </div>
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Ensaios</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {resumo.quantidadeEnsaios}
            </p>
          </div>
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-zinc-400">
              Itens no calendario
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {resumo.quantidadeItens}
            </p>
          </div>
        </section>

        {feedback ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {feedback}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1.1fr_1.3fr]">
          <FormCard
            title={editingItemId ? "Editar item do calendario" : "Novo item do calendario"}
            description="Cadastre marcos operacionais da edicao e escolha se cada item aparece no calendario geral da escola."
          >
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <FormInput
                  as="select"
                  label="Tipo"
                  value={form.tipo}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      tipo: event.target.value as EventoEdicaoCalendarioTipo,
                    }))
                  }
                >
                  {TIPO_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </FormInput>
                <FormInput
                  label="Titulo"
                  value={form.titulo}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, titulo: event.target.value }))
                  }
                  placeholder="Ex.: Abertura das inscricoes"
                  required
                />
                <FormInput
                  label="Inicio"
                  type="datetime-local"
                  value={form.inicio}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, inicio: event.target.value }))
                  }
                  required
                />
                <FormInput
                  label="Fim"
                  type="datetime-local"
                  value={form.fim}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, fim: event.target.value }))
                  }
                />
                <FormInput
                  label="Local"
                  value={form.localNome}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, localNome: event.target.value }))
                  }
                  placeholder="Ex.: Teatro principal"
                />
                <FormInput
                  label="Cidade"
                  value={form.cidade}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, cidade: event.target.value }))
                  }
                  placeholder="Cidade"
                />
                <FormInput
                  label="Endereco"
                  value={form.endereco}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, endereco: event.target.value }))
                  }
                  placeholder="Endereco completo"
                />
                <FormInput
                  label="Ordem"
                  type="number"
                  min="1"
                  value={form.ordem}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, ordem: event.target.value }))
                  }
                />
                <FormInput
                  as="select"
                  label="Turma vinculada"
                  value={form.turmaId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, turmaId: event.target.value }))
                  }
                >
                  <option value="">Nenhuma</option>
                  {data.turmas.map((turma) => (
                    <option key={turma.turma_id} value={turma.turma_id}>
                      {turma.nome}
                    </option>
                  ))}
                </FormInput>
                <FormInput
                  as="select"
                  label="Grupo vinculado"
                  value={form.grupoId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, grupoId: event.target.value }))
                  }
                >
                  <option value="">Nenhum</option>
                  {data.grupos.map((grupo) => (
                    <option key={grupo.id} value={grupo.id}>
                      {grupo.nome}
                    </option>
                  ))}
                </FormInput>
              </div>

              <FormInput
                label="Descricao"
                value={form.descricao}
                onChange={(event) =>
                  setForm((current) => ({ ...current, descricao: event.target.value }))
                }
                placeholder="Contexto operacional do item"
              />

              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700">
                  <input
                    type="checkbox"
                    checked={form.diaInteiro}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        diaInteiro: event.target.checked,
                      }))
                    }
                  />
                  Dia inteiro
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700">
                  <input
                    type="checkbox"
                    checked={form.refleteNoCalendarioEscola}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        refleteNoCalendarioEscola: event.target.checked,
                      }))
                    }
                  />
                  Refletir no calendario geral da escola
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={submitting || !form.titulo.trim() || !form.inicio}
                  className="inline-flex items-center rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting
                    ? "Salvando..."
                    : editingItemId
                      ? "Salvar alteracoes"
                      : "Criar item"}
                </button>
                {editingItemId ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                  >
                    Cancelar edicao
                  </button>
                ) : null}
              </div>
            </form>
          </FormCard>

          <FormCard
            title="Fluxo da edicao"
            description="Use o calendario como a camada operacional da edicao e siga para as areas dependentes."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href={`/escola/eventos/edicoes/${data.edicao.id}/configuracoes`}
                className="rounded-2xl border border-zinc-200 p-4 text-sm font-medium text-zinc-700 transition hover:border-violet-300 hover:bg-violet-50"
              >
                Configuracoes da edicao
              </Link>
              <Link
                href={`/escola/eventos/edicoes/${data.edicao.id}/inscricoes`}
                className="rounded-2xl border border-zinc-200 p-4 text-sm font-medium text-zinc-700 transition hover:border-violet-300 hover:bg-violet-50"
              >
                Inscricoes
              </Link>
              <Link
                href={`/escola/eventos/${data.edicao.id}?aba=coreografias`}
                className="rounded-2xl border border-zinc-200 p-4 text-sm font-medium text-zinc-700 transition hover:border-violet-300 hover:bg-violet-50"
              >
                Coreografias e elencos
              </Link>
              <Link
                href={`/escola/eventos/${data.edicao.id}?aba=financeiro`}
                className="rounded-2xl border border-zinc-200 p-4 text-sm font-medium text-zinc-700 transition hover:border-violet-300 hover:bg-violet-50"
              >
                Financeiro
              </Link>
            </div>
          </FormCard>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-5 space-y-1">
            <h2 className="text-xl font-semibold text-zinc-900">
              Itens do calendario da edicao
            </h2>
            <p className="text-sm text-zinc-600">
              Os itens marcados para reflexo aparecem tambem no calendario geral da escola.
            </p>
          </div>
          <div className="grid gap-5">
            {TIPO_OPTIONS.map((option) => {
              const itens = itensAgrupados.get(option.value) ?? [];

              return (
                <section
                  key={option.value}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${option.accent}`}
                      >
                        {option.label}
                      </span>
                      <span className="text-sm text-zinc-500">{itens.length} item(ns)</span>
                    </div>
                  </div>

                  {itens.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500">
                      Nenhum item deste tipo cadastrado na edicao.
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {itens.map((item) => (
                        <article
                          key={item.id}
                          className="rounded-2xl border border-zinc-200 bg-white p-4"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2 text-xs font-medium">
                                <span
                                  className={`rounded-full px-2.5 py-1 ${option.accent}`}
                                >
                                  {option.label}
                                </span>
                                {item.reflete_no_calendario_escola ? (
                                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                                    Reflete no calendario geral
                                  </span>
                                ) : null}
                              </div>

                              <div>
                                <h3 className="text-base font-semibold text-zinc-900">
                                  {item.titulo}
                                </h3>
                                <p className="text-sm text-zinc-600">
                                  {formatDateRange(item.inicio, item.fim)}
                                </p>
                              </div>

                              <dl className="grid gap-2 text-sm text-zinc-600 md:grid-cols-2">
                                <div>
                                  <dt className="text-xs uppercase tracking-wide text-zinc-400">
                                    Local
                                  </dt>
                                  <dd>
                                    {item.local_nome?.trim() ? item.local_nome : "Nao informado"}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-xs uppercase tracking-wide text-zinc-400">
                                    Vinculos
                                  </dt>
                                  <dd>
                                    Turma:{" "}
                                    {item.turma_id
                                      ? turmaNomeById.get(item.turma_id) ?? `#${item.turma_id}`
                                      : "-"}{" "}
                                    · Grupo:{" "}
                                    {item.grupo_id
                                      ? grupoNomeById.get(item.grupo_id) ?? `#${item.grupo_id}`
                                      : "-"}
                                  </dd>
                                </div>
                              </dl>

                              {item.descricao?.trim() ? (
                                <p className="text-sm text-zinc-600">{item.descricao}</p>
                              ) : null}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleEdit(item)}
                                className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleReflection(item)}
                                className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                              >
                                {item.reflete_no_calendario_escola
                                  ? "Ocultar do geral"
                                  : "Refletir no geral"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(item)}
                                className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                              >
                                Arquivar
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
