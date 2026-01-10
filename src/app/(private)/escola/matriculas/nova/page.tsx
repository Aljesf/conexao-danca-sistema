"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import PessoaSearchBox, { PessoaSearchItem } from "@/components/PessoaSearchBox";
import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/layout/SectionCard";
import ToolbarRow from "@/components/layout/ToolbarRow";

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
type MatriculaResp = {
  ok: boolean;
  matricula?: { id: number };
  message?: string;
  error?: string;
};

type TabelaAplicavel = {
  id: number;
  titulo: string;
  ano_referencia: number | null;
};

type ItemAplicado = {
  id: number;
  codigo_item: string;
  tipo_item: string;
  descricao?: string | null;
  valor_centavos: number;
  ativo: boolean;
  ordem: number;
};

type PrecoResolverResp = {
  ok: boolean;
  data?: {
    tabela: TabelaAplicavel;
    qtd_modalidades: number | null;
    tier?: { id: number; item_codigo: string; tipo_item: string } | null;
    item_aplicado: ItemAplicado;
    valor_final_centavos?: number | null;
    valor_final_brl?: string | null;
    alvo?: { tipo: string; id: number };
    debug?: {
      servico_id: number | null;
      unidade_execucao_id: number | null;
      tabela_id: number;
      pivot_aplica: boolean;
      tier_grupo_id: number | null;
      qtd_modalidades_ativas: number | null;
      tier_ordem_aplicada: number | null;
      valor_base_centavos: number | null;
      valor_final_centavos: number | null;
      origem_valor: "BASE" | "TIER";
    };
  };
  message?: string;
  error?: string;
};

type PrecoDebug = NonNullable<PrecoResolverResp["data"]>["debug"];

type PrecoItem = {
  idx: number;
  servico_id: number;
  unidade_execucao_id: number;
  turma_id: number;
  valor_final_centavos: number;
  valor_final_brl: string;
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
  return { id, curso_id: null, servico_id: null, unidade_execucao_id: null, turma_id: null };
}

function extractErrorMessage(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) return record.message;
    if (typeof record.error === "string" && record.error.trim()) return record.error;
  }
  return `HTTP ${status}`;
}

