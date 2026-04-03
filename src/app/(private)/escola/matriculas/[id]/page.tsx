"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatBRLFromCents } from "@/lib/formatters/money";
import { formatDateISO, formatDateTimeISO } from "@/lib/formatters/date";
import { MatriculaAcoes } from "./_components/MatriculaAcoes";
import { MatriculaItensCard, type MatriculaItemCardItem } from "@/components/matriculas/MatriculaItensCard";
import { MatriculaReativacaoCard } from "@/components/matriculas/MatriculaReativacaoCard";
import {
  MatriculaReativacaoNovoModuloModal,
  type MatriculaReativacaoNovoModuloResult,
} from "@/components/matriculas/MatriculaReativacaoNovoModuloModal";
import {
  buildReativacaoPlano,
  type MatriculaReativacaoEligibilidade,
  type ReativacaoConfigItem,
  type ReativacaoPlano,
} from "@/lib/matriculas/reativacao";

const uiBtnBase =
  "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-medium shadow-sm transition " +
  "focus:outline-none focus:ring-2 focus:ring-violet-200 disabled:opacity-60 disabled:cursor-not-allowed md:text-sm";

const uiBtnPrimary = uiBtnBase + " bg-violet-600 text-white hover:bg-violet-700";

const uiBtnSoft = uiBtnBase + " border border-violet-100 bg-white/80 text-violet-700 hover:bg-violet-50";

const uiBtnNeutral = uiBtnBase + " border border-slate-200 bg-white text-slate-700 hover:bg-slate-50";

type MatriculaDetalheResp = {
  ok: boolean;
  data?: Record<string, unknown> | null;
  matricula?: Record<string, unknown> | null;
  pessoa?: { id?: number; nome?: string | null } | null;
  responsavel_financeiro?: { id?: number; nome?: string | null } | null;
  servico?: { id?: number; titulo?: string | null } | null;
  turma?: { turma_id?: number; nome?: string | null } | null;
  unidade_execucao?: { unidade_execucao_id?: number; denominacao?: string | null; nome?: string | null } | null;
  unidade_execucao_label?: string | null;
  preco_aplicado?: { valor_centavos?: number; moeda?: string | null; created_at?: string | null } | null;
  plano_pagamento?: { id?: number; titulo?: string | null; ciclo_cobranca?: string | null; numero_parcelas?: number | null } | null;
  financeiro_resumo?: {
    entrada_total_paga_centavos: number;
    parcelas_pendentes_count: number;
    parcelas_pendentes_total_centavos: number;
    proximo_vencimento: string | null;
    ultima_atualizacao: string | null;
  } | null;
  resumo_custeio?: {
    familia_centavos: number;
    projeto_social_centavos: number;
  } | null;
  resumo_financeiro_cartao_conexao?: {
    parcelas_pendentes: number;
    proximo_vencimento: string | null;
    fatura_id_proxima: number | null;
    parcelas_proximas: Array<{
      periodo: string | null;
      vencimento: string | null;
      valor_centavos: number;
      status: string | null;
    }>;
  } | null;
  documentos_emitidos?: Array<{
    id: number;
    matricula_id: number | null;
    contrato_modelo_id: number | null;
    status_assinatura: string | null;
    created_at: string | null;
  }>;
  encerramentos?: Array<{
    id: number;
    tipo: string | null;
    motivo: string | null;
    realizado_em: string | null;
    realizado_por_user_id: string | null;
    cobrancas_canceladas_qtd: number | null;
    cobrancas_canceladas_valor_centavos: number | null;
    payload: Record<string, unknown> | null;
  }>;
  itens_matricula?: Array<{
    id: number;
    descricao: string;
    origem_tipo: string;
    status: string;
    turma_id_inicial: number | null;
    turma_inicial_nome: string | null;
    turma_atual_id: number | null;
    turma_atual_nome: string | null;
    ue_id: number | null;
    ue_label: string | null;
    valor_base_centavos: number;
    valor_liquido_centavos: number;
    data_inicio: string | null;
    data_fim: string | null;
    cancelamento_tipo: string | null;
  }>;
  itens_granulares?: Array<{
    id: number;
    descricao: string;
    origem_tipo: string;
    status: string;
    turma_id_inicial: number | null;
    turma_inicial_nome: string | null;
    turma_atual_id: number | null;
    turma_atual_nome: string | null;
    ue_id: number | null;
    ue_label: string | null;
    valor_base_centavos: number;
    valor_liquido_centavos: number;
    data_inicio: string | null;
    data_fim: string | null;
    cancelamento_tipo: string | null;
  }>;
  itens_granulares_indisponiveis?: boolean;
  diagnostico_itens?: string | null;
  resumo_legado?: {
    turma_atual?: {
      turma_id?: number | null;
      nome?: string | null;
    } | null;
    pessoa?: {
      id?: number | null;
      nome?: string | null;
    } | null;
    responsavel?: {
      id?: number | null;
      nome?: string | null;
    } | null;
    status?: string | null;
  } | null;
  turmas_vinculadas?: Array<{
    turma_id: number;
    nome: string | null;
  }>;
  error?: string;
  message?: string;
};

type CobrancaAvulsa = {
  id: number;
  pessoa_id: number;
  origem_tipo: string;
  origem_id: number;
  valor_centavos: number;
  vencimento: string;
  status: string;
  meio: string;
  motivo_excecao: string;
  observacao: string | null;
  criado_em: string | null;
  pago_em: string | null;
};

type ModoReativacao = "MESMOS_MODULOS" | "NOVOS_MODULOS";

type ReativacaoApiResp = {
  ok: boolean;
  possui_matricula_cancelada?: boolean;
  matriculas_canceladas_encontradas?: MatriculaReativacaoEligibilidade["matriculas_canceladas_encontradas"];
  acao_sugerida?: MatriculaReativacaoEligibilidade["acao_sugerida"];
  matricula_reativada?: {
    id: number;
    status: string;
    reativada_em?: string | null;
    motivo_reativacao?: string | null;
  } | null;
  error?: string;
  message?: string;
};

type ReativacaoModuloDraft = {
  id: string;
  origem: "LEGADO" | "NOVO";
  moduloOrigemId: number | null;
  moduloId: number | null;
  moduloLabel: string;
  turmaId: number | null;
  turmaLabel: string | null;
  nivel: string;
  nivelId: number | null;
  manter: boolean;
  turmaHistoricaLabel: string | null;
  liquidacaoTipo: "FAMILIA" | "BOLSA";
  valorMensalCentavos: number | null;
  origemValor: "TABELA" | "MANUAL" | null;
  dataInicioAulas: string | null;
  valorManualReais: string | null;
  cursoId: number | null;
  cursoNome: string | null;
  projetoSocialId: number | null;
  projetoSocialLabel: string | null;
  bolsaTipoId: number | null;
  bolsaTipoLabel: string | null;
};

