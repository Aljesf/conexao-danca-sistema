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

function formatFaixaEtaria(min?: number | null, max?: number | null): string | null {
  if (min === null && max === null) return null;
  const minLabel = min ?? "-";
  const maxLabel = max ?? "-";
  return `${minLabel}-${maxLabel}`;
}

function labelTurma(turma: TurmaOpcao): string {
  const nome = turma.nome?.trim() ? turma.nome : `Turma #${turma.turma_id}`;
  const ano = turma.ano_referencia ?? "-";
  const faixa = formatFaixaEtaria(turma.idade_minima ?? null, turma.idade_maxima ?? null);
  const prefixo = turma.suggested ? "Sugestao: " : "";
  return `${prefixo}${nome} (${ano})${faixa ? ` | Faixa ${faixa}` : ""}`;
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
  const [cursoSelecionado, setCursoSelecionado] = useState<string>("");
  const [turmas, setTurmas] = useState<TurmaOpcao[]>([]);
  const [turmaId, setTurmaId] = useState<number | null>(null);
  const [turmasSelecionadas, setTurmasSelecionadas] = useState<TurmaOpcao[]>([]);
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

  const turmaPrincipalId = tipo === "REGULAR" ? turmasSelecionadas[0]?.turma_id ?? null : turmaId;
  const turmaSelecionada = useMemo(
    () => turmas.find((t) => t.turma_id === turmaPrincipalId) ?? null,
    [turmas, turmaPrincipalId],
  );
  const contextoSelecionado = useMemo(
    () => contextos.find((c) => c.id === contextoId) ?? null,
    [contextos, contextoId],
  );

  const precoOk = !tabelaLoading && !tabelaErro && !!tabelaAplicavel && !!itemAplicado;

  const podeSalvar =
    !!aluno &&
    !!responsavel &&
    Number.isFinite(contextoId ?? NaN) &&
    !!cursoSelecionado &&
    (tipo === "REGULAR" ? turmasSelecionadas.length > 0 : !!turmaSelecionada) &&
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
    setCursoSelecionado("");
    setTurmas([]);
    setTurmaId(null);
    setTurmasErro(null);
    setTurmasSelecionadas([]);
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
    if (!cursoSelecionado.trim() || !contextoId) {
      setTurmas([]);
      setTurmaId(null);
      setTurmasSelecionadas([]);
      setTurmasErro(null);
      return;
    }

    let ativo = true;
    (async () => {
      try {
        setTurmasErro(null);
        setCarregandoTurmas(true);
        const params = new URLSearchParams({
          curso: cursoSelecionado,
          tipo_turma: tipo === "CURSO_LIVRE" ? "CURSO_LIVRE" : "REGULAR",
        });
        const data = await fetchJSON<TurmasResp>(
          `/api/matriculas/contextos/${contextoId}/unidades-execucao?${params.toString()}`,
        );
        if (!ativo) return;
        setTurmas(data.turmas ?? []);
        setTurmaId(null);
        setTurmasSelecionadas([]);
      } catch (e: unknown) {
        if (ativo) setTurmasErro(e instanceof Error ? e.message : "Falha ao carregar turmas.");
      } finally {
        if (ativo) setCarregandoTurmas(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [tipo, cursoSelecionado, contextoId]);

  useEffect(() => {
    if (tipo === "REGULAR" && turmaSelecionada?.ano_referencia) {
      setAnoReferencia(turmaSelecionada.ano_referencia);
    }
  }, [tipo, turmaSelecionada]);

  function toggleTurmaSelecionada(turma: TurmaOpcao) {
    setTurmasSelecionadas((prev) => {
      const exists = prev.some((t) => t.turma_id === turma.turma_id);
      if (exists) {
        return prev.filter((t) => t.turma_id !== turma.turma_id);
      }
      return [...prev, turma];
    });
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

    if (tipo === "REGULAR" && turmasSelecionadas.length === 0) {
      setErro("Selecione ao menos uma unidade de execucao.");
      return;
    }

    if (tipo !== "REGULAR" && !turmaSelecionada) {
      setErro("Selecione a turma.");
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
      const vinculosIds =
        tipo === "REGULAR" ? turmasSelecionadas.map((t) => t.turma_id) : turmaSelecionada ? [turmaSelecionada.turma_id] : [];
      const vinculoPrincipalId = vinculosIds[0];

      if (!vinculoPrincipalId) {
        throw new Error("Turma principal nao encontrada para concluir a matricula.");
      }

      const payload: Record<string, unknown> = {
        pessoa_id: aluno.id,
        responsavel_financeiro_id: responsavel.id,
        tipo_matricula: tipo,
        vinculo_id: vinculoPrincipalId,
        ...(vinculosIds.length > 1 ? { vinculos_ids: vinculosIds } : {}),
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

        <SectionCard title="Contexto, curso e turmas">
          <div className="grid gap-4 md:grid-cols-2">
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Curso</label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={cursoSelecionado}
                onChange={(e) => {
                  setCursoSelecionado(e.target.value);
                  setTurmaId(null);
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
              {!contextoId ? (
                <p className="text-xs text-muted-foreground">Selecione o contexto para habilitar o curso.</p>
              ) : null}
              {cursosErro ? <p className="text-xs text-red-600">{cursosErro}</p> : null}
            </div>
          </div>

          {tipo === "REGULAR" ? (
            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium">Unidades de execucao (multiplas)</label>
              {!contextoId || !cursoSelecionado ? (
                <p className="text-xs text-muted-foreground">Selecione contexto e curso para listar unidades.</p>
              ) : (
                <div className="grid gap-2">
                  {turmas.map((turma) => {
                    const selecionada = turmasSelecionadas.some((t) => t.turma_id === turma.turma_id);
                    const turmaLabel = labelTurma(turma);
                    const ueLabel = labelUnidadeExecucao(turma);
                    return (
                      <label
                        key={turma.turma_id}
                        className={[
                          "flex items-start gap-3 rounded-md border px-3 py-2 text-sm",
                          selecionada ? "border-slate-900 bg-slate-50" : "border-slate-200",
                        ].join(" ")}
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={selecionada}
                          onChange={() => toggleTurmaSelecionada(turma)}
                          disabled={carregandoTurmas}
                        />
                        <div>
                          <div className="font-medium text-slate-900">{ueLabel}</div>
                          {ueLabel !== turmaLabel ? (
                            <div className="text-xs text-slate-500">{turmaLabel}</div>
                          ) : null}
                        </div>
                      </label>
                    );
                  })}
                  {!carregandoTurmas && turmas.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhuma unidade encontrada para este contexto.</p>
                  ) : null}
                </div>
              )}
              {carregandoTurmas ? (
                <p className="text-xs text-muted-foreground">Carregando unidades de execucao...</p>
              ) : null}
              {turmasErro ? <p className="text-xs text-red-600">{turmasErro}</p> : null}
              {turmasSelecionadas.length > 0 ? (
                <p className="text-xs text-slate-500">Selecionadas: {turmasSelecionadas.length}</p>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium">Turma</label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={turmaId ?? ""}
                onChange={(e) => setTurmaId(e.target.value ? Number(e.target.value) : null)}
                disabled={!cursoSelecionado || carregandoTurmas}
              >
                <option value="">Selecione...</option>
                {turmas.map((turma) => (
                  <option key={turma.turma_id} value={turma.turma_id}>
                    {labelTurma(turma)}
                  </option>
                ))}
              </select>
              {carregandoTurmas ? (
                <p className="text-xs text-muted-foreground">Carregando turmas...</p>
              ) : null}
              {turmasErro ? <p className="text-xs text-red-600">{turmasErro}</p> : null}
            </div>
          )}
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
            <div>Curso: {cursoSelecionado || "-"}</div>
            {tipo === "REGULAR" ? (
              <div>
                Unidades de execucao:{" "}
                {turmasSelecionadas.length > 0 ? turmasSelecionadas.map(labelUnidadeExecucao).join(", ") : "-"}
              </div>
            ) : (
              <div>Turma: {turmaSelecionada ? labelTurma(turmaSelecionada) : "-"}</div>
            )}
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
