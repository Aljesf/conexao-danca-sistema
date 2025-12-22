import Link from "next/link";

import {
  listarConceitos,
} from "@/lib/avaliacoes/conceitosServer";
import type { ConceitoAvaliacao } from "@/types/avaliacoes";

export const dynamic = "force-dynamic";

export default async function ConceitosPage() {
  const conceitos: ConceitoAvaliacao[] = await listarConceitos();

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Acadêmico
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              📚 Conceitos de avaliação
            </h1>
            <p className="text-sm text-slate-500">
              Gerencie códigos e rótulos de conceitos usados nas avaliações.
            </p>
          </div>
          <Link
            href="/academico/avaliacoes/conceitos/novo"
            className="inline-flex items-center rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700"
          >
            + Novo conceito
          </Link>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm">
          {conceitos.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum conceito cadastrado ainda.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left">Código</th>
                  <th className="px-3 py-2 text-left">Rótulo</th>
                  <th className="px-3 py-2 text-left">Ordem</th>
                  <th className="px-3 py-2 text-left">Ativo</th>
                  <th className="px-3 py-2 text-left">Cor</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {conceitos.map((c) => (
                  <tr key={c.id}>
                    <td className="px-3 py-2 font-medium">{c.codigo}</td>
                    <td className="px-3 py-2">{c.rotulo}</td>
                    <td className="px-3 py-2 text-xs">{c.ordem ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                          c.ativo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {c.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {c.cor_hex ? (
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-block h-4 w-4 rounded-full border border-slate-200"
                            style={{ backgroundColor: c.cor_hex }}
                          />
                          {c.cor_hex}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-xs">
                      <Link
                        href={`/academico/avaliacoes/conceitos/${c.id}/editar`}
                        className="text-violet-600 hover:underline"
                      >
                        Editar
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