function formatCurrency(cents?: number | null): string {
  if (typeof cents !== "number" || Number.isNaN(cents)) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
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
  const supabase = useMemo(() => createClientComponentClient(), []);
  const isDev = process.env.NODE_ENV !== "production";

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
  const [anoReferencia, setAnoReferencia] = useState<number>(() => new Date().getFullYear());
  const [dataMatricula, setDataMatricula] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [dataInicioVinculo, setDataInicioVinculo] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [politicaModo, setPoliticaModo] = useState<"PADRAO" | "ADIAR_PARA_VENCIMENTO">("PADRAO");
  const [motivoExcecao, setMotivoExcecao] = useState<string>("");
  const [observacoes, setObservacoes] = useState<string>("");

  const [cursosErro, setCursosErro] = useState<string | null>(null);
  const [turmasErro, setTurmasErro] = useState<string | null>(null);
  const [carregandoCursos, setCarregandoCursos] = useState(false);
  const [carregandoTurmas, setCarregandoTurmas] = useState(false);
  const [tabelaAplicavel, setTabelaAplicavel] = useState<TabelaAplicavel | null>(null);
  const [itemAplicado, setItemAplicado] = useState<ItemAplicado | null>(null);
  const [debugInfo, setDebugInfo] = useState<PrecoDebug | null>(null);
  const [precosItens, setPrecosItens] = useState<PrecoItem[]>([]);
  const [tabelaErro, setTabelaErro] = useState<string | null>(null);
  const [tabelaLoading, setTabelaLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

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
    () => precosItens.reduce((acc, item) => acc + item.valor_final_centavos, 0),
    [precosItens],
  );
  const totalMensalidadeBRL = useMemo(
    () =>
      (totalMensalidadeCentavos / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
    [totalMensalidadeCentavos],
  );

  const contextoObrigatorio = tipo === "REGULAR";
  const itensCompletosOk =
    itensCarrinho.length > 0 &&
    itensCarrinho.every(
      (item) =>
        typeof item.servico_id === "number" &&
        typeof item.unidade_execucao_id === "number" &&
        typeof item.turma_id === "number",
    );
  const precosItensOk = itensCompletosOk && precosItens.length === itensCarrinho.length;
  const precoOk = !tabelaLoading && !tabelaErro && !!tabelaAplicavel && !!itemAplicado && precosItensOk;
  const principalCompleto = Boolean(
    principalItem?.servico_id && principalItem?.unidade_execucao_id && principalItem?.turma_id,
  );

  const podeSalvar =
    !!aluno &&
    !!responsavel &&
    (!contextoObrigatorio || Number.isFinite(contextoId ?? NaN)) &&
    itensCompletosOk &&
    principalCompleto &&
    (tipo !== "REGULAR" || !!anoReferencia) &&
    (politicaModo !== "ADIAR_PARA_VENCIMENTO" || motivoExcecao.trim().length > 0) &&
    precoOk;

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
    if (tipo === "REGULAR" && turmaSelecionada?.ano_referencia) {
      setAnoReferencia(turmaSelecionada.ano_referencia);
    }
  }, [tipo, turmaSelecionada]);

  function addItemCarrinho() {
    setItensCarrinho((prev) => [...prev, createCarrinhoItem()]);
  }

  function removeItemCarrinho(id: string) {
    setItensCarrinho((prev) => (prev.length <= 1 ? prev : prev.filter((item) => item.id !== id)));
  }

  function updateItemCarrinho(id: string, patch: Partial<MatriculaCarrinhoItem>) {
    setItensCarrinho((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  useEffect(() => {
    setTabelaAplicavel(null);
    setItemAplicado(null);
    setDebugInfo(null);
    setTabelaErro(null);

    if (!aluno?.id || !turmaPrincipalId || !anoReferencia) return;
    let ativo = true;
    const controller = new AbortController();
    const debounceId = window.setTimeout(() => {
      (async () => {
        try {
          setTabelaLoading(true);
          const params = new URLSearchParams({
            aluno_id: String(aluno.id),
            alvo_tipo: "TURMA",
            alvo_id: String(turmaPrincipalId),
            ano: String(anoReferencia),
          });
          const data = await fetchJSON<PrecoResolverResp>("/api/matriculas/precos/resolver?" + params.toString(), {
            signal: controller.signal,
          });
          if (!ativo) return;
          setTabelaAplicavel(data.data?.tabela ?? null);
          setItemAplicado(data.data?.item_aplicado ?? null);
          if (isDev) setDebugInfo(data.data?.debug ?? null);
        } catch (e) {
          if (!ativo) return;
          const name = e && typeof e === "object" && "name" in e ? String(e.name) : "";
          if (name === "AbortError") return;
          setTabelaErro(e instanceof Error ? e.message : "Falha ao resolver tabela aplicavel.");
        } finally {
          if (ativo) setTabelaLoading(false);
        }
      })();
    }, 500);
    return () => {
      ativo = false;
      controller.abort();
      window.clearTimeout(debounceId);
    };
  }, [aluno?.id, turmaPrincipalId, anoReferencia, isDev]);

  useEffect(() => {
    let ativo = true;
    (async () => {
      if (!aluno?.id || !Number.isFinite(anoReferencia)) {
        if (ativo) setPrecosItens([]);
        return;
      }

      const completos = itensCarrinho
        .map((it, idx) => ({ it, idx }))
        .filter(
          ({ it }) =>
            typeof it.servico_id === "number" &&
            typeof it.unidade_execucao_id === "number" &&
            typeof it.turma_id === "number",
        );

      if (completos.length === 0 || completos.length !== itensCarrinho.length) {
        if (ativo) setPrecosItens([]);
        return;
      }

      const results: PrecoItem[] = [];

      for (const { it, idx } of completos) {
        const servicoId = it.servico_id as number;
        const unidadeExecucaoId = it.unidade_execucao_id as number;
        const turmaId = it.turma_id as number;

        const url = new URL("/api/matriculas/precos/resolver", window.location.origin);
        url.searchParams.set("aluno_id", String(aluno.id));
        url.searchParams.set("alvo_tipo", "TURMA");
        url.searchParams.set("alvo_id", String(turmaId));
        url.searchParams.set("ano", String(anoReferencia));
        url.searchParams.set("servico_id", String(servicoId));
        url.searchParams.set("unidade_execucao_id", String(unidadeExecucaoId));
        url.searchParams.set("ano_referencia", String(anoReferencia));
        url.searchParams.set("tier_ordem_override", String(idx + 1));

        const res = await fetch(url.toString());
        if (!res.ok) continue;

        const json = (await res.json()) as PrecoResolverResp;
        const cent = json.data?.valor_final_centavos ?? json.data?.item_aplicado?.valor_centavos ?? null;
        if (typeof cent !== "number" || !Number.isFinite(cent)) continue;

        const brl =
          (json.data?.valor_final_brl && json.data.valor_final_brl.trim()) || formatCurrency(cent);

        results.push({
          idx,
          servico_id: servicoId,
          unidade_execucao_id: unidadeExecucaoId,
          turma_id: turmaId,
          valor_final_centavos: cent,
          valor_final_brl: brl,
        });
      }

      if (!ativo) return;
      setPrecosItens(results.sort((a, b) => a.idx - b.idx));
    })();
    return () => {
      ativo = false;
    };
  }, [aluno?.id, anoReferencia, itensCarrinho]);

  async function onSubmit() {
    setErro(null);

    if (!aluno || !responsavel) {
      setErro("Selecione aluno e responsavel financeiro.");
      return;
    }

    if (contextoObrigatorio && !contextoId) {
      setErro("Selecione o contexto da matricula.");
      return;
    }

    if (!principalCompleto) {
      setErro("Selecione o curso e a turma principal.");
      return;
    }

    if (!itensCompletosOk) {
      setErro("Complete todos os cursos e turmas antes de continuar.");
      return;
    }

    if (tipo === "REGULAR" && !anoReferencia) {
      setErro("Ano referencia obrigatorio para turma regular.");
      return;
    }

    if (!precoOk) {
      setErro(tabelaErro || "Tabela de precos nao resolvida para a combinacao selecionada.");
      return;
    }

    if (politicaModo === "ADIAR_PARA_VENCIMENTO" && !motivoExcecao.trim()) {
      setErro("Informe o motivo da excecao para adiar o primeiro pagamento.");
      return;
    }

    setLoading(true);
    try {
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
      const vinculosIds = Array.from(new Set(itensPayload.map((item) => item.turma_id)));
      const vinculoPrincipalId = vinculosIds[0];
      const unidadeExecucaoIds = Array.from(new Set(itensPayload.map((item) => item.unidade_execucao_id)));

      if (!vinculoPrincipalId) {
        throw new Error("Turma principal nao encontrada para concluir a matricula.");
      }

      const payload: Record<string, unknown> = {
        pessoa_id: aluno.id,
        responsavel_financeiro_id: responsavel.id,
        tipo_matricula: tipo,
        vinculo_id: vinculoPrincipalId,
        ...(vinculosIds.length > 1 ? { vinculos_ids: vinculosIds } : {}),
        itens: itensPayload,
        ...(unidadeExecucaoIds.length > 0 ? { unidade_execucao_ids: unidadeExecucaoIds } : {}),
        total_mensalidade_centavos: totalMensalidadeCentavos,
        data_matricula: dataMatricula,
        data_inicio_vinculo: dataInicioVinculo,
        observacoes: observacoes.trim() || null,
      };

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

      const data = await fetchJSON<MatriculaResp>("/api/matriculas/novo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const id = data.matricula?.id;
      if (!id) {
        throw new Error("Resposta invalida: matricula sem id.");
      }

      if (!itemAplicado) {
        throw new Error("Preco nao resolvido para definir a primeira cobranca.");
      }

      const primeiraCobrancaTipo =
        itemAplicado.codigo_item === "MENSALIDADE" ? "MENSALIDADE_CHEIA_CARTAO" : "ENTRADA_PRORATA";
      const primeiraCobrancaValorCentavos = itemAplicado.valor_centavos;

      const { error: updErr } = await supabase
        .from("matriculas")
        .update({
          primeira_cobranca_tipo: primeiraCobrancaTipo,
          primeira_cobranca_status: "PENDENTE",
          primeira_cobranca_valor_centavos: primeiraCobrancaValorCentavos,
        })
        .eq("id", id);

      if (updErr) {
        throw new Error("Falha ao atualizar matricula com a primeira cobranca.");
      }

      router.push(`/escola/matriculas/liquidacao?matriculaId=${id}`);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Falha ao criar matricula.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          title="Nova matricula (Escola)"
          description="Operacional: selecione aluno, turma e data de inicio. A API cuidara da cobranca conforme as regras oficiais."
          actions={
            <Link
              href="/escola/matriculas"
              className="inline-flex items-center rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:border-slate-300"
            >
              Voltar para matriculas
            </Link>
          }
        />

        {erro ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erro}</div>
        ) : null}

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
                  className="w-full rounded-md border px-3 py-2 text-sm"
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
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={dataMatricula}
                    onChange={(e) => setDataMatricula(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Inicio do vinculo (aulas)</label>
                  <input
                    type="date"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={dataInicioVinculo}
                    onChange={(e) => setDataInicioVinculo(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Ano referencia {tipo === "REGULAR" ? "(obrigatorio)" : "(opcional)"}
                </label>
                <input
                  type="number"
                  className="w-full rounded-md border px-3 py-2 text-sm"
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
                className="w-full rounded-md border px-3 py-2 text-sm"
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
                    Adicione um curso por vez e selecione a turma. O primeiro item vira a unidade principal.
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
                return (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">
                          {idx === 0 ? "Curso / Turma (Principal)" : `Curso / Turma (${idx + 1})`}
                        </div>
                        <div className="text-xs text-slate-500">
                          {idx === 0
                            ? "Define a referencia principal do resumo e da precificacao (MVP)."
                            : "Item adicional do combo."}
                        </div>
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
                          className="w-full rounded-md border px-3 py-2 text-sm"
                          value={item.curso_id ? String(item.curso_id) : ""}
                          onChange={(e) => {
                            const nextCursoId = e.target.value ? Number(e.target.value) : null;
                            updateItemCarrinho(item.id, {
                              curso_id: nextCursoId,
                              servico_id: null,
                              unidade_execucao_id: null,
                              turma_id: null,
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
                          className="w-full rounded-md border px-3 py-2 text-sm"
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
              className="w-full rounded-md border px-3 py-2 text-sm"
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
                  className="w-full rounded-md border px-3 py-2 text-sm"
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
            className="w-full rounded-md border px-3 py-2 text-sm"
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
              Periodo letivo:{" "}
              {contextoObrigatorio ? (periodoSelecionado ? labelPeriodo(periodoSelecionado) : "-") : "Nao aplicavel"}
            </div>
            <div>Cursos/Turmas: {itensResumo.length > 0 ? itensResumo.join(" | ") : "-"}</div>
            <div>Turma principal: {turmaSelecionada ? labelTurma(turmaSelecionada) : "-"}</div>
            {tabelaLoading ? (
              <div>Tabela aplicada: carregando...</div>
            ) : tabelaErro ? (
              <div className="text-rose-600">Tabela aplicada: {tabelaErro}</div>
            ) : tabelaAplicavel ? (
              <div>
                Tabela aplicada: {tabelaAplicavel.titulo} - Ano {tabelaAplicavel.ano_referencia ?? "-"}
              </div>
            ) : (
              <div>Tabela aplicada: -</div>
            )}
            <div className="text-sm">
              <div className="font-medium">Mensalidades por item</div>
              {precosItens.length === 0 ? (
                <div className="mt-1 text-muted-foreground">-</div>
              ) : (
                <>
                  <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                    {precosItens.map((p) => (
                      <li key={p.idx}>
                        {p.idx + 1}a modalidade: {p.valor_final_brl}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 font-semibold">Total mensalidade: {totalMensalidadeBRL}</div>
                </>
              )}
            </div>
            <div>Plano de pagamento: Plano padrao aplicado</div>
            <div>Data da matricula: {dataMatricula}</div>
            <div>Inicio do vinculo: {dataInicioVinculo}</div>
            <div>Politica: {politicaModo === "PADRAO" ? "Padrao" : "Adiar para vencimento"}</div>
          </div>
        </SectionCard>

        {isDev && debugInfo ? (
          <SectionCard title="Diagnostico de precificacao (dev)" className="border-amber-200 bg-amber-50">
            <div className="space-y-2 text-sm text-amber-900">
              <div>
                Servico/UE/Tabela: {debugInfo.servico_id ?? "-"} / {debugInfo.unidade_execucao_id ?? "-"} /{" "}
                {debugInfo.tabela_id}
              </div>
              <div>Pivot aplica? {debugInfo.pivot_aplica ? "Sim" : "Nao"}</div>
              <div>
                Tier grupo / qtd / ordem: {debugInfo.tier_grupo_id ?? "-"} / {debugInfo.qtd_modalidades_ativas ?? "-"} /{" "}
                {debugInfo.tier_ordem_aplicada ?? "-"}
              </div>
              <div>
                Valor base vs final: {formatCurrency(debugInfo.valor_base_centavos)} {" -> "}
                {formatCurrency(debugInfo.valor_final_centavos)} ({debugInfo.origem_valor})
              </div>
            </div>
          </SectionCard>
        ) : null}

        <ToolbarRow className="justify-end">
          <button
            type="button"
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50"
            onClick={() => void onSubmit()}
            disabled={loading || !podeSalvar}
          >
            {loading ? "Salvando..." : "Concluir matricula"}
          </button>
        </ToolbarRow>
      </div>
    </div>
  );
}
