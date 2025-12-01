"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import type { TipoTurma, TurnoTurma, StatusTurma } from "@/types/turmas";

const tiposTurma: TipoTurma[] = ["REGULAR", "CURSO_LIVRE", "ENSAIO"];
const turnos: TurnoTurma[] = ["MANHA", "TARDE", "NOITE", "INTEGRAL"];
const statusOptions: StatusTurma[] = ["EM_PREPARACAO", "ATIVA", "ENCERRADA", "CANCELADA"];

export default function NovaTurmaPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowser();

  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setErro(null);
    setSaving(true);

    const dias = formData.getAll("dias_semana") as string[];

    const toNumberOrNull = (value: FormDataEntryValue | null) => {
      if (value === null || value === "") return null;
      const n = Number(value);
      return Number.isNaN(n) ? null : n;
    };

    const payload = {
      tipo_turma: (formData.get("tipo_turma") as string) || "REGULAR",
      nome: formData.get("nome") as string,
      curso: formData.get("curso") as string,
      nivel: (formData.get("nivel") as string) || null,
      turno: ((formData.get("turno") as string) || null) as TurnoTurma | null,
      ano_referencia: toNumberOrNull(formData.get("ano_referencia")),
      dias_semana: dias.length > 0 ? dias : null,
      hora_inicio: (formData.get("hora_inicio") as string) || null,
      hora_fim: (formData.get("hora_fim") as string) || null,
      capacidade: toNumberOrNull(formData.get("capacidade")),
      data_inicio: (formData.get("data_inicio") as string) || null,
      data_fim: (formData.get("data_fim") as string) || null,
      status: (formData.get("status") as string) || "EM_PREPARACAO",
      encerramento_automatico: formData.get("encerramento_automatico") === "on",
      carga_horaria_prevista: toNumberOrNull(formData.get("carga_horaria_prevista")),
      frequencia_minima_percentual: toNumberOrNull(formData.get("frequencia_minima_percentual")),
      observacoes: (formData.get("observacoes") as string) || null,
    };

    const { error } = await supabase.from("turmas").insert(payload);

    setSaving(false);

    if (error) {
      setErro(error.message);
      return;
    }

    router.push("/escola/academico/turmas");
  }

  const diasSemana = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Acadêmico</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Nova turma</h1>
          <p className="mt-1 text-sm text-slate-500">
            Preencha os dados básicos da turma. Ajustes mais avançados (avaliações, ensaios, etc.) poderão ser feitos
            depois.
          </p>
        </header>

        {erro && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-700">{erro}</div>
        )}

        <form
          action={handleSubmit}
          className="space-y-6 rounded-3xl border border-violet-100 bg-white/95 p-6 shadow-sm"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Tipo de turma</label>
              <select
                name="tipo_turma"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                defaultValue="REGULAR"
              >
                {tiposTurma.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</label>
              <select
                name="status"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                defaultValue="EM_PREPARACAO"
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Nome da turma</label>
              <input
                name="nome"
                required
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Curso</label>
                <input
                  name="curso"
                  required
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Nível</label>
                <input name="nivel" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Turno</label>
                <select
                  name="turno"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  defaultValue=""
                >
                  <option value="">—</option>
                  {turnos.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Ano de referência</label>
                <input
                  name="ano_referencia"
                  type="number"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Capacidade (alunos)</label>
                <input
                  name="capacidade"
                  type="number"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Dias da semana</label>
              <div className="mt-1 flex flex-wrap gap-2 text-sm text-slate-700">
                {diasSemana.map((dia) => (
                  <label
                    key={dia}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1"
                  >
                    <input type="checkbox" name="dias_semana" value={dia} className="h-3 w-3" />
                    <span>{dia}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Hora de início</label>
                <input
                  type="time"
                  name="hora_inicio"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Hora de fim</label>
                <input
                  type="time"
                  name="hora_fim"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Data de início</label>
                <input
                  type="date"
                  name="data_inicio"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Data de fim</label>
                <input
                  type="date"
                  name="data_fim"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Carga horária prevista</label>
                <input
                  type="number"
                  step="0.5"
                  name="carga_horaria_prevista"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Frequência mínima (%) para conclusão
                </label>
                <input
                  type="number"
                  step="1"
                  name="frequencia_minima_percentual"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input id="encerramento_automatico" type="checkbox" name="encerramento_automatico" className="h-4 w-4" />
              <label htmlFor="encerramento_automatico" className="text-xs text-slate-600">
                Encerrar automaticamente ao passar da data de fim (com aviso)
              </label>
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Observações da turma</label>
              <textarea
                name="observacoes"
                rows={3}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push("/escola/academico/turmas")}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
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