type ReativacaoFeedback = {
  tipo: "sucesso" | "erro";
  mensagem: string;
};

function createReativacaoDraftId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `reativacao-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function extractErrorMessage(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) return record.message;
    if (typeof record.error === "string" && record.error.trim()) return record.error;
  }
  return `HTTP ${status}`;
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const text = await res.text();
  let data: unknown = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(extractErrorMessage(data, res.status));
  }
  return data as T;
}

function labelFromPessoa(pessoa?: { nome?: string | null } | null, fallbackId?: number | null): string {
  const nome = pessoa?.nome?.trim();
  if (nome) return nome;
  return fallbackId ? `Pessoa #${fallbackId}` : "-";
}

function badgeStatus(status: string | null | undefined) {
  const value = (status ?? "").toUpperCase();
  switch (value) {
    case "ATIVA":
      return { label: "ATIVA", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
    case "TRANCADA":
      return { label: "TRANCADA", className: "border-amber-200 bg-amber-50 text-amber-700" };
    case "CANCELADA":
      return { label: "CANCELADA", className: "border-rose-200 bg-rose-50 text-rose-700" };
    case "CONCLUIDA":
      return { label: "CONCLUIDA", className: "border-slate-200 bg-slate-100 text-slate-700" };
    default:
      return { label: status ?? "-", className: "border-slate-200 bg-slate-100 text-slate-600" };
  }
}

export default function MatriculaDetalhePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [data, setData] = useState<MatriculaDetalheResp | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [avulsas, setAvulsas] = useState<CobrancaAvulsa[]>([]);
  const [avulsasErro, setAvulsasErro] = useState<string | null>(null);

  const [payOpen, setPayOpen] = useState(false);
  const [payCobrancaId, setPayCobrancaId] = useState<number | null>(null);
  const [payValor, setPayValor] = useState<number>(0);
  const [payMetodo, setPayMetodo] = useState<string>("PIX");
  const [payComprovante, setPayComprovante] = useState<string>("");
  const [payError, setPayError] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [itemActionLoading, setItemActionLoading] = useState<{
    itemId: number;
    action: "trocar" | "cancelar";
  } | null>(null);
  const [itemFeedback, setItemFeedback] = useState<{
    tipo: "sucesso" | "erro";
    mensagem: string;
  } | null>(null);
  const [reativacaoContexto, setReativacaoContexto] = useState<MatriculaReativacaoEligibilidade | null>(null);
  const [reativacaoContextoLoading, setReativacaoContextoLoading] = useState(false);
  const [reativacaoExpandida, setReativacaoExpandida] = useState(false);
  const [modoReativacaoSelecionado, setModoReativacaoSelecionado] = useState<ModoReativacao | null>(null);
  const [reativando, setReativando] = useState(false);
  const [reativacaoFeedback, setReativacaoFeedback] = useState<ReativacaoFeedback | null>(null);
  const [reativacaoDrafts, setReativacaoDrafts] = useState<ReativacaoModuloDraft[]>([]);
  const [novoModuloModalOpen, setNovoModuloModalOpen] = useState(false);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        setErro(null);
        setLoading(true);
        const resp = await fetchJSON<MatriculaDetalheResp>(`/api/escola/matriculas/${id}`);
        if (ativo) setData(resp);
      } catch (e: unknown) {
        if (ativo) setErro(e instanceof Error ? e.message : "Erro ao carregar matricula.");
      } finally {
        if (ativo) setLoading(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [id, reloadTick]);

  const matricula = useMemo(() => data?.data ?? data?.matricula ?? null, [data]);
  const alunoPessoaId = useMemo(
    () => Number(matricula?.aluno_pessoa_id ?? matricula?.pessoa_id ?? NaN),
    [matricula],
  );
  const responsavelPessoaId = useMemo(
    () => Number(matricula?.responsavel_pessoa_id ?? NaN),
    [matricula],
  );
  const responsavelFinanceiroId = useMemo(
    () => Number(matricula?.responsavel_financeiro_pessoa_id ?? matricula?.responsavel_financeiro_id ?? NaN),
    [matricula],
  );
  const respId = useMemo(
    () => (Number.isFinite(responsavelFinanceiroId) ? responsavelFinanceiroId : responsavelPessoaId),
    [responsavelFinanceiroId, responsavelPessoaId],
  );
  const resumo = data?.financeiro_resumo ?? null;
  const resumoCartao = data?.resumo_financeiro_cartao_conexao ?? null;
  const documentosEmitidos = data?.documentos_emitidos ?? [];
  const encerramentos = useMemo(() => data?.encerramentos ?? [], [data]);
  const itensMatricula = ((data?.itens_granulares ?? data?.itens_matricula ?? []) as MatriculaItemCardItem[]);
  const itensGranularesIndisponiveis = Boolean(data?.itens_granulares_indisponiveis);
  const diagnosticoItens = data?.diagnostico_itens ?? null;
  const resumoLegado = data?.resumo_legado ?? null;
  const verDocs = `/escola/matriculas/${id}/documentos`;
  const emitirDocs = `/escola/matriculas/${id}/documentos?emitir=1`;
  const matriculaIdNum = useMemo(() => Number(matricula?.id ?? id ?? NaN), [matricula, id]);
  const totalMensalidadeCentavos = Number(matricula?.total_mensalidade_centavos ?? NaN);
  const totalMensalidadeLabel = Number.isFinite(totalMensalidadeCentavos)
    ? formatBRLFromCents(totalMensalidadeCentavos)
    : "-";
  const resumoCusteio = data?.resumo_custeio ?? null;
  const custeioFamiliaCentavos = Number(resumoCusteio?.familia_centavos ?? (Number.isFinite(totalMensalidadeCentavos) ? totalMensalidadeCentavos : 0));
  const custeioProjetoSocialCentavos = Number(resumoCusteio?.projeto_social_centavos ?? 0);
  const temCusteioProjetoSocial = Number.isFinite(custeioProjetoSocialCentavos) && custeioProjetoSocialCentavos > 0;
  const temCusteioFamilia = Number.isFinite(custeioFamiliaCentavos) && custeioFamiliaCentavos > 0;
  const cobrancaEntrada = useMemo(() => {
    if (!Number.isFinite(matriculaIdNum)) return null;
    const relacionadas = avulsas.filter(
      (c) => c.origem_tipo === "MATRICULA_ENTRADA" && Number(c.origem_id) === matriculaIdNum,
    );
    if (relacionadas.length === 0) return null;
    return relacionadas.find((c) => c.status === "PENDENTE") ?? relacionadas[0];
  }, [avulsas, matriculaIdNum]);

  const responsavelLinkId = useMemo(() => {
    if (Number.isFinite(responsavelPessoaId)) return responsavelPessoaId;
    if (Number.isFinite(responsavelFinanceiroId)) return responsavelFinanceiroId;
    return null;
  }, [responsavelPessoaId, responsavelFinanceiroId]);

  const statusInfo = useMemo(() => badgeStatus(String(matricula?.status ?? "")), [matricula?.status]);
  const ultimoEncerramento = useMemo(() => (encerramentos.length > 0 ? encerramentos[0] : null), [encerramentos]);
  const encerramentoTipo = String(
    matricula?.encerramento_tipo ?? ultimoEncerramento?.tipo ?? "",
  ).toUpperCase();
  const encerramentoMotivo = String(
    matricula?.encerramento_motivo ?? ultimoEncerramento?.motivo ?? "",
  ).trim();
  const encerramentoEmRaw = String(
    matricula?.encerramento_em ?? matricula?.data_encerramento ?? ultimoEncerramento?.realizado_em ?? "",
  ).trim();
  const exibirEncerramento = String(matricula?.status ?? "").toUpperCase() !== "ATIVA";
  const reativadaEmRaw = String(matricula?.reativada_em ?? "").trim();
  const motivoReativacao = String(matricula?.motivo_reativacao ?? "").trim();
  const exibirHistoricoReativacao =
    String(matricula?.status ?? "").toUpperCase() === "ATIVA" &&
    (Boolean(reativadaEmRaw) || encerramentos.length > 0);
  const matriculaCancelada = String(matricula?.status ?? "").toUpperCase() === "CANCELADA";
  const reativacaoMatriculaAtual = useMemo(
    () =>
      reativacaoContexto?.matriculas_canceladas_encontradas.find((item) => item.id === matriculaIdNum) ??
      null,
    [reativacaoContexto, matriculaIdNum],
  );
  const configuracaoReativacaoMesmosModulos = useMemo<ReativacaoConfigItem[]>(() => {
    if (!reativacaoMatriculaAtual) return [];

    return reativacaoMatriculaAtual.itens
      .map((item) => {
        const moduloId = item.modulo_id_resolvido ?? item.modulo_id;
        if (!moduloId) return null;

        return {
          modulo_id: moduloId,
          turma_id: item.turma_atual_id ?? item.turma_inicial_id ?? null,
          nivel:
            item.descricao?.trim() ||
            item.modulo_label?.trim() ||
            item.turma_atual_nome?.trim() ||
            item.turma_inicial_nome?.trim() ||
            `Modulo ${moduloId}`,
          nivel_id: null,
          liquidacao_tipo: "FAMILIA",
          valor_mensal_centavos: null,
          bolsa: null,
        } satisfies ReativacaoConfigItem;
      })
      .filter((item): item is ReativacaoConfigItem => !!item);
  }, [reativacaoMatriculaAtual]);
  const configuracaoReativacaoNovosModulos = useMemo<ReativacaoConfigItem[]>(
    () =>
      reativacaoDrafts
        .filter((item) => item.manter)
        .map((item) => {
          if (!item.moduloId) return null;
          return {
            modulo_id: item.moduloId,
            turma_id: item.turmaId,
            nivel: item.nivel.trim() || `Modulo ${item.moduloId}`,
            nivel_id: item.nivelId,
            liquidacao_tipo: item.liquidacaoTipo,
            valor_mensal_centavos: item.valorMensalCentavos,
            bolsa:
              item.liquidacaoTipo === "BOLSA" && item.projetoSocialId && item.bolsaTipoId
                ? {
                    projeto_social_id: item.projetoSocialId,
                    bolsa_tipo_id: item.bolsaTipoId,
                  }
                : null,
            curso_id: item.cursoId,
            curso_nome: item.cursoNome,
            turma_label: item.turmaLabel,
            origem_valor: item.origemValor,
            data_inicio_aulas: item.dataInicioAulas,
            valor_manual_reais: item.valorManualReais,
          } satisfies ReativacaoConfigItem;
        })
        .filter((item): item is ReativacaoConfigItem => !!item),
    [reativacaoDrafts],
  );
  const reativacaoPlanoMesmosModulos = useMemo<ReativacaoPlano | null>(() => {
    if (!reativacaoMatriculaAtual) return null;
    if (configuracaoReativacaoMesmosModulos.length === 0) return null;
    return buildReativacaoPlano({
      anteriores: reativacaoMatriculaAtual.itens,
      desejados: configuracaoReativacaoMesmosModulos.map((item) => ({
        modulo_id: item.modulo_id,
        turma_id: item.turma_id,
      })),
    });
  }, [configuracaoReativacaoMesmosModulos, reativacaoMatriculaAtual]);
  const reativacaoPlanoNovosModulos = useMemo<ReativacaoPlano | null>(() => {
    if (!reativacaoMatriculaAtual) return null;
    if (configuracaoReativacaoNovosModulos.length === 0) return null;
    return buildReativacaoPlano({
      anteriores: reativacaoMatriculaAtual.itens,
      desejados: configuracaoReativacaoNovosModulos.map((item) => ({
        modulo_id: item.modulo_id,
        turma_id: item.turma_id,
      })),
    });
  }, [configuracaoReativacaoNovosModulos, reativacaoMatriculaAtual]);
  const haModulosHistoricamenteEncerrados = useMemo(() => {
    if (!reativacaoMatriculaAtual) return false;

    const statuses = new Set(
      reativacaoMatriculaAtual.itens
        .map((item) => (item.status ?? "").trim().toUpperCase())
        .filter((value) => value.length > 0),
    );
    const cancelamentos = new Set(
      reativacaoMatriculaAtual.itens
        .map((item) => (item.cancelamento_tipo ?? "").trim().toUpperCase())
        .filter((value) => value.length > 0),
    );
    const possuiStatusEncerrado = Array.from(statuses).some((status) => status !== "ATIVO" && status !== "ATIVA");

    return (statuses.size > 1 && possuiStatusEncerrado) || cancelamentos.size > 1;
  }, [reativacaoMatriculaAtual]);

  useEffect(() => {
    let ativo = true;
    const responsavelId = Number(respId);
    if (!Number.isFinite(responsavelId)) return undefined;

    (async () => {
      try {
        setAvulsasErro(null);
        const res = await fetch(`/api/financeiro/pessoas/${responsavelId}/cobrancas-avulsas`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.ok || !Array.isArray(json?.data)) {
          if (ativo) {
            setAvulsas([]);
            setAvulsasErro("Falha ao carregar cobrancas avulsas.");
          }
          return;
        }
        if (ativo) setAvulsas(json.data as CobrancaAvulsa[]);
      } catch {
        if (ativo) {
          setAvulsas([]);
          setAvulsasErro("Falha ao carregar cobrancas avulsas.");
        }
      }
    })();

    return () => {
      ativo = false;
    };
  }, [respId]);

  useEffect(() => {
    if (!matriculaCancelada || !Number.isFinite(alunoPessoaId)) {
      setReativacaoContexto(null);
      setReativacaoContextoLoading(false);
      setReativacaoExpandida(false);
      setModoReativacaoSelecionado(null);
      setReativacaoFeedback(null);
      setReativacaoDrafts([]);
      return;
    }

    let ativo = true;
    (async () => {
      try {
        setReativacaoContextoLoading(true);
        const response = await fetchJSON<ReativacaoApiResp>(`/api/matriculas/reativar?pessoa_id=${alunoPessoaId}`);
        if (!ativo) return;

        setReativacaoContexto({
          possui_matricula_cancelada: Boolean(response.possui_matricula_cancelada),
          matriculas_canceladas_encontradas: response.matriculas_canceladas_encontradas ?? [],
          acao_sugerida: response.acao_sugerida ?? "REATIVAR",
        });
      } catch (error) {
        if (!ativo) return;
        setReativacaoContexto(null);
        setReativacaoFeedback({
          tipo: "erro",
          mensagem: error instanceof Error ? error.message : "Falha ao carregar o contexto de reativacao.",
        });
      } finally {
        if (ativo) setReativacaoContextoLoading(false);
      }
    })();

    return () => {
      ativo = false;
    };
  }, [alunoPessoaId, matriculaCancelada]);

  useEffect(() => {
    if (!reativacaoMatriculaAtual) {
      setReativacaoDrafts([]);
      return;
    }

    setReativacaoDrafts(
      reativacaoMatriculaAtual.itens
        .map((item) => {
          const moduloId = item.modulo_id_resolvido ?? item.modulo_id;
          if (!moduloId) return null;
          return {
            id: createReativacaoDraftId(),
            origem: "LEGADO" as const,
            moduloOrigemId: moduloId,
            moduloId,
            moduloLabel:
              item.modulo_label?.trim() ||
              item.descricao?.trim() ||
              `Modulo ${moduloId}`,
            turmaId: item.turma_atual_id ?? item.turma_inicial_id ?? null,
            turmaLabel: item.turma_atual_nome ?? item.turma_inicial_nome ?? null,
            nivel:
              item.descricao?.trim() ||
              item.modulo_label?.trim() ||
              item.turma_atual_nome?.trim() ||
              item.turma_inicial_nome?.trim() ||
              `Modulo ${moduloId}`,
            nivelId: null,
            manter: true,
            turmaHistoricaLabel: item.turma_atual_nome ?? item.turma_inicial_nome ?? null,
            liquidacaoTipo: "FAMILIA",
            valorMensalCentavos: null,
            origemValor: null,
            dataInicioAulas: null,
            valorManualReais: null,
            cursoId: null,
            cursoNome: item.modulo_label?.trim() || null,
            projetoSocialId: null,
            projetoSocialLabel: null,
            bolsaTipoId: null,
            bolsaTipoLabel: null,
          } satisfies ReativacaoModuloDraft;
        })
        .filter((item): item is ReativacaoModuloDraft => !!item),
    );
  }, [reativacaoMatriculaAtual]);

  function atualizarDraftReativacao(idDraft: string, patch: Partial<ReativacaoModuloDraft>) {
    setReativacaoDrafts((prev) => prev.map((item) => (item.id === idDraft ? { ...item, ...patch } : item)));
  }

  function adicionarNovoModuloReativacao(item: MatriculaReativacaoNovoModuloResult) {
    setReativacaoDrafts((prev) => [
      ...prev,
      {
        id: item.id,
        origem: "NOVO",
        moduloOrigemId: null,
        moduloId: item.modulo_id,
        moduloLabel: item.modulo_label,
        turmaId: item.turma_id,
        turmaLabel: item.turma_label,
        nivel: item.nivel,
        nivelId: item.nivel_id ?? null,
        manter: true,
        turmaHistoricaLabel: null,
        liquidacaoTipo: item.liquidacao_tipo === "BOLSA" ? "BOLSA" : "FAMILIA",
        valorMensalCentavos: item.valor_mensal_centavos ?? null,
        origemValor: item.origem_valor ?? null,
        dataInicioAulas: item.data_inicio_aulas ?? null,
        valorManualReais: item.valor_manual_reais ?? null,
        cursoId: item.curso_id ?? null,
        cursoNome: item.curso_nome ?? null,
        projetoSocialId: item.bolsa?.projeto_social_id ?? null,
        projetoSocialLabel: item.projeto_social_label ?? null,
        bolsaTipoId: item.bolsa?.bolsa_tipo_id ?? null,
        bolsaTipoLabel: item.bolsa_tipo_label ?? null,
      },
    ]);
  }

  function removerNovoModuloReativacao(idDraft: string) {
    setReativacaoDrafts((prev) => prev.filter((item) => item.id !== idDraft));
  }

  function validarReativacaoNovosModulos(): string | null {
    const draftsAtivos = reativacaoDrafts.filter((item) => item.manter);
    if (draftsAtivos.length === 0) {
      return "Mantenha ao menos um modulo no retorno ou escolha reativar com os mesmos modulos.";
    }

    for (const draft of draftsAtivos) {
      if (!Number.isInteger(draft.moduloId) || Number(draft.moduloId) <= 0) {
        return "Existe um modulo novo sem configuracao valida.";
      }
      if (!draft.nivel.trim()) {
        return "Existe um modulo sem nivel configurado.";
      }
    }

    return null;
  }

  async function confirmarReativacao(modo: ModoReativacao) {
    setErro(null);
    setReativacaoFeedback(null);

    if (!reativacaoMatriculaAtual) {
      setReativacaoFeedback({
        tipo: "erro",
        mensagem: "Nao foi possivel localizar o historico cancelado desta matricula.",
      });
      return;
    }

    const plano = modo === "MESMOS_MODULOS" ? reativacaoPlanoMesmosModulos : reativacaoPlanoNovosModulos;
    const configuracao =
      modo === "MESMOS_MODULOS" ? configuracaoReativacaoMesmosModulos : configuracaoReativacaoNovosModulos;

    if (modo === "NOVOS_MODULOS") {
      const erroValidacao = validarReativacaoNovosModulos();
      if (erroValidacao) {
        setReativacaoFeedback({ tipo: "erro", mensagem: erroValidacao });
        return;
      }
    }

    if (!plano || configuracao.length === 0) {
      setReativacaoFeedback({
        tipo: "erro",
        mensagem: "Nao foi possivel montar a configuracao final da reativacao.",
      });
      return;
    }

    if (plano.conflitos.length > 0) {
      setReativacaoFeedback({
        tipo: "erro",
        mensagem: plano.conflitos.join(" "),
      });
      return;
    }

    const responsavelId = Number.isFinite(responsavelFinanceiroId)
      ? responsavelFinanceiroId
      : Number.isFinite(respId)
        ? respId
        : null;
    const tipoMatricula = String(matricula?.tipo_matricula ?? "").toUpperCase();
    const tipoMatriculaPayload =
      tipoMatricula === "REGULAR" || tipoMatricula === "CURSO_LIVRE" || tipoMatricula === "PROJETO_ARTISTICO"
        ? tipoMatricula
        : null;
    const anoReferencia = Number(matricula?.ano_referencia ?? NaN);

    setReativando(true);
    try {
      const response = await fetch("/api/matriculas/reativar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matricula_id: reativacaoMatriculaAtual.id,
          pessoa_id: Number.isFinite(alunoPessoaId) ? alunoPessoaId : null,
          responsavel_financeiro_id: responsavelId,
          tipo_matricula: tipoMatriculaPayload,
          ano_referencia: Number.isFinite(anoReferencia) ? anoReferencia : null,
          configuracao_desejada: configuracao,
          modulos_manter: plano.modulos_manter,
          modulos_remover: plano.modulos_remover,
          modulos_adicionar: plano.modulos_adicionar,
          trocas_turma: plano.trocas_turma,
        }),
      });
      const json = (await response.json().catch(() => null)) as ReativacaoApiResp | null;

      if (!response.ok || !json?.ok) {
        throw new Error(extractErrorMessage(json, response.status));
      }

      setReativacaoFeedback({
        tipo: "sucesso",
        mensagem: "Matricula reativada com sucesso. Atualizando os dados desta pagina.",
      });
      setReativacaoExpandida(false);
      setModoReativacaoSelecionado(null);
      setReloadTick((value) => value + 1);
      router.refresh();
    } catch (error) {
      setReativacaoFeedback({
        tipo: "erro",
        mensagem: error instanceof Error ? error.message : "Falha ao reativar matricula.",
      });
    } finally {
      setReativando(false);
    }
  }

  async function registrarPagamentoAvulsa() {
    if (!payCobrancaId) return;
    setPayLoading(true);
    setPayError(null);

    try {
      const res = await fetch(
        `/api/financeiro/cobrancas-avulsas/${payCobrancaId}/registrar-recebimento`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            forma_pagamento: payMetodo,
            valor_pago_centavos: payValor,
            comprovante: payComprovante || null,
          }),
        },
      );

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        const message = json?.message || json?.details || json?.error || `erro_http_${res.status}`;
        throw new Error(message);
      }

      setPayOpen(false);
      setPayCobrancaId(null);

      const responsavelId = Number(respId);
      if (Number.isFinite(responsavelId)) {
        const refresh = await fetch(`/api/financeiro/pessoas/${responsavelId}/cobrancas-avulsas`, {
          cache: "no-store",
        });
        const json = await refresh.json().catch(() => ({}));
        if (refresh.ok && json?.ok && Array.isArray(json?.data)) {
          setAvulsas(json.data as CobrancaAvulsa[]);
          setAvulsasErro(null);
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Falha ao registrar recebimento";
      setPayError(message);
    } finally {
      setPayLoading(false);
    }
  }

  async function trocarTurmaItem(item: MatriculaItemCardItem) {
    const turmaInput = window.prompt(
      `Informe o ID da nova turma para o item #${item.id}.`,
      item.turma_atual_id ? String(item.turma_atual_id) : "",
    );
    if (!turmaInput) return;

    const novaTurmaId = Number(turmaInput);
    if (!Number.isInteger(novaTurmaId) || novaTurmaId <= 0) {
      setItemFeedback({ tipo: "erro", mensagem: "Turma informada invalida." });
      return;
    }

    setItemFeedback(null);
    setItemActionLoading({ itemId: item.id, action: "trocar" });
    try {
      const response = await fetch(`/api/matriculas/itens/${item.id}/trocar-turma`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turma_id: novaTurmaId }),
      });
      const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok || json?.ok === false) {
        throw new Error(
          String(json?.details ?? json?.message ?? json?.error ?? "Falha ao trocar turma."),
        );
      }
      setItemFeedback({ tipo: "sucesso", mensagem: `Turma do item #${item.id} atualizada.` });
      setReloadTick((value) => value + 1);
    } catch (error) {
      setItemFeedback({
        tipo: "erro",
        mensagem: error instanceof Error ? error.message : "Falha ao trocar turma.",
      });
    } finally {
      setItemActionLoading(null);
    }
  }

  async function cancelarModuloItem(item: MatriculaItemCardItem) {
    const confirmado = window.confirm(
      "Cancelar este modulo mantera a matricula principal ativa e pode gerar pendencias financeiras futuras. Deseja continuar?",
    );
    if (!confirmado) return;

    const cancelamentoTipo =
      window.prompt("Informe o tipo de cancelamento.", item.cancelamento_tipo ?? "OPERACIONAL") ?? "";
    const observacoes = window.prompt("Observacoes do cancelamento (opcional).", "") ?? "";

    setItemFeedback(null);
    setItemActionLoading({ itemId: item.id, action: "cancelar" });
    try {
      const response = await fetch(`/api/matriculas/itens/${item.id}/cancelar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cancelamento_tipo: cancelamentoTipo.trim() || "OPERACIONAL",
          observacoes: observacoes.trim() || null,
        }),
      });
      const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok || json?.ok === false) {
        throw new Error(
          String(json?.details ?? json?.message ?? json?.error ?? "Falha ao cancelar modulo."),
        );
      }
      const pendencias = Array.isArray(json?.pendencias_financeiras_detectadas)
        ? json.pendencias_financeiras_detectadas.length
        : 0;
      setItemFeedback({
        tipo: "sucesso",
        mensagem:
          pendencias > 0
            ? `Modulo cancelado com ${pendencias} pendencia(s) financeira(s) futura(s) detectada(s).`
            : `Modulo #${item.id} cancelado.`,
      });
      setReloadTick((value) => value + 1);
    } catch (error) {
      setItemFeedback({
        tipo: "erro",
        mensagem: error instanceof Error ? error.message : "Falha ao cancelar modulo.",
      });
    } finally {
      setItemActionLoading(null);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-pink-50 via-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex items-center justify-between text-[11px] text-slate-500 md:text-xs">
          <div className="flex items-center gap-1">
            <span className="font-semibold uppercase tracking-[0.18em] text-slate-400">
              Matriculas
            </span>
            <span className="text-slate-300">/</span>
            <span className="font-medium text-slate-500">Detalhes</span>
          </div>

          <button
            type="button"
            onClick={() => router.push("/escola/matriculas")}
            className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/70 px-4 py-1.5 text-[11px] font-medium text-violet-700 shadow-sm backdrop-blur hover:bg-violet-50 md:text-xs"
          >
            <span className="text-sm">&lt;</span>
            Voltar para a lista
          </button>
        </div>

        <header className="rounded-3xl border border-violet-100/70 bg-white/95 px-6 py-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
                Matricula #{id}
              </h1>
              <p className="mt-2 max-w-2xl text-[15px] text-slate-600">
                Detalhe operacional da matricula. Aqui voce visualiza o vinculo,
                o resumo financeiro e acessa rapidamente o aluno e o responsavel.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span
                  className={
                    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold shadow-sm " +
                    statusInfo.className
                  }
                >
                  {statusInfo.label}
                </span>
                {matricula?.ano_referencia != null ? (
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                    Ano {matricula.ano_referencia}
                  </span>
                ) : null}
                {matriculaCancelada ? (
                  <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                    Reativacao disponivel
                  </span>
                ) : null}
              </div>
              {matriculaCancelada ? (
                <p className="mt-3 max-w-2xl text-sm text-violet-700">
                  Esta matricula esta cancelada, mas pode ser reativada com preservacao de historico.
                </p>
              ) : null}
            </div>

            <div className="flex flex-col items-start gap-2 text-sm text-slate-600 md:items-end">
              <div>
                <span className="text-slate-400">Criada em</span>
                <div className="font-medium text-slate-700">
                  {formatDateTimeISO(String(matricula?.created_at ?? ""))}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Tipo</span>
                <div className="font-medium text-slate-700">
                  {String(matricula?.tipo_matricula ?? "-")}
                </div>
              </div>
            </div>
          </div>
        </header>

        {erro ? (
          <div className="rounded-2xl border border-rose-100 bg-rose-50/80 px-4 py-3 text-sm text-rose-700 shadow-sm md:text-base">
            {erro}
          </div>
        ) : null}

        {loading && !data ? (
          <div className="space-y-4">
            <div className="h-20 rounded-3xl bg-white/70 shadow-sm backdrop-blur animate-pulse" />
            <div className="h-40 rounded-3xl bg-white/70 shadow-sm backdrop-blur animate-pulse" />
            <div className="h-40 rounded-3xl bg-white/70 shadow-sm backdrop-blur animate-pulse" />
          </div>
        ) : null}

        {!data ? null : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-6">
              <section className="rounded-3xl border border-violet-100 bg-white/95 p-6 shadow-sm backdrop-blur-sm">
                <h2 className="text-base font-semibold text-slate-800 md:text-lg">
                  Dados principais
                </h2>

                <div className="mt-4 space-y-2 text-[15px] text-slate-700">
                  <p>
                    <span className="text-slate-500">Aluno:</span>{" "}
                    <span className="font-medium">
                      {labelFromPessoa(data.pessoa, Number.isFinite(alunoPessoaId) ? alunoPessoaId : null)}
                    </span>
                  </p>
                  <p>
                    <span className="text-slate-500">Responsavel:</span>{" "}
                    <span className="font-medium">
                      {labelFromPessoa(data.responsavel_financeiro, Number.isFinite(respId) ? respId : null)}
                    </span>
                  </p>
                  <p>
                    <span className="text-slate-500">Ano:</span>{" "}
                    <span className="font-medium">{matricula?.ano_referencia ?? "-"}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Status:</span>{" "}
                    <span className="font-medium">{String(matricula?.status ?? "-")}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Criada em:</span>{" "}
                    <span className="font-medium">{formatDateTimeISO(String(matricula?.created_at ?? ""))}</span>
                  </p>
                </div>

                {exibirEncerramento ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-700">
                    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Encerramento
                    </div>
                    <div className="mt-2 space-y-1">
                      <div>
                        <span className="text-slate-500">Tipo:</span>{" "}
                        <span className="font-medium">{encerramentoTipo || "-"}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Motivo:</span>{" "}
                        <span className="font-medium">{encerramentoMotivo || "-"}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Data:</span>{" "}
                        <span className="font-medium">
                          {encerramentoEmRaw ? formatDateTimeISO(encerramentoEmRaw) : "-"}
                        </span>
                      </div>
                      {ultimoEncerramento ? (
                        <div>
                          <span className="text-slate-500">Extrato:</span>{" "}
                          <span className="font-medium">
                            {Number(ultimoEncerramento.cobrancas_canceladas_qtd ?? 0)} cobrancas /{" "}
                            {formatBRLFromCents(Number(ultimoEncerramento.cobrancas_canceladas_valor_centavos ?? 0))}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {exibirHistoricoReativacao ? (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-950">
                    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
                      Historico de retorno
                    </div>
                    <div className="mt-2 space-y-1">
                      <div>
                        <span className="text-amber-700/80">Ultimo cancelamento:</span>{" "}
                        <span className="font-medium">{encerramentoMotivo || encerramentoTipo || "-"}</span>
                      </div>
                      <div>
                        <span className="text-amber-700/80">Reativada em:</span>{" "}
                        <span className="font-medium">
                          {reativadaEmRaw ? formatDateTimeISO(reativadaEmRaw) : "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-amber-700/80">Motivo da reativacao:</span>{" "}
                        <span className="font-medium">{motivoReativacao || "-"}</span>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2">
                  {Number.isFinite(alunoPessoaId) ? (
                    <Link
                      href={`/pessoas/${alunoPessoaId}`}
                      className="text-xs font-medium text-violet-700 hover:underline"
                    >
                      Abrir aluno
                    </Link>
                  ) : null}

                  {responsavelLinkId ? (
                    <Link
                      href={`/pessoas/${responsavelLinkId}`}
                      className="text-xs font-medium text-violet-700 hover:underline"
                    >
                      Abrir responsavel
                    </Link>
                  ) : null}
                </div>
              </section>

              <section className="rounded-3xl border border-violet-100 bg-white/95 p-6 shadow-sm backdrop-blur-sm">
                <h2 className="text-base font-semibold text-slate-800 md:text-lg">
                  Resumo financeiro
                </h2>

                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  <div>
                    Entrada paga:{" "}
                    {resumo ? formatBRLFromCents(Number(resumo.entrada_total_paga_centavos)) : "-"}
                  </div>

                  {avulsasErro ? (
                    <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                      {avulsasErro}
                    </div>
                  ) : null}

                  {cobrancaEntrada ? (
                    <div className="space-y-1">
                      <div className="font-medium">Entrada (cobranca avulsa)</div>
                      <div className="text-muted-foreground">
                        Status: {cobrancaEntrada.status} | Vencimento:{" "}
                        {cobrancaEntrada.vencimento ? formatDateISO(cobrancaEntrada.vencimento) : "-"}
                      </div>
                      <div className="text-muted-foreground">
                        Valor: {formatBRLFromCents(Number(cobrancaEntrada.valor_centavos))}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Link
                          className={uiBtnNeutral}
                          href={`/administracao/financeiro/cobrancas-avulsas/${cobrancaEntrada.id}`}
                        >
                          Descricao
                        </Link>
                        <button
                          className={uiBtnPrimary}
                          onClick={() => {
                            setPayCobrancaId(cobrancaEntrada.id);
                            setPayValor(cobrancaEntrada.valor_centavos);
                            setPayMetodo("PIX");
                            setPayComprovante("");
                            setPayOpen(true);
                          }}
                          disabled={cobrancaEntrada.status !== "PENDENTE"}
                        >
                          Registrar recebimento
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <div className="font-medium">Mensalidade consolidada</div>
                    <div className="text-muted-foreground">{totalMensalidadeLabel}</div>
                  </div>
                  {temCusteioProjetoSocial ? (
                    <div className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Projeto Social
                    </div>
                  ) : null}
                  <div className="text-muted-foreground">
                    Custeio institucional:{" "}
                    <span className="font-medium">{formatBRLFromCents(Math.max(0, Math.trunc(custeioProjetoSocialCentavos)))}</span>
                  </div>

                  {temCusteioFamilia ? (
                    <>
                      <div className="text-muted-foreground">
                        Parcela da familia via <strong>Conta Interna</strong>:{" "}
                        <span className="font-medium">{formatBRLFromCents(Math.max(0, Math.trunc(custeioFamiliaCentavos)))}</span>.
                      </div>
                      <Link
                        className="inline-block text-sm font-medium text-blue-700 hover:underline"
                        href="/admin/financeiro/credito-conexao/faturas"
                      >
                        Ver faturas da Conta Interna
                      </Link>
                    </>
                  ) : (
                    <div className="text-muted-foreground">
                      Sem cobranca recorrente para familia nesta matricula (custeio institucional integral).
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/escola/matriculas/${id}/reprocessar`}
                      className={uiBtnSoft}
                    >
                      Reprocessar matricula
                    </Link>
                  </div>

                  <div>
                    Proximo vencimento:{" "}
                    {resumoCartao?.proximo_vencimento ? formatDateISO(resumoCartao.proximo_vencimento) : "-"}
                  </div>
                  <div>
                    Ultima atualizacao:{" "}
                    {resumo?.ultima_atualizacao ? formatDateTimeISO(resumo.ultima_atualizacao) : "-"}
                  </div>
                  <div>
                    Mensalidade aplicada:{" "}
                    {data.preco_aplicado?.valor_centavos !== undefined
                      ? formatBRLFromCents(Number(data.preco_aplicado.valor_centavos))
                      : "-"}
                  </div>
                  <div>Moeda: {data.preco_aplicado?.moeda ?? "-"}</div>
                  <div>
                    Plano de pagamento:{" "}
                    {data.plano_pagamento?.titulo?.trim() ||
                      (data.plano_pagamento?.id ? `Plano #${data.plano_pagamento.id}` : "-")}
                  </div>
                  <div>
                    Ciclo: {data.plano_pagamento?.ciclo_cobranca ?? "-"}{" "}
                    {data.plano_pagamento?.numero_parcelas ? `(${data.plano_pagamento.numero_parcelas} parcelas)` : ""}
                  </div>
                </div>
              </section>
            </div>

            <div className="flex flex-col gap-6">
              <MatriculaItensCard
                items={itensMatricula}
                indisponivelTemporariamente={itensGranularesIndisponiveis}
                diagnostico={diagnosticoItens}
                resumoLegado={resumoLegado}
                onTrocarTurma={trocarTurmaItem}
                onCancelarModulo={cancelarModuloItem}
                loadingAction={itemActionLoading}
                feedback={itemFeedback}
              />

              <section className="rounded-3xl border border-violet-100 bg-white/95 p-6 shadow-sm backdrop-blur-sm">
                <h2 className="text-base font-semibold text-slate-800 md:text-lg">Documentos</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Emissao e consulta de documentos vinculados a esta matricula.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={verDocs}
                    className={uiBtnNeutral}
                  >
                    Ver documentos
                  </Link>
                  <Link
                    href={emitirDocs}
                    className={uiBtnPrimary}
                  >
                    Emitir documento
                  </Link>
                </div>
                {documentosEmitidos.length === 0 ? (
                  <div className="mt-3 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                    Nenhum documento emitido para esta matricula.
                  </div>
                ) : (
                  <div className="mt-3 grid gap-2">
                    {documentosEmitidos.map((doc) => (
                      <Link
                        key={doc.id}
                        href={`/admin/config/documentos/emitidos/${doc.id}`}
                        className="rounded-md border bg-white px-3 py-2 text-xs hover:bg-slate-50"
                      >
                        <div className="font-semibold">Documento #{doc.id}</div>
                        <div className="mt-1 text-muted-foreground">
                          Modelo: {doc.contrato_modelo_id ?? "-"} | Status: {doc.status_assinatura ?? "-"} | Criado em:{" "}
                          {doc.created_at ? formatDateTimeISO(doc.created_at) : "-"}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-violet-100 bg-white/95 p-6 shadow-sm backdrop-blur-sm">
                <h2 className="text-base font-semibold text-slate-800 md:text-lg">Acoes</h2>
                {matriculaCancelada ? (
                  <div className="mt-3 space-y-3">
                    <p className="text-sm text-violet-700">
                      Esta matricula esta cancelada, mas pode ser reativada com preservacao de historico.
                    </p>

                    {reativacaoFeedback ? (
                      <div
                        className={`rounded-xl border px-3 py-2 text-sm ${
                          reativacaoFeedback.tipo === "sucesso"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-rose-200 bg-rose-50 text-rose-700"
                        }`}
                      >
                        {reativacaoFeedback.mensagem}
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={uiBtnPrimary}
                        onClick={() => {
                          setReativacaoExpandida((value) => !value);
                          setModoReativacaoSelecionado(null);
                          setReativacaoFeedback(null);
                        }}
                        disabled={reativando || reativacaoContextoLoading || !reativacaoContexto?.possui_matricula_cancelada}
                      >
                        {reativacaoContextoLoading ? "Carregando..." : "Reativar matricula"}
                      </button>
                    </div>
                  </div>
                ) : Number.isFinite(matriculaIdNum) ? (
                  <MatriculaAcoes matriculaId={matriculaIdNum} />
                ) : null}
              </section>

              {matriculaCancelada && reativacaoExpandida && reativacaoContexto?.possui_matricula_cancelada && reativacaoMatriculaAtual ? (
                <MatriculaReativacaoCard
                  contexto={reativacaoContexto}
                  matriculaSelecionadaId={reativacaoMatriculaAtual.id}
                  expanded={reativacaoExpandida}
                  modoSelecionado={modoReativacaoSelecionado}
                  processandoReativacao={reativando}
                  criandoNovaMesmoAssim={false}
                  planoMesmosModulos={reativacaoPlanoMesmosModulos}
                  planoNovosModulos={reativacaoPlanoNovosModulos}
                  haModulosEncerrados={haModulosHistoricamenteEncerrados}
                  showTriggerButtons={false}
                  novosModulosConfigurador={
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm font-medium text-sky-950">Reativacao com reconfiguracao</div>
                        <div className="mt-1 text-sm text-sky-900">
                          Ajuste os modulos de retorno desta matricula. Mantenha ou remova os modulos antigos e use o modal para adicionar novos modulos com o fluxo real de matricula complementar.
                        </div>
                      </div>

                      <div className="space-y-3">
                        {reativacaoDrafts
                          .filter((draft) => draft.origem === "LEGADO")
                          .map((draft) => (
                            <div key={draft.id} className="rounded-2xl border border-sky-100 bg-white px-4 py-4">
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div>
                                  <div className="text-sm font-semibold text-slate-900">{draft.moduloLabel}</div>
                                  <div className="mt-1 text-sm text-slate-600">
                                    Turma anterior: {draft.turmaHistoricaLabel ?? "-"}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    Nivel: {draft.nivel || "Nao informado"}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                                    draft.manter
                                      ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  }`}
                                  onClick={() => atualizarDraftReativacao(draft.id, { manter: !draft.manter })}
                                >
                                  {draft.manter ? "Remover modulo do retorno" : "Manter modulo"}
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>

                      <div className="space-y-3">
                        <div className="text-sm font-medium text-slate-900">Novos modulos do retorno</div>
                        {reativacaoDrafts.filter((draft) => draft.origem === "NOVO").length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-sky-200 bg-white/70 px-4 py-4 text-sm text-slate-600">
                            Nenhum novo modulo foi adicionado ainda.
                          </div>
                        ) : (
                          reativacaoDrafts
                            .filter((draft) => draft.origem === "NOVO")
                            .map((draft) => (
                              <div key={draft.id} className="rounded-2xl border border-sky-100 bg-white px-4 py-4">
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                  <div className="space-y-1 text-sm text-slate-700">
                                    <div className="font-semibold text-slate-900">{draft.moduloLabel}</div>
                                    <div>Turma: {draft.turmaLabel ?? "-"}</div>
                                    <div>
                                      Tipo: {draft.liquidacaoTipo === "BOLSA" ? "Projeto / custeio institucional" : "Pago"}
                                    </div>
                                    <div>Origem do valor: {draft.origemValor === "MANUAL" ? "Manual" : "Tabela"}</div>
                                    <div>
                                      Valor aplicado:{" "}
                                      {draft.origemValor === "MANUAL"
                                        ? formatBRLFromCents(Number(draft.valorMensalCentavos ?? 0))
                                        : "Tabela do sistema"}
                                    </div>
                                    <div>Inicio das aulas: {draft.dataInicioAulas ? formatDateISO(draft.dataInicioAulas) : "-"}</div>
                                  </div>

                                  <button
                                    type="button"
                                    className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                                    onClick={() => removerNovoModuloReativacao(draft.id)}
                                  >
                                    Remover
                                  </button>
                                </div>
                              </div>
                            ))
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={uiBtnSoft}
                          onClick={() => setNovoModuloModalOpen(true)}
                        >
                          Adicionar novo modulo
                        </button>
                      </div>
                    </div>
                  }
                  onSelecionarMatricula={() => undefined}
                  onExpandedChange={(open) => {
                    setReativacaoExpandida(open);
                    if (!open) {
                      setModoReativacaoSelecionado(null);
                    }
                  }}
                  onSelecionarModo={(modo) => {
                    setModoReativacaoSelecionado(modo);
                    setReativacaoFeedback(null);
                  }}
                  onCriarNovaMesmoAssim={() => undefined}
                  onConfirmarReativacao={(modo) => void confirmarReativacao(modo)}
                />
              ) : null}
            </div>
          </div>
        )}

      <MatriculaReativacaoNovoModuloModal
        open={novoModuloModalOpen}
        anoReferencia={Number.isFinite(Number(matricula?.ano_referencia ?? NaN)) ? Number(matricula?.ano_referencia) : null}
        onOpenChange={setNovoModuloModalOpen}
        onConfirm={(item) => {
          adicionarNovoModuloReativacao(item);
          setReativacaoFeedback(null);
        }}
      />

      {payOpen && payCobrancaId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow">
            <div className="font-semibold">Registrar recebimento</div>
            <div className="mt-1 text-sm text-muted-foreground">Cobranca #{payCobrancaId}</div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="text-sm">
                Forma de pagamento
                <select
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={payMetodo}
                  onChange={(e) => setPayMetodo(e.target.value)}
                >
                  <option value="PIX">PIX</option>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="CARTAO_CREDITO_AVISTA">Cartao de credito (a vista)</option>
                  <option value="CARTAO_CREDITO_PARCELADO">Cartao de credito (parcelado)</option>
                  <option value="CARTAO_CONEXAO_ALUNO">Conta Interna (Aluno)</option>
                  <option value="CARTAO_CONEXAO_COLABORADOR">Conta Interna (Colaborador)</option>
                  <option value="CREDITO_INTERNO_ALUNO">Credito interno (Aluno)</option>
                  <option value="CREDIARIO_COLABORADOR">Crediario (Colaborador)</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </label>

              <label className="text-sm">
                Valor pago (centavos)
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  type="number"
                  value={payValor}
                  onChange={(e) => setPayValor(Number(e.target.value))}
                />
                <div className="mt-1 text-xs text-muted-foreground">
                  Padrao: {formatBRLFromCents(payValor)}.
                </div>
              </label>

              <label className="text-sm md:col-span-2">
                Comprovante (opcional)
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={payComprovante}
                  onChange={(e) => setPayComprovante(e.target.value)}
                />
              </label>
            </div>

            {payError ? (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                {payError}
              </div>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border px-4 py-2 hover:bg-slate-50"
                onClick={() => {
                  setPayOpen(false);
                  setPayCobrancaId(null);
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:opacity-90"
                onClick={registrarPagamentoAvulsa}
                disabled={payLoading}
              >
                {payLoading ? "Processando..." : "Confirmar pagamento"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
}
