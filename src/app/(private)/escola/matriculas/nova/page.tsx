"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PessoaSearchBox, { PessoaSearchItem } from "@/components/PessoaSearchBox";
import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/layout/SectionCard";
import ToolbarRow from "@/components/layout/ToolbarRow";

type TipoMatricula = "REGULAR" | "CURSO_LIVRE";

type TurmaOpcao = {
  turma_id: number;
  nome: string | null;
  curso: string | null;
  tipo_turma: string | null;
  ano_referencia: number | null;
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
  idade?: number | null;
  idade_aviso?: string | null;
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
  const isDev = process.env.NODE_ENV !== "production";

  const [aluno, setAluno] = useState<PessoaSearchItem | null>(null);
  const [responsavel, setResponsavel] = useState<PessoaSearchItem | null>(null);
  const [tipo, setTipo] = useState<TipoMatricula>("REGULAR");
  const [cursos, setCursos] = useState<string[]>([]);
  const [cursoSelecionado, setCursoSelecionado] = useState<string>("");
  const [turmas, setTurmas] = useState<TurmaOpcao[]>([]);
  const [turmaId, setTurmaId] = useState<number | null>(null);
  const [anoReferencia, setAnoReferencia] = useState<number>(() => new Date().getFullYear());
  const [dataMatricula, setDataMatricula] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [dataInicioVinculo, setDataInicioVinculo] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [politicaModo, setPoliticaModo] = useState<"PADRAO" | "ADIAR_PARA_VENCIMENTO">("PADRAO");
  const [motivoExcecao, setMotivoExcecao] = useState<string>("");
  const [observacoes, setObservacoes] = useState<string>("");

  const [idadeSugestao, setIdadeSugestao] = useState<number | null>(null);
  const [idadeAviso, setIdadeAviso] = useState<string | null>(null);

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

  const turmaSelecionada = useMemo(
    () => turmas.find((t) => t.turma_id === turmaId) ?? null,
    [turmas, turmaId],
  );

  const precoOk = !tabelaLoading && !tabelaErro && !!tabelaAplicavel && !!itemAplicado;

  const podeSalvar =
    !!aluno &&
    !!responsavel &&
    !!cursoSelecionado &&
    !!turmaSelecionada &&
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
    setIdadeSugestao(null);
    setIdadeAviso(null);
  }, [tipo]);

  useEffect(() => {
    if (!cursoSelecionado.trim()) {
      setTurmas([]);
      setTurmaId(null);
      setTurmasErro(null);
      setIdadeSugestao(null);
      setIdadeAviso(null);
      return;
    }

    let ativo = true;
    (async () => {
      try {
        setTurmasErro(null);
        setCarregandoTurmas(true);
        const params = new URLSearchParams({
          tipo,
          curso: cursoSelecionado,
          data_matricula: dataMatricula,
        });
        if (aluno?.id) params.set("aluno_id", String(aluno.id));
        const data = await fetchJSON<TurmasResp>(`/api/escola/matriculas/opcoes/turmas?${params.toString()}`);
        if (!ativo) return;
        setTurmas(data.turmas ?? []);
        setIdadeSugestao(typeof data.idade === "number" ? data.idade : null);
        setIdadeAviso(data.idade_aviso ?? null);
      } catch (e: unknown) {
        if (ativo) setTurmasErro(e instanceof Error ? e.message : "Falha ao carregar turmas.");
      } finally {
        if (ativo) setCarregandoTurmas(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [tipo, cursoSelecionado, aluno?.id, dataMatricula]);

  useEffect(() => {
    if (tipo === "REGULAR" && turmaSelecionada?.ano_referencia) {
      setAnoReferencia(turmaSelecionada.ano_referencia);
    }
  }, [tipo, turmaSelecionada]);

  useEffect(() => {
    setTabelaAplicavel(null);
    setItemAplicado(null);
    setDebugInfo(null);
    setTabelaErro(null);

    if (!aluno?.id || !turmaId || !anoReferencia) return;
    let ativo = true;
    const controller = new AbortController();
    const debounceId = window.setTimeout(() => {
      (async () => {
        try {
          setTabelaLoading(true);
          const params = new URLSearchParams({
            aluno_id: String(aluno.id),
            alvo_tipo: "TURMA",
            alvo_id: String(turmaId),
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
  }, [aluno?.id, turmaId, anoReferencia, isDev]);

  async function onSubmit() {
    setErro(null);

    if (!aluno || !responsavel || !turmaSelecionada) {
      setErro("Selecione aluno, responsavel financeiro e turma.");
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
      const payload: Record<string, unknown> = {
        pessoa_id: aluno.id,
        responsavel_financeiro_id: responsavel.id,
        tipo_matricula: tipo,
        vinculo_id: turmaSelecionada.turma_id,
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
      router.push(`/escola/matriculas/${id}`);
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

        <SectionCard title="Curso e turma">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Curso</label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={cursoSelecionado}
                onChange={(e) => {
                  setCursoSelecionado(e.target.value);
                  setTurmaId(null);
                }}
                disabled={carregandoCursos}
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

            <div className="space-y-2">
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
          </div>

          {idadeAviso ? <p className="mt-3 text-xs text-amber-600">{idadeAviso}</p> : null}
          {idadeSugestao !== null ? (
            <p className="mt-1 text-xs text-muted-foreground">Idade considerada para sugestao: {idadeSugestao} anos.</p>
          ) : null}
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
            <div>Curso: {cursoSelecionado || "-"}</div>
            <div>Turma: {turmaSelecionada ? labelTurma(turmaSelecionada) : "-"}</div>
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
