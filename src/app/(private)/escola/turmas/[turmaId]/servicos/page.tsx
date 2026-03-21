"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type TurmaDetalhe = {
  turma_id?: number;
  id?: number;
  nome?: string | null;
  tipo_turma?: string | null;
  ano_referencia?: number | null;
};

type TurmaResponse = {
  turma: TurmaDetalhe;
};

type Servico = {
  id: number;
  tipo: string;
  titulo: string | null;
  ativo: boolean;
  ano_referencia: number | null;
  referencia_tipo?: string | null;
  referencia_id?: number | null;
};

type ServicoPrecoPlano = {
  id: number;
  codigo: string;
  nome: string;
  valor_mensal_base_centavos: number;
  valor_anuidade_centavos: number;
};

type ServicoPrecoVigente = {
  servico_id: number;
  ano_referencia: number;
  plano_id: number;
  ativo: boolean;
  plano: ServicoPrecoPlano | null;
};

type ServicoVinculado = Servico & {
  preco_vigente?: ServicoPrecoVigente | null;
};

type VinculoResponse = {
  ok: boolean;
  turma_id: number;
  ano_referencia: number | null;
  servicos: ServicoVinculado[];
  message?: string;
};

function extractErrorMessage(data: unknown, status: number): string {
  if (!data || typeof data !== "object") return `HTTP ${status}`;
  const record = data as Record<string, unknown>;
  if (typeof record.message === "string" && record.message.trim()) return record.message;
  if (typeof record.error === "string" && record.error.trim()) return record.error;
  return `HTTP ${status}`;
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

function labelServico(servico: Servico): string {
  const titulo = servico.titulo?.trim() ? servico.titulo : `Servico #${servico.id}`;
  return servico.ano_referencia ? `${titulo} (${servico.ano_referencia})` : titulo;
}

function formatBRL(centavos: number | null): string {
  if (centavos === null) return "-";
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function tipoServicoEsperado(tipoTurma: string | null | undefined): string {
  return tipoTurma === "CURSO_LIVRE" ? "CURSO_LIVRE" : "REGULAR";
}

export default function EscolaTurmaServicosPage() {
  const params = useParams<{ turmaId: string }>();
  const router = useRouter();
  const turmaId = useMemo(() => Number(params?.turmaId), [params]);

  const [turma, setTurma] = useState<TurmaDetalhe | null>(null);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [vinculados, setVinculados] = useState<ServicoVinculado[]>([]);
  const [selecionadoId, setSelecionadoId] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const tipoEsperado = tipoServicoEsperado(turma?.tipo_turma);
  const anoReferencia = turma?.ano_referencia ?? null;

  const configHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set("turmaId", String(turmaId));
    params.set("tipo", tipoEsperado);
    if (Number.isInteger(anoReferencia)) params.set("ano", String(anoReferencia));
    return `/escola/configuracoes/servicos?${params.toString()}`;
  }, [turmaId, tipoEsperado, anoReferencia]);

  const precoVigente = useMemo(() => {
    if (!selecionadoId) return null;
    const vinculo = vinculados.find((v) => v.id === selecionadoId);
    return vinculo?.preco_vigente ?? null;
  }, [selecionadoId, vinculados]);

  useEffect(() => {
    if (!Number.isInteger(turmaId)) return;
    let alive = true;
    (async () => {
      setErro(null);
      setLoading(true);
      try {
        const detalhe = await fetchJSON<TurmaResponse>(`/api/turmas/${turmaId}`);
        if (!alive) return;
        setTurma(detalhe.turma ?? null);

        const dataServicos = await fetchJSON<{ ok: boolean; servicos?: Servico[]; message?: string }>(
          "/api/admin/servicos",
        );
        if (!dataServicos.ok) {
          throw new Error(dataServicos.message ?? "Falha ao carregar servicos.");
        }
        const lista = (dataServicos.servicos ?? []).filter((s) => s.ativo && s.tipo === tipoEsperado);
        const filtrados = lista.filter(
          (s) => String(s.referencia_tipo).toUpperCase() === "TURMA" && Number(s.referencia_id) === turmaId,
        );
        setServicos(filtrados);

        const params = new URLSearchParams();
        if (Number.isInteger(anoReferencia)) params.set("ano_referencia", String(anoReferencia));
        const vinculoData = await fetchJSON<VinculoResponse>(
          `/api/escola/turmas/${turmaId}/servicos${params.toString() ? `?${params.toString()}` : ""}`,
        );
        setVinculados(vinculoData.servicos ?? []);
        const primeiro = (vinculoData.servicos ?? [])[0];
        setSelecionadoId(primeiro?.id ?? null);
      } catch (e: unknown) {
        if (!alive) return;
        setErro(e instanceof Error ? e.message : "Falha ao carregar servicos.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [turmaId, tipoEsperado, anoReferencia]);

  async function salvarVinculo() {
    if (!Number.isInteger(turmaId)) return;
    if (!selecionadoId) {
      setErro("Selecione um servico para vincular a turma.");
      return;
    }
    setErro(null);
    setLoading(true);
    try {
      const payload = { servico_ids: [selecionadoId] };
      const data = await fetchJSON<{ ok: boolean; message?: string }>(
        `/api/escola/turmas/${turmaId}/servicos`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!data.ok) {
        throw new Error(data.message ?? "Falha ao salvar vinculo.");
      }
      const params = new URLSearchParams();
      if (Number.isInteger(anoReferencia)) params.set("ano_referencia", String(anoReferencia));
      const vinculoData = await fetchJSON<VinculoResponse>(
        `/api/escola/turmas/${turmaId}/servicos${params.toString() ? `?${params.toString()}` : ""}`,
      );
      setVinculados(vinculoData.servicos ?? []);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Falha ao salvar vinculo.");
    } finally {
      setLoading(false);
    }
  }

  if (!Number.isInteger(turmaId)) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-600">ID de turma invalido.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Escola</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">
              Servicos da turma {turma?.nome ?? `#${turmaId}`}
            </h1>
            <p className="mt-1 text-sm text-slate-500">Tipo esperado: {tipoEsperado}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
              onClick={() => router.push(`/escola/turmas/${turmaId}`)}
            >
              Voltar
            </button>
            <Link
              href={configHref}
              className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700"
            >
              Configurar servicos
            </Link>
          </div>
        </header>

        {erro ? (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-700">{erro}</div>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Servicos disponiveis</h2>
              <p className="text-sm text-slate-500">
                Selecione o servico que representa esta turma.
              </p>
            </div>
            <button
              type="button"
              className="rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
              onClick={() => void salvarVinculo()}
              disabled={loading}
            >
              Salvar vinculo
            </button>
          </div>

          {loading ? <p className="mt-4 text-xs text-slate-400">Carregando...</p> : null}

          <div className="mt-4 grid gap-2">
            {servicos.map((s) => {
              const checked = selecionadoId === s.id;
              return (
                <label
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm"
                >
                  <div>
                    <div className="font-medium text-slate-900">{labelServico(s)}</div>
                    <div className="text-xs text-slate-500">
                      Vinculado a turma {turmaId}
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="servico-turma"
                    checked={checked}
                    onChange={() => setSelecionadoId(s.id)}
                    disabled={loading}
                  />
                </label>
              );
            })}
            {servicos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
                Nenhum servico cadastrado para esta turma.
                <div className="mt-2">
                  <Link
                    className="text-sm font-medium text-violet-700 hover:underline"
                    href={configHref}
                  >
                    Criar servico para esta turma
                  </Link>
                </div>
              </div>
            ) : null}
          </div>

          {precoVigente?.plano ? (
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm text-slate-700">
              Preco vigente: {precoVigente.plano.nome} ({formatBRL(precoVigente.plano.valor_mensal_base_centavos)})
            </div>
          ) : (
            <div className="mt-4 text-xs text-slate-500">
              Nenhum preco vigente para o servico selecionado no ano {anoReferencia ?? "-"}.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
