"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PessoaSearchBox, { PessoaSearchItem } from "@/components/PessoaSearchBox";
import { ProjetoSocialAutocomplete } from "@/components/bolsas/ProjetoSocialAutocomplete";
import { MatriculaReativacaoCard } from "@/components/matriculas/MatriculaReativacaoCard";
import { SectionCard, pillAccent, pillNeutral } from "@/components/ui/conexao-cards";
import ToolbarRow from "@/components/layout/ToolbarRow";
import {
  buildReativacaoPlano,
  type MatriculaReativacaoEligibilidade,
  type ReativacaoConfigItem,
  type ReativacaoPlano,
} from "@/lib/matriculas/reativacao";

type TipoMatricula = "REGULAR" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";
type ContextoTipo = "PERIODO_LETIVO" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";

type ContextoMatricula = {
  id: number;
  tipo: ContextoTipo;
  titulo: string;
  ano_referencia: number | null;
  status: string;
};

type PeriodoLetivo = {
  id: number;
  codigo: string;
  titulo: string;
  ano_referencia: number;
  data_inicio: string;
  data_fim: string;
  inicio_letivo_janeiro: string | null;
  ativo: boolean;
};

type MatriculaCarrinhoItem = {
  id: string;
  curso_id: number | null;
  servico_id: number | null;
  unidade_execucao_id: number | null;
  turma_id: number | null;
  nivel_id: number | null;
  nivel_texto: string;
  valor_mensal_reais: string;
  liquidacao_tipo: LiquidacaoExecucao;
  bolsa_projeto_busca: string;
  bolsa_projeto_social_id: number | null;
  bolsa_tipo_id: number | null;
};

type CursoOpcao = {
  id: number;
  nome: string;
  ativo: boolean | null;
  ordem: number | null;
};

type TurmaOpcao = {
  turma_id: number;
  nome: string | null;
  curso: string | null;
  nivel: string | null;
  turno: string | null;
  status: string | null;
  periodo_letivo_id: number | null;
  ano_referencia: number | null;
  unidade_execucao_id: number | null;
  servico_id: number | null;
};

type CursosResp = {
  cursos: CursoOpcao[];
};

type TurmasResp = {
  turmas: TurmaOpcao[];
};

type LiquidacaoExecucao = "FAMILIA" | "BOLSA";
type ModoReativacao = "MESMOS_MODULOS" | "NOVOS_MODULOS";

type MatriculaResp = {
  ok: boolean;
  matricula_existente?: boolean;
  matricula_id?: number;
  matricula?: {
    id: number;
    status?: string | null;
    tipo_matricula?: string | null;
    ano_referencia?: number | null;
    vinculo_id?: number | null;
    turma_nome?: string | null;
    data_matricula?: string | null;
    data_inicio_vinculo?: string | null;
  } | null;
  possui_matricula_cancelada?: boolean;
  matriculas_canceladas_encontradas?: MatriculaReativacaoEligibilidade["matriculas_canceladas_encontradas"];
  acao_sugerida?: MatriculaReativacaoEligibilidade["acao_sugerida"];
  bolsa_aplicacoes?: Array<{
    turma_id: number;
    projeto_social_beneficiario_id: number;
    bolsa_concessao_id: number;
    projeto_social_id: number;
    bolsa_tipo_id: number;
  }>;
  message?: string;
  error?: string;
};

type MatriculaExistenteHint = {
  id: number;
  status: string | null;
  tipo_matricula: string | null;
  ano_referencia: number | null;
  vinculo_id: number | null;
  turma_nome: string | null;
  data_matricula: string | null;
  data_inicio_vinculo: string | null;
};

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
  modulos_ativos_finais?: Array<{
    modulo_id: number;
    item_id: number;
    turma_id: number | null;
  }>;
  modulos_encerrados?: Array<{
    modulo_id: number;
    item_id: number | null;
  }>;
  trocas_turma_executadas?: Array<{
    modulo_id: number;
    turma_origem_id: number | null;
    turma_destino_id: number;
  }>;
  error?: string;
  message?: string;
};

type BolsaTipoOpcao = {
  id: number;
  projeto_social_id: number;
  nome: string;
  ativo: boolean;
};

type NivelOpcao = {
  id: number;
  nome: string;
  ordem?: number | null;
};

function labelTipo(tipo: TipoMatricula): string {
  if (tipo === "REGULAR") return "Curso regular";
  if (tipo === "CURSO_LIVRE") return "Curso livre";
  return "Projeto artístico";
}

function labelPeriodo(periodo: PeriodoLetivo): string {
  const ano = periodo.ano_referencia ? ` (${periodo.ano_referencia})` : "";
  return `${periodo.titulo}${ano}`;
}

function labelTurma(turma: TurmaOpcao): string {
  const parts = [turma.nome, turma.nivel, turma.turno].filter((part) => part && part.trim());
  if (parts.length > 0) return parts.join(" - ");
  return turma.turma_id ? `Turma #${turma.turma_id}` : "Turma";
}

function createCarrinhoItem(): MatriculaCarrinhoItem {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id,
    curso_id: null,
    servico_id: null,
    unidade_execucao_id: null,
    turma_id: null,
    nivel_id: null,
    nivel_texto: "",
    valor_mensal_reais: "",
    liquidacao_tipo: "FAMILIA",
    bolsa_projeto_busca: "Movimento Conexao Danca",
    bolsa_projeto_social_id: null,
    bolsa_tipo_id: null,
  };
}

function extractErrorMessage(data: unknown, status: number | string): string {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) return record.message;
    if (typeof record.error === "string" && record.error.trim()) return record.error;
  }
  return typeof status === "string" ? status : `HTTP ${status}`;
}

function formatCurrency(cents?: number | null): string {
  if (typeof cents !== "number" || Number.isNaN(cents)) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function parseMoneyToCentavos(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const num = Number(normalized);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num * 100);
}

type ProrataResumo = {
  competenciaInicial: string | null;
  competenciaMensalidade: string | null;
  prorataCentavos: number | null;
  temProrata: boolean;
};

