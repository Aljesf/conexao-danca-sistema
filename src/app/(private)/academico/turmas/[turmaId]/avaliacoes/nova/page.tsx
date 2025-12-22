import Link from "next/link";

import { listarTurma } from "@/lib/academico/turmasServer";
import { listarModelos } from "@/lib/avaliacoes/modelosServer";

import { criarTurmaAvaliacaoAction } from "../actions";

export default async function NovaAvaliacaoDaTurmaPage({
  params,
}: {
  params: { turmaId: string };
}) {
  const turmaId = Number(params.turmaId);
  const turma = await listarTurma(turmaId);
  const modelos = await listarModelos();
  const modelosAtivos = modelos.filter((m) => m.ativo ?? true);

  async function submitAction(formData: FormData) {
    "use server";
    return criarTurmaAvaliacaoAction(turmaId, formData);
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Avaliações
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">
            📚 Nova avaliação da turma
          </h1>
          <p className="text-sm text-slate-500">
            {turma.nome ?? turma.nome_turma} • {turma.curso ?? turma.modalidade ?? "—"}
            {turma.nivel ? ` • ${turma.nivel}` : ""}
          </p>
        </header>

        <form action={submitAction} className="space-y-4 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Modelo de avaliação
              </label>
              <select
                name="modeloId"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                defaultValue=""
              >
                <option value="" disabled>
                  Selecione um modelo
                </option>
                {modelosAtivos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome} ({m.tipo_avaliacao ?? "—"})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" name="obrigatoria" className="h-4 w-4" />
              <span className="text-sm text-slate-700">Avaliação obrigatória</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Título
            </label>
            <input
              name="titulo"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              placeholder="Ex.: Avaliação de barra - Nível 1"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Descrição (opcional)
            </label>
            <textarea
              name="descricao"
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Data prevista
              </label>
              <input
                type="date"
                name="data_prevista"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <p className="text-xs text-slate-500 mt-6">
                Status inicial: RASCUNHO
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Link
              href={`/academico/turmas/${turmaId}`}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700"
            >
              Salvar avaliação
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
