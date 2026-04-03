"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import FormCard from "@/components/FormCard";
import { EventoHeaderCard } from "@/components/escola/eventos/EventoHeaderCard";
import { InscricaoCoreografiaModal } from "@/components/escola/eventos/InscricaoCoreografiaModal";
import type {
  EventoContaInternaElegivelResumo,
  EventoCoreografiaResumo,
  EventoEdicaoInscricoesData,
  EventoFormaPagamentoResumo,
  EventoInscricaoParticipacaoArtistica,
  EventoInscricaoResumo,
  EventoParticipanteExternoResumo,
} from "@/components/escola/eventos/types";
import { calcularComposicaoFinanceiraEventoEdicao } from "@/lib/eventos/inscricaoPricing";

type OrigemInscricao = "INSCRICAO_INTERNA" | "INSCRICAO_EXTERNA";
type DestinoFinanceiro = "CONTA_INTERNA" | "COBRANCA_DIRETA" | "COBRANCA_AVULSA";
type ModalidadePagamentoFinanceiro =
  | "ATO_TOTAL"
  | "CONTA_INTERNA_TOTAL"
  | "MISTO";

type AlunoBuscaItem = {
  pessoa_id: number;
  nome: string;
  email?: string | null;
  telefone?: string | null;
};

type FormState = {
  origemInscricao: OrigemInscricao;
  alunoBusca: string;
  alunoSelecionado: AlunoBuscaItem | null;
  externoBusca: string;
  externoSelecionado: EventoParticipanteExternoResumo | null;
  externoNome: string;
  externoDocumento: string;
  externoTelefone: string;
  externoEmail: string;
  externoResponsavel: string;
  externoObservacoes: string;
  incluirEventoGeral: boolean;
  itemConfiguracaoIds: string[];
  participacoesArtisticas: EventoInscricaoParticipacaoArtistica[];
  permitirCoreografiasDepois: boolean;
  modalidadePagamentoFinanceiro: ModalidadePagamentoFinanceiro;
  valorPagoAtoCentavos: string;
  pagamentoNoAto: boolean;
  destinoFinanceiro: DestinoFinanceiro;
  contaInternaId: number | null;
  quantidadeParcelasContaInterna: number;
  formaPagamentoCodigo: string;
  observacoes: string;
};

type AmpliacaoFormState = {
  incluirEventoGeral: boolean;
  itemConfiguracaoIds: string[];
  participacoesArtisticas: EventoInscricaoParticipacaoArtistica[];
  observacoes: string;
};

type ParcelamentoOption = {
  quantidadeParcelas: number;
  competencias: string[];
  valorPorCompetencia: Array<{
    competencia: string;
    valorCentavos: number;
  }>;
};

type InscricaoConfirmacaoState = {
  inscricaoId: string;
  participanteNome: string;
  eventoBaseTitulo: string | null;
  tituloEdicao: string | null;
  dataInscricao: string | null;
  itens: Array<{
    id: string;
    tipoItem: string | null;
    descricao: string;
    quantidade: number;
    valorTotalCentavos: number;
    status: string;
  }>;
  financeiro: {
    valorTotalCentavos: number;
    modalidadePagamentoFinanceiro: ModalidadePagamentoFinanceiro | null;
    valorPagoAtoCentavos: number;
    valorSaldoContaInternaCentavos: number;
    statusFinanceiro: string | null;
    destinoFinanceiro: string | null;
    pagamentoNoAto: boolean | null;
    contaInternaId: number | null;
  };
  parcelamento: Array<{
    parcelaNumero: number;
    totalParcelas: number;
    competencia: string;
    valorCentavos: number;
    dataVencimento: string | null;
  }>;
  contaInterna: EventoContaInternaElegivelResumo | null;
};

function currency(valueCentavos: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueCentavos / 100);
}

function parseCentavosInput(value: string): number {
  const normalized = value.replace(/[^\d]/g, "");
  if (!normalized) return 0;
  return Number.parseInt(normalized, 10);
}

function formatStatus(value: string): string {
  return value.replaceAll("_", " ");
}

function formatItemTipo(value: string | null | undefined): string {
  if (!value) return "Item";
  if (value === "EVENTO_GERAL") return "Evento geral";
  if (value === "ITEM_EDICAO") return "Item adicional";
  if (value === "COREOGRAFIA") return "Coreografia";
  return formatStatus(value);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "-";
  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(date);
}

