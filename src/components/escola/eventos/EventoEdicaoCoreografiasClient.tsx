"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import FormCard from "@/components/FormCard";
import FormInput from "@/components/FormInput";
import { EventoHeaderCard } from "@/components/escola/eventos/EventoHeaderCard";
import type {
  CoreografiaMestreResumo,
  EventoCoreografiaResumo,
  EventoEdicaoCoreografiasData,
} from "@/components/escola/eventos/types";

type FormacaoTipo = CoreografiaMestreResumo["tipo_formacao"];

type CoreografiaFormState = {
  nome: string;
  descricao: string;
  modalidade: string;
  tipoFormacao: FormacaoTipo;
  duracaoEstimadaSegundos: string;
  sugestaoMusica: string;
  linkMusica: string;
  quantidadeMinimaParticipantes: string;
  quantidadeMaximaParticipantes: string;
  estiloId: string;
  observacoes: string;
  ativa: boolean;
};

type VinculoFormState = {
  ordemPrevistaApresentacao: string;
  duracaoPrevistaNoEventoSegundos: string;
  valorParticipacaoCoreografia: string;
  observacoesDoEvento: string;
  ativa: boolean;
};

const FORMACAO_PRESETS: Record<
  FormacaoTipo,
  { minimo: number; maximo: number; travado: boolean }
> = {
  SOLO: { minimo: 1, maximo: 1, travado: true },
  DUO: { minimo: 2, maximo: 2, travado: true },
  TRIO: { minimo: 3, maximo: 3, travado: true },
  GRUPO: { minimo: 1, maximo: 20, travado: false },
  TURMA: { minimo: 1, maximo: 40, travado: false },
  LIVRE: { minimo: 1, maximo: 20, travado: false },
};

function createInitialCoreografiaFormState(): CoreografiaFormState {
  return {
    nome: "",
    descricao: "",
    modalidade: "",
    tipoFormacao: "LIVRE",
    duracaoEstimadaSegundos: "",
    sugestaoMusica: "",
    linkMusica: "",
    quantidadeMinimaParticipantes: "1",
    quantidadeMaximaParticipantes: "20",
    estiloId: "",
    observacoes: "",
    ativa: true,
  };
}

function createInitialVinculoFormState(): VinculoFormState {
  return {
    ordemPrevistaApresentacao: "",
    duracaoPrevistaNoEventoSegundos: "",
    valorParticipacaoCoreografia: "",
    observacoesDoEvento: "",
    ativa: true,
  };
}

