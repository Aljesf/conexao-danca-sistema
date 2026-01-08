"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type DiarioStatus = "PENDENTE" | "PRONTO" | "ERRO";
type PresencaStatus = "PRESENTE" | "FALTA" | "JUSTIFICADA" | "ATRASO";

type Turma = {
  turma_id: number;
  nome?: string | null;
  titulo?: string | null;
  descricao?: string | null;
};

type Aluno = {
  aluno_pessoa_id: number;
  nome: string | null;
};

type Aula = {
  id: number;
  turma_id: number;
  data_aula: string;
};

type PresencaDb = {
  aluno_pessoa_id: number;
  status: PresencaStatus;
  minutos_atraso: number | null;
  observacao: string | null;
};

type ItemPresenca = {
  alunoPessoaId: number;
  status: PresencaStatus;
  minutosAtraso?: number;
  observacao?: string;
};

type LinhaChamada = {
  aluno_pessoa_id: number;
  nome: string;
  status: PresencaStatus;
  minutos_atraso: number | null;
  observacao: string;
};

function todayYYYYMMDD(): string {
  const d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

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
  const json = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const msg =
      json &&
      typeof json === "object" &&
      "message" in json &&
      typeof (json as { message?: unknown }).message === "string"
        ? (json as { message: string }).message
        : `Erro HTTP ${res.status}`;
    return { ok: false, status: res.status, message: msg };
  }

  return { ok: true, data: json as T };
}

