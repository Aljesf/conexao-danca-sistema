"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";

type CursoLivre = {
  id: number;
  nome: string;
  classificacao: string;
  descricao: string | null;
  publico_alvo: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  status: string;
  idade_minima: number | null;
  idade_maxima: number | null;
  observacoes: string | null;
};

type Turma = {
  turma_id: number;
  nome: string;
  tipo_turma: string | null;
  status: string | null;
  turno: string | null;
  data_inicio: string | null;
  data_fim: string | null;
};

type Params = { id: string };

function faixa(min: number | null, max: number | null) {
  if (min == null && max == null) return "Sem faixa definida";
  if (min != null && max == null) return `A partir de ${min} anos`;
  if (min != null && max != null) return `De ${min} a ${max} anos`;
  return "Sem faixa definida";
}

export default function CursoLivreDetalhePage({ params }: { params: Promise<Params> }) {
  const { id } = use(params);
  const cursoId = Number(id);

  const [curso, setCurso] = useState<CursoLivre | null>(null);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalidadeNome, setModalidadeNome] = useState("");
  const [area, setArea] = useState("");
  const [turno, setTurno] = useState("");
  const [professorId, setProfessorId] = useState("");

  const canCreateTurma = useMemo(() => modalidadeNome.trim().length >= 3, [modalidadeNome]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [r1, r2] = await Promise.all([
          fetch(`/api/academico/cursos-livres/${cursoId}`, { cache: "no-store" }),
          fetch(`/api/academico/cursos-livres/${cursoId}/turmas`, { cache: "no-store" }),
        ]);

        const j1 = (await r1.json()) as { curso_livre?: CursoLivre; error?: string; message?: string };
        const j2 = (await r2.json()) as { turmas?: Turma[]; error?: string; message?: string };

        if (!r1.ok) throw new Error(j1.message ?? j1.error ?? "Falha ao carregar curso livre.");
        if (!r2.ok) throw new Error(j2.message ?? j2.error ?? "Falha ao listar modalidades.");

        setCurso(j1.curso_livre ?? null);
        setTurmas(j2.turmas ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar.");
      } finally {
        setLoading(false);
      }
    }

    if (Number.isFinite(cursoId)) {
      void load();
    } else {
      setLoading(false);
      setError("ID invalido.");
    }
  }, [cursoId]);

  async function onCreateModalidade() {
    if (!canCreateTurma) return;
    setError(null);

    const professorIdValue = professorId ? Number(professorId) : null;
    const payload = {
      modalidade_nome: modalidadeNome.trim(),
      area: area.trim() || null,
      turno: turno || null,
      professor_id: Number.isFinite(professorIdValue) ? professorIdValue : null,
    };

    try {
      const res = await fetch(`/api/academico/cursos-livres/${cursoId}/turmas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { turma_id?: number; error?: string; message?: string };
      if (!res.ok) throw new Error(json.message ?? json.error ?? "Falha ao criar modalidade.");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar modalidade.");
    }
  }

  async function onApagarTurma(turmaId: number) {
    setError(null);
    const ok = window.confirm(
      "Apagar esta turma (modalidade) ira remover a turma e registros dependentes (ex.: encontros). Esta acao nao pode ser desfeita.\n\nDeseja continuar?",
    );
    if (!ok) return;
    try {
      const res = await fetch(`/api/academico/cursos-livres/${cursoId}/turmas/${turmaId}`, { method: "DELETE" });
      const json = (await res.json()) as { ok?: boolean; error?: string; details?: string; hint?: string };
      if (!res.ok) {
        const msg = [json.error, json.details, json.hint].filter(Boolean).join(" | ");
        throw new Error(msg || "Falha ao apagar turma.");
      }
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao apagar turma.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
        <div className="mx-auto max-w-6xl rounded-2xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!curso) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
        <div className="mx-auto max-w-6xl rounded-2xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-rose-600">{error ?? "Curso livre nao encontrado."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold">{curso.nome}</h1>
              <p className="mt-1 text-sm text-slate-600">
                {curso.classificacao} - {curso.status} - {faixa(curso.idade_minima, curso.idade_maxima)}
              </p>
            </div>
            <Link className="rounded-md border px-3 py-2 text-sm" href="/escola/academico/cursos-livres">
              Voltar
            </Link>
          </div>
          {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold">Modalidades (Turmas CURSO_LIVRE)</h2>
          <p className="mt-1 text-sm text-slate-600">
            Cada modalidade e uma turma do tipo CURSO_LIVRE vinculada a este curso livre.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border p-4">
              <div className="text-sm font-semibold">Adicionar modalidade</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-sm font-medium">Modalidade</label>
                  <input
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={modalidadeNome}
                    onChange={(e) => setModalidadeNome(e.target.value)}
                    placeholder="Ex.: Jazz avancado"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Area/Curso (opcional)</label>
                  <input
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="Ex.: Jazz"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Turno (opcional)</label>
                  <select
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={turno}
                    onChange={(e) => setTurno(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    <option value="MANHA">Manha</option>
                    <option value="TARDE">Tarde</option>
                    <option value="NOITE">Noite</option>
                    <option value="INTEGRAL">Integral</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Professor ID (opcional)</label>
                  <input
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={professorId}
                    onChange={(e) => setProfessorId(e.target.value)}
                    placeholder="Ex.: 12"
                    inputMode="numeric"
                  />
                </div>

              </div>

              <div className="mt-3 text-xs text-slate-500">
                Datas dos encontros sao cadastradas dentro da turma.
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  disabled={!canCreateTurma}
                  onClick={onCreateModalidade}
                >
                  Criar turma
                </button>
              </div>
            </div>

            <div className="rounded-xl border p-4">
              <div className="text-sm font-semibold">Dica operacional</div>
              <p className="mt-2 text-sm text-slate-600">
                Depois de criar a turma, ajuste horarios, professores e datas na tela de edicao da turma.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {turmas.length === 0 ? (
              <p className="text-sm text-slate-600">Nenhuma modalidade vinculada ainda.</p>
            ) : (
              turmas.map((t) => (
                <div key={t.turma_id} className="flex items-center justify-between rounded-xl border p-4">
                  <div>
                    <div className="font-semibold">{t.nome}</div>
                    <div className="text-sm text-slate-600">
                      {t.status ?? "-"} - {t.turno ?? "-"} - {t.data_inicio ?? "-"}{" -> "}{t.data_fim ?? "-"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link className="rounded-md border px-3 py-2 text-sm" href={`/escola/academico/turmas/${t.turma_id}`}>
                      Abrir turma
                    </Link>
                    <button className="rounded-md border px-3 py-2 text-sm" onClick={() => onApagarTurma(t.turma_id)}>
                      Apagar turma
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
