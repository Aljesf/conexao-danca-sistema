"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import type { StatusTurma, TipoTurma, TurnoTurma } from "@/types/turmas";

type Curso = { id: number; nome: string };
type Nivel = { id: number; nome: string; curso_id: number | null };
type Professor = { id: number; nome: string };

const TIPOS_TURMA: TipoTurma[] = ["REGULAR", "CURSO_LIVRE", "ENSAIO"];
const TURNOS: TurnoTurma[] = ["MANHA", "TARDE", "NOITE", "INTEGRAL"];
const STATUS_OPCOES: StatusTurma[] = ["EM_PREPARACAO", "ATIVA", "ENCERRADA", "CANCELADA"];

const DIAS_SEMANA = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sab" },
];

export default function NovaTurmaPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowser();

  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [cursos, setCursos] = useState<Curso[]>([]);
  const [cursoId, setCursoId] = useState<string>("");

  const [niveis, setNiveis] = useState<Nivel[]>([]);
  const [niveisSelecionados, setNiveisSelecionados] = useState<string[]>([]);

  const [professores, setProfessores] = useState<Professor[]>([]);
  const [professorPrincipalId, setProfessorPrincipalId] = useState<string>("");
  const [professoresAuxiliares, setProfessoresAuxiliares] = useState<string[]>([]);

  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([]);
  const anoAtual = new Date().getFullYear();
  const anosReferencia = Array.from({ length: 4 }, (_, i) => anoAtual - 1 + i);

  useEffect(() => {
    async function carregar() {
      const { data: cursosData, error: cursosError } = await supabase.from("cursos").select("id, nome").order("nome");
      if (cursosError) console.error("Erro ao carregar cursos:", cursosError);
      setCursos(cursosData ?? []);

      const { data: profsData, error: profsError } = await supabase
        .from("vw_professores")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome", { ascending: true });
      if (profsError) {
        console.error("Erro ao carregar professores:", profsError);
      } else {
        setProfessores(profsData ?? []);
      }
    }
    void carregar();
  }, [supabase]);

  useEffect(() => {
    let active = true;
    async function carregarNiveis() {
      if (!cursoId) {
        setNiveis([]);
        setNiveisSelecionados([]);
        return;
      }

      const cursoIdNum = Number(cursoId);
      const { data: niveisData, error: niveisError } = await supabase
        .from("niveis")
        .select("id, nome, curso_id")
        .eq("curso_id", cursoIdNum)
        .order("ordem", { ascending: true });

      if (niveisError) {
        const { data: niveisFallback, error: niveisFallbackError } = await supabase
          .from("niveis")
          .select("id, nome, curso_id")
          .eq("curso_id", cursoIdNum)
          .order("nome", { ascending: true });
        if (niveisFallbackError) {
          console.error("Erro ao carregar niveis:", niveisFallbackError);
          if (active) setNiveis([]);
          return;
        }
        if (active) setNiveis(niveisFallback ?? []);
        return;
      }

      if (active) setNiveis(niveisData ?? []);
    }

    void carregarNiveis();
    return () => {
      active = false;
    };
  }, [cursoId, supabase]);

  const toggleNivel = (id: string) => {
    setNiveisSelecionados((prev) => (prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]));
  };

  const toggleAuxiliar = (id: string) => {
    setProfessoresAuxiliares((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const toggleDia = (value: number) => {
    setDiasSelecionados((prev) => (prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]));
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setErro(null);
    setSaving(true);

    try {
      if (!cursoId) {
        setErro("Selecione um curso.");
        setSaving(false);
        return;
      }

      const cursoSelecionado = cursos.find((c) => String(c.id) === cursoId);
      const cursoTexto = cursoSelecionado?.nome ?? "";

      const niveisSelecionadosObjs = niveis.filter((n) => niveisSelecionados.includes(String(n.id)));
      const nivelTexto = niveisSelecionadosObjs.map((n) => n.nome).join(", ") || null;
      const niveisIdsPayload = Array.from(
        new Set(
          niveisSelecionados
            .map((id) => Number(id))
            .filter((id) => Number.isInteger(id) && id > 0),
        ),
      );

      const tipoTurma = (formData.get("tipo_turma") as string) || "REGULAR";
      if ((tipoTurma === "REGULAR" || tipoTurma === "CURSO_LIVRE") && niveisIdsPayload.length === 0) {
        setErro("Selecione ao menos um nivel.");
        setSaving(false);
        return;
      }

      const anoRefStr = formData.get("ano_referencia") as string | null;
      const cargaStr = formData.get("carga_horaria_prevista") as string | null;
      const freqStr = formData.get("frequencia_minima") as string | null;

      const diasMarcadosLabels = diasSelecionados;

      const payload = {
        nome: formData.get("nome") as string,
        tipo_turma: tipoTurma,
        serie: (formData.get("serie") as string) || null,
        turno: (formData.get("turno") as string) || null,
        status: (formData.get("status") as string) || "EM_PREPARACAO",
        nivel: nivelTexto,
        ano_referencia: anoRefStr ? Number(anoRefStr) : null,
        curso: cursoTexto || null,
        capacidade: formData.get("capacidade") ? Number(formData.get("capacidade")) : null,
        carga_horaria_prevista: cargaStr ? Number(cargaStr) : null,
        frequencia_minima_percentual: freqStr ? Number(freqStr) : null,
        data_inicio: (formData.get("data_inicio") as string) || null,
        data_fim: (formData.get("data_fim") as string) || null,
        dias_semana: diasMarcadosLabels.length
          ? diasMarcadosLabels.map((d) => DIAS_SEMANA.find((dia) => dia.value === d)?.label ?? "").join(",")
          : null,
        hora_inicio: null,
        hora_fim: null,
        professor_id: professorPrincipalId ? Number(professorPrincipalId) : null,
        observacoes: (formData.get("observacoes") as string) || null,
      };
      const horarios: { day: number; inicio: string; fim: string }[] = [];
      for (const dia of DIAS_SEMANA) {
        if (diasMarcadosLabels.includes(dia.value)) {
          const inicio = formData.get(`inicio_${dia.value}`) as string | null;
          const fim = formData.get(`fim_${dia.value}`) as string | null;
          if (inicio && fim) {
            horarios.push({ day: dia.value, inicio, fim });
          }
        }
      }

      const response = await fetch("/api/turmas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turma: payload, horarios, niveis_ids: niveisIdsPayload }),
      });
      const json = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(json.error ?? "Erro ao criar turma");
      }

      // TODO: professores auxiliares via turma_professores (usar professoresAuxiliares)

      router.push("/escola/academico/turmas");
    } catch (e: unknown) {
      console.error(e);
      const message = e instanceof Error ? e.message : "Erro inesperado ao salvar turma.";
      setErro(message);
      setSaving(false);
      return;
    }

    setSaving(false);
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Academico</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">📚 Nova turma</h1>
          <p className="mt-1 text-sm text-slate-500">Preencha os dados basicos da turma e os horarios por dia.</p>
        </header>

        {erro && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-700">{erro}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-violet-100 bg-white/95 p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo de turma</label>
              <select
                name="tipo_turma"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                defaultValue="REGULAR"
              >
                {TIPOS_TURMA.map((t) => (
                  <option key={`tipo-${t}`} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
              <select
                name="status"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                defaultValue="EM_PREPARACAO"
              >
                {STATUS_OPCOES.map((s) => (
                  <option key={`status-${s}`} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Turno</label>
              <select name="turno" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <option value="">-</option>
                {TURNOS.map((t) => (
                  <option key={`turno-${t}`} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nome da turma</label>
              <input
                name="nome"
                required
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Curso</label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={cursoId}
                onChange={(e) => {
                  setCursoId(e.target.value);
                  setNiveisSelecionados([]);
                }}
              >
                <option value="">-</option>
                {cursos.map((c) => (
                  <option key={`curso-${c.id}`} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-500">
                Grava como texto em &quot;curso&quot; (TODO: migrar para curso_id quando existir).
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Nivel (pode ser mais de um nivel, ex.: Nivel 1 / Nivel 2)
              </label>
              {cursoId ? (
                <div className="flex flex-wrap gap-2">
                  {niveis.length === 0 && <span className="text-xs text-slate-500">Nenhum nivel para este curso.</span>}
                  {niveis.map((n) => (
                    <label
                      key={`nivel-${n.id}`}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                        niveisSelecionados.includes(String(n.id))
                          ? "border-violet-300 bg-violet-50 text-violet-700"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-3 w-3"
                        checked={niveisSelecionados.includes(String(n.id))}
                        onChange={() => toggleNivel(String(n.id))}
                      />
                      <span>{n.nome}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Escolha primeiro um curso para ver os niveis.</p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ano de referencia</label>
              <select
                name="ano_referencia"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                defaultValue={anoAtual}
              >
                {anosReferencia.map((ano) => (
                  <option key={`ano-${ano}`} value={ano}>
                    {ano}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Capacidade (opcional)</label>
              <input
                name="capacidade"
                type="number"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Professor principal</label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={professorPrincipalId}
                onChange={(e) => setProfessorPrincipalId(e.target.value)}
              >
                <option value="">-</option>
                {professores.map((p) => (
                  <option key={`prof-${p.id}`} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Professores auxiliares / estagiarios</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {professores
                  .filter((p) => p.id !== Number(professorPrincipalId))
                  .map((prof) => (
                    <label
                      key={`aux-${prof.id}`}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm"
                    >
                      <input
                        type="checkbox"
                        checked={professoresAuxiliares.includes(String(prof.id))}
                        onChange={() => toggleAuxiliar(String(prof.id))}
                      />
                      <span>{prof.nome}</span>
                    </label>
                  ))}
                {professores.length === 0 && <span className="text-xs text-slate-500">Nenhum professor encontrado.</span>}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">TODO: Vincular auxiliares via turma_professores apos criar a turma.</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dias da semana e horarios</label>

            <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
              {DIAS_SEMANA.map((dia) => {
                const ativo = diasSelecionados.includes(dia.value);
                return (
                  <div
                    key={`dia-${dia.value}`}
                    className={[
                      "flex flex-col gap-2 rounded-2xl border px-3 py-2 text-[11px] md:text-xs shadow-sm transition",
                      ativo ? "border-violet-300 bg-white ring-1 ring-violet-200" : "border-slate-200 bg-slate-50/60 opacity-80",
                    ].join(" ")}
                  >
                    <label className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-700">{dia.label}</span>
                      <input
                        type="checkbox"
                        className="h-3 w-3 md:h-4 md:w-4"
                        checked={ativo}
                        onChange={() => toggleDia(dia.value)}
                      />
                    </label>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] uppercase tracking-wide text-slate-500">Inicio</span>
                        <input
                          type="time"
                          name={`inicio_${dia.value}`}
                          className="w-24 rounded-xl border border-slate-200 bg-white px-2 py-1 text-[11px]"
                          disabled={!ativo}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] uppercase tracking-wide text-slate-500">Fim</span>
                        <input
                          type="time"
                          name={`fim_${dia.value}`}
                          className="w-24 rounded-xl border border-slate-200 bg-white px-2 py-1 text-[11px]"
                          disabled={!ativo}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-1 text-[11px] text-slate-500">
              Marque os dias em que a turma acontece e defina o horario de inicio e fim para cada dia.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data de inicio</label>
              <input
                name="data_inicio"
                type="date"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data de fim</label>
              <input
                name="data_fim"
                type="date"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Carga horaria prevista (horas ou numero de aulas)
              </label>
              <input
                name="carga_horaria_prevista"
                type="number"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Frequencia minima (%)</label>
              <input
                name="frequencia_minima"
                type="number"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input id="encerramento_automatico" name="encerramento_automatico" type="checkbox" className="h-4 w-4" />
            <label htmlFor="encerramento_automatico" className="text-xs text-slate-600">
              Encerrar automaticamente ao final da data de termino (com aviso)
            </label>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Observacoes</label>
            <textarea
              name="observacoes"
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            />
          </div>

          {/* Info sobre avaliacoes da turma */}
          <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-xs text-slate-600 md:text-sm">
            Apos salvar a turma, voce podera vincular avaliacoes especificas para ela na tela de detalhes da turma, em{" "}
            <span className="font-medium">&quot;Avaliacoes da turma&quot;</span>. Essas avaliacoes serao usadas para conclusao e curriculo.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => router.push("/escola/academico/turmas")}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-70"
            >
              {saving ? "Salvando..." : "Salvar turma"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
