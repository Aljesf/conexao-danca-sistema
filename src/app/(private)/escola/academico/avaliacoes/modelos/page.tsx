import Link from "next/link";

import { listarModelos } from "@/lib/avaliacoes/modelosServer";
import type { ModeloAvaliacao } from "@/types/avaliacoes";

export const dynamic = "force-dynamic";

function contarItens(grupos: ModeloAvaliacao["grupos"]) {
  if (!grupos) return 0;
  return grupos.reduce((acc, g) => acc + (g.itens?.length ?? 0), 0);
}

export default async function ModelosPage() {
  const modelos: ModeloAvaliacao[] = await listarModelos();

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Avaliações
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              📚 Modelos de avaliação
            </h1>
            <p className="text-sm text-slate-500">
              Estruture grupos e conceitos permitidos para aplicar em turmas.
            </p>
          </div>
          <Link
            href="/escola/academico/avaliacoes/modelos/novo"
            className="inline-flex items-center rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700"
          >
            + Novo modelo
          </Link>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm">
          {modelos.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum modelo de avaliação cadastrado ainda.
            </p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left">Nome</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Obrigatória</th>
                  <th className="px-3 py-2 text-left">Ativo</th>
                  <th className="px-3 py-2 text-left">Grupos / Itens</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {modelos.map((m) => {
                  const gruposCount = m.grupos?.length ?? 0;
                  const itensCount = contarItens(m.grupos);
                  return (
                    <tr key={m.id}>
                      <td className="px-3 py-2 font-medium">{m.nome}</td>
                      <td className="px-3 py-2 text-xs">{m.tipo_avaliacao ?? "—"}</td>
                      <td className="px-3 py-2 text-xs">{m.obrigatoria ? "Sim" : "Não"}</td>
                      <td className="px-3 py-2 text-xs">
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                            m.ativo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {m.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {gruposCount} grupos / {itensCount} itens
                      </td>
                      <td className="px-3 py-2 text-right text-xs">
                        <Link
                          href={`/escola/academico/avaliacoes/modelos/${m.id}/editar`}
                          className="text-violet-600 hover:underline"
                        >
                          Editar
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