export default function DiarioDeClassePage() {
  const [aba, setAba] = useState<
    "frequencia" | "plano" | "conteudo" | "observacoes" | "avaliacoes"
  >("frequencia");

  const [status, setStatus] = useState<DiarioStatus>("PENDENTE");
  const [erroMsg, setErroMsg] = useState<string>("");

  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaId, setTurmaId] = useState<number | null>(null);

  const [dataAula, setDataAula] = useState<string>(todayYYYYMMDD());
  const [aula, setAula] = useState<Aula | null>(null);

  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [linhas, setLinhas] = useState<LinhaChamada[]>([]);

  const [dirty, setDirty] = useState<boolean>(false);
  const [salvando, setSalvando] = useState<boolean>(false);
  const [salvoOk, setSalvoOk] = useState<boolean>(false);

  const tituloAba = useMemo(() => {
    switch (aba) {
      case "frequencia":
        return "Frequência";
      case "plano":
        return "Plano de aula";
      case "conteudo":
        return "Conteúdo do curso";
      case "observacoes":
        return "Observações pedagógicas";
      case "avaliacoes":
        return "Avaliações";
      default:
        return "Diário de classe";
    }
  }, [aba]);

  // Carregar turmas
  useEffect(() => {
    let alive = true;
    (async () => {
      setStatus("PENDENTE");
      setErroMsg("");
      const r = await fetchJson<{ ok: boolean; turmas: Turma[] }>(
        "/api/professor/diario-de-classe/turmas"
      );
      if (!alive) return;

      if (!r.ok) {
        setStatus("ERRO");
        setErroMsg(r.message);
        return;
      }

      setTurmas(Array.isArray(r.data.turmas) ? r.data.turmas : []);
      setStatus("PRONTO");
    })().catch((e: unknown) => {
      if (!alive) return;
      setStatus("ERRO");
      setErroMsg(e instanceof Error ? e.message : "Erro inesperado ao carregar turmas.");
    });

    return () => {
      alive = false;
    };
  }, []);

  // Quando selecionar turma: carregar alunos e abrir aula
  useEffect(() => {
    let alive = true;

    (async () => {
      setSalvoOk(false);
      setDirty(false);
      setAula(null);
      setLinhas([]);
      setAlunos([]);

      if (!turmaId) return;

      setStatus("PENDENTE");
      setErroMsg("");

      const alunosRes = await fetchJson<{ ok: boolean; alunos: Aluno[] }>(
        `/api/professor/diario-de-classe/turmas/${turmaId}/alunos`
      );
      if (!alive) return;

      if (!alunosRes.ok) {
        setStatus("ERRO");
        setErroMsg(alunosRes.message);
        return;
      }

      const listaAlunos = Array.isArray(alunosRes.data.alunos)
        ? alunosRes.data.alunos
        : [];
      setAlunos(listaAlunos);

      const abrirRes = await fetchJson<{ ok: boolean; aula: Aula }>(
        "/api/professor/diario-de-classe/aulas/abrir",
        {
          method: "POST",
          body: JSON.stringify({ turmaId, dataAula }),
        }
      );

      if (!alive) return;

      if (!abrirRes.ok) {
        setStatus("ERRO");
        setErroMsg(abrirRes.message);
        return;
      }

      setAula(abrirRes.data.aula);

      // Buscar presenças já salvas
      const presRes = await fetchJson<{ ok: boolean; presencas: PresencaDb[] }>(
        `/api/professor/diario-de-classe/aulas/${abrirRes.data.aula.id}/presencas`
      );

      if (!alive) return;

      if (!presRes.ok) {
        setStatus("ERRO");
        setErroMsg(presRes.message);
        return;
      }

      const presencas = Array.isArray(presRes.data.presencas)
        ? presRes.data.presencas
        : [];
      const mapPres = new Map<number, PresencaDb>();
      for (const p of presencas) mapPres.set(p.aluno_pessoa_id, p);

      // Montar linhas com padrão PRESENTE para quem não tem registro
      const linhasMontadas: LinhaChamada[] = listaAlunos.map((a) => {
        const nome = (a.nome ?? "").trim() || `Aluno ${a.aluno_pessoa_id}`;
        const p = mapPres.get(a.aluno_pessoa_id);
        return {
          aluno_pessoa_id: a.aluno_pessoa_id,
          nome,
          status: p?.status ?? "PRESENTE",
          minutos_atraso: p?.minutos_atraso ?? null,
          observacao: p?.observacao ?? "",
        };
      });

      setLinhas(linhasMontadas);
      setStatus("PRONTO");
    })().catch((e: unknown) => {
      if (!alive) return;
      setStatus("ERRO");
      setErroMsg(e instanceof Error ? e.message : "Erro inesperado ao carregar diário.");
    });

    return () => {
      alive = false;
    };
  }, [turmaId, dataAula]);

  function setStatusLinha(alunoId: number, novo: PresencaStatus) {
    setLinhas((prev) =>
      prev.map((l) => {
        if (l.aluno_pessoa_id !== alunoId) return l;
        return {
          ...l,
          status: novo,
          minutos_atraso: novo === "ATRASO" ? (l.minutos_atraso ?? 1) : null,
        };
      })
    );
    setDirty(true);
    setSalvoOk(false);
  }

  function setMinutosAtraso(alunoId: number, mins: number) {
    setLinhas((prev) =>
      prev.map((l) => {
        if (l.aluno_pessoa_id !== alunoId) return l;
        return { ...l, minutos_atraso: Math.max(1, mins) };
      })
    );
    setDirty(true);
    setSalvoOk(false);
  }

  function setObservacao(alunoId: number, obs: string) {
    setLinhas((prev) =>
      prev.map((l) => {
        if (l.aluno_pessoa_id !== alunoId) return l;
        return { ...l, observacao: obs };
      })
    );
    setDirty(true);
    setSalvoOk(false);
  }

  async function salvarFrequencia() {
    if (!aula) return;
    if (salvando) return;

    setSalvando(true);
    setErroMsg("");
    setStatus("PENDENTE");

    try {
      const itens: ItemPresenca[] = linhas.map((l) => ({
        alunoPessoaId: l.aluno_pessoa_id,
        status: l.status,
        minutosAtraso: l.status === "ATRASO" ? (l.minutos_atraso ?? 1) : undefined,
        observacao: l.observacao.trim() ? l.observacao.trim() : undefined,
      }));

      const r = await fetchJson<{ ok: boolean; presencas: PresencaDb[] }>(
        `/api/professor/diario-de-classe/aulas/${aula.id}/presencas`,
        {
          method: "PUT",
          body: JSON.stringify({ itens }),
        }
      );

      if (!r.ok) {
        setStatus("ERRO");
        setErroMsg(r.message);
        return;
      }

      // Reconciliar com retorno do backend
      const presencas = Array.isArray(r.data.presencas) ? r.data.presencas : [];
      const mapPres = new Map<number, PresencaDb>();
      for (const p of presencas) mapPres.set(p.aluno_pessoa_id, p);

      setLinhas((prev) =>
        prev.map((l) => {
          const p = mapPres.get(l.aluno_pessoa_id);
          if (!p) return l;
          return {
            ...l,
            status: p.status,
            minutos_atraso: p.minutos_atraso ?? null,
            observacao: p.observacao ?? "",
          };
        })
      );

      setDirty(false);
      setSalvoOk(true);
      setStatus("PRONTO");
    } catch (e: unknown) {
      setStatus("ERRO");
      setErroMsg(e instanceof Error ? e.message : "Erro inesperado ao salvar frequência.");
    } finally {
      setSalvando(false);
    }
  }

  const turmaSelecionada = useMemo(
    () => turmas.find((t) => t.turma_id === turmaId) ?? null,
    [turmas, turmaId]
  );

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs tracking-widest text-muted-foreground">ACADÊMICO</div>
            <h1 className="text-2xl font-semibold">Diário de classe</h1>
            <p className="text-sm text-muted-foreground">
              Selecione a turma e registre a aula do dia: frequência, plano, observações e avaliações.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/escola/academico/turmas"
              className="rounded-full border px-4 py-2 text-sm hover:bg-muted"
            >
              Turmas
            </Link>
            <Link
              href="/escola/academico/turmas/grade"
              className="rounded-full border px-4 py-2 text-sm hover:bg-muted"
            >
              Grade
            </Link>
          </div>
        </div>

        {/* STATUS CARDS */}
        <section className="grid gap-3 md:grid-cols-4">
          <Card
            title="Status"
            value={
              status === "PRONTO"
                ? dirty
                  ? "Alterações pendentes"
                  : salvoOk
                    ? "Salvo"
                    : "Pronto"
                : status === "ERRO"
                  ? "Erro"
                  : "Pendente"
            }
          />
          <Card title="Professor" value="—" subtitle="fase API (futuro: auto do usuário)" />
          <Card
            title="Turma"
            value={turmaSelecionada?.nome ?? turmaSelecionada?.titulo ?? "—"}
            subtitle={turmaId ? `ID ${turmaId}` : "selecione uma turma"}
          />
          <Card title="Data" value={dataAula} subtitle="aula do dia" />
        </section>
      </header>

      {/* CONTEXTO */}
      <section className="rounded-2xl border bg-card p-4">
        <div className="mb-2">
          <div className="text-xs tracking-widest text-muted-foreground">SELEÇÃO</div>
          <div className="text-sm font-medium">Contexto da aula</div>
          <div className="text-xs text-muted-foreground">
            Selecione a turma e a data. Depois, registre a frequência.
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Turma</span>
            <select
              className="rounded-lg border bg-background px-3 py-2 text-sm"
              value={turmaId ?? ""}
              onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : null;
                setTurmaId(v);
              }}
            >
              <option value="">Selecione...</option>
              {turmas.map((t) => (
                <option key={t.turma_id} value={t.turma_id}>
                  {(t.nome ?? t.titulo ?? `Turma ${t.turma_id}`) as string}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Data</span>
            <input
              className="rounded-lg border bg-background px-3 py-2 text-sm"
              type="date"
              value={dataAula}
              onChange={(e) => setDataAula(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Aula</span>
            <div className="rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground">
              {aula
                ? `Aula #${aula.id} (turma ${aula.turma_id})`
                : turmaId
                  ? "Abrindo aula..."
                  : "Selecione uma turma"}
            </div>
          </div>
        </div>

        {status === "ERRO" && (
          <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <div className="font-medium">Falha</div>
            <div className="text-muted-foreground">{erroMsg || "Erro inesperado."}</div>
          </div>
        )}
      </section>

      {/* ABAS */}
      <section className="rounded-2xl border bg-card">
        <div className="flex flex-wrap gap-2 border-b p-3">
          <BotaoAba ativo={aba === "frequencia"} onClick={() => setAba("frequencia")}>
            Frequência
          </BotaoAba>
          <BotaoAba ativo={aba === "plano"} onClick={() => setAba("plano")}>
            Plano de aula
          </BotaoAba>
          <BotaoAba ativo={aba === "conteudo"} onClick={() => setAba("conteudo")}>
            Conteúdo do curso
          </BotaoAba>
          <BotaoAba ativo={aba === "observacoes"} onClick={() => setAba("observacoes")}>
            Observações
          </BotaoAba>
          <BotaoAba ativo={aba === "avaliacoes"} onClick={() => setAba("avaliacoes")}>
            Avaliações
          </BotaoAba>
        </div>

        <div className="p-4">
          <h2 className="text-lg font-semibold">{tituloAba}</h2>

          {aba === "frequencia" ? (
            <div className="mt-3 flex flex-col gap-3">
              <div className="rounded-xl border p-4">
                <div className="text-sm font-medium">Chamada</div>
                <div className="text-xs text-muted-foreground">
                  Padrão inicial: <span className="font-medium">PRESENTE</span>. Ajuste apenas exceções e salve no botão.
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  {!turmaId ? (
                    <div className="text-sm text-muted-foreground">Selecione uma turma para carregar a chamada.</div>
                  ) : alunos.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Nenhum aluno encontrado para esta turma.</div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border">
                      <div className="grid grid-cols-12 gap-2 border-b bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground">
                        <div className="col-span-5">Aluno</div>
                        <div className="col-span-5">Status</div>
                        <div className="col-span-2 text-right">Ações</div>
                      </div>

                      {linhas.map((l) => (
                        <div key={l.aluno_pessoa_id} className="border-b px-3 py-3">
                          <div className="grid grid-cols-12 gap-2 items-start">
                            <div className="col-span-5">
                              <div className="text-sm font-medium">{l.nome}</div>
                              {l.status === "ATRASO" && (
                                <div className="mt-2 flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">Minutos:</span>
                                  <input
                                    type="number"
                                    min={1}
                                    className="w-24 rounded-lg border bg-background px-2 py-1 text-sm"
                                    value={l.minutos_atraso ?? 1}
                                    onChange={(e) => setMinutosAtraso(l.aluno_pessoa_id, Number(e.target.value))}
                                  />
                                </div>
                              )}

                              <div className="mt-2">
                                <input
                                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                                  placeholder="Observação (opcional)"
                                  value={l.observacao}
                                  onChange={(e) => setObservacao(l.aluno_pessoa_id, e.target.value)}
                                />
                              </div>
                            </div>

                            <div className="col-span-5 flex flex-wrap gap-2">
                              <StatusPill
                                ativo={l.status === "PRESENTE"}
                                onClick={() => setStatusLinha(l.aluno_pessoa_id, "PRESENTE")}
                              >
                                Presente
                              </StatusPill>
                              <StatusPill
                                ativo={l.status === "FALTA"}
                                onClick={() => setStatusLinha(l.aluno_pessoa_id, "FALTA")}
                              >
                                Falta
                              </StatusPill>
                              <StatusPill
                                ativo={l.status === "JUSTIFICADA"}
                                onClick={() => setStatusLinha(l.aluno_pessoa_id, "JUSTIFICADA")}
                              >
                                Justificada
                              </StatusPill>
                              <StatusPill
                                ativo={l.status === "ATRASO"}
                                onClick={() => setStatusLinha(l.aluno_pessoa_id, "ATRASO")}
                              >
                                Atraso
                              </StatusPill>
                            </div>

                            <div className="col-span-2 flex justify-end">
                              <button
                                type="button"
                                className="rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                                onClick={() => {
                                  setStatusLinha(l.aluno_pessoa_id, "PRESENTE");
                                  setObservacao(l.aluno_pessoa_id, "");
                                }}
                              >
                                Limpar
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">
                    {dirty ? "Alterações pendentes." : salvoOk ? "Salvo." : "Sem alterações."}
                  </div>

                  <button
                    type="button"
                    className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                    disabled={!aula || !turmaId || alunos.length === 0 || salvando || !dirty}
                    onClick={() => void salvarFrequencia()}
                  >
                    {salvando ? "Salvando..." : "Salvar frequência"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">
                Em construção. Este item faz parte do Diário de classe do professor.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Card(props: { title: string; value: string; subtitle?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="text-xs tracking-widest text-muted-foreground">{props.title.toUpperCase()}</div>
      <div className="mt-1 text-lg font-semibold">{props.value}</div>
      {props.subtitle ? <div className="text-xs text-muted-foreground">{props.subtitle}</div> : null}
    </div>
  );
}

function BotaoAba(props: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  const base = "rounded-full px-4 py-2 text-sm transition border";
  const ativo = "bg-primary text-primary-foreground border-primary";
  const inativo = "bg-background text-foreground hover:bg-muted border-border";
  return (
    <button type="button" className={`${base} ${props.ativo ? ativo : inativo}`} onClick={props.onClick}>
      {props.children}
    </button>
  );
}

function StatusPill(props: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  const base = "rounded-full border px-4 py-2 text-sm transition";
  const ativo = "bg-primary text-primary-foreground border-primary";
  const inativo = "bg-background hover:bg-muted border-border";
  return (
    <button type="button" className={`${base} ${props.ativo ? ativo : inativo}`} onClick={props.onClick}>
      {props.children}
    </button>
  );
}
