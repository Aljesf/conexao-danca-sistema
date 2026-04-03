"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type Grupo = {
  id: number;
  nome: string;
  categoria: string;
  subcategoria: string | null;
  tipo: "TEMPORARIO" | "DURADOURO";
  descricao: string | null;
  ativo: boolean;
  data_inicio: string | null;
  data_fim: string | null;
};

type MembroDetalhado = {
  pessoa: {
    id: number;
    nome: string;
    telefone: string | null;
    email: string | null;
  };
  membro: {
    id: number;
    data_entrada: string | null;
  };
  matricula: {
    status: string | null;
    tipo_matricula: string | null;
  } | null;
  turmas: Array<{
    id: number;
    nome: string;
    tipo_turma: string | null;
  }>;
  indicadores: {
    frequencia_percentual: number | null;
    ultima_aula: string | null;
    status: string;
  };
};

type PessoaBusca = {
  id: number;
  nome: string;
  telefone: string | null;
  email: string | null;
};

type ApiResponse<T> = {
  ok: boolean;
  error?: string;
  data?: T;
};

function formatarData(date: string | null): string {
  if (!date) return "-";
  const [ano, mes, dia] = date.slice(0, 10).split("-");
  if (!ano || !mes || !dia) return date;
  return `${dia}/${mes}/${ano}`;
}

function formatarPercentual(valor: number | null): string {
  if (valor === null) return "Frequencia ainda nao disponivel";
  return `${valor.toFixed(2).replace(".", ",")}%`;
}

function badgeStatusClass(status: string): string {
  if (status === "OK") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "SEM_MATRICULA") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