function parseDateParts(value: string | null): { year: number; month: number; day: number } | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function competenciaFromParts(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function calcularResumoPrimeiraCobranca(
  totalCentavos: number,
  dataInicio: string | null,
  dataMatricula: string | null
): ProrataResumo {
  if (!Number.isFinite(totalCentavos) || totalCentavos <= 0) {
    return { competenciaInicial: null, competenciaMensalidade: null, prorataCentavos: null, temProrata: false };
  }

  const fallback = parseDateParts(new Date().toISOString().slice(0, 10));
  const base = parseDateParts(dataInicio) ?? parseDateParts(dataMatricula) ?? fallback;
  if (!base) {
    return { competenciaInicial: null, competenciaMensalidade: null, prorataCentavos: null, temProrata: false };
  }

  const { year, month, day } = base;
  const competenciaInicial = competenciaFromParts(year, month);
  const cutoffDia = 12;
  const inicioLetivoJaneiro = 12;

  if (month === 1) {
    if (day <= inicioLetivoJaneiro) {
      return {
        competenciaInicial,
        competenciaMensalidade: competenciaInicial,
        prorataCentavos: 0,
        temProrata: false,
      };
    }
    const baseDiasJaneiro = 31 - inicioLetivoJaneiro + 1;
    const diasRestantes = Math.max(0, 31 - day + 1);
    const valor = Math.round((totalCentavos * diasRestantes) / baseDiasJaneiro);
    const mesPrimeira = Math.min(12, month + 1);
    return {
      competenciaInicial,
      competenciaMensalidade: competenciaFromParts(year, mesPrimeira),
      prorataCentavos: Math.max(0, valor),
      temProrata: true,
    };
  }

  if (day <= cutoffDia) {
    return {
      competenciaInicial,
      competenciaMensalidade: competenciaInicial,
      prorataCentavos: 0,
      temProrata: false,
    };
  }

  const ultimoDia = lastDayOfMonth(year, month);
  const diasRestantes = Math.max(0, ultimoDia - day + 1);
  const valor = Math.round((totalCentavos * diasRestantes) / 30);
  const mesPrimeira = Math.min(12, month + 1);
  return {
    competenciaInicial,
    competenciaMensalidade: competenciaFromParts(year, mesPrimeira),
    prorataCentavos: Math.max(0, valor),
    temProrata: true,
  };
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
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

export default function NovaMatriculaPage() {
  const router = useRouter();

  const [aluno, setAluno] = useState<PessoaSearchItem | null>(null);
  const [responsavel, setResponsavel] = useState<PessoaSearchItem | null>(null);
  const [tipo, setTipo] = useState<TipoMatricula>("REGULAR");
  const [, setContextos] = useState<ContextoMatricula[]>([]);
  const [contextoId, setContextoId] = useState<number | null>(null);
  const [contextosErro, setContextosErro] = useState<string | null>(null);
  const [contextosLoading, setContextosLoading] = useState(false);
  const [periodos, setPeriodos] = useState<PeriodoLetivo[]>([]);
  const [periodoLetivoId, setPeriodoLetivoId] = useState<number | null>(null);
  const [periodosErro, setPeriodosErro] = useState<string | null>(null);
  const [periodosLoading, setPeriodosLoading] = useState(false);
  const [cursos, setCursos] = useState<CursoOpcao[]>([]);
  const [itensCarrinho, setItensCarrinho] = useState<MatriculaCarrinhoItem[]>(() => [createCarrinhoItem()]);
  const [turmasPorCurso, setTurmasPorCurso] = useState<Record<string, TurmaOpcao[]>>({});
  const [niveisPorTurma, setNiveisPorTurma] = useState<Record<number, NivelOpcao[]>>({});
  const [niveisLoading, setNiveisLoading] = useState<Record<number, boolean>>({});
  const [niveisErro, setNiveisErro] = useState<Record<number, string | null>>({});
  const [anoReferencia, setAnoReferencia] = useState<number>(() => new Date().getFullYear());
  const [dataMatricula, setDataMatricula] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [dataInicioVinculo, setDataInicioVinculo] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [politicaModo, setPoliticaModo] = useState<"PADRAO" | "ADIAR_PARA_VENCIMENTO">("PADRAO");
  const [bolsaTiposPorItem, setBolsaTiposPorItem] = useState<Record<string, BolsaTipoOpcao[]>>({});
  const [bolsaTiposLoadingPorItem, setBolsaTiposLoadingPorItem] = useState<Record<string, boolean>>({});
  const [bolsaTiposErroPorItem, setBolsaTiposErroPorItem] = useState<Record<string, string | null>>({});
  const [motivoExcecao, setMotivoExcecao] = useState<string>("");
  const [observacoes, setObservacoes] = useState<string>("");
  const [modoManualValores, setModoManualValores] = useState(false);
  const niveisRequestedRef = useRef<Set<number>>(new Set());
  const niveisInFlightRef = useRef<Set<number>>(new Set());

  const [cursosErro, setCursosErro] = useState<string | null>(null);
  const [turmasErro, setTurmasErro] = useState<string | null>(null);
  const [carregandoCursos, setCarregandoCursos] = useState(false);
  const [carregandoTurmas, setCarregandoTurmas] = useState(false);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [matriculaExistenteHint, setMatriculaExistenteHint] =
    useState<MatriculaExistenteHint | null>(null);
  const [reativacaoContexto, setReativacaoContexto] =
    useState<MatriculaReativacaoEligibilidade | null>(null);
  const [matriculaCanceladaSelecionadaId, setMatriculaCanceladaSelecionadaId] = useState<number | null>(null);
  const [reativacaoExpandida, setReativacaoExpandida] = useState(false);
  const [modoReativacaoSelecionado, setModoReativacaoSelecionado] = useState<ModoReativacao | null>(null);
  const [reativando, setReativando] = useState(false);
  const [criandoNovaMesmoAssim, setCriandoNovaMesmoAssim] = useState(false);

  const principalItem = itensCarrinho[0] ?? null;
  const turmaPrincipalId = principalItem?.turma_id ?? null;
  const turmasDisponiveis = useMemo(() => Object.values(turmasPorCurso).flat(), [turmasPorCurso]);
  const turmaSelecionada = useMemo(
    () => turmasDisponiveis.find((t) => t.turma_id === turmaPrincipalId) ?? null,
    [turmasDisponiveis, turmaPrincipalId],
  );
  const cursosById = useMemo(() => new Map(cursos.map((curso) => [curso.id, curso])), [cursos]);
  const periodoSelecionado = useMemo(
    () => periodos.find((p) => p.id === periodoLetivoId) ?? null,
    [periodos, periodoLetivoId],
  );
  const itensResumo = useMemo(
    () =>
      itensCarrinho
        .map((item, idx) => {
          if (!item.curso_id || !item.turma_id) return null;
          const curso = cursosById.get(item.curso_id) ?? null;
          const turma = turmasDisponiveis.find((t) => t.turma_id === item.turma_id) ?? null;
          const turmaLabel = turma ? labelTurma(turma) : `Turma #${item.turma_id}`;
          const prefixo = idx === 0 ? "Principal" : `Item ${idx + 1}`;
          return `${prefixo}: ${curso?.nome ?? `Curso #${item.curso_id}`} - ${turmaLabel}`;
        })
        .filter((item): item is string => !!item),
    [itensCarrinho, cursosById, turmasDisponiveis],
  );
  const totalMensalidadeCentavos = useMemo(
    () =>
      modoManualValores
        ? itensCarrinho.reduce((acc, item) => {
            const centavos = parseMoneyToCentavos(item.valor_mensal_reais);
            return centavos === null ? acc : acc + centavos;
          }, 0)
        : 0,
    [itensCarrinho, modoManualValores],
  );
  const totalMensalidadeBRL = useMemo(
    () =>
      (totalMensalidadeCentavos / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
    [totalMensalidadeCentavos],
  );
  const resumoPrimeiraCobranca = useMemo(
    () =>
      calcularResumoPrimeiraCobranca(
        totalMensalidadeCentavos,
        dataInicioVinculo || null,
        dataMatricula || null,
      ),
    [totalMensalidadeCentavos, dataInicioVinculo, dataMatricula],
  );
  const competenciaInicialLabel = resumoPrimeiraCobranca.competenciaInicial ?? "-";
  const competenciaMensalidadeLabel = resumoPrimeiraCobranca.competenciaMensalidade ?? "-";
  const prorataLabel = resumoPrimeiraCobranca.competenciaInicial
    ? resumoPrimeiraCobranca.temProrata
      ? formatCurrency(resumoPrimeiraCobranca.prorataCentavos ?? 0)
      : "Sem pro-rata"
    : "-";
  const execucoesResumo = useMemo(
    () =>
      itensCarrinho.map((item, idx) => {
        const turma = item.turma_id
          ? turmasDisponiveis.find((t) => t.turma_id === item.turma_id) ?? null
          : null;
        const turmaLabel = turma ? labelTurma(turma) : item.turma_id ? `Turma #${item.turma_id}` : "-";
        const niveisTurma = item.turma_id ? niveisPorTurma[item.turma_id] ?? [] : [];
        const nivelNome =
          item.nivel_id && niveisTurma.length > 0
            ? niveisTurma.find((nivel) => nivel.id === item.nivel_id)?.nome ?? item.nivel_texto
            : item.nivel_texto;
        const valorCentavos = parseMoneyToCentavos(item.valor_mensal_reais);
        return {
          id: item.id,
          idx,
          turmaLabel,
          nivel: nivelNome.trim() || "-",
          valor: valorCentavos === null ? "-" : formatCurrency(valorCentavos),
          liquidacao_tipo: item.liquidacao_tipo,
          bolsa_projeto_social_id: item.bolsa_projeto_social_id,
          bolsa_tipo_id: item.bolsa_tipo_id,
        };
      }),
    [itensCarrinho, turmasDisponiveis, niveisPorTurma],
  );
  const execucoesBolsaOk = useMemo(
    () =>
      itensCarrinho.every((item) => {
        if (item.liquidacao_tipo !== "BOLSA") return true;
        return Number.isFinite(item.bolsa_projeto_social_id ?? NaN) && Number.isFinite(item.bolsa_tipo_id ?? NaN);
      }),
    [itensCarrinho],
  );
  const temExecucaoBolsa = useMemo(
    () => itensCarrinho.some((item) => item.liquidacao_tipo === "BOLSA"),
    [itensCarrinho],
  );
  const bolsaModoOk = !temExecucaoBolsa || modoManualValores;
  const configuracaoReativacao = useMemo(
    () =>
      itensCarrinho
        .map((item) => {
          if (!item.servico_id || !item.turma_id) return null;
          const niveisTurma = item.turma_id ? niveisPorTurma[item.turma_id] ?? [] : [];
          const nivelNome =
            item.nivel_id && niveisTurma.length > 0
              ? niveisTurma.find((nivel) => nivel.id === item.nivel_id)?.nome ?? item.nivel_texto
              : item.nivel_texto;
          const valorCentavos = modoManualValores ? parseMoneyToCentavos(item.valor_mensal_reais) : null;
          return {
            modulo_id: item.servico_id,
            turma_id: item.turma_id,
            nivel: nivelNome.trim() || "Nivel nao informado",
            nivel_id: item.nivel_id ?? null,
            liquidacao_tipo: item.liquidacao_tipo,
            valor_mensal_centavos: valorCentavos,
            bolsa:
              item.liquidacao_tipo === "BOLSA" &&
              Number.isFinite(item.bolsa_projeto_social_id ?? NaN) &&
              Number.isFinite(item.bolsa_tipo_id ?? NaN)
                ? {
                    projeto_social_id: Number(item.bolsa_projeto_social_id),
                    bolsa_tipo_id: Number(item.bolsa_tipo_id),
                  }
                : null,
          } satisfies ReativacaoConfigItem;
        })
        .filter((item): item is ReativacaoConfigItem => !!item),
    [itensCarrinho, modoManualValores, niveisPorTurma],
  );
  const matriculaCanceladaSelecionada = useMemo(
    () =>
      reativacaoContexto?.matriculas_canceladas_encontradas.find((item) => item.id === matriculaCanceladaSelecionadaId) ??
      reativacaoContexto?.matriculas_canceladas_encontradas[0] ??
      null,
    [reativacaoContexto, matriculaCanceladaSelecionadaId],
  );
  const configuracaoReativacaoMesmosModulos = useMemo<ReativacaoConfigItem[]>(() => {
    if (!matriculaCanceladaSelecionada) return [];

    return matriculaCanceladaSelecionada.itens
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
  }, [matriculaCanceladaSelecionada]);
  const reativacaoPlanoNovosModulos = useMemo<ReativacaoPlano | null>(() => {
    if (!matriculaCanceladaSelecionada) return null;
    if (configuracaoReativacao.length === 0) return null;
    return buildReativacaoPlano({
      anteriores: matriculaCanceladaSelecionada.itens,
      desejados: configuracaoReativacao.map((item) => ({
        modulo_id: item.modulo_id,
        turma_id: item.turma_id,
      })),
    });
  }, [configuracaoReativacao, matriculaCanceladaSelecionada]);
  const reativacaoPlanoMesmosModulos = useMemo<ReativacaoPlano | null>(() => {
    if (!matriculaCanceladaSelecionada) return null;
    if (configuracaoReativacaoMesmosModulos.length === 0) return null;
    return buildReativacaoPlano({
      anteriores: matriculaCanceladaSelecionada.itens,
      desejados: configuracaoReativacaoMesmosModulos.map((item) => ({
        modulo_id: item.modulo_id,
        turma_id: item.turma_id,
      })),
    });
  }, [configuracaoReativacaoMesmosModulos, matriculaCanceladaSelecionada]);
  const haModulosHistoricamenteEncerrados = useMemo(() => {
    if (!matriculaCanceladaSelecionada) return false;

    const statuses = new Set(
      matriculaCanceladaSelecionada.itens
        .map((item) => (item.status ?? "").trim().toUpperCase())
        .filter((value) => value.length > 0),
    );
    const cancelamentos = new Set(
      matriculaCanceladaSelecionada.itens
        .map((item) => (item.cancelamento_tipo ?? "").trim().toUpperCase())
        .filter((value) => value.length > 0),
    );
    const possuiStatusEncerrado = Array.from(statuses).some((status) => status !== "ATIVO" && status !== "ATIVA");

    return (statuses.size > 1 && possuiStatusEncerrado) || cancelamentos.size > 1;
  }, [matriculaCanceladaSelecionada]);

  const contextoObrigatorio = tipo === "REGULAR";
  const itensCompletosOk =
    itensCarrinho.length > 0 &&
    itensCarrinho.every((item) => {
      const okTurma = typeof item.turma_id === "number";
      const okCurso = typeof item.curso_id === "number";
      if (modoManualValores) return okTurma && okCurso;
      return okTurma && typeof item.servico_id === "number" && typeof item.unidade_execucao_id === "number";
    });
  const valoresOk =
    !modoManualValores ||
    (itensCarrinho.length > 0 &&
      itensCarrinho.every((item) => parseMoneyToCentavos(item.valor_mensal_reais) !== null));
  const niveisOk =
    itensCarrinho.length > 0 &&
    itensCarrinho.every((item) => {
      if (!item.turma_id) return false;
      const niveis = niveisPorTurma[item.turma_id];
      if (!niveis || niveis.length === 0) return false;
      return Number.isFinite(item.nivel_id ?? NaN);
    });
  const niveisCarregando = Object.values(niveisLoading).some(Boolean);
  const principalCompleto = (() => {
    if (!principalItem) return false;
    const okTurma = typeof principalItem.turma_id === "number";
    const okCurso = typeof principalItem.curso_id === "number";
    if (modoManualValores) return okTurma && okCurso;
    return (
      okTurma &&
      typeof principalItem.servico_id === "number" &&
      typeof principalItem.unidade_execucao_id === "number"
    );
  })();

  const podeSalvar =
    !!aluno &&
    !!responsavel &&
    (!contextoObrigatorio || Number.isFinite(contextoId ?? NaN)) &&
    itensCompletosOk &&
    principalCompleto &&
    valoresOk &&
    niveisOk &&
    !niveisCarregando &&
    (tipo !== "REGULAR" || !!anoReferencia) &&
    bolsaModoOk &&
    execucoesBolsaOk &&
    (politicaModo !== "ADIAR_PARA_VENCIMENTO" || motivoExcecao.trim().length > 0);
  const debugFlags = {
    aluno: !!aluno,
    responsavel: !!responsavel,
    contextoOk: !contextoObrigatorio || Number.isFinite(contextoId ?? NaN),
    itensCompletosOk,
    principalCompleto,
    niveisOk,
    valoresOk: !modoManualValores || valoresOk,
    niveisCarregando: !niveisCarregando,
    anoOk: tipo !== "REGULAR" || !!anoReferencia,
    bolsaModoOk,
    bolsaOk: execucoesBolsaOk,
    excecaoOk: politicaModo !== "ADIAR_PARA_VENCIMENTO" || motivoExcecao.trim().length > 0,
  };

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        setCursosErro(null);
        setCarregandoCursos(true);
        const data = await fetchJSON<CursosResp>("/api/academico/cursos");
        if (!ativo) return;
        setCursos(data.cursos ?? []);
      } catch (e: unknown) {
        if (ativo) setCursosErro(e instanceof Error ? e.message : "Falha ao carregar cursos.");
      } finally {
        if (ativo) setCarregandoCursos(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    setItensCarrinho([createCarrinhoItem()]);
    setTurmasPorCurso({});
    setTurmasErro(null);
    setCarregandoTurmas(false);
    setContextoId(null);
    setContextos([]);
    setPeriodoLetivoId(null);
    setPeriodos([]);
  }, [tipo]);

  useEffect(() => {
    if (!aluno?.id) {
      setReativacaoContexto(null);
      setMatriculaCanceladaSelecionadaId(null);
      setReativacaoExpandida(false);
      setModoReativacaoSelecionado(null);
      setCriandoNovaMesmoAssim(false);
      return;
    }

    let ativo = true;
    (async () => {
      try {
        const data = await fetchJSON<ReativacaoApiResp>(`/api/matriculas/reativar?pessoa_id=${aluno.id}`);
        if (!ativo) return;

        const contexto: MatriculaReativacaoEligibilidade = {
          possui_matricula_cancelada: Boolean(data.possui_matricula_cancelada),
          matriculas_canceladas_encontradas: data.matriculas_canceladas_encontradas ?? [],
          acao_sugerida: data.acao_sugerida ?? "CRIAR_NOVA",
        };

        setReativacaoContexto(contexto);
        setMatriculaCanceladaSelecionadaId(contexto.matriculas_canceladas_encontradas[0]?.id ?? null);
        setReativacaoExpandida(false);
        setModoReativacaoSelecionado(null);
        setCriandoNovaMesmoAssim(false);
      } catch (error) {
        if (!ativo) return;
        console.error("[nova-matricula] falha ao consultar reativacao:", error);
        setReativacaoContexto(null);
        setMatriculaCanceladaSelecionadaId(null);
        setReativacaoExpandida(false);
        setModoReativacaoSelecionado(null);
      }
    })();

    return () => {
      ativo = false;
    };
  }, [aluno?.id]);

  useEffect(() => {
    if (!contextoObrigatorio) {
      setContextos([]);
      setContextoId(null);
      setContextosErro(null);
      setContextosLoading(false);
      return;
    }

    let ativo = true;
    (async () => {
      try {
        setContextosErro(null);
        setContextosLoading(true);
        const params = new URLSearchParams({ tipo: "PERIODO_LETIVO", status: "ATIVO" });
        if (Number.isFinite(anoReferencia)) {
          params.set("ano", String(anoReferencia));
        }
        const data = await fetchJSON<{ ok: boolean; data?: ContextoMatricula[]; error?: string }>(
          `/api/matriculas/contextos?${params.toString()}`,
        );
        if (!ativo) return;
        const lista = data.data ?? [];
        setContextos(lista);

        const contextoAtual = Number(contextoId ?? NaN);
        const contextoExiste = lista.some((c) => c.id === contextoAtual);
        const matchAno = Number.isFinite(anoReferencia)
          ? lista.find((c) => c.ano_referencia === anoReferencia) ?? null
          : null;
        const padrao = matchAno ?? lista[0] ?? null;
        if (!contextoExiste) {
          setContextoId(padrao ? padrao.id : null);
        }
      } catch (e: unknown) {
        if (!ativo) return;
        setContextosErro(e instanceof Error ? e.message : "Falha ao carregar contextos.");
        setContextos([]);
      } finally {
        if (ativo) setContextosLoading(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [contextoObrigatorio, anoReferencia, contextoId]);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        setPeriodosErro(null);
        setPeriodosLoading(true);
        const res = await fetch("/api/academico/periodos-letivos");
        const json = (await res.json()) as { items?: PeriodoLetivo[]; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Falha ao carregar periodos letivos.");
        if (!ativo) return;
        const lista = Array.isArray(json.items) ? json.items : [];
        setPeriodos(lista);
        if (!periodoLetivoId) {
          const matchAno = Number.isFinite(anoReferencia)
            ? lista.find((p) => p.ano_referencia === anoReferencia) ?? null
            : null;
          const padrao = matchAno ?? lista[0] ?? null;
          setPeriodoLetivoId(padrao ? padrao.id : null);
          if (padrao?.ano_referencia) setAnoReferencia(padrao.ano_referencia);
        }
      } catch (e: unknown) {
        if (!ativo) return;
        setPeriodosErro(e instanceof Error ? e.message : "Falha ao carregar periodos letivos.");
        setPeriodos([]);
      } finally {
        if (ativo) setPeriodosLoading(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [anoReferencia, periodoLetivoId]);

  useEffect(() => {
    if (!contextoObrigatorio) return;
    setItensCarrinho((prev) =>
      prev.map((item) => ({
        ...item,
        servico_id: null,
        unidade_execucao_id: null,
        turma_id: null,
      })),
    );
    setTurmasPorCurso({});
    setTurmasErro(null);
    setCarregandoTurmas(false);
  }, [contextoObrigatorio, contextoId]);

  useEffect(() => {
    if (!periodoLetivoId) return;
    setItensCarrinho((prev) =>
      prev.map((item) => ({
        ...item,
        servico_id: null,
        unidade_execucao_id: null,
        turma_id: null,
      })),
    );
    setTurmasPorCurso({});
    setTurmasErro(null);
    setCarregandoTurmas(false);
  }, [periodoLetivoId]);

  const cursosSelecionados = useMemo(() => {
    const lista = itensCarrinho
      .map((item) => item.curso_id)
      .filter((id): id is number => Number.isFinite(id ?? NaN));
    return Array.from(new Set(lista));
  }, [itensCarrinho]);

  useEffect(() => {
    if ((contextoObrigatorio && !contextoId) || !periodoLetivoId || cursosSelecionados.length === 0) {
      setTurmasErro(null);
      setCarregandoTurmas(false);
      return;
    }

    const pendentes = cursosSelecionados.filter((cursoId) => {
      const key = `${periodoLetivoId}:${cursoId}`;
      return !turmasPorCurso[key];
    });
    if (pendentes.length === 0) return;

    let ativo = true;
    (async () => {
      try {
        setTurmasErro(null);
        setCarregandoTurmas(true);
        for (const cursoId of pendentes) {
          const curso = cursosById.get(cursoId);
          const cursoNome = curso?.nome?.trim();
          if (!cursoNome) continue;
          const url = new URL("/api/academico/turmas", window.location.origin);
          url.searchParams.set("periodo_letivo_id", String(periodoLetivoId));
          url.searchParams.set("curso", cursoNome);
          const data = await fetchJSON<TurmasResp>(url.toString());
          if (!ativo) return;
          const key = `${periodoLetivoId}:${cursoId}`;
          setTurmasPorCurso((prev) => ({ ...prev, [key]: data.turmas ?? [] }));
        }
      } catch (e: unknown) {
        if (ativo) setTurmasErro(e instanceof Error ? e.message : "Falha ao carregar turmas.");
      } finally {
        if (ativo) setCarregandoTurmas(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [contextoObrigatorio, contextoId, periodoLetivoId, cursosSelecionados, turmasPorCurso, cursosById]);

  useEffect(() => {
    const turmaIds = Array.from(
      new Set(
        itensCarrinho
          .map((item) => item.turma_id)
          .filter((id): id is number => Number.isFinite(id ?? NaN)),
      ),
    );

    if (turmaIds.length === 0) return;

    const controller = new AbortController();
    let ativo = true;

    (async () => {
      for (const turmaId of turmaIds) {
        if (Object.prototype.hasOwnProperty.call(niveisPorTurma, turmaId)) continue;
        if (niveisRequestedRef.current.has(turmaId)) continue;
        if (niveisInFlightRef.current.has(turmaId)) continue;

        niveisRequestedRef.current.add(turmaId);
        niveisInFlightRef.current.add(turmaId);

        setNiveisLoading((prev) => ({ ...prev, [turmaId]: true }));
        setNiveisErro((prev) => ({ ...prev, [turmaId]: null }));

        try {
          const params = new URLSearchParams();
          params.set("turma_id", String(turmaId));
          params.set("turmaId", String(turmaId));

          const resp = await fetchJSON<{
            ok?: boolean;
            niveis?: NivelOpcao[];
            items?: NivelOpcao[];
            data?: NivelOpcao[];
            error?: string;
          }>(`/api/academico/turmas/niveis?${params.toString()}`, { signal: controller.signal });

          if (!ativo) return;

          const lista = resp.niveis ?? resp.items ?? resp.data ?? [];
          setNiveisPorTurma((prev) => ({ ...prev, [turmaId]: Array.isArray(lista) ? lista : [] }));

          if (resp.ok === false && resp.error) {
            setNiveisErro((prev) => ({ ...prev, [turmaId]: resp.error }));
            continue;
          }

          if (!Array.isArray(lista) || lista.length === 0) {
            setNiveisErro((prev) => ({
              ...prev,
              [turmaId]: "Turma sem níveis vinculados. Configure em Acadêmico > Turmas.",
            }));
          }
        } catch (e: unknown) {
          if (!ativo) return;

          if (e instanceof Error && (e.name === "AbortError" || e.message.toLowerCase().includes("aborted"))) {
            niveisRequestedRef.current.delete(turmaId);
            continue;
          }

          setNiveisPorTurma((prev) => ({ ...prev, [turmaId]: [] }));
          setNiveisErro((prev) => ({
            ...prev,
            [turmaId]: e instanceof Error ? e.message : "Falha ao carregar níveis desta turma.",
          }));
        } finally {
          niveisInFlightRef.current.delete(turmaId);
          if (ativo) setNiveisLoading((prev) => ({ ...prev, [turmaId]: false }));
        }
      }
    })();

    return () => {
      ativo = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itensCarrinho]);

  useEffect(() => {
    if (tipo === "REGULAR" && turmaSelecionada?.ano_referencia) {
      setAnoReferencia(turmaSelecionada.ano_referencia);
    }
  }, [tipo, turmaSelecionada]);

  async function carregarTiposBolsaItem(itemId: string, projetoId: number | null) {
    if (!projetoId) {
      setBolsaTiposPorItem((prev) => ({ ...prev, [itemId]: [] }));
      setBolsaTiposErroPorItem((prev) => ({ ...prev, [itemId]: null }));
      return;
    }

    setBolsaTiposLoadingPorItem((prev) => ({ ...prev, [itemId]: true }));
    setBolsaTiposErroPorItem((prev) => ({ ...prev, [itemId]: null }));
    try {
      const resp = await fetchJSON<{ ok: boolean; data?: BolsaTipoOpcao[] }>(
        `/api/bolsas/tipos?projeto_social_id=${projetoId}&ativo=true`,
      );
      const lista = Array.isArray(resp.data) ? resp.data : [];
      setBolsaTiposPorItem((prev) => ({ ...prev, [itemId]: lista }));
      if (lista.length === 0) {
        setBolsaTiposErroPorItem((prev) => ({
          ...prev,
          [itemId]: "Nenhum tipo de bolsa ativo para este projeto.",
        }));
      }
    } catch (e: unknown) {
      setBolsaTiposPorItem((prev) => ({ ...prev, [itemId]: [] }));
      setBolsaTiposErroPorItem((prev) => ({
        ...prev,
        [itemId]: e instanceof Error ? e.message : "Falha ao carregar tipos de bolsa.",
      }));
    } finally {
      setBolsaTiposLoadingPorItem((prev) => ({ ...prev, [itemId]: false }));
    }
  }

  function addItemCarrinho() {
    setItensCarrinho((prev) => [...prev, createCarrinhoItem()]);
  }

  function removeItemCarrinho(id: string) {
    setItensCarrinho((prev) => (prev.length <= 1 ? prev : prev.filter((item) => item.id !== id)));
    setBolsaTiposPorItem((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setBolsaTiposLoadingPorItem((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setBolsaTiposErroPorItem((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function updateItemCarrinho(id: string, patch: Partial<MatriculaCarrinhoItem>) {
    setItensCarrinho((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function buildSubmissionPayloads() {
    const itensPayload = itensCarrinho
      .map((item) => ({
        servico_id: item.servico_id,
        unidade_execucao_id: item.unidade_execucao_id,
        turma_id: item.turma_id,
      }))
      .filter(
        (item): item is { servico_id: number; unidade_execucao_id: number; turma_id: number } =>
          typeof item.servico_id === "number" &&
          typeof item.unidade_execucao_id === "number" &&
          typeof item.turma_id === "number",
      );

    const unidadeExecucaoIds = Array.from(new Set(itensPayload.map((item) => item.unidade_execucao_id)));
    const execucoesPayload = modoManualValores
      ? configuracaoReativacao
          .filter(
            (item): item is ReativacaoConfigItem & { turma_id: number; valor_mensal_centavos: number } =>
              typeof item.turma_id === "number" && typeof item.valor_mensal_centavos === "number",
          )
          .map((item) => ({
            turma_id: item.turma_id,
            nivel: item.nivel,
            nivel_id: item.nivel_id ?? null,
            valor_mensal_centavos: item.valor_mensal_centavos,
            liquidacao_tipo: item.liquidacao_tipo ?? "FAMILIA",
            bolsa: item.bolsa ?? null,
          }))
      : [];

    const vinculosIdsManual = Array.from(new Set(execucoesPayload.map((execucao) => execucao.turma_id)));
    const vinculoPrincipalIdManual = vinculosIdsManual[0] ?? null;
    const vinculosIdsAuto = Array.from(new Set(itensPayload.map((item) => item.turma_id)));
    const vinculoPrincipalIdAuto = vinculosIdsAuto[0] ?? null;
    const vinculosIdsFinal = modoManualValores ? vinculosIdsManual : vinculosIdsAuto;
    const vinculoPrincipalIdFinal = modoManualValores ? vinculoPrincipalIdManual : vinculoPrincipalIdAuto;

    if (!vinculoPrincipalIdFinal) {
      throw new Error("Turma (item 1) nao encontrada para concluir a matricula.");
    }
    if (modoManualValores && execucoesPayload.length !== itensCarrinho.length) {
      throw new Error("Execucoes invalidas para concluir a matricula.");
    }

    const execucoesBolsa = execucoesPayload.filter((execucao) => execucao.liquidacao_tipo === "BOLSA");
    const metodoLiquidacaoGlobal =
      execucoesPayload.length > 0 && execucoesBolsa.length === execucoesPayload.length
        ? "CREDITO_BOLSA"
        : "CARTAO_CONEXAO";

    const payload: Record<string, unknown> = {
      pessoa_id: aluno?.id,
      responsavel_financeiro_id: responsavel?.id,
      tipo_matricula: tipo,
      metodo_liquidacao: metodoLiquidacaoGlobal,
      vinculo_id: vinculoPrincipalIdFinal,
      ...(vinculosIdsFinal.length > 1 ? { vinculos_ids: vinculosIdsFinal } : {}),
      itens: itensPayload,
      ...(unidadeExecucaoIds.length > 0 ? { unidade_execucao_ids: unidadeExecucaoIds } : {}),
      data_matricula: dataMatricula,
      data_inicio_vinculo: dataInicioVinculo,
      observacoes: observacoes.trim() || null,
    };

    if (modoManualValores) {
      payload.execucoes = execucoesPayload;
      payload.total_mensalidade_centavos = totalMensalidadeCentavos;
    }

    if (tipo === "REGULAR") {
      payload.ano_referencia = anoReferencia;
    }

    if (politicaModo === "ADIAR_PARA_VENCIMENTO") {
      payload.politica_primeiro_pagamento = {
        modo: "ADIAR_PARA_VENCIMENTO",
        motivo_excecao: motivoExcecao.trim(),
      };
    } else {
      payload.politica_primeiro_pagamento = { modo: "PADRAO" };
    }

    return {
      itensPayload,
      execucoesPayload,
      payload,
      configuracaoReativacao,
    };
  }

  function validarFormularioAntesDeSalvar() {
    if (!aluno || !responsavel) {
      return "Selecione aluno e responsavel financeiro.";
    }

    if (contextoObrigatorio && !contextoId) {
      return "Selecione o contexto da matricula.";
    }

    if (!principalCompleto) {
      return "Selecione o curso e a turma principal.";
    }

    if (!itensCompletosOk) {
      return "Complete todos os cursos e turmas antes de continuar.";
    }

    if (niveisCarregando) {
      return "Aguarde o carregamento dos niveis.";
    }

    if (!niveisOk) {
      return "Informe o nivel em todas as execucoes.";
    }

    if (!valoresOk) {
      return "Informe o valor mensal de todas as execucoes.";
    }

    if (temExecucaoBolsa && !modoManualValores) {
      return 'Para usar bolsa por execução, ative "Inserir valores manualmente".';
    }

    const execucoesBolsaInvalidas = itensCarrinho.filter(
      (item) => item.liquidacao_tipo === "BOLSA" && (!item.bolsa_projeto_social_id || !item.bolsa_tipo_id),
    );
    if (execucoesBolsaInvalidas.length > 0) {
      return "Selecione projeto social e tipo de bolsa em todas as execuções com liquidação por bolsa.";
    }

    if (tipo === "REGULAR" && !anoReferencia) {
      return "Ano referencia obrigatorio para turma regular.";
    }

    if (politicaModo === "ADIAR_PARA_VENCIMENTO" && !motivoExcecao.trim()) {
      return "Informe o motivo da excecao para adiar o primeiro pagamento.";
    }

    return null;
  }

  async function onSubmit() {
    setErro(null);
    setMatriculaExistenteHint(null);
    const erroValidacao = validarFormularioAntesDeSalvar();
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }

    if (reativacaoContexto?.possui_matricula_cancelada && !criandoNovaMesmoAssim) {
      setErro("Existe matricula cancelada anterior. Escolha reativar a matricula anterior ou confirme a criacao de uma nova.");
      return;
    }

    setLoading(true);
    try {
      const { payload } = buildSubmissionPayloads();
      payload.pessoa_id = aluno.id;
      payload.responsavel_financeiro_id = responsavel.id;
      payload.ignorar_matricula_cancelada = criandoNovaMesmoAssim;

      const response = await fetch("/api/matriculas/novo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => null)) as MatriculaResp | null;

      if (!response.ok || !data) {
        if (response.status === 409 && data?.matricula_existente) {
          const matriculaExistenteId = Number(
            data.matricula?.id ?? data.matricula_id ?? 0,
          );

          if (matriculaExistenteId > 0) {
            setMatriculaExistenteHint({
              id: matriculaExistenteId,
              status: data.matricula?.status ?? null,
              tipo_matricula: data.matricula?.tipo_matricula ?? null,
              ano_referencia: data.matricula?.ano_referencia ?? null,
              vinculo_id: data.matricula?.vinculo_id ?? null,
              turma_nome: data.matricula?.turma_nome ?? null,
              data_matricula: data.matricula?.data_matricula ?? null,
              data_inicio_vinculo: data.matricula?.data_inicio_vinculo ?? null,
            });
          }

          setErro(
            extractErrorMessage(
              data,
              "A pessoa ja possui matricula ativa. Abra a matricula existente.",
            ),
          );
          return;
        }

        if (response.status === 409 && data?.possui_matricula_cancelada) {
          const contexto: MatriculaReativacaoEligibilidade = {
            possui_matricula_cancelada: true,
            matriculas_canceladas_encontradas: data.matriculas_canceladas_encontradas ?? [],
            acao_sugerida: data.acao_sugerida ?? "REATIVAR",
          };
          setReativacaoContexto(contexto);
          setMatriculaCanceladaSelecionadaId(contexto.matriculas_canceladas_encontradas[0]?.id ?? null);
          setReativacaoExpandida(true);
          setModoReativacaoSelecionado(null);
          setCriandoNovaMesmoAssim(false);
          setErro(
            extractErrorMessage(
              data,
              "Existe matricula cancelada anterior. Reative a matricula anterior ou confirme a criacao de uma nova.",
            ),
          );
          return;
        }

        throw new Error(extractErrorMessage(data, response.status));
      }

      const id = data.matricula?.id;
      if (!id) {
        throw new Error("Resposta invalida: matricula sem id.");
      }

      router.push(`/escola/matriculas/${id}/liquidacao`);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Falha ao criar matricula.");
    } finally {
      setLoading(false);
    }
  }

  function validarContextoMinimoReativacao() {
    if (!aluno || !responsavel) {
      return "Selecione aluno e responsavel financeiro.";
    }

    if (!matriculaCanceladaSelecionada) {
      return "Selecione a matricula cancelada a ser reativada.";
    }

    return null;
  }

  function buildPayloadReativacao(modo: ModoReativacao) {
    if (!aluno || !responsavel || !matriculaCanceladaSelecionada) {
      throw new Error("Nao foi possivel montar o contexto de reativacao.");
    }

    const usandoMesmosModulos = modo === "MESMOS_MODULOS";
    const plano = usandoMesmosModulos ? reativacaoPlanoMesmosModulos : reativacaoPlanoNovosModulos;
    const configuracao = usandoMesmosModulos ? configuracaoReativacaoMesmosModulos : configuracaoReativacao;
    const tipoHistorico = matriculaCanceladaSelecionada.tipo_matricula;
    const tipoReativacao =
      usandoMesmosModulos &&
      (tipoHistorico === "REGULAR" || tipoHistorico === "CURSO_LIVRE" || tipoHistorico === "PROJETO_ARTISTICO")
        ? tipoHistorico
        : tipo;

    if (!plano) {
      throw new Error("Nao foi possivel montar o diff de reativacao.");
    }

    return {
      matricula_id: matriculaCanceladaSelecionada.id,
      pessoa_id: aluno.id,
      responsavel_financeiro_id: responsavel.id,
      tipo_matricula: tipoReativacao,
      ano_referencia:
        tipoReativacao === "REGULAR"
          ? usandoMesmosModulos
            ? matriculaCanceladaSelecionada.ano_referencia ?? anoReferencia
            : anoReferencia
          : null,
      data_matricula: dataMatricula,
      data_inicio_vinculo: dataInicioVinculo,
      observacoes: observacoes.trim() || null,
      motivo_reativacao: observacoes.trim() || null,
      total_mensalidade_centavos: usandoMesmosModulos ? null : modoManualValores ? totalMensalidadeCentavos : null,
      configuracao_desejada: configuracao,
      modulos_manter: plano.modulos_manter,
      modulos_remover: plano.modulos_remover,
      modulos_adicionar: plano.modulos_adicionar,
      trocas_turma: plano.trocas_turma,
    };
  }

  async function onConfirmarReativacao(modo: ModoReativacao) {
    setErro(null);
    const erroValidacao =
      modo === "NOVOS_MODULOS" ? validarFormularioAntesDeSalvar() : validarContextoMinimoReativacao();
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }

    const plano = modo === "MESMOS_MODULOS" ? reativacaoPlanoMesmosModulos : reativacaoPlanoNovosModulos;

    if (!aluno || !responsavel || !matriculaCanceladaSelecionada || !plano) {
      setErro("Nao foi possivel montar o contexto de reativacao.");
      return;
    }

    if (plano.conflitos.length > 0) {
      setErro(plano.conflitos.join(" "));
      return;
    }

    setReativando(true);
    try {
      const payload = buildPayloadReativacao(modo);

      const response = await fetch("/api/matriculas/reativar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as ReativacaoApiResp | null;

      if (!response.ok || !data?.ok) {
        throw new Error(extractErrorMessage(data, response.status));
      }

      const id = data.matricula_reativada?.id ?? matriculaCanceladaSelecionada.id;
      setCriandoNovaMesmoAssim(false);
      setReativacaoExpandida(false);
      setModoReativacaoSelecionado(null);
      router.push(`/escola/matriculas/${id}`);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha ao reativar matricula.");
    } finally {
      setReativando(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-pink-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="rounded-3xl border border-violet-100/70 bg-white/95 px-6 py-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Escola</p>
              <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">Nova matrícula (Escola)</h1>
              <p className="mt-1 text-sm text-slate-600">
                Operacional: selecione aluno, responsável financeiro, período/turmas e datas. A API aplicará as regras
                oficiais de cobrança e primeiro pagamento.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setModoManualValores((prev) => !prev)} className={modoManualValores ? pillAccent : pillNeutral}>
                {modoManualValores ? "Valores manuais: ATIVO" : "Inserir valores manualmente"}
              </button>

              <Link href="/escola/matriculas" className={pillNeutral}>
                Voltar para matrículas
              </Link>
            </div>
          </div>
        </header>

        {erro ? (
          <SectionCard
            title="Falha de validação"
            subtitle="Status"
            description="Verifique os campos obrigatórios antes de continuar."
            className="border-rose-200 bg-rose-50/70"
          >
            <div className="text-sm text-rose-700">{erro}</div>
          </SectionCard>
        ) : null}

        {reativacaoContexto?.possui_matricula_cancelada ? (
          <MatriculaReativacaoCard
            contexto={reativacaoContexto}
            matriculaSelecionadaId={matriculaCanceladaSelecionada?.id ?? matriculaCanceladaSelecionadaId}
            expanded={reativacaoExpandida}
            modoSelecionado={modoReativacaoSelecionado}
            processandoReativacao={reativando}
            criandoNovaMesmoAssim={criandoNovaMesmoAssim}
            planoMesmosModulos={reativacaoPlanoMesmosModulos}
            planoNovosModulos={reativacaoPlanoNovosModulos}
            haModulosEncerrados={haModulosHistoricamenteEncerrados}
            onSelecionarMatricula={(matriculaId) => setMatriculaCanceladaSelecionadaId(matriculaId)}
            onExpandedChange={(open) => {
              setReativacaoExpandida(open);
              if (open) {
                setCriandoNovaMesmoAssim(false);
                setErro(null);
                return;
              }
              setModoReativacaoSelecionado(null);
            }}
            onSelecionarModo={(modo) => {
              setModoReativacaoSelecionado(modo);
              setCriandoNovaMesmoAssim(false);
              setErro(null);
            }}
            onCriarNovaMesmoAssim={() => {
              setCriandoNovaMesmoAssim(true);
              setReativacaoExpandida(false);
              setModoReativacaoSelecionado(null);
              setErro(null);
            }}
            onConfirmarReativacao={(modo) => void onConfirmarReativacao(modo)}
          />
        ) : null}

        {matriculaExistenteHint ? (
          <SectionCard
            title="Matricula ativa existente"
            subtitle="Reaproveitar cadastro"
            description="O sistema bloqueou a duplicidade e orienta continuar pela matricula ja ativa."
            className="border-amber-200 bg-amber-50/80"
          >
            <div className="flex flex-col gap-4 text-sm text-amber-900 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <div>
                  Matricula #{matriculaExistenteHint.id}
                  {matriculaExistenteHint.status ? ` • ${matriculaExistenteHint.status}` : ""}
                </div>
                <div>
                  {matriculaExistenteHint.turma_nome
                    ? `Turma atual: ${matriculaExistenteHint.turma_nome}`
                    : "Use a matricula existente para adicionar/remover modulos ou trocar turma."}
                </div>
                {matriculaExistenteHint.ano_referencia ? (
                  <div>Ano de referencia: {matriculaExistenteHint.ano_referencia}</div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/escola/matriculas/${matriculaExistenteHint.id}`}
                  className="inline-flex items-center rounded-xl border border-amber-300 bg-white px-4 py-2 font-medium text-amber-900 transition hover:bg-amber-100"
                >
                  Abrir matricula existente
                </Link>
              </div>
            </div>
          </SectionCard>
        ) : null}

        <div className="flex flex-col gap-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Aluno e responsavel financeiro">
            <div className="space-y-4">
              <PessoaSearchBox
                label="Aluno"
                valueId={aluno?.id ?? null}
                onChange={(p) => {
                  setAluno(p);
                  if (!responsavel) setResponsavel(p);
                }}
                placeholder="Buscar aluno (2+ caracteres)"
              />
              <PessoaSearchBox
                label="Responsavel financeiro"
                valueId={responsavel?.id ?? null}
                onChange={(p) => setResponsavel(p)}
                placeholder="Buscar responsavel (2+ caracteres)"
                disabled={!aluno}
              />
              {aluno && responsavel?.id !== aluno.id ? (
                <button
                  type="button"
                  className="text-xs text-indigo-600 hover:underline"
                  onClick={() => setResponsavel(aluno)}
                >
                  Usar aluno como responsavel financeiro
                </button>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="Dados da matricula">
            <div className="grid gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de matricula</label>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoMatricula)}
                >
                  <option value="REGULAR">Curso regular</option>
                  <option value="CURSO_LIVRE">Curso livre</option>
                  <option value="PROJETO_ARTISTICO">Projeto artístico</option>
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data da matricula</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
                    value={dataMatricula}
                    onChange={(e) => setDataMatricula(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Inicio do vinculo (aulas)</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
                    value={dataInicioVinculo}
                    onChange={(e) => setDataInicioVinculo(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Ano referência {tipo === "REGULAR" ? "(obrigatório)" : "(opcional)"}
                </label>
                <input
                  type="number"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  value={anoReferencia}
                  onChange={(e) => setAnoReferencia(Number(e.target.value))}
                  min={2000}
                  max={2100}
                />
              </div>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Contexto, cursos e turmas">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Periodo letivo</label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
                value={periodoLetivoId ?? ""}
                onChange={(e) => {
                  const nextId = e.target.value ? Number(e.target.value) : null;
                  setPeriodoLetivoId(nextId);
                  const encontrado = periodos.find((p) => p.id === nextId) ?? null;
                  if (encontrado?.ano_referencia) setAnoReferencia(encontrado.ano_referencia);
                }}
                disabled={periodosLoading}
              >
                <option value="">Selecione...</option>
                {periodos.map((periodo) => (
                  <option key={periodo.id} value={periodo.id}>
                    {labelPeriodo(periodo)}
                  </option>
                ))}
              </select>
              {periodosLoading ? <p className="text-xs text-muted-foreground">Carregando periodos...</p> : null}
              {periodosErro ? <p className="text-xs text-red-600">{periodosErro}</p> : null}
              {!periodosLoading && periodos.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum periodo ativo encontrado.</p>
              ) : null}
              {contextoObrigatorio ? (
                <>
                  {contextosErro ? <p className="text-xs text-red-600">{contextosErro}</p> : null}
                  {!contextosLoading && !contextoId ? (
                    <p className="text-xs text-red-600">
                      Contexto da matricula nao encontrado para o periodo selecionado.
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-xs text-slate-500">Contexto de matricula definido pelo curso/projeto selecionado.</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">Cursos e turmas (multiplos)</div>
                  <div className="text-xs text-slate-500">
                    Adicione um curso por vez, selecione a turma e defina a liquidação de cada execução. O primeiro item vira a unidade principal.
                  </div>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-slate-300"
                  onClick={addItemCarrinho}
                >
                  + Adicionar curso
                </button>
              </div>

              {contextoObrigatorio && !contextoId ? (
                <p className="text-xs text-muted-foreground">
                  Selecione o periodo letivo com contexto ativo para habilitar cursos e turmas.
                </p>
              ) : null}

              {itensCarrinho.map((item, idx) => {
                const turmaKey =
                  item.curso_id && periodoLetivoId ? `${periodoLetivoId}:${item.curso_id}` : null;
                const turmas = turmaKey ? turmasPorCurso[turmaKey] ?? [] : [];
                const niveisTurma = item.turma_id ? niveisPorTurma[item.turma_id] ?? [] : [];
                const niveisLoadingItem = item.turma_id ? niveisLoading[item.turma_id] : false;
                const niveisErroItem = item.turma_id ? niveisErro[item.turma_id] : null;
                const valorMensalCentavos = parseMoneyToCentavos(item.valor_mensal_reais);
                const valorMensalInvalido =
                  item.valor_mensal_reais.trim() !== "" && valorMensalCentavos === null;
                return (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{`Curso / Turma (${idx + 1})`}</div>
                        <div className="text-xs text-slate-500">O item 1 vira referencia do resumo (tecnico).</div>
                      </div>
                      <button
                        type="button"
                        className="text-xs text-slate-500 hover:text-slate-700"
                        onClick={() => removeItemCarrinho(item.id)}
                        disabled={itensCarrinho.length <= 1}
                      >
                        Remover
                      </button>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Curso</label>
                        <select
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
                          value={item.curso_id ? String(item.curso_id) : ""}
                          onChange={(e) => {
                            const nextCursoId = e.target.value ? Number(e.target.value) : null;
                            updateItemCarrinho(item.id, {
                              curso_id: nextCursoId,
                              servico_id: null,
                              unidade_execucao_id: null,
                              turma_id: null,
                              nivel_id: null,
                              nivel_texto: "",
                              valor_mensal_reais: "",
                            });
                          }}
                          disabled={carregandoCursos || (contextoObrigatorio && !contextoId)}
                        >
                          <option value="">Selecione...</option>
                          {cursos.map((curso) => (
                            <option key={curso.id} value={curso.id}>
                              {curso.nome}
                            </option>
                          ))}
                        </select>
                        {carregandoCursos ? <p className="text-xs text-muted-foreground">Carregando cursos...</p> : null}
                        {cursosErro ? <p className="text-xs text-red-600">{cursosErro}</p> : null}
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">Turma (Unidade de execucao)</label>
                        <select
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
                          value={item.turma_id ?? ""}
                          onChange={(e) => {
                            const nextId = e.target.value ? Number(e.target.value) : null;
                            const selected =
                              nextId && Number.isFinite(nextId)
                                ? turmas.find((turma) => turma.turma_id === nextId) ?? null
                                : null;
                            updateItemCarrinho(item.id, {
                              turma_id: nextId,
                              unidade_execucao_id: selected?.unidade_execucao_id ?? null,
                              servico_id: selected?.servico_id ?? null,
                              nivel_id: null,
                              nivel_texto: "",
                              valor_mensal_reais: "",
                            });
                          }}
                          disabled={
                            !item.curso_id ||
                            !periodoLetivoId ||
                            (contextoObrigatorio && !contextoId) ||
                            carregandoTurmas
                          }
                        >
                          <option value="">
                            {item.curso_id ? "Selecione a turma" : "Selecione o curso primeiro"}
                          </option>
                          {turmas
                            .filter((turma) => Number.isFinite(turma.turma_id ?? NaN))
                            .map((turma) => (
                              <option key={String(turma.turma_id)} value={turma.turma_id}>
                                {labelTurma(turma)}
                              </option>
                            ))}
                        </select>
                        {!carregandoTurmas && item.curso_id && periodoLetivoId && turmas.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            Nenhuma turma encontrada para este curso no periodo letivo selecionado.
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Nivel nesta execucao</label>
                        {!item.turma_id ? (
                          <input
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
                            value=""
                            placeholder="Selecione a turma primeiro"
                            disabled
                          />
                        ) : niveisLoadingItem ? (
                          <p className="text-xs text-muted-foreground">Carregando niveis...</p>
                        ) : niveisErroItem ? (
                          <p className="text-xs text-red-600">{niveisErroItem}</p>
                        ) : niveisTurma.length > 0 ? (
                          <select
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
                            value={item.nivel_id ?? ""}
                            onChange={(e) => {
                              const nextId = e.target.value ? Number(e.target.value) : null;
                              const nome =
                                nextId && Number.isFinite(nextId)
                                  ? niveisTurma.find((nivel) => nivel.id === nextId)?.nome ?? ""
                                  : "";
                              updateItemCarrinho(item.id, { nivel_id: nextId, nivel_texto: nome });
                            }}
                          >
                            <option value="">Selecione...</option>
                            {niveisTurma.map((nivel) => (
                              <option key={nivel.id} value={nivel.id}>
                                {nivel.nome}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-xs text-red-600">
                            {niveisErroItem || "Turma sem níveis vinculados. Configure em Acadêmico > Turmas."}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        {modoManualValores ? (
                          <>
                            <label className="text-sm font-medium">Valor mensal</label>
                            <input
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
                              value={item.valor_mensal_reais}
                              onChange={(e) => updateItemCarrinho(item.id, { valor_mensal_reais: e.target.value })}
                              inputMode="decimal"
                              placeholder="Ex.: 220,00"
                            />
                            {valorMensalInvalido ? (
                              <p className="text-xs text-red-600">Valor mensal invalido.</p>
                            ) : (
                              <p className="text-xs text-muted-foreground">Informe o valor em reais.</p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Ative &quot;Inserir valores manualmente&quot; para informar o valor mensal.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Liquidação desta execução</label>
                        <select
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
                          value={item.liquidacao_tipo}
                          onChange={(e) =>
                            updateItemCarrinho(item.id, {
                              liquidacao_tipo: e.target.value as LiquidacaoExecucao,
                              bolsa_tipo_id: e.target.value === "BOLSA" ? item.bolsa_tipo_id : null,
                              bolsa_projeto_social_id:
                                e.target.value === "BOLSA" ? item.bolsa_projeto_social_id : null,
                            })
                          }
                        >
                          <option value="FAMILIA">Família (padrão)</option>
                          <option value="BOLSA">Bolsa (Projeto Social)</option>
                        </select>
                      </div>
                    </div>

                    {item.liquidacao_tipo === "BOLSA" ? (
                      <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <ProjetoSocialAutocomplete
                            label="Projeto social"
                            valueId={item.bolsa_projeto_social_id}
                            valueLabel={item.bolsa_projeto_busca}
                            initialQuery={item.bolsa_projeto_busca}
                            onChange={(projeto) => {
                              updateItemCarrinho(item.id, {
                                bolsa_projeto_busca: projeto?.nome ?? "",
                                bolsa_projeto_social_id: projeto?.id ?? null,
                                bolsa_tipo_id: null,
                              });
                              void carregarTiposBolsaItem(item.id, projeto?.id ?? null);
                            }}
                          />

                          <div className="space-y-1 md:col-span-2">
                            <label className="text-sm font-medium">Tipo de bolsa</label>
                            <select
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
                              value={item.bolsa_tipo_id ?? ""}
                              onChange={(e) =>
                                updateItemCarrinho(item.id, {
                                  bolsa_tipo_id: e.target.value ? Number(e.target.value) : null,
                                })
                              }
                              disabled={!item.bolsa_projeto_social_id || (bolsaTiposPorItem[item.id]?.length ?? 0) === 0}
                            >
                              <option value="">Selecione...</option>
                              {(bolsaTiposPorItem[item.id] ?? []).map((tipoBolsa) => (
                                <option key={tipoBolsa.id} value={tipoBolsa.id}>
                                  {tipoBolsa.nome} (#{tipoBolsa.id})
                                </option>
                              ))}
                            </select>
                            {bolsaTiposLoadingPorItem[item.id] ? (
                              <p className="text-xs text-slate-500">Carregando tipos de bolsa...</p>
                            ) : null}
                            {bolsaTiposErroPorItem[item.id] ? (
                              <p className="text-xs text-rose-600">{bolsaTiposErroPorItem[item.id]}</p>
                            ) : null}
                            {!bolsaTiposLoadingPorItem[item.id] &&
                            item.bolsa_projeto_social_id &&
                            (bolsaTiposPorItem[item.id]?.length ?? 0) === 0 ? (
                              <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
                                Nenhum tipo de bolsa ativo para este projeto.
                                <div className="mt-2 flex items-center gap-2">
                                  <button
                                    type="button"
                                    className="rounded-md border border-amber-300 bg-white px-2 py-1 hover:bg-amber-100"
                                    onClick={() =>
                                      window.open(
                                        `/bolsas/tipos?projeto_social_id=${item.bolsa_projeto_social_id}`,
                                        "_blank",
                                      )
                                    }
                                  >
                                    Cadastrar tipo de bolsa
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {carregandoTurmas ? <p className="text-xs text-muted-foreground">Carregando turmas...</p> : null}
              {turmasErro ? <p className="text-xs text-red-600">{turmasErro}</p> : null}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Primeiro pagamento">
          <div className="space-y-2">
            <label className="text-sm font-medium">Politica</label>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
              value={politicaModo}
              onChange={(e) => setPoliticaModo(e.target.value as "PADRAO" | "ADIAR_PARA_VENCIMENTO")}
            >
              <option value="PADRAO">Padrao (entrada paga no ato)</option>
              <option value="ADIAR_PARA_VENCIMENTO">Adiar para vencimento</option>
            </select>
            {politicaModo === "ADIAR_PARA_VENCIMENTO" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Motivo da excecao</label>
                <textarea
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  rows={3}
                  value={motivoExcecao}
                  onChange={(e) => setMotivoExcecao(e.target.value)}
                />
              </div>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard title="Observacoes internas">
          <textarea
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
            rows={3}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
        </SectionCard>

        <SectionCard title="Resumo">
          <div className="grid gap-2 text-sm text-slate-700">
            <div>Aluno: {aluno?.nome ?? "Nao selecionado"}</div>
            <div>Responsavel: {responsavel?.nome ?? "Nao selecionado"}</div>
            <div>Tipo: {labelTipo(tipo)}</div>
            <div>
              Execuções em família: {itensCarrinho.filter((item) => item.liquidacao_tipo === "FAMILIA").length}
            </div>
            <div>
              Execuções em bolsa: {itensCarrinho.filter((item) => item.liquidacao_tipo === "BOLSA").length}
            </div>
            <div>
              Periodo letivo:{" "}
              {contextoObrigatorio ? (periodoSelecionado ? labelPeriodo(periodoSelecionado) : "-") : "Nao aplicavel"}
            </div>
            <div>Cursos/Turmas: {itensResumo.length > 0 ? itensResumo.join(" | ") : "-"}</div>
            <div>Turma principal: {turmaSelecionada ? labelTurma(turmaSelecionada) : "-"}</div>
            {modoManualValores ? (
              <div className="text-sm">
                <div className="font-medium">Valores por execucao</div>
                {execucoesResumo.length === 0 ? (
                  <div className="mt-1 text-muted-foreground">-</div>
                ) : (
                  <>
                    <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                      {execucoesResumo.map((execucao) => (
                        <li key={execucao.id}>
                          {execucao.idx + 1}a execucao: {execucao.turmaLabel} | Nivel: {execucao.nivel} | Valor:{" "}
                          {execucao.valor} | Liquidação: {execucao.liquidacao_tipo === "BOLSA" ? "Bolsa" : "Família"}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 font-semibold">Total mensalidade: {totalMensalidadeBRL}</div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Valores: modo automatico (nao configurado neste MVP).</div>
            )}
            <div>Plano de pagamento: Plano padrao aplicado</div>
            <div>Data da matricula: {dataMatricula}</div>
            <div>Inicio do vinculo: {dataInicioVinculo}</div>
            <div>Competencia inicial: {competenciaInicialLabel}</div>
            <div>Pro-rata (entrada): {prorataLabel}</div>
            <div>Mensalidade cheia a partir de: {competenciaMensalidadeLabel}</div>
            <div>Politica: {politicaModo === "PADRAO" ? "Padrao" : "Adiar para vencimento"}</div>
          </div>
        </SectionCard>

        {process.env.NODE_ENV !== "production" ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            <div className="font-semibold">Debug validação (dev)</div>
            <pre className="mt-2 whitespace-pre-wrap">{JSON.stringify(debugFlags, null, 2)}</pre>
          </div>
        ) : null}

        <ToolbarRow className="justify-end">
          <button
            type="button"
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50"
            onClick={() => void onSubmit()}
            disabled={loading || !podeSalvar}
          >
            {loading ? "Salvando..." : "Concluir matrícula"}
          </button>
        </ToolbarRow>
      </div>
      </div>
    </div>
  );
}