function formatStatus(value: string): string {
  return value.replaceAll("_", " ");
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "-";
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}min ${String(remaining).padStart(2, "0")}s`;
}

function formatCurrency(valueCentavos: number | null): string {
  if (valueCentavos === null) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueCentavos / 100);
}

function decimalToCentavos(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(normalized) || normalized < 0) return null;
  return Math.round(normalized * 100);
}

function mapCoreografiaToForm(coreografia: CoreografiaMestreResumo): CoreografiaFormState {
  return {
    nome: coreografia.nome,
    descricao: coreografia.descricao ?? "",
    modalidade: coreografia.modalidade ?? "",
    tipoFormacao: coreografia.tipo_formacao,
    duracaoEstimadaSegundos: coreografia.duracao_estimada_segundos
      ? String(coreografia.duracao_estimada_segundos)
      : "",
    sugestaoMusica: coreografia.sugestao_musica ?? "",
    linkMusica: coreografia.link_musica ?? "",
    quantidadeMinimaParticipantes: String(
      coreografia.quantidade_minima_participantes,
    ),
    quantidadeMaximaParticipantes: String(
      coreografia.quantidade_maxima_participantes,
    ),
    estiloId: coreografia.estilo_id,
    observacoes: coreografia.observacoes ?? "",
    ativa: coreografia.ativa,
  };
}

function mapVinculoToForm(vinculo: EventoCoreografiaResumo): VinculoFormState {
  return {
    ordemPrevistaApresentacao: vinculo.ordem_prevista_apresentacao
      ? String(vinculo.ordem_prevista_apresentacao)
      : "",
    duracaoPrevistaNoEventoSegundos: vinculo.duracao_prevista_no_evento_segundos
      ? String(vinculo.duracao_prevista_no_evento_segundos)
      : "",
    valorParticipacaoCoreografia:
      vinculo.valor_participacao_coreografia_centavos !== null
        ? (vinculo.valor_participacao_coreografia_centavos / 100).toFixed(2)
        : "",
    observacoesDoEvento: vinculo.observacoes_do_evento ?? "",
    ativa: vinculo.ativa,
  };
}

function buildCoreografiaPayload(form: CoreografiaFormState) {
  return {
    nome: form.nome.trim(),
    descricao: form.descricao.trim() || null,
    modalidade: form.modalidade.trim() || null,
    tipoFormacao: form.tipoFormacao,
    duracaoEstimadaSegundos: form.duracaoEstimadaSegundos.trim()
      ? Number(form.duracaoEstimadaSegundos)
      : null,
    sugestaoMusica: form.sugestaoMusica.trim() || null,
    linkMusica: form.linkMusica.trim() || null,
    quantidadeMinimaParticipantes: Number(form.quantidadeMinimaParticipantes),
    quantidadeMaximaParticipantes: Number(form.quantidadeMaximaParticipantes),
    estiloId: form.estiloId,
    observacoes: form.observacoes.trim() || null,
    ativa: form.ativa,
  };
}

function buildVinculoPayload(form: VinculoFormState, coreografiaId: string) {
  return {
    coreografiaId,
    ordemPrevistaApresentacao: form.ordemPrevistaApresentacao.trim()
      ? Number(form.ordemPrevistaApresentacao)
      : null,
    duracaoPrevistaNoEventoSegundos: form.duracaoPrevistaNoEventoSegundos.trim()
      ? Number(form.duracaoPrevistaNoEventoSegundos)
      : null,
    valorParticipacaoCoreografiaCentavos: decimalToCentavos(
      form.valorParticipacaoCoreografia,
    ),
    observacoesDoEvento: form.observacoesDoEvento.trim() || null,
    ativa: form.ativa,
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

export function EventoEdicaoCoreografiasClient({
  data,
}: {
  data: EventoEdicaoCoreografiasData;
}) {
  const router = useRouter();
  const [coreografiaForm, setCoreografiaForm] = useState<CoreografiaFormState>(
    createInitialCoreografiaFormState,
  );
  const [vinculoForm, setVinculoForm] = useState<VinculoFormState>(
    createInitialVinculoFormState,
  );
  const [selectedCoreografiaId, setSelectedCoreografiaId] = useState("");
  const [editingMasterId, setEditingMasterId] = useState<string | null>(null);
  const [editingVinculoId, setEditingVinculoId] = useState<string | null>(null);
  const [submittingNova, setSubmittingNova] = useState(false);
  const [submittingVinculo, setSubmittingVinculo] = useState(false);
  const [submittingEdicao, setSubmittingEdicao] = useState(false);
  const [filtroEstiloId, setFiltroEstiloId] = useState("TODOS");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const resumo = useMemo(() => {
    const ativas = data.coreografias.filter((item) => item.ativa);
    const totalDuracao = ativas.reduce((acc, item) => {
      const duracao =
        item.duracao_prevista_no_evento_segundos
        ?? item.coreografia.duracao_estimada_segundos
        ?? 0;
      return acc + duracao;
    }, 0);

    return {
      total: ativas.length,
      solos: ativas.filter((item) => item.coreografia.tipo_formacao === "SOLO").length,
      duosTrios: ativas.filter((item) =>
        ["DUO", "TRIO"].includes(item.coreografia.tipo_formacao),
      ).length,
      gruposTurmas: ativas.filter((item) =>
        ["GRUPO", "TURMA", "LIVRE"].includes(item.coreografia.tipo_formacao),
      ).length,
      totalDuracao,
    };
  }, [data.coreografias]);

  const coreografiasFiltradas = useMemo(() => {
    if (filtroEstiloId === "TODOS") return data.coreografias;
    return data.coreografias.filter(
      (item) => item.coreografia.estilo_id === filtroEstiloId,
    );
  }, [data.coreografias, filtroEstiloId]);

  const coreografiasDisponiveisFiltradas = useMemo(() => {
    if (filtroEstiloId === "TODOS") return data.coreografiasDisponiveis;
    return data.coreografiasDisponiveis.filter(
      (item) => item.estilo_id === filtroEstiloId,
    );
  }, [data.coreografiasDisponiveis, filtroEstiloId]);

  const formacoesPorCodigo = useMemo(
    () =>
      new Map(
        data.formacoes.map((item) => [item.codigo, item] as const),
      ),
    [data.formacoes],
  );
  const formacaoAtual =
    formacoesPorCodigo.get(coreografiaForm.tipoFormacao) ?? null;
  const limitesTravados =
    formacaoAtual?.quantidade_fixa ??
    FORMACAO_PRESETS[coreografiaForm.tipoFormacao].travado;

  function atualizarCoreografiaCampo<K extends keyof CoreografiaFormState>(
    campo: K,
    valor: CoreografiaFormState[K],
  ) {
    setCoreografiaForm((current) => ({ ...current, [campo]: valor }));
  }

  function atualizarVinculoCampo<K extends keyof VinculoFormState>(
    campo: K,
    valor: VinculoFormState[K],
  ) {
    setVinculoForm((current) => ({ ...current, [campo]: valor }));
  }

  function aplicarPresetFormacao(tipoFormacao: FormacaoTipo) {
    const formacao = formacoesPorCodigo.get(tipoFormacao);
    const preset = formacao
      ? {
          minimo: formacao.quantidade_minima_padrao,
          maximo: formacao.quantidade_maxima_padrao,
        }
      : FORMACAO_PRESETS[tipoFormacao];

    setCoreografiaForm((current) => ({
      ...current,
      tipoFormacao,
      quantidadeMinimaParticipantes: String(preset.minimo),
      quantidadeMaximaParticipantes: String(preset.maximo),
    }));
  }

  function resetCoreografiaForm() {
    setCoreografiaForm(createInitialCoreografiaFormState());
    setEditingMasterId(null);
  }

  function resetVinculoForm() {
    setVinculoForm(createInitialVinculoFormState());
    setEditingVinculoId(null);
    setSelectedCoreografiaId("");
  }

  async function handleCreateAndLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!data.edicao) return;
    if (!coreografiaForm.estiloId) {
      setErro("Selecione um estilo para a coreografia.");
      return;
    }

    setSubmittingNova(true);
    setErro(null);
    setSucesso(null);

    try {
      const createResponse = await fetch("/api/coreografias", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildCoreografiaPayload(coreografiaForm)),
      });

      const createJson = await createResponse.json().catch(() => null);

      if (!createResponse.ok || !createJson || !(createJson as { ok?: boolean }).ok) {
        throw new Error(
          readErrorMessage(createJson, "Nao foi possivel criar a coreografia."),
        );
      }

      const coreografiaCriada = (createJson as { data: { id: string; nome: string } }).data;

      const linkResponse = await fetch(
        `/api/eventos/escola/edicoes/${data.edicao.id}/coreografias`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(buildVinculoPayload(vinculoForm, coreografiaCriada.id)),
        },
      );

      const linkJson = await linkResponse.json().catch(() => null);

      if (!linkResponse.ok || !linkJson || !(linkJson as { ok?: boolean }).ok) {
        throw new Error(
          readErrorMessage(linkJson, "Nao foi possivel vincular a coreografia a edicao."),
        );
      }

      setSucesso(
        `Coreografia ${coreografiaCriada.nome} criada e vinculada a edicao com sucesso.`,
      );
      resetCoreografiaForm();
      resetVinculoForm();
      router.refresh();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Nao foi possivel criar a coreografia.",
      );
    } finally {
      setSubmittingNova(false);
    }
  }

  async function handleLinkExisting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!data.edicao || !selectedCoreografiaId) return;

    setSubmittingVinculo(true);
    setErro(null);
    setSucesso(null);

    try {
      const response = await fetch(
        `/api/eventos/escola/edicoes/${data.edicao.id}/coreografias`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(buildVinculoPayload(vinculoForm, selectedCoreografiaId)),
        },
      );

      const json = await response.json().catch(() => null);

      if (!response.ok || !json || !(json as { ok?: boolean }).ok) {
        throw new Error(
          readErrorMessage(json, "Nao foi possivel vincular a coreografia existente."),
        );
      }

      const mestre = data.coreografiasDisponiveis.find((item) => item.id === selectedCoreografiaId);
      setSucesso(
        `Coreografia ${mestre?.nome ?? "selecionada"} vinculada a edicao com sucesso.`,
      );
      resetVinculoForm();
      router.refresh();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Nao foi possivel vincular a coreografia existente.",
      );
    } finally {
      setSubmittingVinculo(false);
    }
  }

  async function handleSaveMaster(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingMasterId) return;
    if (!coreografiaForm.estiloId) {
      setErro("Selecione um estilo para a coreografia.");
      return;
    }

    setSubmittingEdicao(true);
    setErro(null);
    setSucesso(null);

    try {
      const response = await fetch(`/api/coreografias/${editingMasterId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildCoreografiaPayload(coreografiaForm)),
      });

      const json = await response.json().catch(() => null);

      if (!response.ok || !json || !(json as { ok?: boolean }).ok) {
        throw new Error(
          readErrorMessage(json, "Nao foi possivel atualizar o cadastro mestre."),
        );
      }

      setSucesso("Cadastro mestre atualizado com sucesso.");
      resetCoreografiaForm();
      router.refresh();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Nao foi possivel atualizar o cadastro mestre.",
      );
    } finally {
      setSubmittingEdicao(false);
    }
  }

  async function handleSaveVinculo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!data.edicao || !editingVinculoId) return;

    setSubmittingEdicao(true);
    setErro(null);
    setSucesso(null);

    try {
      const response = await fetch(
        `/api/eventos/escola/edicoes/${data.edicao.id}/coreografias/${editingVinculoId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ordemPrevistaApresentacao: vinculoForm.ordemPrevistaApresentacao.trim()
              ? Number(vinculoForm.ordemPrevistaApresentacao)
              : null,
            duracaoPrevistaNoEventoSegundos: vinculoForm.duracaoPrevistaNoEventoSegundos.trim()
              ? Number(vinculoForm.duracaoPrevistaNoEventoSegundos)
              : null,
            valorParticipacaoCoreografiaCentavos: decimalToCentavos(
              vinculoForm.valorParticipacaoCoreografia,
            ),
            observacoesDoEvento: vinculoForm.observacoesDoEvento.trim() || null,
            ativa: vinculoForm.ativa,
          }),
        },
      );

      const json = await response.json().catch(() => null);

      if (!response.ok || !json || !(json as { ok?: boolean }).ok) {
        throw new Error(
          readErrorMessage(json, "Nao foi possivel atualizar o vinculo da edicao."),
        );
      }

      setSucesso("Vinculo da coreografia atualizado com sucesso.");
      resetVinculoForm();
      router.refresh();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Nao foi possivel atualizar o vinculo da edicao.",
      );
    } finally {
      setSubmittingEdicao(false);
    }
  }

  async function handleArchive(vinculo: EventoCoreografiaResumo) {
    if (!data.edicao) return;
    if (!window.confirm(`Arquivar o vinculo da coreografia ${vinculo.coreografia.nome}?`)) {
      return;
    }

    setErro(null);
    setSucesso(null);

    try {
      const response = await fetch(
        `/api/eventos/escola/edicoes/${data.edicao.id}/coreografias/${vinculo.id}`,
        { method: "DELETE" },
      );

      const json = await response.json().catch(() => null);

      if (!response.ok || !json || !(json as { ok?: boolean }).ok) {
        throw new Error(
          readErrorMessage(json, "Nao foi possivel arquivar o vinculo da coreografia."),
        );
      }

      if (editingVinculoId === vinculo.id) {
        resetVinculoForm();
      }

      setSucesso(`Vinculo de ${vinculo.coreografia.nome} arquivado com sucesso.`);
      router.refresh();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Nao foi possivel arquivar o vinculo da coreografia.",
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
            descricao="Nao foi possivel localizar a edicao para gerenciar as coreografias."
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
          titulo={`Coreografias da edicao - ${data.edicao.titulo_exibicao}`}
          descricao="Gerencie o cadastro mestre reutilizavel das coreografias e o uso contextual de cada uma nesta edicao."
          actions={
            <>
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
                Calendario
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

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Evento-base</p>
            <p className="mt-2 text-sm font-medium text-zinc-900">
              {data.edicao.evento?.titulo ?? "Nao informado"}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Ano</p>
            <p className="mt-2 text-sm font-medium text-zinc-900">
              {data.edicao.ano_referencia}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Status</p>
            <p className="mt-2 text-sm font-medium text-zinc-900">
              {formatStatus(data.edicao.status)}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Tema</p>
            <p className="mt-2 text-sm font-medium text-zinc-900">
              {data.edicao.tema?.trim() ? data.edicao.tema : "Nao informado"}
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Vinculos ativos</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">{resumo.total}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Solos</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">{resumo.solos}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Duos e trios</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">{resumo.duosTrios}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Grupos e turmas</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">{resumo.gruposTurmas}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Duracao total</p>
            <p className="mt-2 text-lg font-semibold text-zinc-900">
              {formatDuration(resumo.totalDuracao)}
            </p>
          </div>
        </section>

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

        <form className="grid gap-6" onSubmit={handleCreateAndLink}>
          <FormCard
            title="Nova coreografia"
            description="Crie o cadastro mestre e ja vincule a coreografia a esta edicao."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FormInput
                label="Nome da coreografia"
                value={coreografiaForm.nome}
                onChange={(event) => atualizarCoreografiaCampo("nome", event.target.value)}
              />
              <FormInput
                label="Modalidade"
                value={coreografiaForm.modalidade}
                onChange={(event) =>
                  atualizarCoreografiaCampo("modalidade", event.target.value)
                }
              />
              <FormInput
                as="select"
                label="Tipo de formacao"
                value={coreografiaForm.tipoFormacao}
                onChange={(event) =>
                  aplicarPresetFormacao(event.target.value as FormacaoTipo)
                }
              >
                {data.formacoes.map((formacao) => (
                  <option key={formacao.id} value={formacao.codigo}>
                    {formacao.nome}
                  </option>
                ))}
              </FormInput>
              <FormInput
                label="Duracao estimada (segundos)"
                type="number"
                min="1"
                value={coreografiaForm.duracaoEstimadaSegundos}
                onChange={(event) =>
                  atualizarCoreografiaCampo("duracaoEstimadaSegundos", event.target.value)
                }
              />
              <FormInput
                label="Participantes minimos"
                type="number"
                min="1"
                disabled={limitesTravados}
                value={coreografiaForm.quantidadeMinimaParticipantes}
                onChange={(event) =>
                  atualizarCoreografiaCampo("quantidadeMinimaParticipantes", event.target.value)
                }
              />
              <FormInput
                label="Participantes maximos"
                type="number"
                min="1"
                disabled={limitesTravados}
                value={coreografiaForm.quantidadeMaximaParticipantes}
                onChange={(event) =>
                  atualizarCoreografiaCampo("quantidadeMaximaParticipantes", event.target.value)
                }
              />
              <FormInput
                label="Sugestao de musica"
                value={coreografiaForm.sugestaoMusica}
                onChange={(event) =>
                  atualizarCoreografiaCampo("sugestaoMusica", event.target.value)
                }
              />
              <FormInput
                label="Link da musica"
                value={coreografiaForm.linkMusica}
                onChange={(event) =>
                  atualizarCoreografiaCampo("linkMusica", event.target.value)
                }
              />
              <FormInput
                as="select"
                label="Estilo"
                value={coreografiaForm.estiloId}
                onChange={(event) =>
                  atualizarCoreografiaCampo("estiloId", event.target.value)
                }
              >
                <option value="">Selecione</option>
                {data.estilos
                  .filter((item) => item.ativo)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                    </option>
                  ))}
              </FormInput>
              <FormInput
                label="Ordem prevista no evento"
                type="number"
                min="1"
                value={vinculoForm.ordemPrevistaApresentacao}
                onChange={(event) =>
                  atualizarVinculoCampo("ordemPrevistaApresentacao", event.target.value)
                }
              />
              <FormInput
                label="Duracao prevista no evento (segundos)"
                type="number"
                min="1"
                value={vinculoForm.duracaoPrevistaNoEventoSegundos}
                onChange={(event) =>
                  atualizarVinculoCampo(
                    "duracaoPrevistaNoEventoSegundos",
                    event.target.value,
                  )
                }
              />
              <FormInput
                label="Ajuste legado de valor (R$)"
                type="number"
                min="0"
                step="0.01"
                value={vinculoForm.valorParticipacaoCoreografia}
                onChange={(event) =>
                  atualizarVinculoCampo("valorParticipacaoCoreografia", event.target.value)
                }
              />
              <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700">
                <input
                  type="checkbox"
                  checked={coreografiaForm.ativa}
                  onChange={(event) =>
                    atualizarCoreografiaCampo("ativa", event.target.checked)
                  }
                />
                Cadastro mestre ativo
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700">
                <input
                  type="checkbox"
                  checked={vinculoForm.ativa}
                  onChange={(event) =>
                    atualizarVinculoCampo("ativa", event.target.checked)
                  }
                />
                Vinculo ativo na edicao
              </label>
              <FormInput
                as="textarea"
                label="Descricao"
                value={coreografiaForm.descricao}
                onChange={(event) =>
                  atualizarCoreografiaCampo("descricao", event.target.value)
                }
                className="md:col-span-2 xl:col-span-4"
              />
              <FormInput
                as="textarea"
                label="Observacoes do cadastro mestre"
                value={coreografiaForm.observacoes}
                onChange={(event) =>
                  atualizarCoreografiaCampo("observacoes", event.target.value)
                }
                className="md:col-span-2 xl:col-span-2"
              />
              <FormInput
                as="textarea"
                label="Observacoes desta apresentacao"
                value={vinculoForm.observacoesDoEvento}
                onChange={(event) =>
                  atualizarVinculoCampo("observacoesDoEvento", event.target.value)
                }
                className="md:col-span-2 xl:col-span-2"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={submittingNova}
                className="inline-flex items-center rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submittingNova ? "Salvando..." : "Nova coreografia"}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetCoreografiaForm();
                  resetVinculoForm();
                }}
                className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Limpar
              </button>
            </div>
          </FormCard>
        </form>

        <form className="grid gap-6" onSubmit={handleLinkExisting}>
          <FormCard
            title="Vincular coreografia existente"
            description="Selecione um cadastro mestre ja existente e configure o uso dele nesta edicao."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <FormInput
                as="select"
                label="Coreografia mestre"
                value={selectedCoreografiaId}
                onChange={(event) => setSelectedCoreografiaId(event.target.value)}
              >
                <option value="">Selecione</option>
                {coreografiasDisponiveisFiltradas.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome} · {item.formacao?.nome ?? item.tipo_formacao}
                  </option>
                ))}
              </FormInput>
              <FormInput
                label="Ordem prevista"
                type="number"
                min="1"
                value={vinculoForm.ordemPrevistaApresentacao}
                onChange={(event) =>
                  atualizarVinculoCampo("ordemPrevistaApresentacao", event.target.value)
                }
              />
              <FormInput
                label="Duracao prevista (segundos)"
                type="number"
                min="1"
                value={vinculoForm.duracaoPrevistaNoEventoSegundos}
                onChange={(event) =>
                  atualizarVinculoCampo(
                    "duracaoPrevistaNoEventoSegundos",
                    event.target.value,
                  )
                }
              />
              <FormInput
                label="Ajuste legado de valor (R$)"
                type="number"
                min="0"
                step="0.01"
                value={vinculoForm.valorParticipacaoCoreografia}
                onChange={(event) =>
                  atualizarVinculoCampo("valorParticipacaoCoreografia", event.target.value)
                }
              />
              <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700">
                <input
                  type="checkbox"
                  checked={vinculoForm.ativa}
                  onChange={(event) =>
                    atualizarVinculoCampo("ativa", event.target.checked)
                  }
                />
                Vinculo ativo
              </label>
              <FormInput
                as="textarea"
                label="Observacoes desta apresentacao"
                value={vinculoForm.observacoesDoEvento}
                onChange={(event) =>
                  atualizarVinculoCampo("observacoesDoEvento", event.target.value)
                }
                className="md:col-span-2 xl:col-span-5"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={submittingVinculo || !selectedCoreografiaId}
                className="inline-flex items-center rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submittingVinculo ? "Vinculando..." : "Vincular coreografia existente"}
              </button>
              <button
                type="button"
                onClick={resetVinculoForm}
                className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Limpar vinculo
              </button>
            </div>
          </FormCard>
        </form>

        {editingMasterId ? (
          <form className="grid gap-6" onSubmit={handleSaveMaster}>
            <FormCard
              title="Editar cadastro mestre"
              description="Altere os dados reutilizaveis da coreografia sem mexer no uso contextual desta edicao."
              actions={
                <button
                  type="button"
                  onClick={resetCoreografiaForm}
                  className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                >
                  Cancelar
                </button>
              }
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <FormInput label="Nome" value={coreografiaForm.nome} onChange={(event) => atualizarCoreografiaCampo("nome", event.target.value)} />
                <FormInput label="Modalidade" value={coreografiaForm.modalidade} onChange={(event) => atualizarCoreografiaCampo("modalidade", event.target.value)} />
                <FormInput as="select" label="Formacao" value={coreografiaForm.tipoFormacao} onChange={(event) => aplicarPresetFormacao(event.target.value as FormacaoTipo)}>
                {data.formacoes.map((formacao) => (
                  <option key={formacao.id} value={formacao.codigo}>
                    {formacao.nome}
                  </option>
                ))}
                </FormInput>
                <FormInput label="Duracao estimada" type="number" min="1" value={coreografiaForm.duracaoEstimadaSegundos} onChange={(event) => atualizarCoreografiaCampo("duracaoEstimadaSegundos", event.target.value)} />
                <FormInput label="Minimo" type="number" min="1" disabled={limitesTravados} value={coreografiaForm.quantidadeMinimaParticipantes} onChange={(event) => atualizarCoreografiaCampo("quantidadeMinimaParticipantes", event.target.value)} />
                <FormInput label="Maximo" type="number" min="1" disabled={limitesTravados} value={coreografiaForm.quantidadeMaximaParticipantes} onChange={(event) => atualizarCoreografiaCampo("quantidadeMaximaParticipantes", event.target.value)} />
                <FormInput label="Sugestao de musica" value={coreografiaForm.sugestaoMusica} onChange={(event) => atualizarCoreografiaCampo("sugestaoMusica", event.target.value)} />
                <FormInput label="Link da musica" value={coreografiaForm.linkMusica} onChange={(event) => atualizarCoreografiaCampo("linkMusica", event.target.value)} />
                <FormInput
                  as="select"
                  label="Estilo"
                  value={coreografiaForm.estiloId}
                  onChange={(event) =>
                    atualizarCoreografiaCampo("estiloId", event.target.value)
                  }
                >
                  <option value="">Selecione</option>
                  {data.estilos.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                    </option>
                  ))}
                </FormInput>
                <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700">
                  <input type="checkbox" checked={coreografiaForm.ativa} onChange={(event) => atualizarCoreografiaCampo("ativa", event.target.checked)} />
                  Cadastro mestre ativo
                </label>
                <FormInput as="textarea" label="Descricao" value={coreografiaForm.descricao} onChange={(event) => atualizarCoreografiaCampo("descricao", event.target.value)} className="md:col-span-2 xl:col-span-2" />
                <FormInput as="textarea" label="Observacoes" value={coreografiaForm.observacoes} onChange={(event) => atualizarCoreografiaCampo("observacoes", event.target.value)} className="md:col-span-2 xl:col-span-2" />
              </div>

              <div className="mt-4">
                <button type="submit" disabled={submittingEdicao} className="inline-flex items-center rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70">
                  {submittingEdicao ? "Salvando..." : "Salvar cadastro mestre"}
                </button>
              </div>
            </FormCard>
          </form>
        ) : null}

        {editingVinculoId ? (
          <form className="grid gap-6" onSubmit={handleSaveVinculo}>
            <FormCard
              title="Editar uso da coreografia na edicao"
              description="Ajuste apenas ordem, duracao e observacoes especificas deste evento. O valor padrao da inscricao deve ser configurado nas regras financeiras da edicao."
              actions={
                <button
                  type="button"
                  onClick={resetVinculoForm}
                  className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                >
                  Cancelar
                </button>
              }
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <FormInput label="Ordem prevista" type="number" min="1" value={vinculoForm.ordemPrevistaApresentacao} onChange={(event) => atualizarVinculoCampo("ordemPrevistaApresentacao", event.target.value)} />
                <FormInput label="Duracao prevista" type="number" min="1" value={vinculoForm.duracaoPrevistaNoEventoSegundos} onChange={(event) => atualizarVinculoCampo("duracaoPrevistaNoEventoSegundos", event.target.value)} />
                <FormInput label="Ajuste legado de valor (R$)" type="number" min="0" step="0.01" value={vinculoForm.valorParticipacaoCoreografia} onChange={(event) => atualizarVinculoCampo("valorParticipacaoCoreografia", event.target.value)} />
                <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700">
                  <input type="checkbox" checked={vinculoForm.ativa} onChange={(event) => atualizarVinculoCampo("ativa", event.target.checked)} />
                  Vinculo ativo
                </label>
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                  Regras financeiras da inscricao sao definidas na configuracao da edicao
                </div>
                <FormInput as="textarea" label="Observacoes desta apresentacao" value={vinculoForm.observacoesDoEvento} onChange={(event) => atualizarVinculoCampo("observacoesDoEvento", event.target.value)} className="md:col-span-2 xl:col-span-5" />
              </div>

              <div className="mt-4">
                <button type="submit" disabled={submittingEdicao} className="inline-flex items-center rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70">
                  {submittingEdicao ? "Salvando..." : "Salvar vinculo"}
                </button>
              </div>
            </FormCard>
          </form>
        ) : null}

        <FormCard
          title="Coreografias vinculadas a esta edicao"
          description="Lista operacional da edicao com acesso ao cadastro mestre e ao uso contextual do evento."
        >
          <div className="mb-4 grid gap-4 md:grid-cols-[minmax(0,320px)_1fr] md:items-end">
            <FormInput
              as="select"
              label="Filtrar por estilo"
              value={filtroEstiloId}
              onChange={(event) => setFiltroEstiloId(event.target.value)}
            >
              <option value="TODOS">Todos os estilos</option>
              {data.estilos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </FormInput>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              {coreografiasFiltradas.length} coreografia(s) no filtro atual.
            </div>
          </div>

          {coreografiasFiltradas.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-500">
              Nenhuma coreografia vinculada a esta edicao para o filtro atual.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {coreografiasFiltradas.map((vinculo) => {
                const duracao = vinculo.duracao_prevista_no_evento_segundos ?? vinculo.coreografia.duracao_estimada_segundos;

                return (
                  <article key={vinculo.id} className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap gap-2 text-xs font-medium">
                        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">
                          {vinculo.coreografia.formacao?.nome ?? vinculo.coreografia.tipo_formacao}
                        </span>
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                          {vinculo.coreografia.estilo?.nome ?? "Sem estilo"}
                        </span>
                        <span className="rounded-full bg-zinc-200 px-2.5 py-1 text-zinc-700">Ordem {vinculo.ordem_prevista_apresentacao ?? "-"}</span>
                        <span className={`rounded-full px-2.5 py-1 ${vinculo.ativa ? "bg-emerald-50 text-emerald-700" : "bg-zinc-200 text-zinc-700"}`}>
                          {vinculo.ativa ? "Vinculada" : "Arquivada"}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-semibold text-zinc-900">{vinculo.coreografia.nome}</h3>
                        <p className="text-sm text-zinc-600">
                          Modalidade: {vinculo.coreografia.modalidade?.trim() ? vinculo.coreografia.modalidade : "Nao informada"}
                        </p>
                        {vinculo.coreografia.descricao?.trim() ? (
                          <p className="mt-1 text-sm text-zinc-600">{vinculo.coreografia.descricao}</p>
                        ) : null}
                      </div>

                      <dl className="grid gap-3 text-sm text-zinc-600 sm:grid-cols-2">
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-zinc-400">Duracao</dt>
                          <dd>{formatDuration(duracao)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-zinc-400">Participantes</dt>
                          <dd>
                            {vinculo.coreografia.quantidade_minima_participantes} a {vinculo.coreografia.quantidade_maxima_participantes}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-zinc-400">Ocupacao atual</dt>
                          <dd>
                            {vinculo.ocupacao_atual ??
                              vinculo.participantes?.filter((item) => item.ativo !== false).length ??
                              0}
                            {typeof vinculo.coreografia.quantidade_maxima_participantes === "number"
                              ? ` / ${vinculo.coreografia.quantidade_maxima_participantes}`
                              : ""}
                            {vinculo.lotada ? " · lotada" : ""}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-zinc-400">Musica</dt>
                          <dd>{vinculo.coreografia.sugestao_musica?.trim() ? vinculo.coreografia.sugestao_musica : "Nao informada"}</dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-zinc-400">Ajuste legado de valor</dt>
                          <dd>{formatCurrency(vinculo.valor_participacao_coreografia_centavos)}</dd>
                        </div>
                      </dl>

                      {vinculo.observacoes_do_evento?.trim() ? (
                        <p className="text-sm text-zinc-600">{vinculo.observacoes_do_evento}</p>
                      ) : null}

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMasterId(vinculo.coreografia.id);
                            setCoreografiaForm(mapCoreografiaToForm(vinculo.coreografia));
                            setErro(null);
                            setSucesso(null);
                          }}
                          className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                        >
                          Editar cadastro
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingVinculoId(vinculo.id);
                            setVinculoForm(mapVinculoToForm(vinculo));
                            setErro(null);
                            setSucesso(null);
                          }}
                          className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                        >
                          Editar vinculo
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleArchive(vinculo)}
                          className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                        >
                          Arquivar vinculo
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </FormCard>
      </div>
    </div>
  );
}
