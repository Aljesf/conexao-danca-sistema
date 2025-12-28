import Link from "next/link";

import { listarTurmas } from "@/lib/academico/turmasServer";
import type { Turma } from "@/types/turmas";

export const dynamic = "force-dynamic";

export default async function TurmasPage() {
  const turmas: Turma[] = await listarTurmas();

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Acadêmico
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">
              📚 Turmas
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Visualize e gerencie as turmas da escola.
            </p>
          </div>
          <Link
            href="/escola/academico/turmas/nova"
            className="inline-flex items-center rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700"
          >
            + Nova turma
          </Link>
        </header>

        <section className="rounded-3xl border border-violet-100 bg-white/95 p-4 shadow-sm">
          {turmas.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma turma cadastrada ainda.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left">Turma</th>
                  <th className="px-3 py-2 text-left">Curso / Nível</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Turno</th>
                  <th className="px-3 py-2 text-left">Ano</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Frequência mín.</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {turmas.map((turma) => (
                  <tr key={turma.turma_id}>
                    <td className="px-3 py-2 font-medium">{turma.nome ?? "Turma"}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span>{turma.curso ?? "—"}</span>
                        {turma.nivel && (
                          <span className="text-xs text-slate-500">{turma.nivel}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs">{turma.tipo_turma ?? "REGULAR"}</td>
                    <td className="px-3 py-2 text-xs">{turma.turno ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{turma.ano_referencia ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{turma.status ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">
                      {turma.frequencia_minima_percentual ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-xs">
                      <Link
                        href={`/academico/turmas/${turma.turma_id}`}
                        className="text-violet-600 hover:underline"
                      >
                        Detalhes
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
