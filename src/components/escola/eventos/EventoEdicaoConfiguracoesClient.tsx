"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import FormCard from "@/components/FormCard";
import FormInput from "@/components/FormInput";
import { EventoHeaderCard } from "@/components/escola/eventos/EventoHeaderCard";
import type {
  CoreografiaEstiloResumo,
  EventoEdicaoConfiguracaoData,
  EventoEdicaoRegraFinanceiraData,
} from "@/components/escola/eventos/types";

type EventoEdicaoResumo = {
  id: string;
  eventoId: string;
  tituloExibicao: string;
  anoReferencia: number;
  tema: string | null;
  descricao: string | null;
  status: string;
  eventoTitulo: string | null;
  eventoDescricao: string | null;
};

type EventoEdicaoConfiguracoesClientProps = {
  edicao: EventoEdicaoResumo | null;
  configuracaoInicial: EventoEdicaoConfiguracaoData | null;
  estilos: CoreografiaEstiloResumo[];
  destacarCriacao?: boolean;
};

type ItemConfiguravelState = {
  id?: string;
  codigo: string;
  nome: string;
  tipoItem:
    | "FIGURINO"
    | "ENSAIO_EXTRA"
    | "KIT"
    | "MIDIA"
    | "TAXA_ADMINISTRATIVA"
    | "OUTRO";
  modoCobranca:
    | "UNICO"
    | "POR_ALUNO"
    | "POR_TURMA"
    | "POR_GRUPO"
    | "POR_COREOGRAFIA"
    | "PACOTE";
  valorReais: string;
  ativo: boolean;
  descricao: string;
  ordem: number | null;
};

type RegraFinanceiraState = {
  localId: string;
  tipoRegra: EventoEdicaoRegraFinanceiraData["tipo_regra"];
  modoCalculo: EventoEdicaoRegraFinanceiraData["modo_calculo"];
  descricaoRegra: string;
  formacaoCoreografia: EventoEdicaoRegraFinanceiraData["formacao_coreografia"];
  estiloId: string;
  modalidadeNome: string;
  ordemProgressao: string;
  quantidadeMinima: string;
  quantidadeMaxima: string;
  valorReais: string;
  valorPorParticipanteReais: string;
  ativa: boolean;
  ordemAplicacao: string;
};

const ITEM_DEFAULTS: Array<
  Omit<ItemConfiguravelState, "id" | "valorReais" | "descricao" | "ativo">
> = [
  { codigo: "FIGURINO", nome: "Figurino", tipoItem: "FIGURINO", modoCobranca: "POR_ALUNO", ordem: 1 },
  { codigo: "ENSAIO_EXTRA", nome: "Ensaio extra", tipoItem: "ENSAIO_EXTRA", modoCobranca: "POR_ALUNO", ordem: 2 },
  { codigo: "KIT", nome: "Kit", tipoItem: "KIT", modoCobranca: "UNICO", ordem: 3 },
  { codigo: "MIDIA", nome: "Mídia / foto / vídeo", tipoItem: "MIDIA", modoCobranca: "UNICO", ordem: 4 },
  { codigo: "TAXA_ADMIN", nome: "Taxa administrativa", tipoItem: "TAXA_ADMINISTRATIVA", modoCobranca: "UNICO", ordem: 5 },
  { codigo: "OUTROS", nome: "Outros", tipoItem: "OUTRO", modoCobranca: "UNICO", ordem: 6 },
];

function formatStatus(value: string): string {
  return value.replaceAll("_", " ");
}

function centavosToDecimal(value: number): string {
  return (value / 100).toFixed(2);
}

function decimalToCentavos(value: string): number {
  const normalized = Number(value.replace(",", "."));
  if (!Number.isFinite(normalized) || normalized < 0) return 0;
  return Math.round(normalized * 100);
}

