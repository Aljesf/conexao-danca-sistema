"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Turma = {
  turma_id: number;
  nome?: string | null;
  curso?: string | null;
  nivel?: string | null;
  dias_semana?: string[] | null;
  hora_inicio?: string | null;
  hora_fim?: string | null;
};

type Ciclo = {
  id: number;
  turma_id: number;
  titulo: string;
  aula_inicio_numero: number;
  aula_fim_numero: number;
  status: string;
};

type PlanoSubbloco = {
  id: number;
  bloco_id: number;
  ordem: number;
  titulo: string;
  minutos_min?: number | null;
  minutos_ideal?: number | null;
  minutos_max?: number | null;
  nivel_abordagem?: string | null;
  instrucoes?: string | null;
};

type PlanoBloco = {
  id: number;
  plano_aula_id: number;
  ordem: number;
  titulo: string;
  objetivo?: string | null;
  minutos_min?: number | null;
  minutos_ideal?: number | null;
  minutos_max?: number | null;
  plano_aula_subblocos?: PlanoSubbloco[] | null;
};

type PlanoAula = {
  id: number;
  ciclo_id: number;
  aula_numero: number;
  intencao_pedagogica?: string | null;
  observacoes_gerais?: string | null;
  playlist_url?: string | null;
  plano_aula_blocos?: PlanoBloco[] | null;
};

async function fetchJson<T>(
  url: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      json = null;
    }
  }

  if (!res.ok) {
    const msg =
      json &&
      typeof json === "object" &&
      typeof (json as { message?: unknown }).message === "string"
        ? (json as { message: string }).message
        : json &&
            typeof json === "object" &&
            typeof (json as { code?: unknown }).code === "string"
          ? (json as { code: string }).code
          : `Erro HTTP ${res.status}`;
    return { ok: false, status: res.status, message: msg };
  }

  return { ok: true, data: json as T };
}

