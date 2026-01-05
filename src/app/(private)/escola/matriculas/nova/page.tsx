"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import PessoaSearchBox, { PessoaSearchItem } from "@/components/PessoaSearchBox";
import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/layout/SectionCard";
import ToolbarRow from "@/components/layout/ToolbarRow";

type TipoMatricula = "REGULAR" | "CURSO_LIVRE";
type ContextoTipo = "PERIODO_LETIVO" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";

type ContextoMatricula = {
  id: number;
  tipo: ContextoTipo;
  titulo: string;
  ano_referencia: number | null;
  status: string;
};

type TurmaOpcao = {
  turma_id: number;
  nome: string | null;
  curso: string | null;
  tipo_turma: string | null;
  ano_referencia: number | null;
  unidade_execucao_id?: number | null;
  unidade_execucao_label?: string | null;
  idade_minima?: number | null;
  idade_maxima?: number | null;
  suggested?: boolean;
};

type MatriculaCarrinhoItem = {
  id: string;
  curso: string | null;
  turma_id: number | null;
};

type CursosResp = {
  ok: boolean;
  cursos?: string[];
  message?: string;
  error?: string;
};

type TurmasResp = {
  ok: boolean;
  turmas?: TurmaOpcao[];
  contexto?: ContextoMatricula;
  message?: string;
  error?: string;
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

function labelTipo(tipo: TipoMatricula): string {
  return tipo === "REGULAR" ? "Turma regular" : "Curso livre";
}

function mapContextoTipo(tipo: TipoMatricula): ContextoTipo {
  return tipo === "REGULAR" ? "PERIODO_LETIVO" : "CURSO_LIVRE";
}

function labelContexto(contexto: ContextoMatricula): string {
  const ano = contexto.ano_referencia ? ` (${contexto.ano_referencia})` : "";
  return `${contexto.titulo}${ano}`;
}

function labelUnidadeExecucao(turma: TurmaOpcao): string {
  if (turma.unidade_execucao_label?.trim()) return turma.unidade_execucao_label;
  if (turma.nome?.trim()) return turma.nome;
  return `Turma #${turma.turma_id}`;
}

function createCarrinhoItem(): MatriculaCarrinhoItem {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return { id, curso: null, turma_id: null };
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
  const [contextos, setContextos] = useState<ContextoMatricula[]>([]);
  const [contextoId, setContextoId] = useState<number | null>(null);
  const [contextosErro, setContextosErro] = useState<string | null>(null);
  const [contextosLoading, setContextosLoading] = useState(false);
  const [cursos, setCursos] = useState<string[]>([]);
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
  const contextoSelecionado = useMemo(
    () => contextos.find((c) => c.id === contextoId) ?? null,
    [contextos, contextoId],
  );
  const itensResumo = useMemo(
    () =>
      itensCarrinho
        .map((item, idx) => {
          if (!item.curso || !item.turma_id) return null;
          const turma = turmasDisponiveis.find((t) => t.turma_id === item.turma_id) ?? null;
          const ueLabel = turma ? labelUnidadeExecucao(turma) : `UE #${item.turma_id}`;
          const prefixo = idx === 0 ? "Principal" : `Item ${idx + 1}`;
          return `${prefixo}: ${item.curso} - ${ueLabel}`;
        })
        .filter((item): item is string => !!item),
    [itensCarrinho, turmasDisponiveis],
  );

  const precoOk = !tabelaLoading && !tabelaErro && !!tabelaAplicavel && !!itemAplicado;
  const itensCompletos =
    itensCarrinho.length > 0 && itensCarrinho.every((item) => Boolean(item.curso && item.turma_id));
  const principalCompleto = Boolean(principalItem?.curso && principalItem?.turma_id);

  const podeSalvar =
    !!aluno &&
    !!responsavel &&
    Number.isFinite(contextoId ?? NaN) &&
    itensCompletos &&
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
        const data = await fetchJSON<CursosResp>("/api/escola/matriculas/opcoes/cursos");
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
    setContextoId(null);
    setContextos([]);
  }, [tipo]);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        setContextosErro(null);
        setContextosLoading(true);
        const tipoContexto = mapContextoTipo(tipo);
        const params = new URLSearchParams({ tipo: tipoContexto, status: "ATIVO" });
        if (tipo === "REGULAR" && Number.isFinite(anoReferencia)) {
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
        const matchAno =
          tipo === "REGULAR" && Number.isFinite(anoReferencia)
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
  }, [tipo, anoReferencia, contextoId]);

  useEffect(() => {
    setItensCarrinho((prev) => prev.map((item) => ({ ...item, turma_id: null })));
    setTurmasPorCurso({});
    setTurmasErro(null);
    setCarregandoTurmas(false);
  }, [contextoId]);

  const cursosSelecionados = useMemo(() => {
    const lista = itensCarrinho
      .map((item) => item.curso?.trim())
      .filter((curso): curso is string => !!curso);
    return Array.from(new Set(lista));
  }, [itensCarrinho]);

  useEffect(() => {
    if (!contextoId || cursosSelecionados.length === 0) {
      setTurmasErro(null);
      setCarregandoTurmas(false);
      return;
    }

    const pendentes = cursosSelecionados.filter((curso) => !turmasPorCurso[curso]);
    if (pendentes.length === 0) return;

    let ativo = true;
    (async () => {
      try {
        setTurmasErro(null);
        setCarregandoTurmas(true);
        for (const curso of pendentes) {
          const params = new URLSearchParams({
            curso,
            tipo_turma: tipo === "CURSO_LIVRE" ? "CURSO_LIVRE" : "REGULAR",
          });
          const data = await fetchJSON<TurmasResp>(
            `/api/matriculas/contextos/${contextoId}/unidades-execucao?${params.toString()}`,
          );
          if (!ativo) return;
          setTurmasPorCurso((prev) => ({ ...prev, [curso]: data.turmas ?? [] }));
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
  }, [tipo, contextoId, cursosSelecionados, turmasPorCurso]);

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

  async function onSubmit() {
    setErro(null);

    if (!aluno || !responsavel) {
      setErro("Selecione aluno e responsavel financeiro.");
      return;
    }

    if (!contextoId) {
      setErro("Selecione o contexto da matricula.");
      return;
    }

    if (!principalCompleto) {
      setErro("Selecione o curso e a turma principal.");
      return;
    }

    if (!itensCompletos) {
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
      const vinculosIds: number[] = [];
      const seen = new Set<number>();
      for (const item of itensCarrinho) {
        if (typeof item.turma_id !== "number") continue;
        if (seen.has(item.turma_id)) continue;
        seen.add(item.turma_id);
        vinculosIds.push(item.turma_id);
      }
      const vinculoPrincipalId = vinculosIds[0];
      const unidadeExecucaoIds = Array.from(
        new Set(
          vinculosIds
            .map((id) => turmasDisponiveis.find((t) => t.turma_id === id)?.unidade_execucao_id ?? null)
            .filter((id): id is number => typeof id === "number"),
        ),
      );

      if (!vinculoPrincipalId) {
        throw new Error("Turma principal nao encontrada para concluir a matricula.");
      }

      const payload: Record<string, unknown> = {
        pessoa_id: aluno.id,
        responsavel_financeiro_id: responsavel.id,
        tipo_matricula: tipo,
        vinculo_id: vinculoPrincipalId,
        ...(vinculosIds.length > 1 ? { vinculos_ids: vinculosIds } : {}),
        ...(unidadeExecucaoIds.length > 0 ? { unidade_execucao_ids: unidadeExecucaoIds } : {}),
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
                  <option value="REGULAR">Turma regular</option>
                  <option value="CURSO_LIVRE">Curso livre</option>
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
              <label className="text-sm font-medium">{tipo === "REGULAR" ? "Periodo letivo" : "Contexto de matricula"}</label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={contextoId ?? ""}
                onChange={(e) => {
                  const nextId = e.target.value ? Number(e.target.value) : null;
                  setContextoId(nextId);
                  if (tipo === "REGULAR") {
                    const encontrado = contextos.find((c) => c.id === nextId) ?? null;
                    if (encontrado?.ano_referencia) setAnoReferencia(encontrado.ano_referencia);
                  }
                }}
                disabled={contextosLoading}
              >
                <option value="">Selecione...</option>
                {contextos.map((contexto) => (
                  <option key={contexto.id} value={contexto.id}>
                    {labelContexto(contexto)}
                  </option>
                ))}
              </select>
              {contextosLoading ? (
                <p className="text-xs text-muted-foreground">Carregando contextos...</p>
              ) : null}
              {contextosErro ? <p className="text-xs text-red-600">{contextosErro}</p> : null}
              {!contextosLoading && contextos.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum contexto ativo encontrado.</p>
              ) : null}
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

              {!contextoId ? (
                <p className="text-xs text-muted-foreground">Selecione o contexto para habilitar os cursos.</p>
              ) : null}

              {itensCarrinho.map((item, idx) => {
                const ues = item.curso ? turmasPorCurso[item.curso] ?? [] : [];
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
                          value={item.curso ?? ""}
                          onChange={(e) => {
                            const nextCurso = e.target.value ? e.target.value : null;
                            updateItemCarrinho(item.id, { curso: nextCurso, turma_id: null });
                          }}
                          disabled={carregandoCursos || !contextoId}
                        >
                          <option value="">Selecione...</option>
                          {cursos.map((curso) => (
                            <option key={curso} value={curso}>
                              {curso}
                            </option>
                          ))}
                        </select>
                        {cursosErro ? <p className="text-xs text-red-600">{cursosErro}</p> : null}
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">Turma (Unidade de execucao)</label>
                        <select
                          className="w-full rounded-md border px-3 py-2 text-sm"
                          value={item.turma_id ?? ""}
                          onChange={(e) => {
                            const nextId = e.target.value ? Number(e.target.value) : null;
                            updateItemCarrinho(item.id, { turma_id: nextId });
                          }}
                          disabled={!item.curso || !contextoId || carregandoTurmas}
                        >
                          <option value="">
                            {item.curso ? "Selecione a turma" : "Selecione o curso primeiro"}
                          </option>
                          {ues.map((turma) => (
                            <option key={turma.turma_id} value={turma.turma_id}>
                              {labelUnidadeExecucao(turma)}
                            </option>
                          ))}
                        </select>
                        {!carregandoTurmas && item.curso && ues.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            Nenhuma unidade encontrada para este curso no contexto selecionado.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}

              {carregandoTurmas ? (
                <p className="text-xs text-muted-foreground">Carregando turmas...</p>
              ) : null}
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
            <div>Contexto: {contextoSelecionado ? labelContexto(contextoSelecionado) : "-"}</div>
            <div>Cursos/UEs: {itensResumo.length > 0 ? itensResumo.join(" | ") : "-"}</div>
            <div>UE principal: {turmaSelecionada ? labelUnidadeExecucao(turmaSelecionada) : "-"}</div>
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
            <div>Mensalidade aplicada: {itemAplicado ? formatCurrency(itemAplicado.valor_centavos) : "-"}</div>
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