function addMonths(baseCompetencia: string, months: number): string {
  const [yearRaw, monthRaw] = baseCompetencia.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const date = new Date(Date.UTC(year, month - 1, 1));
  date.setUTCMonth(date.getUTCMonth() + months);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function buildCompetenciaOptions(months = 12): string[] {
  const today = new Date();
  const baseCompetencia = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  return Array.from({ length: months }, (_, index) =>
    addMonths(baseCompetencia, index),
  );
}

function formatCompetenciaLabel(competencia: string): string {
  const [yearRaw, monthRaw] = competencia.split("-");
  const date = new Date(Number(yearRaw), Number(monthRaw) - 1, 1);

  if (Number.isNaN(date.getTime())) return competencia;

  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function buildInitialItens(
  configuracaoInicial: EventoEdicaoConfiguracaoData | null,
): ItemConfiguravelState[] {
  return ITEM_DEFAULTS.map((item) => {
    const existente =
      configuracaoInicial?.itensFinanceiros.find(
        (configItem) => configItem.tipo_item === item.tipoItem,
      ) ?? null;

    return {
      id: existente?.id ?? undefined,
      codigo: existente?.codigo ?? item.codigo,
      nome: existente?.nome ?? item.nome,
      tipoItem: existente?.tipo_item ?? item.tipoItem,
      modoCobranca: existente?.modo_cobranca ?? item.modoCobranca,
      valorReais: centavosToDecimal(existente?.valor_centavos ?? 0),
      ativo: existente?.ativo ?? false,
      descricao: existente?.descricao ?? "",
      ordem: existente?.ordem ?? item.ordem,
    };
  });
}

function createBlankRegraFinanceira(
  tipoRegra: EventoEdicaoRegraFinanceiraData["tipo_regra"] = "POR_FORMACAO",
): RegraFinanceiraState {
  return {
    localId: crypto.randomUUID(),
    tipoRegra,
    modoCalculo: "VALOR_FIXO",
    descricaoRegra: "",
    formacaoCoreografia: tipoRegra === "POR_FORMACAO" ? "SOLO" : null,
    estiloId: "",
    modalidadeNome: "",
    ordemProgressao: "",
    quantidadeMinima: "",
    quantidadeMaxima: "",
    valorReais: "0.00",
    valorPorParticipanteReais: "",
    ativa: true,
    ordemAplicacao: "0",
  };
}

function buildInitialRegrasFinanceiras(
  configuracaoInicial: EventoEdicaoConfiguracaoData | null,
): RegraFinanceiraState[] {
  if ((configuracaoInicial?.regrasFinanceiras.length ?? 0) === 0) return [];

  return configuracaoInicial!.regrasFinanceiras.map((regra, index) => ({
    localId: regra.id ?? `regra-${index}`,
    tipoRegra: regra.tipo_regra,
    modoCalculo: regra.modo_calculo,
    descricaoRegra: regra.descricao_regra ?? "",
    formacaoCoreografia: regra.formacao_coreografia,
    estiloId: regra.estilo_id ?? "",
    modalidadeNome: regra.modalidade_nome ?? "",
    ordemProgressao:
      regra.ordem_progressao !== null ? String(regra.ordem_progressao) : "",
    quantidadeMinima:
      regra.quantidade_minima !== null ? String(regra.quantidade_minima) : "",
    quantidadeMaxima:
      regra.quantidade_maxima !== null ? String(regra.quantidade_maxima) : "",
    valorReais: centavosToDecimal(regra.valor_centavos),
    valorPorParticipanteReais:
      regra.valor_por_participante_centavos !== null
        ? centavosToDecimal(regra.valor_por_participante_centavos)
        : "",
    ativa: regra.ativa,
    ordemAplicacao:
      regra.ordem_aplicacao !== null ? String(regra.ordem_aplicacao) : "0",
  }));
}

export function EventoEdicaoConfiguracoesClient({
  edicao,
  configuracaoInicial,
  estilos,
  destacarCriacao = false,
}: EventoEdicaoConfiguracoesClientProps) {
  const router = useRouter();
  const [cobraTaxaParticipacaoGeral, setCobraTaxaParticipacaoGeral] = useState(
    configuracaoInicial?.cobra_taxa_participacao_geral ?? false,
  );
  const [cobraPorCoreografia, setCobraPorCoreografia] = useState(
    configuracaoInicial?.cobra_por_coreografia ?? false,
  );
  const [cobraPorPacote, setCobraPorPacote] = useState(
    configuracaoInicial?.cobra_por_pacote ?? false,
  );
  const [permiteItensAdicionais, setPermiteItensAdicionais] = useState(
    configuracaoInicial?.permite_itens_adicionais ?? false,
  );
  const [permitePagamentoNoAto, setPermitePagamentoNoAto] = useState(
    configuracaoInicial?.permite_pagamento_no_ato ?? true,
  );
  const [permiteContaInterna, setPermiteContaInterna] = useState(
    configuracaoInicial?.permite_conta_interna ?? true,
  );
  const [permiteParcelamentoContaInterna, setPermiteParcelamentoContaInterna] =
    useState(configuracaoInicial?.permite_parcelamento_conta_interna ?? false);
  const [exigeInscricaoGeral, setExigeInscricaoGeral] = useState(
    configuracaoInicial?.exige_inscricao_geral ?? true,
  );
  const [permiteInscricaoPorCoreografia, setPermiteInscricaoPorCoreografia] =
    useState(configuracaoInicial?.permite_inscricao_por_coreografia ?? true);
  const [permiteVincularCoreografiaDepois, setPermiteVincularCoreografiaDepois] =
    useState(configuracaoInicial?.permite_vincular_coreografia_depois ?? true);
  const [participacaoPorAluno, setParticipacaoPorAluno] = useState(
    configuracaoInicial?.participacao_por_aluno ?? true,
  );
  const [participacaoPorTurma, setParticipacaoPorTurma] = useState(
    configuracaoInicial?.participacao_por_turma ?? false,
  );
  const [participacaoPorGrupo, setParticipacaoPorGrupo] = useState(
    configuracaoInicial?.participacao_por_grupo ?? false,
  );
  const [participacaoPorCoreografia, setParticipacaoPorCoreografia] = useState(
    configuracaoInicial?.participacao_por_coreografia ?? true,
  );
  const [permiteMultiplasCoreografiasAluno, setPermiteMultiplasCoreografiasAluno] =
    useState(configuracaoInicial?.permite_multiplas_coreografias_aluno ?? false);
  const [valorTaxaParticipacao, setValorTaxaParticipacao] = useState(
    centavosToDecimal(configuracaoInicial?.valor_taxa_participacao_centavos ?? 0),
  );
  const [modoComposicaoValor, setModoComposicaoValor] = useState<
    EventoEdicaoConfiguracaoData["modo_composicao_valor"]
  >(configuracaoInicial?.modo_composicao_valor ?? "VALOR_FIXO");
  const [modoCobranca, setModoCobranca] = useState<
    EventoEdicaoConfiguracaoData["modo_cobranca"]
  >(configuracaoInicial?.modo_cobranca ?? "UNICA");
  const [quantidadeMaximaParcelas, setQuantidadeMaximaParcelas] = useState(
    String(configuracaoInicial?.quantidade_maxima_parcelas ?? 1),
  );
  const [maximoParcelasContaInterna, setMaximoParcelasContaInterna] = useState(
    String(configuracaoInicial?.maximo_parcelas_conta_interna ?? 1),
  );
  const [competenciasElegiveisContaInterna, setCompetenciasElegiveisContaInterna] =
    useState<string[]>(
      configuracaoInicial?.competencias_elegiveis_conta_interna ?? [],
    );
  const [permiteCompetenciasAposEvento, setPermiteCompetenciasAposEvento] =
    useState(configuracaoInicial?.permite_competencias_apos_evento ?? false);
  const [geraContaInternaAutomaticamente, setGeraContaInternaAutomaticamente] =
    useState(configuracaoInicial?.gera_conta_interna_automaticamente ?? false);
  const [itens, setItens] = useState<ItemConfiguravelState[]>(
    buildInitialItens(configuracaoInicial),
  );
  const [regrasFinanceiras, setRegrasFinanceiras] = useState<RegraFinanceiraState[]>(
    buildInitialRegrasFinanceiras(configuracaoInicial),
  );
  const [eventoTitulo, setEventoTitulo] = useState(edicao?.eventoTitulo ?? "");
  const [eventoDescricao, setEventoDescricao] = useState(
    edicao?.eventoDescricao ?? "",
  );
  const [tituloExibicao, setTituloExibicao] = useState(edicao?.tituloExibicao ?? "");
  const [tema, setTema] = useState(edicao?.tema ?? "");
  const [descricaoEdicao, setDescricaoEdicao] = useState(edicao?.descricao ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(
    destacarCriacao && edicao
      ? `Edição ${edicao.tituloExibicao} criada. Agora finalize as configurações antes de seguir para o calendário.`
      : null,
  );
  const [detalheSucesso, setDetalheSucesso] = useState<string | null>(null);

  const resumoFinanceiro = useMemo(() => {
    return itens
      .filter((item) => item.ativo)
      .reduce((acc, item) => acc + decimalToCentavos(item.valorReais), 0);
  }, [itens]);
  const resumoRegrasFinanceiras = useMemo(() => {
    return {
      ativas: regrasFinanceiras.filter((regra) => regra.ativa).length,
      porFormacao: regrasFinanceiras.filter(
        (regra) => regra.ativa && regra.tipoRegra === "POR_FORMACAO",
      ).length,
      porModalidade: regrasFinanceiras.filter(
        (regra) => regra.ativa && regra.tipoRegra === "POR_MODALIDADE",
      ).length,
      porProgressao: regrasFinanceiras.filter(
        (regra) => regra.ativa && regra.tipoRegra === "POR_PROGRESSAO",
      ).length,
      porQuantidade: regrasFinanceiras.filter(
        (regra) => regra.ativa && regra.tipoRegra === "POR_QUANTIDADE",
      ).length,
    };
  }, [regrasFinanceiras]);
  const competenciaOptions = useMemo(() => buildCompetenciaOptions(12), []);

  useEffect(() => {
    if (!sucesso) return undefined;

    const timeout = window.setTimeout(() => {
      setSucesso(null);
      setDetalheSucesso(null);
    }, 6000);

    return () => window.clearTimeout(timeout);
  }, [sucesso]);

  function updateItem(index: number, patch: Partial<ItemConfiguravelState>) {
    setItens((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }

  function updateRegra(index: number, patch: Partial<RegraFinanceiraState>) {
    setRegrasFinanceiras((current) =>
      current.map((regra, regraIndex) =>
        regraIndex === index ? { ...regra, ...patch } : regra,
      ),
    );
  }

  function addRegra(tipoRegra: RegraFinanceiraState["tipoRegra"]) {
    setRegrasFinanceiras((current) => [
      ...current,
      createBlankRegraFinanceira(tipoRegra),
    ]);
  }

  function removeRegra(localId: string) {
    setRegrasFinanceiras((current) =>
      current.filter((regra) => regra.localId !== localId),
    );
  }

  function toggleCompetencia(competencia: string) {
    setCompetenciasElegiveisContaInterna((current) =>
      current.includes(competencia)
        ? current.filter((item) => item !== competencia)
        : [...current, competencia].sort((left, right) => left.localeCompare(right)),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!edicao) return;

    setSubmitting(true);
    setErro(null);
    setSucesso(null);
    setDetalheSucesso(null);

    try {
      if (!eventoTitulo.trim()) {
        throw new Error("Informe o nome do evento-base.");
      }

      if (!tituloExibicao.trim()) {
        throw new Error("Informe o titulo da edicao.");
      }

      const regrasFinanceirasAtivas = regrasFinanceiras.filter((regra) => regra.ativa);
      const usaRegrasFinanceirasDetalhadas = regrasFinanceirasAtivas.length > 0;
      const possuiRegrasArtisticasDetalhadas = regrasFinanceirasAtivas.some((regra) =>
        ["POR_FORMACAO", "POR_MODALIDADE", "POR_PROGRESSAO", "POR_QUANTIDADE"].includes(
          regra.tipoRegra,
        ),
      );

      const eventoResponse = await fetch(
        `/api/eventos/escola/eventos/${edicao.eventoId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            titulo: eventoTitulo.trim(),
            descricao: eventoDescricao.trim() || null,
          }),
        },
      );

      const eventoJson = (await eventoResponse.json().catch(() => null)) as
        | { ok: true }
        | { ok: false; details?: string; error?: string }
        | null;

      if (!eventoResponse.ok || !eventoJson || ("ok" in eventoJson && !eventoJson.ok)) {
        throw new Error(
          (eventoJson && "details" in eventoJson ? eventoJson.details : null) ??
            (eventoJson && "error" in eventoJson ? eventoJson.error : null) ??
            "Nao foi possivel atualizar o evento-base.",
        );
      }

      const edicaoResponse = await fetch(`/api/eventos/escola/edicoes/${edicao.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tituloExibicao: tituloExibicao.trim(),
          tema: tema.trim() || null,
          descricao: descricaoEdicao.trim() || null,
        }),
      });

      const edicaoJson = (await edicaoResponse.json().catch(() => null)) as
        | { ok: true }
        | { ok: false; details?: string; error?: string }
        | null;

      if (!edicaoResponse.ok || !edicaoJson || ("ok" in edicaoJson && !edicaoJson.ok)) {
        throw new Error(
          (edicaoJson && "details" in edicaoJson ? edicaoJson.details : null) ??
            (edicaoJson && "error" in edicaoJson ? edicaoJson.error : null) ??
            "Nao foi possivel atualizar a edicao.",
        );
      }

      const payload = {
          edicaoId: edicao.id,
          cobraTaxaParticipacaoGeral:
            usaRegrasFinanceirasDetalhadas ? false : cobraTaxaParticipacaoGeral,
          cobraPorCoreografia: usaRegrasFinanceirasDetalhadas
            ? possuiRegrasArtisticasDetalhadas
            : cobraPorCoreografia,
          cobraPorPacote,
          permiteItensAdicionais,
          permitePagamentoNoAto,
          permiteContaInterna,
          permiteParcelamentoContaInterna:
            permiteContaInterna && permiteParcelamentoContaInterna,
          exigeInscricaoGeral,
          permiteInscricaoPorCoreografia,
          permiteVincularCoreografiaDepois,
          participacaoPorAluno,
          participacaoPorTurma,
          participacaoPorGrupo,
          participacaoPorCoreografia,
          permiteMultiplasCoreografiasAluno,
          valorTaxaParticipacaoCentavos: usaRegrasFinanceirasDetalhadas
            ? 0
            : decimalToCentavos(valorTaxaParticipacao),
          modoComposicaoValor: usaRegrasFinanceirasDetalhadas
            ? "PERSONALIZADO"
            : modoComposicaoValor,
          modoCobranca,
          quantidadeMaximaParcelas: Number(quantidadeMaximaParcelas) || 1,
          maximoParcelasContaInterna: permiteContaInterna
            ? Number(maximoParcelasContaInterna) || 1
            : 1,
          competenciasElegiveisContaInterna: permiteContaInterna
            ? competenciasElegiveisContaInterna
            : [],
          permiteCompetenciasAposEvento: permiteContaInterna
            ? permiteCompetenciasAposEvento
            : false,
          geraContaInternaAutomaticamente,
          regrasAdicionais: null,
          itensFinanceiros: itens.map((item) => ({
            ...(item.id ? { id: item.id } : {}),
            codigo: item.codigo,
            nome: item.nome,
            descricao: item.descricao.trim() || null,
            tipoItem: item.tipoItem,
            modoCobranca: item.modoCobranca,
            valorCentavos: decimalToCentavos(item.valorReais),
            ativo: item.ativo,
            ordem: item.ordem,
            metadata: null,
          })),
          regrasFinanceiras: regrasFinanceiras.map((regra) => ({
            tipoRegra: regra.tipoRegra,
            modoCalculo: regra.modoCalculo,
            descricaoRegra: regra.descricaoRegra.trim() || null,
            formacaoCoreografia: regra.formacaoCoreografia,
            estiloId: regra.estiloId || null,
            modalidadeNome: regra.modalidadeNome.trim() || null,
            ordemProgressao: regra.ordemProgressao.trim()
              ? Number(regra.ordemProgressao)
              : null,
            quantidadeMinima: regra.quantidadeMinima.trim()
              ? Number(regra.quantidadeMinima)
              : null,
            quantidadeMaxima: regra.quantidadeMaxima.trim()
              ? Number(regra.quantidadeMaxima)
              : null,
            valor: decimalToCentavos(regra.valorReais),
            valorPorParticipante: regra.valorPorParticipanteReais.trim()
              ? decimalToCentavos(regra.valorPorParticipanteReais)
              : null,
            ativa: regra.ativa,
            ordemAplicacao: regra.ordemAplicacao.trim()
              ? Number(regra.ordemAplicacao)
              : 0,
            metadata: null,
          })),
        };

      const response = await fetch("/api/eventos/escola/edicoes/configuracoes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = (await response.json().catch(() => null)) as
        | { ok: true; success?: true }
        | {
            ok: false;
            success?: false;
            details?: string;
            message?: string;
            error?: string;
            code?: string | null;
          }
        | null;

      if (!response.ok || !json || ("ok" in json && !json.ok)) {
        throw new Error(
          (json && "details" in json ? json.details : null) ??
            (json && "message" in json ? json.message : null) ??
            (json && "error" in json ? json.error : null) ??
            "Não foi possível salvar as configurações da edição.",
        );
      }

      setSucesso("Evento-base, edição e configurações salvos com sucesso.");
      setSucesso("Configuracoes da edicao salvas com sucesso");
      setDetalheSucesso(
        `${regrasFinanceirasAtivas.length} regra(s) ativa(s) e ${itens.filter((item) => item.ativo).length} item(ns) financeiro(s) ativo(s).`,
      );
      router.refresh();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar as configurações da edição.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!edicao) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-white px-4 py-6 md:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <EventoHeaderCard
            eyebrow="Eventos da Escola"
            titulo="Edição não encontrada"
            descricao="Não foi possível localizar a edição para configurar."
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
          titulo={`Configurações da edição · ${edicao.tituloExibicao}`}
          descricao="Defina o modelo de participacao, a logica financeira e os itens configuraveis antes de avancar para o calendario."
          actions={
            <>
              <Link
                href="/escola/eventos"
                className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Visão geral
              </Link>
              <Link
                href={`/escola/eventos/edicoes/${edicao.id}/calendario`}
                className="inline-flex items-center rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
              >
                Ir para calendário
              </Link>
            </>
          }
        />

        {sucesso ? (
          <div className="fixed right-4 top-4 z-50 w-full max-w-sm rounded-3xl border border-emerald-200 bg-white p-4 shadow-xl shadow-emerald-100">
            <p className="text-sm font-semibold text-emerald-700">{sucesso}</p>
            {detalheSucesso ? (
              <p className="mt-1 text-sm text-zinc-600">{detalheSucesso}</p>
            ) : null}
          </div>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <FormCard
            title="Resumo da edição"
            description="Base institucional e posicionamento da edição atual."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Evento-base</p>
                <p className="mt-2 text-sm font-medium text-zinc-900">
                  {edicao.eventoTitulo ?? "Não informado"}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Título</p>
                <p className="mt-2 text-sm font-medium text-zinc-900">
                  {edicao.tituloExibicao}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Ano</p>
                <p className="mt-2 text-sm font-medium text-zinc-900">
                  {edicao.anoReferencia}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Tema</p>
                <p className="mt-2 text-sm font-medium text-zinc-900">
                  {edicao.tema?.trim() ? edicao.tema : "Não informado"}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Status</p>
                <p className="mt-2 text-sm font-medium text-zinc-900">
                  {formatStatus(edicao.status)}
                </p>
              </div>
            </div>
          </FormCard>

          <FormCard
            title="Próximos passos"
            description="Fluxo recomendado para a edição após esta configuração."
          >
            <div className="grid gap-3">
              <Link
                href={`/escola/eventos/edicoes/${edicao.id}/calendario`}
                className="rounded-2xl border border-zinc-200 p-4 text-sm font-medium text-zinc-700 transition hover:border-violet-300 hover:bg-violet-50"
              >
                Calendário da edição
              </Link>
              <Link
                href={`/escola/eventos/edicoes/${edicao.id}/inscricoes`}
                className="rounded-2xl border border-zinc-200 p-4 text-sm font-medium text-zinc-700 transition hover:border-violet-300 hover:bg-violet-50"
              >
                Inscrições
              </Link>
              <Link
                href={`/escola/eventos/edicoes/${edicao.id}/coreografias`}
                className="rounded-2xl border border-zinc-200 p-4 text-sm font-medium text-zinc-700 transition hover:border-violet-300 hover:bg-violet-50"
              >
                Coreografias e elencos
              </Link>
              <Link
                href={`/escola/eventos/${edicao.id}?aba=financeiro`}
                className="rounded-2xl border border-zinc-200 p-4 text-sm font-medium text-zinc-700 transition hover:border-violet-300 hover:bg-violet-50"
              >
                Financeiro
              </Link>
            </div>
          </FormCard>
        </section>

        <form className="grid gap-6" onSubmit={handleSubmit}>
          {erro ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {erro}
            </div>
          ) : null}

          <FormCard
            title="Identidade editorial"
            description="Separe o evento-base do titulo, tema e descricao desta edicao."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FormInput label="Nome do evento-base" value={eventoTitulo} onChange={(event) => setEventoTitulo(event.target.value)} />
              <FormInput label="Titulo da edicao" value={tituloExibicao} onChange={(event) => setTituloExibicao(event.target.value)} />
              <FormInput label="Tema da edicao" value={tema} onChange={(event) => setTema(event.target.value)} />
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                Ano de referencia: <span className="font-medium text-zinc-900">{edicao.anoReferencia}</span>
              </div>
              <FormInput as="textarea" label="Descricao institucional do evento-base" value={eventoDescricao} onChange={(event) => setEventoDescricao(event.target.value)} className="md:col-span-2 xl:col-span-2" />
              <FormInput as="textarea" label="Descricao editorial da edicao" value={descricaoEdicao} onChange={(event) => setDescricaoEdicao(event.target.value)} className="md:col-span-2 xl:col-span-2" />
            </div>
          </FormCard>

          <FormCard
            title="Modelo de participação"
            description="Defina como a edição será cobrada e como os itens opcionais entram na operação."
          >
            <div className="grid gap-3 md:grid-cols-2">
              {[
                [
                  cobraTaxaParticipacaoGeral,
                  setCobraTaxaParticipacaoGeral,
                  "Cobrar taxa de participação geral",
                ],
                [
                  cobraPorCoreografia,
                  setCobraPorCoreografia,
                  "Permitir cobranca por regras aplicadas as coreografias",
                ],
                [cobraPorPacote, setCobraPorPacote, "Cobrar por pacote"],
                [
                  permiteItensAdicionais,
                  setPermiteItensAdicionais,
                  "Permitir itens adicionais",
                ],
              ].map(([checked, onChange, label]) => (
                <label
                  key={label as string}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700"
                >
                  <input
                    type="checkbox"
                    checked={checked as boolean}
                    onChange={(event) =>
                      (onChange as (value: boolean) => void)(event.target.checked)
                    }
                  />
                  {label as string}
                </label>
              ))}
            </div>
          </FormCard>

          <FormCard
            title="Política de inscrições"
            description="Defina o que a operação de inscrições pode fazer nesta edição e quais caminhos financeiros ficam disponíveis."
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[
                [
                  permitePagamentoNoAto,
                  setPermitePagamentoNoAto,
                  "Permitir pagamento no ato",
                ],
                [
                  permiteContaInterna,
                  setPermiteContaInterna,
                  "Permitir conta interna",
                ],
                [
                  permiteParcelamentoContaInterna,
                  setPermiteParcelamentoContaInterna,
                  "Permitir parcelamento em conta interna",
                ],
                [
                  exigeInscricaoGeral,
                  setExigeInscricaoGeral,
                  "Exigir inscrição geral",
                ],
                [
                  permiteInscricaoPorCoreografia,
                  setPermiteInscricaoPorCoreografia,
                  "Permitir inscrição por coreografia",
                ],
                [
                  permiteVincularCoreografiaDepois,
                  setPermiteVincularCoreografiaDepois,
                  "Permitir vincular coreografia depois",
                ],
              ].map(([checked, onChange, label]) => (
                <label
                  key={label as string}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700"
                >
                  <input
                    type="checkbox"
                    checked={checked as boolean}
                    onChange={(event) =>
                      (onChange as (value: boolean) => void)(event.target.checked)
                    }
                  />
                  {label as string}
                </label>
              ))}
            </div>
          </FormCard>

          <FormCard
            title="Estrutura artística"
            description="Defina as formas de participação permitidas na edição."
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[
                [participacaoPorAluno, setParticipacaoPorAluno, "Participação por aluno"],
                [participacaoPorTurma, setParticipacaoPorTurma, "Participação por turma"],
                [participacaoPorGrupo, setParticipacaoPorGrupo, "Participação por grupo"],
                [
                  participacaoPorCoreografia,
                  setParticipacaoPorCoreografia,
                  "Participação por coreografia",
                ],
                [
                  permiteMultiplasCoreografiasAluno,
                  setPermiteMultiplasCoreografiasAluno,
                  "Permitir múltiplas coreografias por aluno",
                ],
              ].map(([checked, onChange, label]) => (
                <label
                  key={label as string}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700"
                >
                  <input
                    type="checkbox"
                    checked={checked as boolean}
                    onChange={(event) =>
                      (onChange as (value: boolean) => void)(event.target.checked)
                    }
                  />
                  {label as string}
                </label>
              ))}
            </div>
          </FormCard>

          <FormCard
            title="Conta interna por competencias"
            description="Configure parcelamento e quais competencias podem receber parcelas desta edicao. O vencimento real continua seguindo a fatura oficial da conta interna."
          >
            <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
              <div className="grid gap-4 md:grid-cols-2">
                <FormInput
                  label="Max. parcelas na conta interna"
                  type="number"
                  min="1"
                  max="12"
                  disabled={!permiteContaInterna}
                  value={maximoParcelasContaInterna}
                  onChange={(event) =>
                    setMaximoParcelasContaInterna(event.target.value)
                  }
                />
                <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={permiteCompetenciasAposEvento}
                    disabled={!permiteContaInterna}
                    onChange={(event) =>
                      setPermiteCompetenciasAposEvento(event.target.checked)
                    }
                  />
                  Permitir competencias apos o evento
                </label>
                <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 md:col-span-2">
                  Se nenhuma competencia for marcada, a inscricao usa uma janela
                  progressiva a partir do mes da inscricao, respeitando o fim do
                  evento quando aplicavel. O vencimento real da cobranca nao e
                  definido aqui: ele segue a fatura oficial da conta interna
                  escolhida.
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    Competencias elegiveis da conta interna
                  </p>
                  <p className="text-xs text-zinc-500">
                    Marque os meses que podem receber parcelas desta edicao.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {competenciaOptions.map((competencia) => (
                    <label
                      key={competencia}
                      className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700"
                    >
                      <input
                        type="checkbox"
                        checked={competenciasElegiveisContaInterna.includes(competencia)}
                        disabled={!permiteContaInterna}
                        onChange={() => toggleCompetencia(competencia)}
                      />
                      <span>{formatCompetenciaLabel(competencia)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </FormCard>

          {false ? (
          <FormCard
            title="Regras financeiras"
            description="Defina a taxa principal e os parametros gerais. A cobranca artistica detalhada passa a nascer das regras financeiras desta edicao."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <FormInput
                label="Valor da taxa (R$)"
                type="number"
                min="0"
                step="0.01"
                value={valorTaxaParticipacao}
                onChange={(event) => setValorTaxaParticipacao(event.target.value)}
              />
              <FormInput
                as="select"
                label="Modo de composição"
                value={modoComposicaoValor}
                onChange={(event) =>
                  setModoComposicaoValor(
                    event.target.value as EventoEdicaoConfiguracaoData["modo_composicao_valor"],
                  )
                }
              >
                <option value="VALOR_FIXO">Valor fixo</option>
                <option value="POR_COREOGRAFIA">Legado por coreografia</option>
                <option value="PACOTE">Pacote</option>
                <option value="PERSONALIZADO">Personalizado</option>
              </FormInput>
              <FormInput
                as="select"
                label="Cobrança"
                value={modoCobranca}
                onChange={(event) =>
                  setModoCobranca(
                    event.target.value as EventoEdicaoConfiguracaoData["modo_cobranca"],
                  )
                }
              >
                <option value="UNICA">Única</option>
                <option value="PARCELADA">Parcelada</option>
              </FormInput>
              <FormInput
                label="Máx. parcelas"
                type="number"
                min="1"
                max="24"
                value={quantidadeMaximaParcelas}
                onChange={(event) => setQuantidadeMaximaParcelas(event.target.value)}
              />
              <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700">
                <input
                  type="checkbox"
                  checked={geraContaInternaAutomaticamente}
                  onChange={(event) =>
                    setGeraContaInternaAutomaticamente(event.target.checked)
                  }
                />
                Gerar conta interna automaticamente
              </label>
            </div>
          </FormCard>
          ) : null}

          <FormCard
            title="Regras financeiras detalhadas"
            description="Esta e a fonte principal da politica de cobranca da edicao. Cadastre regras por taxa geral, formacao, modalidade, progressao e quantidade."
            actions={
              <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                Ativas: {resumoRegrasFinanceiras.ativas} · Formacao {resumoRegrasFinanceiras.porFormacao} · Modalidade {resumoRegrasFinanceiras.porModalidade} · Progressao {resumoRegrasFinanceiras.porProgressao} · Quantidade {resumoRegrasFinanceiras.porQuantidade}
              </div>
            }
          >
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => addRegra("TAXA_GERAL")}
                className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Regra de taxa geral
              </button>
              <button
                type="button"
                onClick={() => addRegra("POR_FORMACAO")}
                className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Regra por formacao
              </button>
              <button
                type="button"
                onClick={() => addRegra("POR_MODALIDADE")}
                className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Regra por modalidade
              </button>
              <button
                type="button"
                onClick={() => addRegra("POR_PROGRESSAO")}
                className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Regra de progressao
              </button>
              <button
                type="button"
                onClick={() => addRegra("POR_QUANTIDADE")}
                className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Regra por quantidade
              </button>
            </div>

            {regrasFinanceiras.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-500">
                Nenhuma regra detalhada cadastrada. Configure aqui a taxa geral e as regras artisticas da edicao para evitar depender de compatibilidade legada.
              </div>
            ) : (
              <div className="grid gap-4">
                {regrasFinanceiras.map((regra, index) => (
                  <div
                    key={regra.localId}
                    className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                  >
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-700">
                        Regra {index + 1}
                      </span>
                      <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                        {regra.tipoRegra}
                      </span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                      <FormInput
                        as="select"
                        label="Tipo da regra"
                        value={regra.tipoRegra}
                        onChange={(event) =>
                          updateRegra(index, {
                            tipoRegra: event.target.value as RegraFinanceiraState["tipoRegra"],
                            formacaoCoreografia:
                              event.target.value === "POR_FORMACAO"
                                ? regra.formacaoCoreografia ?? "SOLO"
                                : null,
                          })
                        }
                      >
                        <option value="TAXA_GERAL">Taxa geral</option>
                        <option value="POR_FORMACAO">Por formacao</option>
                        <option value="POR_MODALIDADE">Por modalidade</option>
                        <option value="POR_PROGRESSAO">Por progressao</option>
                        <option value="POR_QUANTIDADE">Por quantidade</option>
                        <option value="ITEM_ADICIONAL">Item adicional</option>
                      </FormInput>
                      <FormInput
                        as="select"
                        label="Modo de calculo"
                        value={regra.modoCalculo}
                        onChange={(event) =>
                          updateRegra(index, {
                            modoCalculo:
                              event.target.value as RegraFinanceiraState["modoCalculo"],
                          })
                        }
                      >
                        <option value="VALOR_FIXO">Valor fixo</option>
                        <option value="VALOR_TOTAL_FAIXA">Valor total/faixa</option>
                        <option value="VALOR_POR_PARTICIPANTE">Valor por participante</option>
                        <option value="VALOR_INCREMENTAL">Valor incremental</option>
                      </FormInput>
                      <FormInput
                        label="Valor da regra (R$)"
                        type="number"
                        min="0"
                        step="0.01"
                        value={regra.valorReais}
                        onChange={(event) =>
                          updateRegra(index, { valorReais: event.target.value })
                        }
                      />
                      <FormInput
                        label="Valor por participante (R$)"
                        type="number"
                        min="0"
                        step="0.01"
                        value={regra.valorPorParticipanteReais}
                        onChange={(event) =>
                          updateRegra(index, {
                            valorPorParticipanteReais: event.target.value,
                          })
                        }
                      />
                      <FormInput
                        label="Ordem de aplicacao"
                        type="number"
                        min="0"
                        value={regra.ordemAplicacao}
                        onChange={(event) =>
                          updateRegra(index, { ordemAplicacao: event.target.value })
                        }
                      />
                      <FormInput
                        as="select"
                        label="Formacao"
                        value={regra.formacaoCoreografia ?? ""}
                        onChange={(event) =>
                          updateRegra(index, {
                            formacaoCoreografia:
                              (event.target.value || null) as RegraFinanceiraState["formacaoCoreografia"],
                          })
                        }
                      >
                        <option value="">Nao se aplica</option>
                        <option value="SOLO">SOLO</option>
                        <option value="DUO">DUO</option>
                        <option value="TRIO">TRIO</option>
                        <option value="GRUPO">GRUPO</option>
                        <option value="TURMA">TURMA</option>
                        <option value="LIVRE">LIVRE</option>
                      </FormInput>
                      <FormInput
                        as="select"
                        label="Estilo"
                        value={regra.estiloId}
                        onChange={(event) =>
                          updateRegra(index, { estiloId: event.target.value })
                        }
                      >
                        <option value="">Nao se aplica</option>
                        {estilos.map((estilo) => (
                          <option key={estilo.id} value={estilo.id}>
                            {estilo.nome}
                          </option>
                        ))}
                      </FormInput>
                      <FormInput
                        label="Modalidade textual"
                        value={regra.modalidadeNome}
                        onChange={(event) =>
                          updateRegra(index, { modalidadeNome: event.target.value })
                        }
                        placeholder="Ex.: Ballet, Jazz, Hip-hop"
                      />
                      <FormInput
                        label="Ordem de progressao"
                        type="number"
                        min="1"
                        value={regra.ordemProgressao}
                        onChange={(event) =>
                          updateRegra(index, { ordemProgressao: event.target.value })
                        }
                      />
                      <FormInput
                        label="Quantidade minima"
                        type="number"
                        min="1"
                        value={regra.quantidadeMinima}
                        onChange={(event) =>
                          updateRegra(index, { quantidadeMinima: event.target.value })
                        }
                      />
                      <FormInput
                        label="Quantidade maxima"
                        type="number"
                        min="1"
                        value={regra.quantidadeMaxima}
                        onChange={(event) =>
                          updateRegra(index, { quantidadeMaxima: event.target.value })
                        }
                      />
                      <FormInput
                        as="textarea"
                        label="Descricao operacional"
                        value={regra.descricaoRegra}
                        onChange={(event) =>
                          updateRegra(index, { descricaoRegra: event.target.value })
                        }
                        className="md:col-span-2 xl:col-span-3"
                      />
                      <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700">
                        <input
                          type="checkbox"
                          checked={regra.ativa}
                          onChange={(event) =>
                            updateRegra(index, { ativa: event.target.checked })
                          }
                        />
                        Regra ativa
                      </label>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => removeRegra(regra.localId)}
                        className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                      >
                        Remover regra
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </FormCard>

          <FormCard
            title="Itens adicionais configuráveis"
            description="Ative os itens que podem compor o valor da edição. Esta etapa não gera cobrança real automaticamente."
            actions={
              <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                Itens ativos: {itens.filter((item) => item.ativo).length} · Total base: R${" "}
                {centavosToDecimal(resumoFinanceiro)}
              </div>
            }
          >
            <div className="grid gap-4">
              {itens.map((item, index) => (
                <div
                  key={item.codigo}
                  className="grid gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 lg:grid-cols-[1.2fr_1fr_0.8fr_auto]"
                >
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 text-sm font-medium text-zinc-700">
                      <input
                        type="checkbox"
                        checked={item.ativo}
                        onChange={(event) =>
                          updateItem(index, { ativo: event.target.checked })
                        }
                      />
                      {item.nome}
                    </label>
                    <FormInput
                      label="Descrição"
                      value={item.descricao}
                      onChange={(event) =>
                        updateItem(index, { descricao: event.target.value })
                      }
                      placeholder="Como este item aparece para a equipe"
                    />
                  </div>
                  <FormInput
                    as="select"
                    label="Modo de cobrança"
                    value={item.modoCobranca}
                    onChange={(event) =>
                      updateItem(index, {
                        modoCobranca: event.target.value as ItemConfiguravelState["modoCobranca"],
                      })
                    }
                  >
                    <option value="UNICO">Único</option>
                    <option value="POR_ALUNO">Por aluno</option>
                    <option value="POR_TURMA">Por turma</option>
                    <option value="POR_GRUPO">Por grupo</option>
                    <option value="POR_COREOGRAFIA">Por coreografia</option>
                    <option value="PACOTE">Pacote</option>
                  </FormInput>
                  <FormInput
                    label="Valor (R$)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.valorReais}
                    onChange={(event) =>
                      updateItem(index, { valorReais: event.target.value })
                    }
                  />
                  <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
                    {item.tipoItem}
                  </div>
                </div>
              ))}
            </div>
          </FormCard>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Salvando..." : "Salvar configurações"}
            </button>
            <Link
              href={`/escola/eventos/edicoes/${edicao.id}/calendario`}
              className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Ir para calendário
            </Link>
            <Link
              href={`/escola/eventos/edicoes/${edicao.id}/inscricoes`}
              className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Ir para inscrições
            </Link>
            <Link
              href={`/escola/eventos/edicoes/${edicao.id}/coreografias`}
              className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Ir para coreografias
            </Link>
            <Link
              href={`/escola/eventos/${edicao.id}?aba=financeiro`}
              className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Ir para financeiro
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