function formatCompetenciaLabel(value: string): string {
  const [yearRaw, monthRaw] = value.split("-");
  const date = new Date(Number(yearRaw), Number(monthRaw) - 1, 1);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function readErrorMessage(json: unknown, fallback: string): string {
  if (typeof json === "object" && json !== null) {
    const record = json as Record<string, unknown>;
    if (typeof record.details === "string" && record.details) return record.details;
    if (typeof record.message === "string" && record.message) return record.message;
    if (typeof record.error === "string" && record.error) return record.error;
  }
  return fallback;
}

function readOperationalError(
  json: unknown,
  fallback: string,
): { code: string | null; message: string; details: string | null } {
  if (typeof json === "object" && json !== null) {
    const record = json as Record<string, unknown>;
    const message =
      typeof record.message === "string" && record.message
        ? record.message
        : typeof record.error === "string" && record.error
          ? record.error
          : fallback;
    const details =
      typeof record.details === "string" && record.details ? record.details : null;
    const code = typeof record.code === "string" ? record.code : null;

    return { code, message, details };
  }

  return { code: null, message: fallback, details: null };
}

function getFinanceiroTecnicoBadgeTone(
  status: string | null | undefined,
): string {
  if (status === "CONCLUIDO") return "bg-emerald-50 text-emerald-700";
  if (status === "ERRO") return "bg-rose-50 text-rose-700";
  if (status === "PROCESSANDO") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

async function fetchContasInternasElegiveisEvento(params: {
  edicaoId: string;
  alunoPessoaId: number;
  signal?: AbortSignal;
}) {
  const searchParams = new URLSearchParams({
    alunoPessoaId: String(params.alunoPessoaId),
  });
  const response = await fetch(
    `/api/eventos/escola/edicoes/${params.edicaoId}/inscricoes/contas-internas?${searchParams.toString()}`,
    {
      signal: params.signal,
    },
  );
  const json = (await response.json().catch(() => null)) as
    | { ok: true; data: EventoContaInternaElegivelResumo[] }
    | { ok: false; details?: string; message?: string; error?: string }
    | null;

  if (!response.ok || !json || ("ok" in json && !json.ok)) {
    throw new Error(
      readErrorMessage(
        json,
        "Nao foi possivel carregar as contas internas elegiveis.",
      ),
    );
  }

  return json.data ?? [];
}

function buildParticipacaoArtistica(
  coreografia: EventoCoreografiaResumo,
): EventoInscricaoParticipacaoArtistica {
  return {
    localId: crypto.randomUUID(),
    coreografiaVinculoId: coreografia.id,
    formacao: coreografia.coreografia.tipo_formacao,
  };
}

function findCoreografiaByParticipacao(
  coreografias: EventoCoreografiaResumo[],
  participacao: EventoInscricaoParticipacaoArtistica,
) {
  return (
    coreografias.find((item) => item.id === participacao.coreografiaVinculoId) ?? null
  );
}

function describeContaInterna(conta: EventoContaInternaElegivelResumo): string {
  const detalhes = [conta.descricao?.trim() || null];

  if (conta.destinoLiquidacaoFatura === "INTEGRACAO_FOLHA_MES_SEGUINTE") {
    detalhes.push("liquidacao via folha");
  } else if (conta.destinoLiquidacaoFatura === "NEOFIN") {
    detalhes.push("fatura mensal");
  }

  return detalhes.filter(Boolean).join(" - ");
}

function formatContaInternaOrigem(
  origem: EventoContaInternaElegivelResumo["origemTitular"],
): string {
  if (origem === "ALUNO") return "Conta do aluno";
  if (origem === "RESPONSAVEL_FINANCEIRO") return "Conta do responsavel financeiro";
  return "Conta do colaborador";
}

function buildCompetenciasElegiveis(params: {
  conta: EventoContaInternaElegivelResumo | null;
}): string[] {
  if (!params.conta) return [];
  return params.conta.competenciasElegiveis;
}

function distribuirParcelas(
  valorTotalCentavos: number,
  quantidadeParcelas: number,
): number[] {
  if (quantidadeParcelas <= 1) return [valorTotalCentavos];
  const base = Math.floor(valorTotalCentavos / quantidadeParcelas);
  const resto = valorTotalCentavos % quantidadeParcelas;

  return Array.from({ length: quantidadeParcelas }, (_, index) =>
    base + (index < resto ? 1 : 0),
  );
}

function createInitialForm(data: EventoEdicaoInscricoesData): FormState {
  const configuracao = data.configuracao;

  return {
    origemInscricao: "INSCRICAO_INTERNA",
    alunoBusca: "",
    alunoSelecionado: null,
    externoBusca: "",
    externoSelecionado: null,
    externoNome: "",
    externoDocumento: "",
    externoTelefone: "",
    externoEmail: "",
    externoResponsavel: "",
    externoObservacoes: "",
    incluirEventoGeral: configuracao?.exige_inscricao_geral ?? false,
    itemConfiguracaoIds: [],
    participacoesArtisticas: [],
    permitirCoreografiasDepois: false,
    modalidadePagamentoFinanceiro:
      configuracao?.permite_conta_interna === false ? "ATO_TOTAL" : "CONTA_INTERNA_TOTAL",
    valorPagoAtoCentavos: "",
    pagamentoNoAto: false,
    destinoFinanceiro:
      configuracao?.permite_conta_interna === false
        ? "COBRANCA_DIRETA"
        : "CONTA_INTERNA",
    contaInternaId: null,
    quantidadeParcelasContaInterna: 1,
    formaPagamentoCodigo: "",
    observacoes: "",
  };
}

function createAmpliacaoForm(): AmpliacaoFormState {
  return {
    incluirEventoGeral: false,
    itemConfiguracaoIds: [],
    participacoesArtisticas: [],
    observacoes: "",
  };
}

export function EventoEdicaoInscricoesClient({
  data,
  modo = "operacao",
}: {
  data: EventoEdicaoInscricoesData;
  modo?: "operacao" | "controle";
}) {
  const router = useRouter();
  const isModoOperacao = modo === "operacao";
  const isModoControle = modo === "controle";
  const [form, setForm] = useState<FormState>(() => createInitialForm(data));
  const [inscricoes, setInscricoes] = useState<EventoInscricaoResumo[]>(data.inscricoes);
  const [coreografiasState, setCoreografiasState] = useState<EventoCoreografiaResumo[]>(
    data.coreografias.filter((item) => item.ativa),
  );
  const [formasPagamento, setFormasPagamento] = useState<EventoFormaPagamentoResumo[]>(
    data.formasPagamento,
  );
  const [contasInternasElegiveis, setContasInternasElegiveis] = useState<
    EventoContaInternaElegivelResumo[]
  >([]);
  const [alunos, setAlunos] = useState<AlunoBuscaItem[]>([]);
  const [externos, setExternos] = useState<EventoParticipanteExternoResumo[]>([]);
  const [loadingAlunos, setLoadingAlunos] = useState(false);
  const [loadingExternos, setLoadingExternos] = useState(false);
  const [loadingContasInternas, setLoadingContasInternas] = useState(false);
  const [criandoContaInterna, setCriandoContaInterna] = useState(false);
  const [erroContasInternas, setErroContasInternas] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);
  const [reprocessandoFinanceiroId, setReprocessandoFinanceiroId] = useState<string | null>(
    null,
  );
  const [ampliandoInscricaoId, setAmpliandoInscricaoId] = useState<string | null>(null);
  const [ampliacaoForm, setAmpliacaoForm] = useState<AmpliacaoFormState>(
    () => createAmpliacaoForm(),
  );
  const [modalParticipacaoAberto, setModalParticipacaoAberto] = useState(false);
  const [modalParticipacaoContexto, setModalParticipacaoContexto] = useState<
    "nova_inscricao" | "ampliacao"
  >("nova_inscricao");
  const [salvandoAmpliacaoId, setSalvandoAmpliacaoId] = useState<string | null>(null);
  const [cancelandoItemId, setCancelandoItemId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [erroOperacional, setErroOperacional] = useState<{
    code: string | null;
    message: string;
    details: string | null;
  } | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [confirmacaoInscricao, setConfirmacaoInscricao] =
    useState<InscricaoConfirmacaoState | null>(null);

  const configuracao = data.configuracao;
  const dashboard = data.dashboard;
  const itensConfiguraveis = data.itensFinanceiros;
  const coreografias = coreografiasState.filter((item) => item.ativa);
  const inscricaoEmAmpliacao = useMemo(
    () =>
      inscricoes.find((item) => item.id === ampliandoInscricaoId) ?? null,
    [ampliandoInscricaoId, inscricoes],
  );

  const composicao = useMemo(() => {
    return calcularComposicaoFinanceiraEventoEdicao({
      configuracao,
      incluirEventoGeral: form.incluirEventoGeral,
      itensConfiguracao: itensConfiguraveis.filter((item) =>
        form.itemConfiguracaoIds.includes(String(item.id)),
      ),
      coreografiasSelecionadas: form.participacoesArtisticas
        .map((participacao) =>
          coreografias.find(
            (item) => item.id === participacao.coreografiaVinculoId,
          ) ?? null,
        )
        .filter((item): item is EventoCoreografiaResumo => Boolean(item)),
    });
  }, [
    configuracao,
    coreografias,
    form.incluirEventoGeral,
    form.itemConfiguracaoIds,
    form.participacoesArtisticas,
      itensConfiguraveis,
  ]);

  const permitePagamentoNoAto = configuracao?.permite_pagamento_no_ato !== false;
  const permiteContaInterna = configuracao?.permite_conta_interna !== false;
  const valorPagoAtoCentavosCalculado = useMemo(() => {
    if (form.origemInscricao === "INSCRICAO_EXTERNA") return composicao.totalCentavos;
    if (form.modalidadePagamentoFinanceiro === "ATO_TOTAL") {
      return composicao.totalCentavos;
    }
    if (form.modalidadePagamentoFinanceiro === "MISTO") {
      return Math.min(
        composicao.totalCentavos,
        Math.max(0, parseCentavosInput(form.valorPagoAtoCentavos)),
      );
    }
    return 0;
  }, [
    composicao.totalCentavos,
    form.modalidadePagamentoFinanceiro,
    form.origemInscricao,
    form.valorPagoAtoCentavos,
  ]);
  const valorSaldoContaInternaCentavos = Math.max(
    0,
    composicao.totalCentavos - valorPagoAtoCentavosCalculado,
  );

  const contaInternaSelecionada = useMemo(
    () =>
      contasInternasElegiveis.find((item) => item.contaId === form.contaInternaId) ??
      null,
    [contasInternasElegiveis, form.contaInternaId],
  );
  const competenciasElegiveisContaInterna = useMemo(
    () =>
      buildCompetenciasElegiveis({
        conta: contaInternaSelecionada,
      }),
    [contaInternaSelecionada],
  );
  const parcelamentoOptions = useMemo<ParcelamentoOption[]>(() => {
    if (
      form.origemInscricao !== "INSCRICAO_INTERNA" ||
      valorSaldoContaInternaCentavos <= 0 ||
      form.destinoFinanceiro !== "CONTA_INTERNA" ||
      !contaInternaSelecionada
    ) {
      return [];
    }

    if (competenciasElegiveisContaInterna.length === 0) return [];

    const maximoParcelas =
      configuracao?.permite_parcelamento_conta_interna &&
        contaInternaSelecionada.permiteParcelamento
        ? Math.min(
            Math.max(1, contaInternaSelecionada.maxParcelasDisponiveis),
            competenciasElegiveisContaInterna.length,
          )
        : 1;

    return Array.from({ length: maximoParcelas }, (_, index) => {
      const quantidadeParcelas = index + 1;
      const competencias = competenciasElegiveisContaInterna.slice(0, quantidadeParcelas);
      const valores = distribuirParcelas(
        valorSaldoContaInternaCentavos,
        quantidadeParcelas,
      );

      return {
        quantidadeParcelas,
        competencias,
        valorPorCompetencia: competencias.map((competencia, parcelaIndex) => ({
          competencia,
          valorCentavos: valores[parcelaIndex] ?? 0,
        })),
      };
    });
  }, [
    competenciasElegiveisContaInterna,
    configuracao?.permite_parcelamento_conta_interna,
    contaInternaSelecionada,
    form.destinoFinanceiro,
    form.origemInscricao,
    valorSaldoContaInternaCentavos,
  ]);
  const parcelamentoSelecionado = useMemo(
    () =>
      parcelamentoOptions.find(
        (item) => item.quantidadeParcelas === form.quantidadeParcelasContaInterna,
      ) ?? parcelamentoOptions[0] ?? null,
    [form.quantidadeParcelasContaInterna, parcelamentoOptions],
  );

  const precisaSelecionarContaInterna =
    form.origemInscricao === "INSCRICAO_INTERNA" &&
    valorSaldoContaInternaCentavos > 0 &&
    form.destinoFinanceiro === "CONTA_INTERNA" &&
    contasInternasElegiveis.length > 1 &&
    !form.contaInternaId;

  const contaInternaBloqueada =
    form.origemInscricao === "INSCRICAO_INTERNA" &&
    valorSaldoContaInternaCentavos > 0 &&
    form.destinoFinanceiro === "CONTA_INTERNA" &&
    !loadingContasInternas &&
    contasInternasElegiveis.length === 0;
  const parcelamentoBloqueado =
    form.origemInscricao === "INSCRICAO_INTERNA" &&
    valorSaldoContaInternaCentavos > 0 &&
    form.destinoFinanceiro === "CONTA_INTERNA" &&
    !loadingContasInternas &&
    Boolean(contaInternaSelecionada) &&
    parcelamentoOptions.length === 0;

  const aplicarContasInternasElegiveis = useCallback(function aplicarContasInternasElegiveis(
    contas: EventoContaInternaElegivelResumo[],
  ) {
    setContasInternasElegiveis(contas);
    setErroContasInternas(null);
    setForm((current) => {
      const contaAtualValida = contas.some(
        (item) => item.contaId === current.contaInternaId,
      );

      if (contas.length === 1) {
        return current.contaInternaId === contas[0].contaId
          ? current
          : { ...current, contaInternaId: contas[0].contaId };
      }

      if (contaAtualValida) {
        return current;
      }

      return current.contaInternaId === null
        ? current
        : { ...current, contaInternaId: null };
    });
  }, []);

  function selecionarAluno(aluno: AlunoBuscaItem) {
    setAlunos([]);
    setForm((current) => ({
      ...current,
      alunoSelecionado: aluno,
      alunoBusca: aluno.nome,
      contaInternaId: null,
      quantidadeParcelasContaInterna: 1,
    }));
  }

  function limparAlunoSelecionado() {
    setAlunos([]);
    setContasInternasElegiveis([]);
    setErroContasInternas(null);
    setForm((current) => ({
      ...current,
      alunoSelecionado: null,
      alunoBusca: "",
      contaInternaId: null,
      quantidadeParcelasContaInterna: 1,
    }));
  }

  useEffect(() => {
    let active = true;

    fetch("/api/financeiro/formas-pagamento/dicionario")
      .then(async (response) => {
        const json = (await response.json().catch(() => null)) as
          | { ok: true; formas: EventoFormaPagamentoResumo[] }
          | { ok: false }
          | null;

        if (!active || !response.ok || !json || !("ok" in json) || !json.ok) return;
        setFormasPagamento(json.formas);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (form.origemInscricao !== "INSCRICAO_INTERNA") {
      setAlunos([]);
      return;
    }

    const termo = form.alunoBusca.trim();
    if (
      form.alunoSelecionado &&
      termo.localeCompare(form.alunoSelecionado.nome.trim(), "pt-BR", {
        sensitivity: "base",
      }) === 0
    ) {
      setAlunos([]);
      return;
    }

    if (termo.length < 2) {
      setAlunos([]);
      return;
    }

    let active = true;
    setLoadingAlunos(true);

    fetch(`/api/escola/alunos/lista?search=${encodeURIComponent(termo)}&limit=10`)
      .then(async (response) => {
        const json = (await response.json().catch(() => null)) as
          | { ok: true; data: AlunoBuscaItem[] }
          | { ok: false }
          | null;

        if (!active) return;
        if (!response.ok || !json || !("ok" in json) || !json.ok) {
          setAlunos([]);
          return;
        }
        setAlunos(json.data ?? []);
      })
      .catch(() => {
        if (active) setAlunos([]);
      })
      .finally(() => {
        if (active) setLoadingAlunos(false);
      });

    return () => {
      active = false;
    };
  }, [form.alunoBusca, form.alunoSelecionado, form.origemInscricao]);

  useEffect(() => {
    if (form.origemInscricao !== "INSCRICAO_EXTERNA") {
      setExternos([]);
      return;
    }

    const termo = form.externoBusca.trim();
    if (termo.length < 2) {
      setExternos([]);
      return;
    }

    let active = true;
    setLoadingExternos(true);

    fetch(`/api/eventos/escola/participantes-externos?q=${encodeURIComponent(termo)}`)
      .then(async (response) => {
        const json = (await response.json().catch(() => null)) as
          | { ok: true; data: EventoParticipanteExternoResumo[] }
          | { ok: false }
          | null;

        if (!active) return;
        if (!response.ok || !json || !("ok" in json) || !json.ok) {
          setExternos([]);
          return;
        }
        setExternos(json.data ?? []);
      })
      .catch(() => {
        if (active) setExternos([]);
      })
      .finally(() => {
        if (active) setLoadingExternos(false);
      });

    return () => {
      active = false;
    };
  }, [form.externoBusca, form.origemInscricao]);

  useEffect(() => {
    const deveConsultarContasInternas =
      Boolean(data.edicao?.id) &&
      form.origemInscricao === "INSCRICAO_INTERNA" &&
      Boolean(form.alunoSelecionado?.pessoa_id) &&
      valorSaldoContaInternaCentavos > 0 &&
      form.destinoFinanceiro === "CONTA_INTERNA";

    if (!deveConsultarContasInternas) {
      setContasInternasElegiveis([]);
      setErroContasInternas(null);
      setLoadingContasInternas(false);
      setForm((current) =>
        current.contaInternaId === null ? current : { ...current, contaInternaId: null },
      );
      return;
    }

    let active = true;
    const controller = new AbortController();
    setLoadingContasInternas(true);
    setErroContasInternas(null);

    fetchContasInternasElegiveisEvento({
      edicaoId: data.edicao?.id ?? "",
      alunoPessoaId: form.alunoSelecionado?.pessoa_id ?? 0,
      signal: controller.signal,
    })
      .then((contas) => {
        if (!active) return;
        aplicarContasInternasElegiveis(contas);
      })
      .catch((error) => {
        if (!active) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        setContasInternasElegiveis([]);
        setErroContasInternas(
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar as contas internas elegiveis.",
        );
        setForm((current) =>
          current.contaInternaId === null ? current : { ...current, contaInternaId: null },
        );
      })
      .finally(() => {
        if (active) setLoadingContasInternas(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    aplicarContasInternasElegiveis,
    data.edicao?.id,
    form.alunoSelecionado?.pessoa_id,
    form.destinoFinanceiro,
    form.origemInscricao,
    valorSaldoContaInternaCentavos,
  ]);

  useEffect(() => {
    const usaContaInterna =
      form.origemInscricao === "INSCRICAO_INTERNA" &&
      valorSaldoContaInternaCentavos > 0 &&
      form.destinoFinanceiro === "CONTA_INTERNA";

    if (!usaContaInterna) {
      setForm((current) =>
        current.quantidadeParcelasContaInterna === 1
          ? current
          : { ...current, quantidadeParcelasContaInterna: 1 },
      );
      return;
    }

    if (parcelamentoOptions.length === 0) return;

    setForm((current) => {
      const existe = parcelamentoOptions.some(
        (item) => item.quantidadeParcelas === current.quantidadeParcelasContaInterna,
      );

      if (existe) return current;

      return {
        ...current,
        quantidadeParcelasContaInterna: parcelamentoOptions[0].quantidadeParcelas,
      };
    });
  }, [
    form.destinoFinanceiro,
    form.origemInscricao,
    parcelamentoOptions,
    valorSaldoContaInternaCentavos,
  ]);

  useEffect(() => {
    if (form.origemInscricao === "INSCRICAO_EXTERNA") {
      setForm((current) => ({
        ...current,
        modalidadePagamentoFinanceiro: "ATO_TOTAL",
        valorPagoAtoCentavos: "",
        pagamentoNoAto: true,
        destinoFinanceiro: "COBRANCA_AVULSA",
        contaInternaId: null,
        quantidadeParcelasContaInterna: 0,
      }));
      return;
    }

    setForm((current) => {
      const pagamentoNoAtoAtual = current.modalidadePagamentoFinanceiro !== "CONTA_INTERNA_TOTAL";
      const destinoAtual =
        current.modalidadePagamentoFinanceiro === "ATO_TOTAL"
          ? "COBRANCA_DIRETA"
          : "CONTA_INTERNA";
      const proximoQuantidade =
        current.modalidadePagamentoFinanceiro === "ATO_TOTAL"
          ? 0
          : Math.max(1, current.quantidadeParcelasContaInterna);

      return {
        ...current,
        pagamentoNoAto: pagamentoNoAtoAtual,
        destinoFinanceiro: destinoAtual,
        contaInternaId:
          current.modalidadePagamentoFinanceiro === "ATO_TOTAL"
            ? null
            : current.contaInternaId,
        quantidadeParcelasContaInterna: proximoQuantidade,
      };
    });
  }, [form.modalidadePagamentoFinanceiro, form.origemInscricao]);

  function updateForm<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleItemConfiguracaoId(id: string) {
    setForm((current) => ({
      ...current,
      itemConfiguracaoIds: current.itemConfiguracaoIds.includes(id)
        ? current.itemConfiguracaoIds.filter((item) => item !== id)
        : [...current.itemConfiguracaoIds, id],
    }));
  }

  function updateAmpliacaoForm<K extends keyof AmpliacaoFormState>(
    field: K,
    value: AmpliacaoFormState[K],
  ) {
    setAmpliacaoForm((current) => ({ ...current, [field]: value }));
  }

  function toggleAmpliacaoItemConfiguracaoId(id: string) {
    setAmpliacaoForm((current) => ({
      ...current,
      itemConfiguracaoIds: current.itemConfiguracaoIds.includes(id)
        ? current.itemConfiguracaoIds.filter((item) => item !== id)
        : [...current.itemConfiguracaoIds, id],
    }));
  }

  function adicionarParticipacaoArtistica(
    contexto: "nova_inscricao" | "ampliacao",
    coreografia: EventoCoreografiaResumo,
  ) {
    if (coreografia.lotada) {
      setErro(
        `${coreografia.coreografia.nome} atingiu a lotacao permitida e nao aceita novas participacoes.`,
      );
      return;
    }

    const participacao = buildParticipacaoArtistica(coreografia);

    if (contexto === "nova_inscricao") {
      setForm((current) => {
        if (
          current.participacoesArtisticas.some(
            (item) => item.coreografiaVinculoId === coreografia.id,
          )
        ) {
          return current;
        }

        return {
          ...current,
          participacoesArtisticas: [...current.participacoesArtisticas, participacao],
        };
      });
      return;
    }

    setAmpliacaoForm((current) => {
      if (
        current.participacoesArtisticas.some(
          (item) => item.coreografiaVinculoId === coreografia.id,
        )
      ) {
        return current;
      }

      return {
        ...current,
        participacoesArtisticas: [...current.participacoesArtisticas, participacao],
      };
    });
  }

  function removerParticipacaoArtistica(
    contexto: "nova_inscricao" | "ampliacao",
    localId: string,
  ) {
    if (contexto === "nova_inscricao") {
      setForm((current) => ({
        ...current,
        participacoesArtisticas: current.participacoesArtisticas.filter(
          (item) => item.localId !== localId,
        ),
      }));
      return;
    }

    setAmpliacaoForm((current) => ({
      ...current,
      participacoesArtisticas: current.participacoesArtisticas.filter(
        (item) => item.localId !== localId,
      ),
    }));
  }

  async function refreshCoreografias() {
    if (!data.edicao) return;

    const response = await fetch(
      `/api/eventos/escola/edicoes/${data.edicao.id}/coreografias`,
    );
    const json = (await response.json().catch(() => null)) as
      | { ok: true; data: EventoCoreografiaResumo[] }
      | { ok: false; details?: string; message?: string; error?: string }
      | null;

    if (!response.ok || !json || ("ok" in json && !json.ok)) {
      throw new Error(
        readErrorMessage(json, "Nao foi possivel atualizar a lista de coreografias."),
      );
    }

    setCoreografiasState((json.data ?? []).filter((item) => item.ativa));
  }

  async function criarCoreografiaRapida(payload: {
    nome: string;
    tipoFormacao: EventoCoreografiaResumo["coreografia"]["tipo_formacao"];
    estiloId: string;
    modalidade: string | null;
    descricao: string | null;
    duracaoEstimadaSegundos: number | null;
    ativa: boolean;
  }) {
    if (!data.edicao) return;

    const formacao = data.formacoes.find(
      (item) => item.codigo === payload.tipoFormacao,
    );
    const preset = formacao
      ? {
          minimo: formacao.quantidade_minima_padrao,
          maximo: formacao.quantidade_maxima_padrao,
        }
      : payload.tipoFormacao === "SOLO"
        ? { minimo: 1, maximo: 1 }
        : payload.tipoFormacao === "DUO"
          ? { minimo: 2, maximo: 2 }
          : payload.tipoFormacao === "TRIO"
            ? { minimo: 3, maximo: 3 }
            : { minimo: 1, maximo: 20 };

    const createResponse = await fetch("/api/coreografias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: payload.nome,
        descricao: payload.descricao,
        modalidade: payload.modalidade,
        tipoFormacao: payload.tipoFormacao,
        quantidadeMinimaParticipantes: preset.minimo,
        quantidadeMaximaParticipantes: preset.maximo,
        duracaoEstimadaSegundos: payload.duracaoEstimadaSegundos,
        sugestaoMusica: null,
        linkMusica: null,
        estiloId: payload.estiloId,
        ativa: payload.ativa,
      }),
    });

    const createJson = (await createResponse.json().catch(() => null)) as
      | { ok: true; data: { id: string; nome: string } }
      | { ok: false; details?: string; message?: string; error?: string }
      | null;

    if (!createResponse.ok || !createJson || ("ok" in createJson && !createJson.ok)) {
      throw new Error(
        readErrorMessage(createJson, "Nao foi possivel criar a coreografia."),
      );
    }

    const coreografiaId =
      "data" in createJson && createJson.data ? createJson.data.id : null;

    if (!coreografiaId) {
      throw new Error("Nao foi possivel obter a coreografia criada.");
    }

    const linkResponse = await fetch(
      `/api/eventos/escola/edicoes/${data.edicao.id}/coreografias`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coreografiaId,
          ativa: true,
        }),
      },
    );

    const linkJson = (await linkResponse.json().catch(() => null)) as
      | { ok: true }
      | { ok: false; details?: string; message?: string; error?: string }
      | null;

    if (!linkResponse.ok || !linkJson || ("ok" in linkJson && !linkJson.ok)) {
      throw new Error(
        readErrorMessage(
          linkJson,
          "Nao foi possivel vincular a nova coreografia a edicao.",
        ),
      );
    }

    await refreshCoreografias();

    const novaCoreografia =
      coreografiasState.find((item) => item.coreografia_id === coreografiaId) ?? null;
    const coreografiaAtualizada =
      novaCoreografia ??
      (await (async () => {
        const response = await fetch(
          `/api/eventos/escola/edicoes/${data.edicao.id}/coreografias`,
        );
        const json = (await response.json().catch(() => null)) as
          | { ok: true; data: EventoCoreografiaResumo[] }
          | { ok: false; details?: string; message?: string; error?: string }
          | null;

        if (!response.ok || !json || ("ok" in json && !json.ok)) {
          throw new Error(
            readErrorMessage(
              json,
              "Nao foi possivel carregar a coreografia criada na inscricao.",
            ),
          );
        }

        const lista = (json.data ?? []).filter((item) => item.ativa);
        setCoreografiasState(lista);
        return lista.find((item) => item.coreografia_id === coreografiaId) ?? null;
      })());

    if (!coreografiaAtualizada) {
      throw new Error("A coreografia foi criada, mas nao foi encontrada na edicao.");
    }

  adicionarParticipacaoArtistica(modalParticipacaoContexto, coreografiaAtualizada);
  setSucesso(`Coreografia ${payload.nome} criada e adicionada a inscricao.`);
}

  async function handleCriarContaInternaAgora() {
    if (!data.edicao?.id || !form.alunoSelecionado) return;

    setCriandoContaInterna(true);
    setErro(null);
    setErroOperacional(null);
    setSucesso(null);

    try {
      const response = await fetch(
        `/api/eventos/escola/edicoes/${data.edicao.id}/inscricoes/contas-internas`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            alunoPessoaId: form.alunoSelecionado.pessoa_id,
          }),
        },
      );

      const json = (await response.json().catch(() => null)) as
        | { ok: true; data: EventoContaInternaElegivelResumo[] }
        | { ok: false; details?: string; message?: string; error?: string }
        | null;

      if (!response.ok || !json || ("ok" in json && !json.ok)) {
        throw new Error(
          readErrorMessage(
            json,
            "Nao foi possivel criar ou ativar a conta interna para esta inscricao.",
          ),
        );
      }

      const contas = json.data ?? [];
      aplicarContasInternasElegiveis(contas);
      setSucesso(
        contas.length > 0
          ? "Conta interna elegivel criada/ativada com sucesso."
          : "A conta interna foi processada, mas nenhuma opcao elegivel ficou disponivel.",
      );
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Nao foi possivel criar ou ativar a conta interna.",
      );
    } finally {
      setCriandoContaInterna(false);
    }
  }

  function abrirAmpliacao(inscricao: EventoInscricaoResumo) {
    const itensAtivos =
      inscricao.itens?.filter((item) => item.status !== "CANCELADO") ?? [];

    updateAmpliacaoForm(
      "incluirEventoGeral",
      !itensAtivos.some((item) => item.tipo_item === "EVENTO_GERAL"),
    );
    setAmpliacaoForm({
      incluirEventoGeral: !itensAtivos.some((item) => item.tipo_item === "EVENTO_GERAL"),
      itemConfiguracaoIds: [],
      participacoesArtisticas: [],
      observacoes: "",
    });
    setAmpliandoInscricaoId(inscricao.id);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data.edicao) return;

    setSubmitting(true);
    setErro(null);
    setErroOperacional(null);
    setSucesso(null);
    setConfirmacaoInscricao(null);

    try {
      if (form.origemInscricao === "INSCRICAO_INTERNA" && !form.alunoSelecionado) {
        throw new Error("Selecione um aluno da escola.");
      }

      if (
        form.origemInscricao === "INSCRICAO_EXTERNA" &&
        !form.externoSelecionado &&
        !form.externoNome.trim()
      ) {
        throw new Error("Informe ou selecione o participante externo.");
      }

      if (contaInternaBloqueada) {
        throw new Error(
          erroContasInternas ??
            "Nao foi encontrada conta interna ativa elegivel para esta inscricao. Use pagamento no ato ou ative/crie uma conta interna adequada.",
        );
      }

      if (precisaSelecionarContaInterna) {
        throw new Error("Selecione a conta interna de destino para continuar.");
      }

      if (parcelamentoBloqueado) {
        throw new Error(
          "Nao ha competencias elegiveis disponiveis para gerar a inscricao em conta interna.",
        );
      }

      if (valorPagoAtoCentavosCalculado > 0 && !form.formaPagamentoCodigo.trim()) {
        throw new Error("Selecione a forma de pagamento.");
      }

      if (
        form.modalidadePagamentoFinanceiro === "MISTO" &&
        (valorPagoAtoCentavosCalculado <= 0 ||
          valorPagoAtoCentavosCalculado >= composicao.totalCentavos)
      ) {
        throw new Error(
          "No pagamento misto, a entrada deve ser maior que zero e menor que o total.",
        );
      }

      const idsParticipacoes = form.participacoesArtisticas.map(
        (item) => item.coreografiaVinculoId,
      );
      if (new Set(idsParticipacoes).size !== idsParticipacoes.length) {
        throw new Error("Nao repita a mesma coreografia na inscricao.");
      }

      const response = await fetch(
        `/api/eventos/escola/edicoes/${data.edicao.id}/inscricoes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origemInscricao: form.origemInscricao,
            alunoPessoaId: form.alunoSelecionado?.pessoa_id ?? null,
            contaInternaId: form.contaInternaId,
            quantidadeParcelasContaInterna: form.quantidadeParcelasContaInterna,
            participanteExternoId: form.externoSelecionado?.id ?? null,
            participanteExterno:
              form.origemInscricao === "INSCRICAO_EXTERNA" && !form.externoSelecionado
                ? {
                    nome: form.externoNome,
                    documento: form.externoDocumento || null,
                    telefone: form.externoTelefone || null,
                    email: form.externoEmail || null,
                    responsavelNome: form.externoResponsavel || null,
                    observacoes: form.externoObservacoes || null,
                    ativo: true,
                  }
                : null,
            incluirEventoGeral: form.incluirEventoGeral,
            itemConfiguracaoIds: form.itemConfiguracaoIds,
            participacoesArtisticas: form.participacoesArtisticas.map((item) => ({
              coreografiaVinculoId: item.coreografiaVinculoId,
              formacao: item.formacao,
            })),
            coreografiaVinculoIds: form.participacoesArtisticas.map(
              (item) => item.coreografiaVinculoId,
            ),
            permitirCoreografiasDepois: form.permitirCoreografiasDepois,
            destinoFinanceiro: form.destinoFinanceiro,
            pagamentoNoAto: form.pagamentoNoAto,
            formaPagamentoCodigo: form.formaPagamentoCodigo || null,
            pagamentoFinanceiro: {
              modalidade:
                form.origemInscricao === "INSCRICAO_EXTERNA"
                  ? "ATO_TOTAL"
                  : form.modalidadePagamentoFinanceiro,
              valorPagoAtoCentavos: valorPagoAtoCentavosCalculado,
              formaPagamentoCodigo:
                valorPagoAtoCentavosCalculado > 0 ? form.formaPagamentoCodigo || null : null,
              observacoesPagamento: form.observacoes || null,
              parcelasContaInternaSelecionadas:
                valorSaldoContaInternaCentavos > 0
                  ? (parcelamentoSelecionado?.valorPorCompetencia.map(
                      (item, index) => ({
                        parcelaNumero: index + 1,
                        totalParcelas: parcelamentoSelecionado.quantidadeParcelas,
                        competencia: item.competencia,
                        valorCentavos: item.valorCentavos,
                      }),
                    ) ?? [])
                  : [],
            },
            observacoes: form.observacoes || null,
          }),
        },
      );

      const json = (await response.json().catch(() => null)) as
        | {
            ok: true;
            success?: true;
            data: EventoInscricaoResumo;
            inscricaoId?: string;
            participante?: {
              origem?: string;
              nome?: string | null;
              alunoPessoaId?: number | null;
              participanteExternoId?: string | null;
            };
            financeiro?: {
              valorTotalCentavos?: number | null;
              modalidadePagamentoFinanceiro?: ModalidadePagamentoFinanceiro | null;
              valorPagoAtoCentavos?: number | null;
              valorSaldoContaInternaCentavos?: number | null;
              statusFinanceiro?: string | null;
              destinoFinanceiro?: string | null;
              pagamentoNoAto?: boolean | null;
              cobrancaId?: number | null;
              recebimentoId?: number | null;
              contaInternaId?: number | null;
            };
            edicao?: {
              id?: string;
              tituloExibicao?: string | null;
              eventoBaseTitulo?: string | null;
            };
            itens?: Array<{
              id: string;
              tipoItem?: string | null;
              descricao?: string | null;
              quantidade?: number | null;
              valorTotalCentavos?: number | null;
              status?: string | null;
            }>;
            parcelamento?: Array<{
              parcelaNumero?: number | null;
              totalParcelas?: number | null;
              competencia?: string | null;
              valorCentavos?: number | null;
              dataVencimento?: string | null;
            }>;
            dataInscricao?: string | null;
          }
        | {
            ok: false;
            details?: string;
            message?: string;
            error?: string;
            code?: string;
          }
        | null;

      if (!response.ok || !json || ("ok" in json && !json.ok)) {
        const erroEstruturado = readOperationalError(
          json,
          "Nao foi possivel criar a inscricao.",
        );
        setErroOperacional(erroEstruturado);
        setErro(erroEstruturado.message);
        router.refresh();
        return;
      }

      setInscricoes((current) => [json.data, ...current]);
      const contaInternaConfirmada = contaInternaSelecionada;
      setForm(createInitialForm(data));
      setAlunos([]);
      setExternos([]);
      setSucesso(null);
      setErroOperacional(null);
      setConfirmacaoInscricao({
        inscricaoId: json.data.id,
        participanteNome:
          json.participante?.nome?.trim() ||
          json.data.participante_nome_snapshot?.trim() ||
          json.data.aluno?.nome?.trim() ||
          json.data.participante_externo?.nome_exibicao?.trim() ||
          json.data.participante?.nome?.trim() ||
          `Pessoa #${json.data.pessoa_id}`,
        eventoBaseTitulo:
          json.edicao?.eventoBaseTitulo?.trim() ||
          data.edicao.evento?.titulo?.trim() ||
          null,
        tituloEdicao:
          json.edicao?.tituloExibicao?.trim() ||
          data.edicao.titulo_exibicao ||
          null,
        dataInscricao: json.dataInscricao ?? json.data.data_inscricao ?? null,
        itens:
          json.itens?.map((item) => ({
            id: item.id,
            tipoItem: item.tipoItem ?? null,
            descricao: item.descricao?.trim() || "Item da inscricao",
            quantidade: item.quantidade ?? 1,
            valorTotalCentavos: item.valorTotalCentavos ?? 0,
            status: item.status ?? "CONFIRMADO",
          })) ??
          [],
        financeiro: {
          valorTotalCentavos:
            json.financeiro?.valorTotalCentavos ?? json.data.valor_total_centavos ?? 0,
          modalidadePagamentoFinanceiro:
            json.financeiro?.modalidadePagamentoFinanceiro ??
            json.data.modalidade_pagamento_financeiro ??
            null,
          valorPagoAtoCentavos:
            json.financeiro?.valorPagoAtoCentavos ??
            json.data.valor_pago_ato_centavos ??
            0,
          valorSaldoContaInternaCentavos:
            json.financeiro?.valorSaldoContaInternaCentavos ??
            json.data.valor_saldo_conta_interna_centavos ??
            0,
          statusFinanceiro:
            json.financeiro?.statusFinanceiro ?? json.data.status_financeiro ?? null,
          destinoFinanceiro:
            json.financeiro?.destinoFinanceiro ?? json.data.destino_financeiro ?? null,
          pagamentoNoAto:
            json.financeiro?.pagamentoNoAto ?? json.data.pagamento_no_ato ?? null,
          contaInternaId:
            json.financeiro?.contaInternaId ?? json.data.conta_interna_id ?? null,
        },
        parcelamento:
          json.parcelamento?.map((parcela) => ({
            parcelaNumero: parcela.parcelaNumero ?? 1,
            totalParcelas: parcela.totalParcelas ?? 1,
            competencia: parcela.competencia ?? "-",
            valorCentavos: parcela.valorCentavos ?? 0,
            dataVencimento: parcela.dataVencimento ?? null,
          })) ?? [],
        contaInterna: contaInternaConfirmada,
      });
      router.refresh();
    } catch (error) {
      setErroOperacional(null);
      setErro(
        error instanceof Error ? error.message : "Nao foi possivel criar a inscricao.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelar(inscricaoId: string) {
    if (!data.edicao) return;

    setCancelandoId(inscricaoId);
    setErro(null);
    setErroOperacional(null);
    setSucesso(null);

    try {
      const response = await fetch(
        `/api/eventos/escola/edicoes/${data.edicao.id}/inscricoes/${inscricaoId}`,
        { method: "DELETE" },
      );

      const json = (await response.json().catch(() => null)) as
        | { ok: true; data: EventoInscricaoResumo }
        | { ok: false; details?: string; message?: string; error?: string }
        | null;

      if (!response.ok || !json || ("ok" in json && !json.ok)) {
        throw new Error(readErrorMessage(json, "Nao foi possivel cancelar a inscricao."));
      }

      setInscricoes((current) =>
        current.map((item) => (item.id === inscricaoId ? json.data : item)),
      );
      setSucesso("Inscricao cancelada.");
      router.refresh();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Nao foi possivel cancelar a inscricao.",
      );
    } finally {
      setCancelandoId(null);
    }
  }

  async function handleReprocessarFinanceiro(inscricao: EventoInscricaoResumo) {
    if (!data.edicao) return;

    setReprocessandoFinanceiroId(inscricao.id);
    setErro(null);
    setErroOperacional(null);
    setSucesso(null);

    try {
      const response = await fetch(
        `/api/eventos/escola/edicoes/${data.edicao.id}/inscricoes/${inscricao.id}/reprocessar-financeiro`,
        { method: "POST" },
      );

      const json = (await response.json().catch(() => null)) as
        | {
            ok: true;
            success?: true;
            data?: {
              acao?: string;
              inscricao?: EventoInscricaoResumo;
            };
          }
        | {
            ok: false;
            details?: string;
            message?: string;
            error?: string;
            code?: string;
          }
        | null;

      if (!response.ok || !json || ("ok" in json && !json.ok)) {
        const erroEstruturado = readOperationalError(
          json,
          "Nao foi possivel reprocessar o financeiro da inscricao.",
        );
        setErroOperacional(erroEstruturado);
        setErro(erroEstruturado.message);
        return;
      }

      const inscricaoAtualizada = json.data?.inscricao ?? null;
      if (inscricaoAtualizada) {
        setInscricoes((current) =>
          current.map((item) =>
            item.id === inscricao.id ? inscricaoAtualizada : item,
          ),
        );
      }

      setSucesso(
        json.data?.acao === "reaproveitado"
          ? "Financeiro revisado e marcado como concluido sem nova geracao."
          : "Financeiro reprocessado com sucesso.",
      );
      router.refresh();
    } catch (error) {
      setErroOperacional(null);
      setErro(
        error instanceof Error
          ? error.message
          : "Nao foi possivel reprocessar o financeiro da inscricao.",
      );
    } finally {
      setReprocessandoFinanceiroId(null);
    }
  }

  async function handleAdicionarItens(inscricao: EventoInscricaoResumo) {
    if (!data.edicao) return;

    setSalvandoAmpliacaoId(inscricao.id);
    setErro(null);
    setErroOperacional(null);
    setSucesso(null);

    try {
      const idsParticipacoes = ampliacaoForm.participacoesArtisticas.map(
        (item) => item.coreografiaVinculoId,
      );
      if (new Set(idsParticipacoes).size !== idsParticipacoes.length) {
        throw new Error("Nao repita a mesma coreografia na ampliacao.");
      }

      const response = await fetch(
        `/api/eventos/escola/edicoes/${data.edicao.id}/inscricoes/${inscricao.id}/itens`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            incluirEventoGeral: ampliacaoForm.incluirEventoGeral,
            itemConfiguracaoIds: ampliacaoForm.itemConfiguracaoIds,
            participacoesArtisticas: ampliacaoForm.participacoesArtisticas.map(
              (item) => ({
                coreografiaVinculoId: item.coreografiaVinculoId,
                formacao: item.formacao,
              }),
            ),
            coreografiaVinculoIds: ampliacaoForm.participacoesArtisticas.map(
              (item) => item.coreografiaVinculoId,
            ),
            observacoes: ampliacaoForm.observacoes || null,
          }),
        },
      );

      const json = (await response.json().catch(() => null)) as
        | { ok: true; data: EventoInscricaoResumo }
        | { ok: false; details?: string; message?: string; error?: string }
        | null;

      if (!response.ok || !json || ("ok" in json && !json.ok)) {
        throw new Error(
          readErrorMessage(json, "Nao foi possivel ampliar a inscricao."),
        );
      }

      setInscricoes((current) =>
        current.map((item) => (item.id === inscricao.id ? json.data : item)),
      );
      setAmpliandoInscricaoId(null);
      setAmpliacaoForm(createAmpliacaoForm());
      setSucesso("Participacao ampliada dentro da mesma inscricao.");
      router.refresh();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Nao foi possivel ampliar a inscricao.",
      );
    } finally {
      setSalvandoAmpliacaoId(null);
    }
  }

  async function handleCancelarItem(
    inscricao: EventoInscricaoResumo,
    itemId: string,
  ) {
    if (!data.edicao) return;

    const motivo = window.prompt(
      "Motivo do cancelamento parcial (opcional):",
      "",
    );

    setCancelandoItemId(itemId);
    setErro(null);
    setErroOperacional(null);
    setSucesso(null);

    try {
      const response = await fetch(
        `/api/eventos/escola/edicoes/${data.edicao.id}/inscricoes/${inscricao.id}/itens/${itemId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            motivoCancelamento: motivo?.trim() ? motivo.trim() : null,
          }),
        },
      );

      const json = (await response.json().catch(() => null)) as
        | { ok: true; data: EventoInscricaoResumo }
        | { ok: false; details?: string; message?: string; error?: string }
        | null;

      if (!response.ok || !json || ("ok" in json && !json.ok)) {
        throw new Error(
          readErrorMessage(json, "Nao foi possivel cancelar o item da inscricao."),
        );
      }

      setInscricoes((current) =>
        current.map((item) => (item.id === inscricao.id ? json.data : item)),
      );
      setSucesso("Item cancelado sem apagar o historico da inscricao.");
      router.refresh();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Nao foi possivel cancelar o item da inscricao.",
      );
    } finally {
      setCancelandoItemId(null);
    }
  }

  if (!data.edicao) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-white px-4 py-6 md:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <EventoHeaderCard
            eyebrow="Eventos da Escola"
            titulo="Edicao nao encontrada"
            descricao="Nao foi possivel localizar a edicao para operar inscricoes."
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
          titulo={`${isModoOperacao ? "Inscricoes" : "Inscritos"} | ${data.edicao.titulo_exibicao}`}
          descricao={
            isModoOperacao
              ? "Fluxo operacional de balcão para selecionar participante, montar a composicao e confirmar a inscricao."
              : "Area de controle das inscricoes realizadas, com historico, ampliacao de participacao e financeiro consolidado."
          }
          actions={
            <>
              {isModoOperacao ? (
                <Link
                  href={`/escola/eventos/edicoes/${data.edicao.id}/inscritos`}
                  className="inline-flex items-center rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
                >
                  Controle de inscritos
                </Link>
              ) : (
                <Link
                  href={`/escola/eventos/edicoes/${data.edicao.id}/inscricoes`}
                  className="inline-flex items-center rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
                >
                  Nova inscricao
                </Link>
              )}
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
                href={`/escola/eventos/${data.edicao.id}?aba=inscricoes`}
                className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Visao consolidada
              </Link>
            </>
          }
        />

        {isModoOperacao ? (
          <FormCard
            title="Nova inscricao"
            description="Escolha a origem, monte a composicao da inscricao e defina o destino financeiro permitido pela edicao."
          >
            <form className="space-y-6" onSubmit={handleSubmit}>
            {confirmacaoInscricao ? (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Confirmacao operacional
                    </p>
                    <h3 className="text-xl font-semibold text-emerald-950">
                      Inscricao realizada com sucesso
                    </h3>
                    <p className="text-sm text-emerald-900">
                      {confirmacaoInscricao.participanteNome} -{" "}
                      {confirmacaoInscricao.eventoBaseTitulo ?? "Evento da escola"} -{" "}
                      {confirmacaoInscricao.tituloEdicao ?? "Edicao"}
                    </p>
                    <p className="text-sm text-emerald-900">
                      Inscricao registrada em{" "}
                      {formatDateTime(confirmacaoInscricao.dataInscricao)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/escola/eventos/edicoes/${data.edicao.id}/inscritos#inscricao-${confirmacaoInscricao.inscricaoId}`,
                        )
                      }
                      className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                    >
                      Ver inscricao
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmacaoInscricao(null);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                    >
                      Nova inscricao
                    </button>
                    <Link
                      href={`/escola/eventos/edicoes/${data.edicao.id}/inscricoes/${confirmacaoInscricao.inscricaoId}/comprovante`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-full border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                    >
                      Abrir comprovante
                    </Link>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-emerald-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-zinc-400">
                      Total da inscricao
                    </p>
                    <p className="mt-1 text-base font-semibold text-zinc-900">
                      {currency(confirmacaoInscricao.financeiro.valorTotalCentavos)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-zinc-400">
                      Destino financeiro
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-900">
                      {confirmacaoInscricao.financeiro.destinoFinanceiro ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-zinc-400">
                      Pago no ato
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-900">
                      {currency(confirmacaoInscricao.financeiro.valorPagoAtoCentavos)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-zinc-400">
                      Saldo em conta interna
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-900">
                      {currency(
                        confirmacaoInscricao.financeiro.valorSaldoContaInternaCentavos,
                      )}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-zinc-400">
                      Status financeiro
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-900">
                      {confirmacaoInscricao.financeiro.statusFinanceiro
                        ? formatStatus(confirmacaoInscricao.financeiro.statusFinanceiro)
                        : "-"}
                    </p>
                  </div>
                </div>

                {confirmacaoInscricao.contaInterna ? (
                  <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                      Conta interna escolhida
                    </p>
                    <p className="mt-1 text-sm font-medium text-blue-950">
                      {formatContaInternaOrigem(confirmacaoInscricao.contaInterna.origemTitular)}
                    </p>
                    <p className="text-sm text-blue-900">
                      {describeContaInterna(confirmacaoInscricao.contaInterna)}
                    </p>
                  </div>
                ) : null}

                {confirmacaoInscricao.parcelamento.length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                      Parcelamento e competencias
                    </p>
                    <div className="mt-3 grid gap-2">
                      {confirmacaoInscricao.parcelamento.map((parcela) => (
                        <div
                          key={`${parcela.parcelaNumero}-${parcela.competencia}`}
                          className="rounded-2xl border border-violet-200 bg-white p-3 text-sm text-zinc-700"
                        >
                          <p className="font-medium text-zinc-900">
                            Parcela {parcela.parcelaNumero}/{parcela.totalParcelas} -{" "}
                            {formatCompetenciaLabel(parcela.competencia)}
                          </p>
                          <p>Valor: {currency(parcela.valorCentavos)}</p>
                          <p>
                            Vencimento real da fatura:{" "}
                            {formatDateOnly(parcela.dataVencimento)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Itens inscritos
                  </p>
                  <div className="mt-3 grid gap-2">
                    {confirmacaoInscricao.itens.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm md:flex-row md:items-start md:justify-between"
                      >
                        <div>
                          <p className="font-medium text-zinc-900">
                            {item.descricao}
                          </p>
                          <p className="text-zinc-500">
                            {formatItemTipo(item.tipoItem)} - Quantidade {item.quantidade}
                          </p>
                        </div>
                        <p className="font-medium text-zinc-900">
                          {currency(item.valorTotalCentavos)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Origem</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                    <input type="radio" checked={form.origemInscricao === "INSCRICAO_INTERNA"} onChange={() => updateForm("origemInscricao", "INSCRICAO_INTERNA")} />
                    Aluno da escola
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                    <input type="radio" checked={form.origemInscricao === "INSCRICAO_EXTERNA"} onChange={() => updateForm("origemInscricao", "INSCRICAO_EXTERNA")} />
                    Participante externo
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-700">Conta interna: {configuracao?.permite_conta_interna ? "sim" : "nao"}</span>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-700">Pagamento no ato: {configuracao?.permite_pagamento_no_ato ? "sim" : "nao"}</span>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-700">Coreografia depois: {configuracao?.permite_vincular_coreografia_depois ? "sim" : "nao"}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Participante</p>
                {form.origemInscricao === "INSCRICAO_INTERNA" ? (
                  <div className="mt-3 space-y-3">
                    {!form.alunoSelecionado ? <input value={form.alunoBusca} onChange={(event) => updateForm("alunoBusca", event.target.value)} placeholder="Buscar aluno" className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100" /> : null}
                    {!form.alunoSelecionado && loadingAlunos ? <p className="text-sm text-zinc-500">Buscando alunos...</p> : null}
                    {form.alunoSelecionado ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><p className="font-medium">{form.alunoSelecionado.nome}</p><p>{form.alunoSelecionado.email ?? "Sem email"}</p><p>{form.alunoSelecionado.telefone ?? "Sem telefone"}</p></div><button type="button" onClick={limparAlunoSelecionado} className="inline-flex items-center rounded-full border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100">Trocar aluno</button></div></div> : null}
                    {!form.alunoSelecionado ? <div className="grid gap-2">
                      {alunos.map((aluno) => (
                        <button key={aluno.pessoa_id} type="button" onClick={() => selecionarAluno(aluno)} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-left text-sm transition hover:border-violet-300 hover:bg-violet-50">
                          <p className="font-medium text-zinc-900">{aluno.nome}</p>
                          <p className="text-zinc-600">{aluno.email ?? "Sem email"} · {aluno.telefone ?? "Sem telefone"}</p>
                        </button>
                      ))}
                    </div> : null}
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    <input value={form.externoBusca} onChange={(event) => updateForm("externoBusca", event.target.value)} placeholder="Buscar participante externo" className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
                    {loadingExternos ? <p className="text-sm text-zinc-500">Buscando participantes...</p> : null}
                    {form.externoSelecionado ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><p className="font-medium">{form.externoSelecionado.nome_exibicao ?? form.externoSelecionado.pessoa?.nome ?? "Participante selecionado"}</p><p>{form.externoSelecionado.pessoa?.email ?? "Sem email"}</p></div> : null}
                    <div className="grid gap-2">
                      {externos.map((participante) => (
                        <button key={participante.id} type="button" onClick={() => updateForm("externoSelecionado", participante)} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-left text-sm transition hover:border-violet-300 hover:bg-violet-50">
                          <p className="font-medium text-zinc-900">{participante.nome_exibicao ?? participante.pessoa?.nome ?? "Participante externo"}</p>
                          <p className="text-zinc-600">{participante.pessoa?.email ?? "Sem email"} · {participante.pessoa?.telefone ?? "Sem telefone"}</p>
                        </button>
                      ))}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <input value={form.externoNome} onChange={(event) => updateForm("externoNome", event.target.value)} placeholder="Nome do participante" className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
                      <input value={form.externoDocumento} onChange={(event) => updateForm("externoDocumento", event.target.value)} placeholder="Documento" className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
                      <input value={form.externoTelefone} onChange={(event) => updateForm("externoTelefone", event.target.value)} placeholder="Telefone" className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
                      <input value={form.externoEmail} onChange={(event) => updateForm("externoEmail", event.target.value)} placeholder="Email" className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
                      <input value={form.externoResponsavel} onChange={(event) => updateForm("externoResponsavel", event.target.value)} placeholder="Responsavel" className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 md:col-span-2" />
                      <textarea value={form.externoObservacoes} onChange={(event) => updateForm("externoObservacoes", event.target.value)} placeholder="Observacoes do participante externo" className="min-h-[96px] rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 md:col-span-2" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Composicao</p>
                <div className="mt-3 space-y-3">
                  <label className="flex items-start gap-3 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-700">
                    <input type="checkbox" checked={form.incluirEventoGeral} disabled={configuracao?.exige_inscricao_geral} onChange={(event) => updateForm("incluirEventoGeral", event.target.checked)} />
                    <span>Inscricao geral da edicao</span>
                  </label>
                  {configuracao?.permite_itens_adicionais ? (
                    <div className="space-y-2">
                      {itensConfiguraveis.map((item) => (
                        <label key={item.id} className="flex items-start gap-3 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-700">
                          <input type="checkbox" checked={form.itemConfiguracaoIds.includes(String(item.id))} onChange={() => toggleItemConfiguracaoId(String(item.id))} />
                          <span>{item.nome} · {currency(item.valor_centavos)}</span>
                        </label>
                      ))}
                    </div>
                  ) : null}
                  {false ? (
                    <div className="space-y-2">
                      {coreografias.map((item) => (
                        <label key={item.id} className="flex items-start gap-3 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-700">
                          <input type="checkbox" checked={form.participacoesArtisticas.some((participacao) => participacao.coreografiaVinculoId === item.id)} onChange={() => adicionarParticipacaoArtistica("nova_inscricao", item)} />
                          <span>
                            {item.coreografia.nome} · {item.coreografia.tipo_formacao}
                            {item.coreografia.estilo?.nome ? ` · ${item.coreografia.estilo.nome}` : ""}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : null}
                  {configuracao?.permite_inscricao_por_coreografia ? (
                    <div className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-zinc-900">
                            Participacoes artisticas
                          </p>
                          <p className="text-xs text-zinc-500">
                            Monte a inscricao com varias participacoes artisticas
                            sem repetir a mesma coreografia.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setModalParticipacaoContexto("nova_inscricao");
                            setModalParticipacaoAberto(true);
                          }}
                          className="inline-flex items-center rounded-full border border-violet-300 bg-white px-4 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-50"
                        >
                          Adicionar participacao artistica
                        </button>
                      </div>
                      {form.participacoesArtisticas.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500">
                          Nenhuma participacao artistica adicionada ainda.
                        </div>
                      ) : (
                        <div className="grid gap-2">
                          {form.participacoesArtisticas.map((participacao, index) => {
                            const coreografia = findCoreografiaByParticipacao(
                              coreografias,
                              participacao,
                            );

                            return (
                              <div
                                key={participacao.localId}
                                className="rounded-2xl border border-zinc-200 bg-white p-3"
                              >
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap gap-2 text-xs font-medium">
                                      <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">
                                        Participacao {index + 1}
                                      </span>
                                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                                        {participacao.formacao}
                                      </span>
                                    </div>
                                    <p className="font-medium text-zinc-900">
                                      {coreografia?.coreografia.nome ?? "Coreografia nao encontrada"}
                                    </p>
                                    <p className="text-sm text-zinc-600">
                                      {coreografia?.coreografia.estilo?.nome ?? "Sem estilo"}
                                      {coreografia?.coreografia.modalidade?.trim()
                                        ? ` · ${coreografia.coreografia.modalidade}`
                                        : ""}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removerParticipacaoArtistica(
                                        "nova_inscricao",
                                        participacao.localId,
                                      )
                                    }
                                    className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                                  >
                                    Remover
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : null}
                  {configuracao?.permite_vincular_coreografia_depois ? (
                    <label className="flex items-start gap-3 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-700">
                      <input type="checkbox" checked={form.permitirCoreografiasDepois} onChange={(event) => updateForm("permitirCoreografiasDepois", event.target.checked)} />
                      <span>Permitir vincular coreografias depois</span>
                    </label>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Destino e resumo financeiro</p>
                <div className="mt-3 space-y-3">
                  {composicao.linhas.length === 0 ? (
                    <p className="text-sm text-zinc-500">Nenhum item selecionado.</p>
                  ) : (
                    composicao.linhas.map((linha) => (
                      <div key={linha.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <span className="text-zinc-700">{linha.label}</span>
                            {linha.detalhePrincipal ? (
                              <p className="text-xs text-zinc-500">{linha.detalhePrincipal}</p>
                            ) : null}
                            {linha.fonteCalculo === "FALLBACK_LEGADO" ? (
                              <p className="text-xs text-amber-700">
                                Compatibilidade legada temporaria. A origem oficial do
                                preco deve ser configurada nas regras detalhadas da edicao.
                              </p>
                            ) : null}
                          </div>
                          <span className="font-medium text-zinc-900">{currency(linha.valorCentavos)}</span>
                        </div>
                      </div>
                    ))
                  )}
                  <div className="rounded-2xl bg-violet-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-violet-700">Total</p>
                    <p className="mt-1 text-2xl font-semibold text-violet-900">{currency(composicao.totalCentavos)}</p>
                  </div>
                  {form.origemInscricao === "INSCRICAO_INTERNA" ? (
                    <div className="space-y-3">
                      <div className="grid gap-2 md:grid-cols-3">
                        {permitePagamentoNoAto ? (
                          <label className="flex items-start gap-3 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-700">
                            <input
                              type="radio"
                              checked={form.modalidadePagamentoFinanceiro === "ATO_TOTAL"}
                              onChange={() =>
                                updateForm("modalidadePagamentoFinanceiro", "ATO_TOTAL")
                              }
                            />
                            <span>Pagamento total no ato</span>
                          </label>
                        ) : null}
                        {permiteContaInterna ? (
                          <label className="flex items-start gap-3 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-700">
                            <input
                              type="radio"
                              checked={
                                form.modalidadePagamentoFinanceiro === "CONTA_INTERNA_TOTAL"
                              }
                              onChange={() =>
                                updateForm(
                                  "modalidadePagamentoFinanceiro",
                                  "CONTA_INTERNA_TOTAL",
                                )
                              }
                            />
                            <span>Conta interna / parcelado</span>
                          </label>
                        ) : null}
                        {permitePagamentoNoAto && permiteContaInterna ? (
                          <label className="flex items-start gap-3 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-700">
                            <input
                              type="radio"
                              checked={form.modalidadePagamentoFinanceiro === "MISTO"}
                              onChange={() =>
                                updateForm("modalidadePagamentoFinanceiro", "MISTO")
                              }
                            />
                            <span>Pagamento misto</span>
                          </label>
                        ) : null}
                      </div>

                      {(form.modalidadePagamentoFinanceiro === "MISTO" ||
                        form.modalidadePagamentoFinanceiro === "ATO_TOTAL") ? (
                        <div className="space-y-3 rounded-2xl border border-zinc-200 p-3">
                          <div>
                            <label
                              htmlFor="valor-pago-ato-centavos"
                              className="text-sm font-medium text-zinc-700"
                            >
                              Valor pago no ato
                            </label>
                            {form.modalidadePagamentoFinanceiro === "ATO_TOTAL" ? (
                              <div className="mt-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                                Pagamento integral no ato: {currency(composicao.totalCentavos)}
                              </div>
                            ) : (
                              <input
                                id="valor-pago-ato-centavos"
                                inputMode="numeric"
                                value={form.valorPagoAtoCentavos}
                                onChange={(event) =>
                                  updateForm(
                                    "valorPagoAtoCentavos",
                                    String(
                                      Math.min(
                                        composicao.totalCentavos,
                                        parseCentavosInput(event.target.value),
                                      ),
                                    ),
                                  )
                                }
                                placeholder="Informe em centavos. Ex.: 7000"
                                className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                              />
                            )}
                          </div>

                          <select
                            value={form.formaPagamentoCodigo}
                            onChange={(event) =>
                              updateForm("formaPagamentoCodigo", event.target.value)
                            }
                            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                          >
                            <option value="">Selecione a forma de pagamento</option>
                            {formasPagamento.map((forma) => (
                              <option key={forma.id} value={forma.codigo}>
                                {forma.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}

                      <div className="grid gap-2 md:grid-cols-4">
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm">
                          <p className="text-xs uppercase tracking-wide text-zinc-500">Total</p>
                          <p className="mt-1 font-semibold text-zinc-900">
                            {currency(composicao.totalCentavos)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm">
                          <p className="text-xs uppercase tracking-wide text-zinc-500">Pago no ato</p>
                          <p className="mt-1 font-semibold text-zinc-900">
                            {currency(valorPagoAtoCentavosCalculado)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm">
                          <p className="text-xs uppercase tracking-wide text-zinc-500">Saldo conta interna</p>
                          <p className="mt-1 font-semibold text-zinc-900">
                            {currency(valorSaldoContaInternaCentavos)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm">
                          <p className="text-xs uppercase tracking-wide text-zinc-500">Parcelas do saldo</p>
                          <p className="mt-1 font-semibold text-zinc-900">
                            {valorSaldoContaInternaCentavos > 0
                              ? `${parcelamentoSelecionado?.quantidadeParcelas ?? form.quantidadeParcelasContaInterna}x`
                              : "0x"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      <p>Participante externo usa cobranca avulsa com pagamento no ato.</p>
                      <select
                        value={form.formaPagamentoCodigo}
                        onChange={(event) =>
                          updateForm("formaPagamentoCodigo", event.target.value)
                        }
                        className="w-full rounded-2xl border border-amber-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                      >
                        <option value="">Selecione a forma de pagamento</option>
                        {formasPagamento.map((forma) => (
                          <option key={forma.id} value={forma.codigo}>
                            {forma.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {form.origemInscricao === "INSCRICAO_INTERNA" &&
                  valorSaldoContaInternaCentavos > 0 &&
                  form.destinoFinanceiro === "CONTA_INTERNA" ? (
                    <div className="space-y-3">
                      {loadingContasInternas ? (
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
                          Buscando contas internas elegiveis...
                        </div>
                      ) : null}

                      {erroContasInternas ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                          {erroContasInternas}
                        </div>
                      ) : null}

                      {!loadingContasInternas &&
                      !erroContasInternas &&
                      contasInternasElegiveis.length === 0 ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                          <p>
                            Nao foi encontrada conta interna ativa elegivel para esta inscricao.
                            Use pagamento no ato ou ative/crie uma conta interna adequada.
                          </p>
                          {form.alunoSelecionado ? (
                            <button type="button" onClick={() => void handleCriarContaInternaAgora()} disabled={criandoContaInterna} className="mt-3 inline-flex items-center rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60">
                              {criandoContaInterna
                                ? "Criando conta interna..."
                                : "Criar conta interna agora"}
                            </button>
                          ) : null}
                        </div>
                      ) : null}

                      {!loadingContasInternas &&
                      !erroContasInternas &&
                      contasInternasElegiveis.length === 1 &&
                      contaInternaSelecionada ? (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                          <p className="font-medium">
                            {contaInternaSelecionada.label} selecionada automaticamente
                          </p>
                          <p className="mt-1">
                            Origem: {formatContaInternaOrigem(contaInternaSelecionada.origemTitular)}
                          </p>
                          <p>
                            {describeContaInterna(contaInternaSelecionada) ||
                              `Conta interna #${contaInternaSelecionada.contaId}`}
                          </p>
                        </div>
                      ) : null}

                      {!loadingContasInternas &&
                      !erroContasInternas &&
                      contasInternasElegiveis.length > 1 ? (
                        <div className="space-y-2 rounded-2xl border border-zinc-200 p-3">
                          <label
                            htmlFor="conta-interna-destino"
                            className="text-sm font-medium text-zinc-700"
                          >
                            Conta interna de destino
                          </label>
                          <select
                            id="conta-interna-destino"
                            value={form.contaInternaId ? String(form.contaInternaId) : ""}
                            onChange={(event) =>
                              updateForm(
                                "contaInternaId",
                                event.target.value ? Number(event.target.value) : null,
                              )
                            }
                            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                          >
                            <option value="">Selecione a conta de destino</option>
                            {contasInternasElegiveis.map((conta) => (
                              <option key={conta.contaId} value={conta.contaId}>
                                {conta.label}
                                {describeContaInterna(conta)
                                  ? ` - ${describeContaInterna(conta)}`
                                  : ` - Conta #${conta.contaId}`}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-zinc-500">
                            Mais de uma conta interna esta elegivel para esta inscricao.
                            Escolha qual deve receber o lancamento.
                          </p>
                          <div className="grid gap-2">
                            {contasInternasElegiveis.map((conta) => (
                              <p key={conta.contaId} className="text-xs text-zinc-500">
                                {conta.label}: {formatContaInternaOrigem(conta.origemTitular)}
                              </p>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {!loadingContasInternas &&
                      !erroContasInternas &&
                      contaInternaSelecionada &&
                      !parcelamentoBloqueado ? (
                        <div className="space-y-3 rounded-2xl border border-zinc-200 p-3">
                          <div>
                            <p className="text-sm font-medium text-zinc-900">
                              Parcelamento por competencias
                            </p>
                            <p className="text-xs text-zinc-500">
                              O saldo restante usa a conta selecionada e e distribuido
                              conforme as competencias elegiveis da edicao.
                            </p>
                          </div>

                          <div className="grid gap-2 md:grid-cols-3">
                            {parcelamentoOptions.map((option) => (
                              <label
                                key={option.quantidadeParcelas}
                                className="flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700"
                              >
                                <input
                                  type="radio"
                                  checked={
                                    form.quantidadeParcelasContaInterna ===
                                    option.quantidadeParcelas
                                  }
                                  onChange={() =>
                                    updateForm(
                                      "quantidadeParcelasContaInterna",
                                      option.quantidadeParcelas,
                                    )
                                  }
                                />
                                <span>
                                  <span className="block font-medium text-zinc-900">
                                    {option.quantidadeParcelas}x
                                  </span>
                                  <span className="block text-xs text-zinc-500">
                                    {option.competencias
                                      .map((item) => formatCompetenciaLabel(item))
                                      .join(" + ")}
                                  </span>
                                </span>
                              </label>
                            ))}
                          </div>

                          {parcelamentoSelecionado ? (
                            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-950">
                              <p className="font-medium">
                                Conta escolhida: {contaInternaSelecionada.label}
                              </p>
                              <p className="mt-1 text-violet-900">
                                {describeContaInterna(contaInternaSelecionada) ||
                                  `Conta interna #${contaInternaSelecionada.contaId}`}
                              </p>
                              <p className="mt-1 text-violet-900">
                                Origem da conta: {formatContaInternaOrigem(contaInternaSelecionada.origemTitular)}
                              </p>
                              <p className="mt-1 text-violet-900">
                                Parcelamento selecionado: {parcelamentoSelecionado.quantidadeParcelas}x
                              </p>
                              <div className="mt-3 grid gap-2">
                                {parcelamentoSelecionado.valorPorCompetencia.map((item) => (
                                  <div
                                    key={item.competencia}
                                    className="flex items-center justify-between rounded-2xl border border-violet-200 bg-white px-3 py-2"
                                  >
                                    <span>{formatCompetenciaLabel(item.competencia)}</span>
                                    <span className="font-medium">
                                      {currency(item.valorCentavos)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {parcelamentoBloqueado ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                          Nao ha competencias elegiveis suficientes para parcelar o saldo
                          desta inscricao em conta interna com as regras atuais da edicao.
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  <textarea value={form.observacoes} onChange={(event) => updateForm("observacoes", event.target.value)} placeholder="Observacoes da inscricao" className="min-h-[96px] w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
                </div>
              </div>
            </div>

            {erro ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                <p className="font-medium">{erroOperacional?.message ?? erro}</p>
                {erroOperacional?.code ? (
                  <p className="mt-1 text-xs uppercase tracking-wide text-rose-700">
                    Codigo: {erroOperacional.code}
                  </p>
                ) : null}
                {erroOperacional?.details ? (
                  <p className="mt-2 text-xs text-rose-900">
                    Detalhes: {erroOperacional.details}
                  </p>
                ) : null}
              </div>
            ) : null}
            {sucesso ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{sucesso}</div> : null}

              <div className="flex flex-wrap gap-3">
                <button type="submit" disabled={submitting || contaInternaBloqueada || precisaSelecionarContaInterna || parcelamentoBloqueado} className="inline-flex items-center rounded-full bg-violet-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {submitting ? "Salvando..." : "Criar inscricao"}
                </button>
                <Link href={`/escola/eventos/edicoes/${data.edicao.id}/coreografias`} className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">
                  Ir para coreografias
                </Link>
              </div>
            </form>
          </FormCard>
        ) : null}

        {isModoControle ? (
          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-5 space-y-1">
            <h2 className="text-xl font-semibold text-zinc-900">Controle de inscritos</h2>
            <p className="text-sm text-zinc-600">Listagem, historico, ampliacao de participacao, cancelamento e financeiro por inscricao.</p>
          </div>
          <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Inscritos ativos</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-950">
                {dashboard.totalInscritosAtivos}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {dashboard.totalItensAtivos} itens ativos na composicao
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Valor previsto</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-950">
                {currency(dashboard.valorPrevistoCentavos)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Receita prevista da composicao ativa
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Valor arrecadado</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-700">
                {currency(dashboard.valorArrecadadoCentavos)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Recebimentos efetivos vinculados a esta edicao
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Cancelamentos</p>
              <p className="mt-1 text-2xl font-semibold text-rose-700">
                {dashboard.totalInscricoesCanceladas}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {dashboard.totalItensCancelados} itens cancelados no historico
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Valor cancelado</p>
              <p className="mt-1 text-2xl font-semibold text-rose-700">
                {currency(dashboard.valorCanceladoCentavos)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Perda operacional sem estorno automatico
              </p>
            </div>
          </div>
          {inscricoes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-500">Nenhuma inscricao cadastrada para esta edicao.</div>
          ) : (
            <div className="grid gap-4">
              {inscricoes.map((inscricao) => {
                const participanteNome =
                  inscricao.participante_nome_snapshot?.trim() ||
                  (inscricao.origem_inscricao === "INSCRICAO_EXTERNA"
                    ? inscricao.participante_externo?.nome_exibicao ??
                      inscricao.participante_externo?.pessoa?.nome ??
                      inscricao.participante?.nome ??
                      `Pessoa #${inscricao.pessoa_id}`
                    : inscricao.aluno?.nome ??
                      inscricao.participante?.nome ??
                      `Pessoa #${inscricao.pessoa_id}`);
                const parcelasContaInterna = inscricao.parcelas_conta_interna ?? [];
                const itensOrdenados = [...(inscricao.itens ?? [])].sort((left, right) =>
                  (left.created_at ?? "").localeCompare(right.created_at ?? ""),
                );
                const itensAtivos = itensOrdenados.filter((item) => item.status !== "CANCELADO");
                const itensCancelados = itensOrdenados.filter((item) => item.status === "CANCELADO");
                const totalAtivo = itensAtivos.reduce(
                  (acc, item) => acc + item.valor_total_centavos,
                  0,
                );
                const totalCancelado = itensCancelados.reduce(
                  (acc, item) => acc + item.valor_total_centavos,
                  0,
                );
                const idsItensAtivos = new Set(
                  itensAtivos
                    .map((item) => item.item_configuracao_id)
                    .filter((item): item is string => Boolean(item)),
                );
                const idsCoreografiasAtivas = new Set(
                  itensAtivos
                    .map((item) => item.coreografia_vinculo_id)
                    .filter((item): item is string => Boolean(item)),
                );
                const possuiEventoGeralAtivo = itensAtivos.some(
                  (item) => item.tipo_item === "EVENTO_GERAL",
                );
                const itensConfiguraveisDisponiveis = itensConfiguraveis.filter(
                  (item) => !idsItensAtivos.has(String(item.id)),
                );
                const coreografiasDisponiveis = coreografias.filter(
                  (item) => !idsCoreografiasAtivas.has(item.id),
                );
                const podeSalvarAmpliacao =
                  ampliacaoForm.incluirEventoGeral ||
                  ampliacaoForm.itemConfiguracaoIds.length > 0 ||
                  ampliacaoForm.participacoesArtisticas.length > 0;
                const financeiroTecnicoStatus =
                  inscricao.financeiro_status ?? "PENDENTE";
                const inscricaoLegadaInconsistente =
                  financeiroTecnicoStatus === "PENDENTE" &&
                  inscricao.status_inscricao === "RASCUNHO" &&
                  inscricao.status_financeiro === "NAO_GERADO";
                const podeReprocessarFinanceiro =
                  financeiroTecnicoStatus === "ERRO" || inscricaoLegadaInconsistente;

                return (
                  <article
                    id={`inscricao-${inscricao.id}`}
                    key={inscricao.id}
                    className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2 text-xs font-medium">
                          <span className="rounded-full bg-zinc-200 px-2.5 py-1 text-zinc-700">{formatStatus(inscricao.status_inscricao)}</span>
                          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">{formatStatus(inscricao.status_financeiro)}</span>
                          <span className={`rounded-full px-2.5 py-1 ${getFinanceiroTecnicoBadgeTone(financeiroTecnicoStatus)}`}>{`Financeiro ${formatStatus(financeiroTecnicoStatus)}`}</span>
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">{inscricao.origem_inscricao === "INSCRICAO_EXTERNA" ? "Participante externo" : "Aluno da escola"}</span>
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">{inscricao.destino_financeiro ?? "Sem destino"}</span>
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-zinc-900">{participanteNome}</h3>
                          <p className="text-sm text-zinc-600">Financeiro constituido: {currency(inscricao.valor_total_centavos ?? 0)} - Pagamento: {inscricao.pagamento_no_ato ? "no ato" : "em aberto"} - Forma: {inscricao.forma_pagamento_codigo ?? "-"}</p>
                        </div>
                        {podeReprocessarFinanceiro ? (
                          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-900">
                            <p className="font-medium">
                              {financeiroTecnicoStatus === "ERRO"
                                ? "Financeiro com erro"
                                : "Financeiro pendente de diagnostico"}
                            </p>
                            {inscricao.financeiro_erro_codigo ? (
                              <p className="mt-1 text-xs uppercase tracking-wide text-rose-700">
                                Codigo: {inscricao.financeiro_erro_codigo}
                              </p>
                            ) : null}
                            {inscricao.financeiro_erro_detalhe ? (
                              <p className="mt-2 text-xs text-rose-900">
                                Detalhes: {inscricao.financeiro_erro_detalhe}
                              </p>
                            ) : inscricaoLegadaInconsistente ? (
                              <p className="mt-2 text-xs text-rose-900">
                                Inscricao legada sem reflexo financeiro detectado. Use o
                                reprocessamento administrativo.
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                            <p className="text-xs uppercase tracking-wide text-zinc-400">Composicao ativa</p>
                            <p className="mt-1 text-base font-semibold text-zinc-900">{currency(totalAtivo)}</p>
                          </div>
                          <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                            <p className="text-xs uppercase tracking-wide text-zinc-400">Financeiro constituido</p>
                            <p className="mt-1 text-base font-semibold text-zinc-900">{currency(inscricao.valor_total_centavos ?? 0)}</p>
                          </div>
                          <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                            <p className="text-xs uppercase tracking-wide text-zinc-400">Cancelado sem estorno</p>
                            <p className="mt-1 text-base font-semibold text-zinc-900">{currency(totalCancelado)}</p>
                          </div>
                        </div>
                        {parcelasContaInterna.length > 0 ? (
                          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                              Parcelamento em conta interna
                            </p>
                            <p className="mt-1 text-sm text-blue-900">
                              {parcelasContaInterna.length}x planejado em{" "}
                              {parcelasContaInterna
                                .map((parcela) =>
                                  `${formatCompetenciaLabel(parcela.competencia)} (${currency(parcela.valor_centavos)})`,
                                )
                                .join(" - ")}
                            </p>
                          </div>
                        ) : null}
                        {podeReprocessarFinanceiro ? (
                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              disabled={reprocessandoFinanceiroId === inscricao.id}
                              onClick={() => handleReprocessarFinanceiro(inscricao)}
                              className="inline-flex items-center justify-center rounded-full border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {reprocessandoFinanceiroId === inscricao.id
                                ? "Reprocessando..."
                                : "Reprocessar financeiro"}
                            </button>
                          </div>
                        ) : null}
                        {itensAtivos.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-xs uppercase tracking-wide text-zinc-400">Itens ativos</p>
                            <div className="grid gap-2">
                              {itensAtivos.map((item) => (
                                <div key={item.id} className="rounded-xl border border-zinc-200 bg-white p-3 text-sm">
                                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div className="space-y-2">
                                      <div className="flex flex-wrap gap-2 text-xs font-medium">
                                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-700">{formatItemTipo(item.tipo_item)}</span>
                                        {item.origem_item === "AMPLIACAO_POSTERIOR" ? (
                                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">Adicionado depois</span>
                                        ) : null}
                                      </div>
                                      <div>
                                        <p className="font-medium text-zinc-900">{item.descricao_snapshot ?? item.descricao ?? "Item da inscricao"}</p>
                                        <p className="text-zinc-500">Quantidade {item.quantidade}</p>
                                        {item.observacoes?.trim() ? (
                                          <p className="text-zinc-500">{item.observacoes}</p>
                                        ) : null}
                                      </div>
                                    </div>
                                    <div className="flex flex-col gap-2 md:items-end">
                                      <p className="font-medium text-zinc-900">{currency(item.valor_total_centavos)}</p>
                                      <button type="button" disabled={cancelandoItemId === item.id || inscricao.status_inscricao === "CANCELADA"} onClick={() => handleCancelarItem(inscricao, item.id)} className="inline-flex items-center justify-center rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60">
                                        {cancelandoItemId === item.id ? "Cancelando item..." : "Cancelar item"}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-zinc-500">Inscricao sem composicao ativa no momento.</p>
                        )}
                        {itensCancelados.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-xs uppercase tracking-wide text-zinc-400">Historico cancelado</p>
                            <div className="grid gap-2">
                              {itensCancelados.map((item) => (
                                <div key={item.id} className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-sm">
                                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div className="space-y-2">
                                      <div className="flex flex-wrap gap-2 text-xs font-medium">
                                        <span className="rounded-full bg-rose-100 px-2.5 py-1 text-rose-700">Cancelado</span>
                                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-700">{formatItemTipo(item.tipo_item)}</span>
                                        {item.origem_item === "AMPLIACAO_POSTERIOR" ? (
                                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">Adicionado depois</span>
                                        ) : null}
                                      </div>
                                      <div>
                                        <p className="font-medium text-zinc-900">{item.descricao_snapshot ?? item.descricao ?? "Item da inscricao"}</p>
                                        <p className="text-zinc-600">Cancelado em {formatDateTime(item.cancelado_em ?? null)}</p>
                                        {item.observacoes?.trim() ? (
                                          <p className="text-zinc-500">{item.observacoes}</p>
                                        ) : null}
                                        {item.motivo_cancelamento?.trim() ? (
                                          <p className="text-zinc-500">Motivo: {item.motivo_cancelamento}</p>
                                        ) : null}
                                      </div>
                                    </div>
                                    <p className="font-medium text-zinc-900">{currency(item.valor_total_centavos)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {ampliandoInscricaoId === inscricao.id ? (
                          <div className="space-y-3 rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
                            <div>
                              <h4 className="text-sm font-semibold text-violet-950">Ampliar participacao dentro da mesma inscricao</h4>
                              <p className="text-sm text-violet-900">Adicione novos modulos sem criar outra inscricao-mae.</p>
                            </div>
                            {!possuiEventoGeralAtivo ? (
                              <label className="flex items-start gap-3 rounded-2xl border border-violet-200 bg-white p-3 text-sm text-zinc-700">
                                <input type="checkbox" checked={ampliacaoForm.incluirEventoGeral} onChange={(event) => updateAmpliacaoForm("incluirEventoGeral", event.target.checked)} />
                                <span>Adicionar inscricao geral da edicao</span>
                              </label>
                            ) : null}
                            {itensConfiguraveisDisponiveis.length > 0 ? (
                              <div className="space-y-2">
                                {itensConfiguraveisDisponiveis.map((item) => (
                                  <label key={item.id} className="flex items-start gap-3 rounded-2xl border border-violet-200 bg-white p-3 text-sm text-zinc-700">
                                    <input type="checkbox" checked={ampliacaoForm.itemConfiguracaoIds.includes(String(item.id))} onChange={() => toggleAmpliacaoItemConfiguracaoId(String(item.id))} />
                                    <span>{item.nome} - {currency(item.valor_centavos)}</span>
                                  </label>
                                ))}
                              </div>
                            ) : null}
                            {false ? (
                              <div className="space-y-2">
                                {coreografiasDisponiveis.map((item) => (
                                  <label key={item.id} className="flex items-start gap-3 rounded-2xl border border-violet-200 bg-white p-3 text-sm text-zinc-700">
                                    <input type="checkbox" checked={ampliacaoForm.participacoesArtisticas.some((participacao) => participacao.coreografiaVinculoId === item.id)} onChange={() => adicionarParticipacaoArtistica("ampliacao", item)} />
                                    <span>
                                      {item.coreografia.nome} - {item.coreografia.tipo_formacao}
                                      {item.coreografia.estilo?.nome ? ` · ${item.coreografia.estilo.nome}` : ""}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            ) : null}
                            <div className="space-y-3 rounded-2xl border border-violet-200 bg-white p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium text-zinc-900">
                                    Novas participacoes artisticas
                                  </p>
                                  <p className="text-xs text-zinc-500">
                                    Adicione novas coreografias a esta mesma inscricao.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalParticipacaoContexto("ampliacao");
                                    setModalParticipacaoAberto(true);
                                  }}
                                  className="inline-flex items-center rounded-full border border-violet-300 bg-white px-4 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-50"
                                >
                                  Adicionar participacao artistica
                                </button>
                              </div>

                              {ampliacaoForm.participacoesArtisticas.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500">
                                  Nenhuma nova participacao artistica selecionada.
                                </div>
                              ) : (
                                <div className="grid gap-2">
                                  {ampliacaoForm.participacoesArtisticas.map((participacao, index) => {
                                    const coreografia = findCoreografiaByParticipacao(
                                      coreografias,
                                      participacao,
                                    );

                                    return (
                                      <div
                                        key={participacao.localId}
                                        className="rounded-2xl border border-violet-200 bg-violet-50 p-3"
                                      >
                                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                          <div className="space-y-1">
                                            <div className="flex flex-wrap gap-2 text-xs font-medium">
                                              <span className="rounded-full bg-white px-2.5 py-1 text-violet-700">
                                                Participacao {index + 1}
                                              </span>
                                              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                                                {participacao.formacao}
                                              </span>
                                            </div>
                                            <p className="font-medium text-zinc-900">
                                              {coreografia?.coreografia.nome ?? "Coreografia nao encontrada"}
                                            </p>
                                            <p className="text-sm text-zinc-600">
                                              {coreografia?.coreografia.estilo?.nome ?? "Sem estilo"}
                                              {coreografia?.coreografia.modalidade?.trim()
                                                ? ` · ${coreografia.coreografia.modalidade}`
                                                : ""}
                                            </p>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              removerParticipacaoArtistica(
                                                "ampliacao",
                                                participacao.localId,
                                              )
                                            }
                                            className="inline-flex items-center rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
                                          >
                                            Remover
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            {!possuiEventoGeralAtivo && itensConfiguraveisDisponiveis.length === 0 && coreografiasDisponiveis.length === 0 ? (
                              <p className="text-sm text-zinc-600">Nao ha novos itens disponiveis para ampliar esta inscricao.</p>
                            ) : null}
                            <textarea value={ampliacaoForm.observacoes} onChange={(event) => updateAmpliacaoForm("observacoes", event.target.value)} placeholder="Observacoes da ampliacao" className="min-h-[88px] w-full rounded-2xl border border-violet-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
                            <div className="flex flex-wrap gap-2">
                              <button type="button" disabled={salvandoAmpliacaoId === inscricao.id || !podeSalvarAmpliacao} onClick={() => handleAdicionarItens(inscricao)} className="inline-flex items-center justify-center rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60">
                                {salvandoAmpliacaoId === inscricao.id ? "Salvando ampliacao..." : "Adicionar itens"}
                              </button>
                              <button type="button" onClick={() => { setAmpliandoInscricaoId(null); setAmpliacaoForm(createAmpliacaoForm()); }} className="inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">
                                Fechar
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <div className="grid gap-2 text-sm lg:text-right">
                        <p className="text-zinc-600">Criada em {formatDateTime(inscricao.created_at)}</p>
                        <p className="text-zinc-600">Conta interna: {inscricao.conta_interna_id ?? "-"}</p>
                        <p className="text-zinc-600">Recebimento: {inscricao.recebimento_id ?? "-"}</p>
                        <button type="button" disabled={inscricao.status_inscricao === "CANCELADA"} onClick={() => ampliandoInscricaoId === inscricao.id ? setAmpliandoInscricaoId(null) : abrirAmpliacao(inscricao)} className="inline-flex items-center justify-center rounded-full border border-violet-300 bg-white px-4 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60">
                          {ampliandoInscricaoId === inscricao.id ? "Fechar ampliacao" : "Ampliar participacao"}
                        </button>
                        <button type="button" disabled={cancelandoId === inscricao.id || inscricao.status_inscricao === "CANCELADA"} onClick={() => handleCancelar(inscricao.id)} className="inline-flex items-center justify-center rounded-full border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60">
                          {cancelandoId === inscricao.id ? "Cancelando..." : "Cancelar inscricao"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          </section>
        ) : null}

        <InscricaoCoreografiaModal
          open={modalParticipacaoAberto}
          estilos={data.estilos}
          formacoes={data.formacoes}
          coreografiasDisponiveis={coreografias}
          coreografiasSelecionadasIds={
            modalParticipacaoContexto === "nova_inscricao"
              ? form.participacoesArtisticas.map((item) => item.coreografiaVinculoId)
              : [
                  ...new Set([
                    ...(inscricaoEmAmpliacao?.itens ?? [])
                      .filter((item) => item.status !== "CANCELADO")
                      .map((item) => item.coreografia_vinculo_id)
                      .filter((item): item is string => Boolean(item)),
                    ...ampliacaoForm.participacoesArtisticas.map(
                      (item) => item.coreografiaVinculoId,
                    ),
                  ]),
                ]
          }
          onClose={() => setModalParticipacaoAberto(false)}
          onSelecionarExistente={(coreografia) => {
            adicionarParticipacaoArtistica(modalParticipacaoContexto, coreografia);
            setSucesso(`Participacao artistica ${coreografia.coreografia.nome} adicionada.`);
          }}
          onCriarNova={criarCoreografiaRapida}
        />
      </div>
    </div>
  );
}
