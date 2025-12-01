"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import type { TipoTurma, TurnoTurma, StatusTurma } from "@/types/turmas";

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
  { value: 6, label: "Sáb" },
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

  useEffect(() => {
    async function carregar() {
      const { data: cursosData, error: cursosError } = await supabase.from("cursos").select("id, nome").order("nome");
      if (cursosError) console.error("Erro ao carregar cursos:", cursosError);
      setCursos(cursosData ?? []);

      const { data: niveisData, error: niveisError } = await supabase
        .from("niveis")
        .select("id, nome, curso_id")
        .order("nome", { ascending: true });
      if (niveisError) console.error("Erro ao carregar níveis:", niveisError);
      setNiveis(niveisData ?? []);

      // Professores direto da view vw_professores
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

  const niveisDoCurso = cursoId ? niveis.filter((n) => String(n.curso_id ?? "") === String(cursoId)) : [];

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
      const cursoSelecionado = cursos.find((c) => String(c.id) === cursoId);
      const cursoTexto = cursoSelecionado?.nome ?? "";

      const niveisSelecionadosObjs = niveis.filter((n) => niveisSelecionados.includes(String(n.id)));
      const nivelTexto = niveisSelecionadosObjs.map((n) => n.nome).join(" / ") || null;

      const anoRefStr = formData.get("ano_referencia") as string | null;
      const cargaStr = formData.get("carga_horaria_prevista") as string | null;
      const freqStr = formData.get("frequencia_minima") as string | null;

      const diasMarcadosLabels = diasSelecionados;

      const payload = {
        nome_turma: formData.get("nome") as string,
        tipo_turma: (formData.get("tipo_turma") as string) || "REGULAR",
        serie: (formData.get("serie") as string) || null,
        turno: (formData.get("turno") as string) || null,
        nivel: nivelTexto,
        ano_referencia: anoRefStr ? Number(anoRefStr) : null,
        modalidade: cursoTexto || null, // TODO: migrar para curso_id quando a coluna existir
        carga_horaria_prevista: cargaStr ? Number(cargaStr) : null,
        frequencia_minima: freqStr ? Number(freqStr) : null,
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

      const { data: created, error } = await supabase.from("turmas").insert(payload).select("id").single();
      if (error || !created) {
        throw new Error(error?.message ?? "Erro ao criar turma");
      }

      const turmaId = Number(created.id);

      // turmas_horarios (por dia)
      const horarios: { turma_id: number; day_of_week: number; inicio: string; fim: string }[] = [];
      for (const dia of DIAS_SEMANA) {
        if (diasMarcadosLabels.includes(dia.value)) {
          const inicio = formData.get(`inicio_${dia.value}`) as string | null;
          const fim = formData.get(`fim_${dia.value}`) as string | null;
          if (inicio && fim) {
            horarios.push({ turma_id: turmaId, day_of_week: dia.value, inicio, fim });
          }
        }
      }

      if (horarios.length > 0) {
        const { error: errHorarios } = await supabase.from("turmas_horarios").insert(horarios);
        if (errHorarios) {
          console.error("Erro ao salvar horários da turma:", errHorarios);
        }
      }

      // TODO: professores auxiliares via turma_professores (usar professoresAuxiliares)

      router.push("/academico/turmas");
    } catch (e: any) {
      console.error(e);
      setErro(e?.message ?? "Erro inesperado ao salvar turma.");
      setSaving(false);
      return;
    }

    setSaving(false);
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Acadêmico</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Nova turma</h1>
          <p className="mt-1 text-sm text-slate-500">Preencha os dados básicos da turma e os horários por dia.</p>
        </header>

        {erro && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-700">
            {erro}
          </div>
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
                  <option key={t} value={t}>
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
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Turno</label>
              <select name="turno" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <option value="">—</option>
                {TURNOS.map((t) => (
                  <option key={t} value={t}>
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
                <option value="">Selecione o curso</option>
                {cursos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-500">
                Grava como texto em “modalidade” (TODO: migrar para curso_id quando existir).
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Nível (pode ser mais de um nível, ex.: Nível 1 / Nível 2)
              </label>
              {cursoId ? (
                <div className="flex flex-wrap gap-2">
                  {niveisDoCurso.length === 0 && <span className="text-xs text-slate-500">Nenhum nível para este curso.</span>}
                  {niveisDoCurso.map((n) => (
                    <label
                      key={n.id}
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
                <p className="text-xs text-slate-500">Escolha primeiro um curso para ver os níveis.</p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ano de referência</label>
              <input
                name="ano_referencia"
                type="number"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              />
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
                <option value="">Selecione...</option>
                {professores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Professores auxiliares / estagiários</label>
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
              <p className="mt-1 text-[11px] text-slate-500">
                TODO: Vincular auxiliares via turma_professores após criar a turma.
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Dias da semana e horários
            </label>

            <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
              {DIAS_SEMANA.map((dia) => {
                const ativo = diasSelecionados.includes(dia.value);
                return (
                  <div
                    key={dia.value}
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
                        <span className="text-[10px] uppercase tracking-wide text-slate-500">Início</span>
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
              Marque os dias em que a turma acontece e defina o horário de início e fim para cada dia.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data de início</label>
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
                Carga horária prevista (horas ou nº de aulas)
              </label>
              <input
                name="carga_horaria_prevista"
                type="number"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Frequência mínima (%)</label>
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
              Encerrar automaticamente ao final da data de término (com aviso)
            </label>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Observações</label>
            <textarea
              name="observacoes"
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            />
          </div>

          {/* Info sobre avaliações da turma */}
          <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-xs text-slate-600 md:text-sm">
            Após salvar a turma, você poderá vincular avaliações específicas
            para ela na tela de detalhes da turma, em{" "}
            <span className="font-medium">“Avaliações da turma”</span>. Essas
            avaliações serão usadas para conclusão e currículo.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => router.push("/academico/turmas")}
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