export default function PlanejamentoTurmaPage() {
  const params = useParams();
  const turmaId = useMemo(() => {
    const raw = params?.id;
    const v = Array.isArray(raw) ? raw[0] : raw;
    const n = v ? Number(v) : NaN;
    return Number.isFinite(n) ? n : null;
  }, [params]);

  const [turma, setTurma] = useState<Turma | null>(null);
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [planosPorCiclo, setPlanosPorCiclo] = useState<Record<number, PlanoAula[]>>({});
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [acaoErro, setAcaoErro] = useState("");
  const [acaoOk, setAcaoOk] = useState("");

  const [novoCiclo, setNovoCiclo] = useState({
    titulo: "",
    aula_inicio_numero: "",
    aula_fim_numero: "",
  });

  const [novoPlano, setNovoPlano] = useState<
    Record<number, { aula_numero: string; intencao: string; observacoes: string; playlist: string }>
  >({});

  const [novoBloco, setNovoBloco] = useState<
    Record<
      number,
      { ordem: string; titulo: string; objetivo: string; minutos_min: string; minutos_ideal: string; minutos_max: string }
    >
  >({});

  const [novoSubbloco, setNovoSubbloco] = useState<
    Record<
      number,
      { ordem: string; titulo: string; minutos_min: string; minutos_ideal: string; minutos_max: string; nivel: string; instrucoes: string }
    >
  >({});

  async function carregarTurma() {
    if (!turmaId) return;
    const r = await fetchJson<{ ok: boolean; turmas: Turma[] }>("/api/professor/diario-de-classe/turmas");
    if (!r.ok) {
      setErro(r.message);
      return;
    }
    const found = (r.data.turmas ?? []).find((t) => t.turma_id === turmaId) ?? null;
    setTurma(found);
  }

  async function carregarCiclos() {
    if (!turmaId) return;
    const r = await fetchJson<{ ok: boolean; ciclos: Ciclo[] }>(
      `/api/admin/academico/planejamento/turmas/${turmaId}/ciclos`
    );
    if (!r.ok) {
      setErro(r.message);
      return;
    }
    const ciclosList = Array.isArray(r.data.ciclos) ? r.data.ciclos : [];
    setCiclos(ciclosList);

    const planosMap: Record<number, PlanoAula[]> = {};
    await Promise.all(
      ciclosList.map(async (c) => {
        const planosRes = await fetchJson<{ ok: boolean; planos: PlanoAula[] }>(
          `/api/admin/academico/planejamento/ciclos/${c.id}/planos`
        );
        planosMap[c.id] = planosRes.ok ? (planosRes.data.planos ?? []) : [];
      })
    );
    setPlanosPorCiclo(planosMap);
  }

  async function aprovarCiclo(cicloId: number) {
    setAcaoErro("");
    setAcaoOk("");
    const r = await fetchJson<{ ok: boolean }>(
      `/api/admin/academico/planejamento/ciclos/${cicloId}/aprovar`,
      { method: "POST" }
    );
    if (!r.ok) {
      setAcaoErro(r.message);
      return;
    }
    setAcaoOk("Ciclo aprovado.");
    await carregarCiclos();
  }

  async function criarCiclo() {
    if (!turmaId) return;
    setAcaoErro("");
    setAcaoOk("");

    const payload = {
      titulo: novoCiclo.titulo.trim(),
      aula_inicio_numero: Number(novoCiclo.aula_inicio_numero),
      aula_fim_numero: Number(novoCiclo.aula_fim_numero),
    };

    const r = await fetchJson<{ ok: boolean }>(
      `/api/admin/academico/planejamento/turmas/${turmaId}/ciclos`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    if (!r.ok) {
      setAcaoErro(r.message);
      return;
    }

    setNovoCiclo({ titulo: "", aula_inicio_numero: "", aula_fim_numero: "" });
    setAcaoOk("Ciclo criado.");
    await carregarCiclos();
  }

  async function criarPlano(cicloId: number) {
    setAcaoErro("");
    setAcaoOk("");

    const form = novoPlano[cicloId] ?? {
      aula_numero: "",
      intencao: "",
      observacoes: "",
      playlist: "",
    };

    const payload = {
      aula_numero: Number(form.aula_numero),
      intencao_pedagogica: form.intencao.trim() || null,
      observacoes_gerais: form.observacoes.trim() || null,
      playlist_url: form.playlist.trim() || null,
    };

    const r = await fetchJson<{ ok: boolean }>(
      `/api/admin/academico/planejamento/ciclos/${cicloId}/planos`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    if (!r.ok) {
      setAcaoErro(r.message);
      return;
    }

    setNovoPlano((prev) => ({ ...prev, [cicloId]: { aula_numero: "", intencao: "", observacoes: "", playlist: "" } }));
    setAcaoOk("Plano criado.");
    await carregarCiclos();
  }

  async function criarBloco(plano: PlanoAula) {
    setAcaoErro("");
    setAcaoOk("");

    const form = novoBloco[plano.id] ?? {
      ordem: "",
      titulo: "",
      objetivo: "",
      minutos_min: "",
      minutos_ideal: "",
      minutos_max: "",
    };

    const payload = {
      ordem: Number(form.ordem),
      titulo: form.titulo.trim(),
      objetivo: form.objetivo.trim() || null,
      minutos_min: form.minutos_min ? Number(form.minutos_min) : null,
      minutos_ideal: form.minutos_ideal ? Number(form.minutos_ideal) : null,
      minutos_max: form.minutos_max ? Number(form.minutos_max) : null,
    };

    const r = await fetchJson<{ ok: boolean }>(
      `/api/admin/academico/planejamento/planos/${plano.id}/blocos`,
      { method: "POST", body: JSON.stringify(payload) }
    );

    if (!r.ok) {
      setAcaoErro(r.message);
      return;
    }

    setNovoBloco((prev) => ({
      ...prev,
      [plano.id]: { ordem: "", titulo: "", objetivo: "", minutos_min: "", minutos_ideal: "", minutos_max: "" },
    }));
    setAcaoOk("Bloco criado.");
    await carregarCiclos();
  }

  async function criarSubbloco(plano: PlanoAula, blocoId: number) {
    setAcaoErro("");
    setAcaoOk("");

    const form = novoSubbloco[blocoId] ?? {
      ordem: "",
      titulo: "",
      minutos_min: "",
      minutos_ideal: "",
      minutos_max: "",
      nivel: "",
      instrucoes: "",
    };

    const payload = {
      ordem: Number(form.ordem),
      titulo: form.titulo.trim(),
      minutos_min: form.minutos_min ? Number(form.minutos_min) : null,
      minutos_ideal: form.minutos_ideal ? Number(form.minutos_ideal) : null,
      minutos_max: form.minutos_max ? Number(form.minutos_max) : null,
      nivel_abordagem: form.nivel || null,
      instrucoes: form.instrucoes.trim() || null,
    };

    const r = await fetchJson<{ ok: boolean }>(
      `/api/admin/academico/planejamento/blocos/${blocoId}/subblocos`,
      { method: "POST", body: JSON.stringify(payload) }
    );

    if (!r.ok) {
      setAcaoErro(r.message);
      return;
    }

    setNovoSubbloco((prev) => ({
      ...prev,
      [blocoId]: {
        ordem: "",
        titulo: "",
        minutos_min: "",
        minutos_ideal: "",
        minutos_max: "",
        nivel: "",
        instrucoes: "",
      },
    }));
    setAcaoOk("Sub-bloco criado.");
    await carregarCiclos();
  }

  useEffect(() => {
    if (!turmaId) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setErro("");
      await carregarTurma();
      await carregarCiclos();
      if (!alive) return;
      setLoading(false);
    })().catch((e: unknown) => {
      if (!alive) return;
      setErro(e instanceof Error ? e.message : "Erro ao carregar planejamento.");
      setLoading(false);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turmaId]);

  const dias = Array.isArray(turma?.dias_semana) ? turma?.dias_semana.join(", ") : "--";
  const horario =
    turma?.hora_inicio && turma?.hora_fim
      ? `${turma.hora_inicio.slice(0, 5)} - ${turma.hora_fim.slice(0, 5)}`
      : "--";

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Academico</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Planejamento da turma</h1>
            <p className="mt-1 text-sm text-slate-500">
              Gerencie ciclos e planos de aula vinculados a esta turma.
            </p>
          </div>
          <Link
            href="/academico/planejamento"
            className="rounded-full border px-4 py-2 text-sm hover:bg-muted"
          >
            Voltar
          </Link>
        </header>

        {loading ? (
          <div className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
            Carregando planejamento...
          </div>
        ) : erro ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {erro}
          </div>
        ) : (
          <>
            <section className="rounded-3xl border border-violet-100 bg-white/95 p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Turma</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">
                {turma?.nome ?? (turmaId ? `Turma ${turmaId}` : "Turma")}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {turma?.curso ?? "Curso"} • {turma?.nivel ?? "Nivel"}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Dias: {dias} • Horario: {horario}
              </div>
            </section>

            {(acaoErro || acaoOk) && (
              <div
                className={`rounded-2xl border p-3 text-sm ${
                  acaoErro
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {acaoErro || acaoOk}
              </div>
            )}

            <section className="rounded-3xl border border-violet-100 bg-white/95 p-4 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Novo ciclo</div>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <input
                  className="rounded-xl border px-3 py-2 text-sm"
                  placeholder="Titulo do ciclo"
                  value={novoCiclo.titulo}
                  onChange={(e) => setNovoCiclo((prev) => ({ ...prev, titulo: e.target.value }))}
                />
                <input
                  className="rounded-xl border px-3 py-2 text-sm"
                  placeholder="Aula inicio"
                  type="number"
                  min={1}
                  value={novoCiclo.aula_inicio_numero}
                  onChange={(e) =>
                    setNovoCiclo((prev) => ({ ...prev, aula_inicio_numero: e.target.value }))
                  }
                />
                <input
                  className="rounded-xl border px-3 py-2 text-sm"
                  placeholder="Aula fim"
                  type="number"
                  min={1}
                  value={novoCiclo.aula_fim_numero}
                  onChange={(e) =>
                    setNovoCiclo((prev) => ({ ...prev, aula_fim_numero: e.target.value }))
                  }
                />
                <button
                  type="button"
                  className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
                  onClick={() => void criarCiclo()}
                >
                  Criar ciclo
                </button>
              </div>
            </section>

            <section className="space-y-4">
              {ciclos.length === 0 ? (
                <div className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
                  Nenhum ciclo cadastrado.
                </div>
              ) : (
                ciclos.map((ciclo) => {
                  const planos = planosPorCiclo[ciclo.id] ?? [];
                  return (
                    <div key={ciclo.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{ciclo.titulo}</div>
                          <div className="text-xs text-slate-500">
                            Aulas #{ciclo.aula_inicio_numero} a #{ciclo.aula_fim_numero} • Status: {ciclo.status}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="rounded-full border px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          onClick={() => void aprovarCiclo(ciclo.id)}
                        >
                          Aprovar ciclo
                        </button>
                      </div>

                      <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Novo plano
                        </div>
                        <div className="mt-3 grid gap-2 md:grid-cols-4">
                          <input
                            className="rounded-xl border px-3 py-2 text-sm"
                            placeholder="Aula #"
                            type="number"
                            min={1}
                            value={novoPlano[ciclo.id]?.aula_numero ?? ""}
                            onChange={(e) =>
                              setNovoPlano((prev) => ({
                                ...prev,
                                [ciclo.id]: {
                                  aula_numero: e.target.value,
                                  intencao: prev[ciclo.id]?.intencao ?? "",
                                  observacoes: prev[ciclo.id]?.observacoes ?? "",
                                  playlist: prev[ciclo.id]?.playlist ?? "",
                                },
                              }))
                            }
                          />
                          <input
                            className="rounded-xl border px-3 py-2 text-sm"
                            placeholder="Intencao pedagogica"
                            value={novoPlano[ciclo.id]?.intencao ?? ""}
                            onChange={(e) =>
                              setNovoPlano((prev) => ({
                                ...prev,
                                [ciclo.id]: {
                                  aula_numero: prev[ciclo.id]?.aula_numero ?? "",
                                  intencao: e.target.value,
                                  observacoes: prev[ciclo.id]?.observacoes ?? "",
                                  playlist: prev[ciclo.id]?.playlist ?? "",
                                },
                              }))
                            }
                          />
                          <input
                            className="rounded-xl border px-3 py-2 text-sm"
                            placeholder="Observacoes"
                            value={novoPlano[ciclo.id]?.observacoes ?? ""}
                            onChange={(e) =>
                              setNovoPlano((prev) => ({
                                ...prev,
                                [ciclo.id]: {
                                  aula_numero: prev[ciclo.id]?.aula_numero ?? "",
                                  intencao: prev[ciclo.id]?.intencao ?? "",
                                  observacoes: e.target.value,
                                  playlist: prev[ciclo.id]?.playlist ?? "",
                                },
                              }))
                            }
                          />
                          <div className="flex gap-2">
                            <input
                              className="w-full rounded-xl border px-3 py-2 text-sm"
                              placeholder="Playlist URL"
                              value={novoPlano[ciclo.id]?.playlist ?? ""}
                              onChange={(e) =>
                                setNovoPlano((prev) => ({
                                  ...prev,
                                  [ciclo.id]: {
                                    aula_numero: prev[ciclo.id]?.aula_numero ?? "",
                                    intencao: prev[ciclo.id]?.intencao ?? "",
                                    observacoes: prev[ciclo.id]?.observacoes ?? "",
                                    playlist: e.target.value,
                                  },
                                }))
                              }
                            />
                            <button
                              type="button"
                              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
                              onClick={() => void criarPlano(ciclo.id)}
                            >
                              Criar
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        {planos.length === 0 ? (
                          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-500">
                            Nenhum plano cadastrado.
                          </div>
                        ) : (
                          planos.map((plano) => {
                            const blocos = [...(plano.plano_aula_blocos ?? [])].sort(
                              (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)
                            );
                            return (
                              <div key={plano.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div>
                                    <div className="text-sm font-semibold text-slate-900">
                                      Aula #{plano.aula_numero}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                      {plano.intencao_pedagogica ?? "Sem intencao definida"}
                                    </div>
                                  </div>
                                  {plano.observacoes_gerais ? (
                                    <div className="text-xs text-slate-500">
                                      {plano.observacoes_gerais}
                                    </div>
                                  ) : null}
                                </div>

                                <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                                    Novo bloco
                                  </div>
                                  <div className="mt-3 grid gap-2 md:grid-cols-6">
                                    <input
                                      className="rounded-xl border px-3 py-2 text-sm"
                                      placeholder="Ordem"
                                      type="number"
                                      min={1}
                                      value={novoBloco[plano.id]?.ordem ?? ""}
                                      onChange={(e) =>
                                        setNovoBloco((prev) => ({
                                          ...prev,
                                          [plano.id]: {
                                            ordem: e.target.value,
                                            titulo: prev[plano.id]?.titulo ?? "",
                                            objetivo: prev[plano.id]?.objetivo ?? "",
                                            minutos_min: prev[plano.id]?.minutos_min ?? "",
                                            minutos_ideal: prev[plano.id]?.minutos_ideal ?? "",
                                            minutos_max: prev[plano.id]?.minutos_max ?? "",
                                          },
                                        }))
                                      }
                                    />
                                    <input
                                      className="rounded-xl border px-3 py-2 text-sm md:col-span-2"
                                      placeholder="Titulo"
                                      value={novoBloco[plano.id]?.titulo ?? ""}
                                      onChange={(e) =>
                                        setNovoBloco((prev) => ({
                                          ...prev,
                                          [plano.id]: {
                                            ordem: prev[plano.id]?.ordem ?? "",
                                            titulo: e.target.value,
                                            objetivo: prev[plano.id]?.objetivo ?? "",
                                            minutos_min: prev[plano.id]?.minutos_min ?? "",
                                            minutos_ideal: prev[plano.id]?.minutos_ideal ?? "",
                                            minutos_max: prev[plano.id]?.minutos_max ?? "",
                                          },
                                        }))
                                      }
                                    />
                                    <input
                                      className="rounded-xl border px-3 py-2 text-sm md:col-span-2"
                                      placeholder="Objetivo"
                                      value={novoBloco[plano.id]?.objetivo ?? ""}
                                      onChange={(e) =>
                                        setNovoBloco((prev) => ({
                                          ...prev,
                                          [plano.id]: {
                                            ordem: prev[plano.id]?.ordem ?? "",
                                            titulo: prev[plano.id]?.titulo ?? "",
                                            objetivo: e.target.value,
                                            minutos_min: prev[plano.id]?.minutos_min ?? "",
                                            minutos_ideal: prev[plano.id]?.minutos_ideal ?? "",
                                            minutos_max: prev[plano.id]?.minutos_max ?? "",
                                          },
                                        }))
                                      }
                                    />
                                    <input
                                      className="rounded-xl border px-3 py-2 text-sm"
                                      placeholder="Min ideal"
                                      type="number"
                                      min={1}
                                      value={novoBloco[plano.id]?.minutos_ideal ?? ""}
                                      onChange={(e) =>
                                        setNovoBloco((prev) => ({
                                          ...prev,
                                          [plano.id]: {
                                            ordem: prev[plano.id]?.ordem ?? "",
                                            titulo: prev[plano.id]?.titulo ?? "",
                                            objetivo: prev[plano.id]?.objetivo ?? "",
                                            minutos_min: prev[plano.id]?.minutos_min ?? "",
                                            minutos_ideal: e.target.value,
                                            minutos_max: prev[plano.id]?.minutos_max ?? "",
                                          },
                                        }))
                                      }
                                    />
                                    <button
                                      type="button"
                                      className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
                                      onClick={() => void criarBloco(plano)}
                                    >
                                      Adicionar
                                    </button>
                                  </div>
                                </div>

                                <div className="mt-4 space-y-3">
                                  {blocos.length === 0 ? (
                                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-500">
                                      Nenhum bloco cadastrado.
                                    </div>
                                  ) : (
                                    blocos.map((bloco) => {
                                      const subblocos = [...(bloco.plano_aula_subblocos ?? [])].sort(
                                        (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)
                                      );
                                      return (
                                        <div key={bloco.id} className="rounded-xl border border-slate-200 bg-white p-4">
                                          <div className="text-sm font-semibold">
                                            {bloco.ordem}. {bloco.titulo}
                                          </div>
                                          {bloco.objetivo ? (
                                            <div className="text-xs text-slate-500">{bloco.objetivo}</div>
                                          ) : null}

                                          <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                                            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                                              Novo sub-bloco
                                            </div>
                                            <div className="mt-3 grid gap-2 md:grid-cols-6">
                                              <input
                                                className="rounded-xl border px-3 py-2 text-sm"
                                                placeholder="Ordem"
                                                type="number"
                                                min={1}
                                                value={novoSubbloco[bloco.id]?.ordem ?? ""}
                                                onChange={(e) =>
                                                  setNovoSubbloco((prev) => ({
                                                    ...prev,
                                                    [bloco.id]: {
                                                      ordem: e.target.value,
                                                      titulo: prev[bloco.id]?.titulo ?? "",
                                                      minutos_min: prev[bloco.id]?.minutos_min ?? "",
                                                      minutos_ideal: prev[bloco.id]?.minutos_ideal ?? "",
                                                      minutos_max: prev[bloco.id]?.minutos_max ?? "",
                                                      nivel: prev[bloco.id]?.nivel ?? "",
                                                      instrucoes: prev[bloco.id]?.instrucoes ?? "",
                                                    },
                                                  }))
                                                }
                                              />
                                              <input
                                                className="rounded-xl border px-3 py-2 text-sm md:col-span-2"
                                                placeholder="Titulo"
                                                value={novoSubbloco[bloco.id]?.titulo ?? ""}
                                                onChange={(e) =>
                                                  setNovoSubbloco((prev) => ({
                                                    ...prev,
                                                    [bloco.id]: {
                                                      ordem: prev[bloco.id]?.ordem ?? "",
                                                      titulo: e.target.value,
                                                      minutos_min: prev[bloco.id]?.minutos_min ?? "",
                                                      minutos_ideal: prev[bloco.id]?.minutos_ideal ?? "",
                                                      minutos_max: prev[bloco.id]?.minutos_max ?? "",
                                                      nivel: prev[bloco.id]?.nivel ?? "",
                                                      instrucoes: prev[bloco.id]?.instrucoes ?? "",
                                                    },
                                                  }))
                                                }
                                              />
                                              <select
                                                className="rounded-xl border px-3 py-2 text-sm"
                                                value={novoSubbloco[bloco.id]?.nivel ?? ""}
                                                onChange={(e) =>
                                                  setNovoSubbloco((prev) => ({
                                                    ...prev,
                                                    [bloco.id]: {
                                                      ordem: prev[bloco.id]?.ordem ?? "",
                                                      titulo: prev[bloco.id]?.titulo ?? "",
                                                      minutos_min: prev[bloco.id]?.minutos_min ?? "",
                                                      minutos_ideal: prev[bloco.id]?.minutos_ideal ?? "",
                                                      minutos_max: prev[bloco.id]?.minutos_max ?? "",
                                                      nivel: e.target.value,
                                                      instrucoes: prev[bloco.id]?.instrucoes ?? "",
                                                    },
                                                  }))
                                                }
                                              >
                                                <option value="">Nivel</option>
                                                <option value="INTRODUCAO">Introducao</option>
                                                <option value="PRATICA">Pratica</option>
                                                <option value="REFORCO">Reforco</option>
                                                <option value="CONSOLIDACAO">Consolidacao</option>
                                              </select>
                                              <input
                                                className="rounded-xl border px-3 py-2 text-sm md:col-span-2"
                                                placeholder="Instrucoes"
                                                value={novoSubbloco[bloco.id]?.instrucoes ?? ""}
                                                onChange={(e) =>
                                                  setNovoSubbloco((prev) => ({
                                                    ...prev,
                                                    [bloco.id]: {
                                                      ordem: prev[bloco.id]?.ordem ?? "",
                                                      titulo: prev[bloco.id]?.titulo ?? "",
                                                      minutos_min: prev[bloco.id]?.minutos_min ?? "",
                                                      minutos_ideal: prev[bloco.id]?.minutos_ideal ?? "",
                                                      minutos_max: prev[bloco.id]?.minutos_max ?? "",
                                                      nivel: prev[bloco.id]?.nivel ?? "",
                                                      instrucoes: e.target.value,
                                                    },
                                                  }))
                                                }
                                              />
                                              <button
                                                type="button"
                                                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
                                                onClick={() => void criarSubbloco(plano, bloco.id)}
                                              >
                                                Adicionar
                                              </button>
                                            </div>
                                          </div>

                                          <div className="mt-3 space-y-2">
                                            {subblocos.length === 0 ? (
                                              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
                                                Nenhum sub-bloco cadastrado.
                                              </div>
                                            ) : (
                                              subblocos.map((sb) => (
                                                <div
                                                  key={sb.id}
                                                  className="rounded-lg border border-dashed bg-slate-50 px-3 py-2 text-sm"
                                                >
                                                  <div className="font-medium">
                                                    {sb.ordem}. {sb.titulo}
                                                  </div>
                                                  {sb.nivel_abordagem ? (
                                                    <div className="text-xs text-slate-500">
                                                      Nivel: {sb.nivel_abordagem}
                                                    </div>
                                                  ) : null}
                                                  {sb.instrucoes ? (
                                                    <div className="text-xs text-slate-500">
                                                      {sb.instrucoes}
                                                    </div>
                                                  ) : null}
                                                </div>
                                              ))
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