export default function EscolaAlunosGrupoDetalhePage() {
  const params = useParams<{ id: string }>();
  const grupoId = Number(params?.id ?? NaN);

  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [grupoLoading, setGrupoLoading] = useState(false);
  const [membros, setMembros] = useState<MembroDetalhado[]>([]);
  const [membrosLoading, setMembrosLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const [buscaPessoa, setBuscaPessoa] = useState("");
  const [buscaPessoaDebounced, setBuscaPessoaDebounced] = useState("");
  const [resultadosBusca, setResultadosBusca] = useState<PessoaBusca[]>([]);
  const [buscaLoading, setBuscaLoading] = useState(false);
  const [adicionandoPessoaId, setAdicionandoPessoaId] = useState<number | null>(null);
  const [removendoMembroId, setRemovendoMembroId] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setBuscaPessoaDebounced(buscaPessoa.trim()), 300);
    return () => clearTimeout(t);
  }, [buscaPessoa]);

  useEffect(() => {
    if (!sucesso) return;
    const t = window.setTimeout(() => setSucesso(null), 2800);
    return () => window.clearTimeout(t);
  }, [sucesso]);

  const membrosAtivosIds = useMemo(() => new Set(membros.map((m) => m.pessoa.id)), [membros]);

  const resumo = useMemo(() => {
    const total = membros.length;
    const comMatricula = membros.filter((m) => m.matricula).length;
    const semMatricula = membros.filter((m) => !m.matricula).length;
    const comTurmas = membros.filter((m) => m.turmas.length > 0).length;
    return { total, comMatricula, semMatricula, comTurmas };
  }, [membros]);

  const loadGrupo = useCallback(async () => {
    if (!Number.isFinite(grupoId)) return;

    setGrupoLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/escola/alunos/grupos/${grupoId}`, { method: "GET" });
      const json = (await res.json()) as ApiResponse<Grupo>;
      if (!json.ok) throw new Error(json.error ?? "Falha ao carregar nucleo.");
      setGrupo(json.data ?? null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar nucleo.";
      setError(msg);
    } finally {
      setGrupoLoading(false);
    }
  }, [grupoId]);

  const loadMembros = useCallback(async () => {
    if (!Number.isFinite(grupoId)) return;

    setMembrosLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/escola/alunos/grupos/${grupoId}/membros/detalhado`, { method: "GET" });
      const json = (await res.json()) as ApiResponse<MembroDetalhado[]>;
      if (!json.ok) throw new Error(json.error ?? "Falha ao carregar membros.");
      setMembros(json.data ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar membros.";
      setError(msg);
    } finally {
      setMembrosLoading(false);
    }
  }, [grupoId]);

  useEffect(() => {
    void loadGrupo();
    void loadMembros();
  }, [loadGrupo, loadMembros]);

  useEffect(() => {
    if (!Number.isFinite(grupoId)) return;

    if (buscaPessoaDebounced.length < 2) {
      setResultadosBusca([]);
      setBuscaLoading(false);
      return;
    }

    let ativo = true;

    async function buscarPessoas() {
      setBuscaLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/escola/alunos/grupos/pessoas/busca?q=${encodeURIComponent(buscaPessoaDebounced)}`,
          { method: "GET" },
        );
        const json = (await res.json()) as ApiResponse<PessoaBusca[]>;
        if (!json.ok) throw new Error(json.error ?? "Falha ao buscar pessoas.");
        if (ativo) setResultadosBusca(json.data ?? []);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erro ao buscar pessoas.";
        if (ativo) {
          setError(msg);
          setResultadosBusca([]);
        }
      } finally {
        if (ativo) setBuscaLoading(false);
      }
    }

    void buscarPessoas();

    return () => {
      ativo = false;
    };
  }, [buscaPessoaDebounced, grupoId]);

  async function adicionarPessoa(pessoaId: number) {
    if (!Number.isFinite(grupoId)) return;

    setAdicionandoPessoaId(pessoaId);
    setError(null);
    setSucesso(null);

    try {
      const res = await fetch(`/api/escola/alunos/grupos/${grupoId}/membros`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pessoa_id: pessoaId }),
      });

      const json = (await res.json()) as ApiResponse<{ id: number }>;
      if (!res.ok || !json.ok) {
        const msg =
          res.status === 409
            ? "Esta pessoa ja esta vinculada a este nucleo."
            : (json.error ?? "Falha ao adicionar pessoa ao nucleo.");
        throw new Error(msg);
      }

      await loadMembros();
      setResultadosBusca((prev) => prev.filter((p) => p.id !== pessoaId));
      setSucesso("Membro vinculado com sucesso.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao adicionar pessoa.";
      setError(msg);
    } finally {
      setAdicionandoPessoaId(null);
    }
  }

  async function removerMembro(membro: MembroDetalhado) {
    if (!Number.isFinite(grupoId)) return;
    if (!window.confirm("Remover este membro do nucleo?")) return;

    setRemovendoMembroId(membro.membro.id);
    setError(null);
    setSucesso(null);

    try {
      const res = await fetch(`/api/escola/alunos/grupos/${grupoId}/membros/${membro.membro.id}`, {
        method: "DELETE",
      });

      const json = (await res.json()) as ApiResponse<{ id: number }>;
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Falha ao remover membro.");
      }

      await loadMembros();
      setSucesso("Membro removido do nucleo.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao remover membro.";
      setError(msg);
    } finally {
      setRemovendoMembroId(null);
    }
  }

  if (!Number.isFinite(grupoId)) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">ID de nucleo invalido.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(244,114,182,0.12),_transparent_30%),linear-gradient(to_bottom,_#fff7fb,_#ffffff)] px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="text-sm text-slate-500">
          <Link href="/escola/alunos/grupos" className="font-medium hover:text-slate-700">
            Nucleos
          </Link>
          <span className="mx-2">/</span>
          <span>Detalhe do nucleo</span>
        </div>

        <section className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.35)] md:p-8">
          {grupoLoading && !grupo ? (
            <div className="text-sm text-slate-500">Carregando nucleo...</div>
          ) : grupo ? (
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Nucleo</div>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{grupo.nome}</h1>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                  {grupo.categoria ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">{grupo.categoria}</span>
                  ) : null}
                  {grupo.subcategoria ? (
                    <span className="rounded-full bg-pink-100 px-2.5 py-1 text-pink-700">{grupo.subcategoria}</span>
                  ) : null}
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">
                    {grupo.tipo === "DURADOURO" ? "Duradouro" : "Temporario"}
                  </span>
                </div>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
                  {grupo.descricao?.trim() || "Sem descricao cadastrada para este nucleo."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  void loadGrupo();
                  void loadMembros();
                }}
                disabled={grupoLoading || membrosLoading}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {grupoLoading || membrosLoading ? "Atualizando..." : "Atualizar dados"}
              </button>
            </div>
          ) : (
            <div className="text-sm text-slate-500">Nucleo nao encontrado.</div>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[24px] border border-white/80 bg-white p-5 shadow-[0_22px_60px_-44px_rgba(15,23,42,0.35)]">
            <div className="text-xs uppercase tracking-wide text-slate-500">Membros ativos</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">{resumo.total}</div>
          </div>
          <div className="rounded-[24px] border border-white/80 bg-white p-5 shadow-[0_22px_60px_-44px_rgba(15,23,42,0.35)]">
            <div className="text-xs uppercase tracking-wide text-slate-500">Com matricula</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">{resumo.comMatricula}</div>
          </div>
          <div className="rounded-[24px] border border-white/80 bg-white p-5 shadow-[0_22px_60px_-44px_rgba(15,23,42,0.35)]">
            <div className="text-xs uppercase tracking-wide text-slate-500">Sem matricula</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">{resumo.semMatricula}</div>
          </div>
          <div className="rounded-[24px] border border-white/80 bg-white p-5 shadow-[0_22px_60px_-44px_rgba(15,23,42,0.35)]">
            <div className="text-xs uppercase tracking-wide text-slate-500">Com turmas ativas</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">{resumo.comTurmas}</div>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        {sucesso ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {sucesso}
          </div>
        ) : null}

        <section className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.35)] md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Adicionar aluno</h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-600">
                Busque por nome e vincule alunos com matricula ativa a este nucleo.
              </p>
            </div>
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Somente alunos com matricula ativa aparecem nesta busca
            </div>
          </div>

          <div className="mt-5">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Buscar aluno</span>
              <input
                value={buscaPessoa}
                onChange={(e) => setBuscaPessoa(e.target.value)}
                placeholder="Digite ao menos 2 caracteres"
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
              />
            </label>
            <p className="mt-2 text-xs text-slate-500">A busca acontece automaticamente enquanto voce digita.</p>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {buscaPessoaDebounced.length > 0 && buscaPessoaDebounced.length < 2 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-500 lg:col-span-2">
                Digite pelo menos 2 caracteres para buscar.
              </div>
            ) : null}

            {buscaLoading ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 lg:col-span-2">
                Buscando alunos...
              </div>
            ) : null}

            {!buscaLoading && buscaPessoaDebounced.length >= 2 && resultadosBusca.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 lg:col-span-2">
                Nenhum aluno ativo encontrado. Somente alunos com matricula ativa aparecem nesta busca.
              </div>
            ) : null}

            {!buscaLoading &&
              resultadosBusca.map((pessoa) => {
                const jaMembro = membrosAtivosIds.has(pessoa.id);

                return (
                  <div
                    key={pessoa.id}
                    className={`rounded-2xl border px-4 py-4 ${
                      jaMembro ? "border-amber-200 bg-amber-50/70" : "border-slate-200 bg-slate-50/70"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900">{pessoa.nome}</div>
                        <div className="mt-1 space-y-1 text-sm text-slate-600">
                          <div>{pessoa.telefone || "Telefone nao informado"}</div>
                          <div className="break-all">{pessoa.email || "Email nao informado"}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {jaMembro ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                            Ja e membro
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={adicionandoPessoaId === pessoa.id}
                            onClick={() => void adicionarPessoa(pessoa.id)}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                          >
                            {adicionandoPessoaId === pessoa.id ? "Adicionando..." : "Adicionar"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.35)] md:p-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Membros cadastrados</h2>
              <p className="text-sm text-slate-600">Lista enriquecida dos participantes vinculados a este nucleo.</p>
            </div>
            <div className="text-xs uppercase tracking-wide text-slate-500">{membros.length} membro(s)</div>
          </div>

          <div className="mt-6 space-y-4">
            {membrosLoading ? (
              <div className="rounded-[24px] border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
                Carregando membros...
              </div>
            ) : membros.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
                Nenhum membro ativo neste nucleo.
              </div>
            ) : (
              membros.map((membro) => (
                <article
                  key={membro.membro.id}
                  className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5 transition hover:border-slate-300 hover:bg-white"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-slate-950">{membro.pessoa.nome}</h3>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${badgeStatusClass(
                              membro.indicadores.status,
                            )}`}
                          >
                            {membro.indicadores.status}
                          </span>
                        </div>
                        <div className="mt-2 grid gap-1 text-sm text-slate-600 md:grid-cols-2">
                          <div>{membro.pessoa.telefone || "Telefone nao informado"}</div>
                          <div className="break-all">{membro.pessoa.email || "Email nao informado"}</div>
                          <div>Entrada no nucleo: {formatarData(membro.membro.data_entrada)}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => void removerMembro(membro)}
                        disabled={removendoMembroId === membro.membro.id}
                        className="rounded-2xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        {removendoMembroId === membro.membro.id ? "Removendo..." : "Remover"}
                      </button>
                    </div>

                    <div className="grid gap-3 text-sm text-slate-600 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)_minmax(0,0.9fr)]">
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Matricula</div>
                        {membro.matricula ? (
                          <div className="mt-2 space-y-1">
                            <div>Status: {membro.matricula.status || "-"}</div>
                            <div>Tipo: {membro.matricula.tipo_matricula || "-"}</div>
                          </div>
                        ) : (
                          <div className="mt-2">Sem matricula ativa</div>
                        )}
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Turmas atuais</div>
                        {membro.turmas.length > 0 ? (
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {membro.turmas.map((turma) => (
                              <div key={turma.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                <div className="break-words font-medium text-slate-800">{turma.nome}</div>
                                <div className="mt-1 text-xs text-slate-500">{turma.tipo_turma || "Tipo nao informado"}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-2">Sem turmas ativas</div>
                        )}
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Frequencia</div>
                        <div className="mt-2">{formatarPercentual(membro.indicadores.frequencia_percentual)}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          Ultima aula: {formatarData(membro.indicadores.ultima_aula)}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
