import Link from "next/link";

import { getSupabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type PessoaResumo = {
  id: number;
  nome: string | null;
  foto_url?: string | null;
};

export default async function CurriculoListaPage() {
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from("pessoas")
    .select("id, nome, foto_url")
    .order("nome", { ascending: true })
    .limit(100);

  const pessoas = (data ?? []) as PessoaResumo[];

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Acadêmico
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Currículos
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Consulte o currículo detalhado de cada pessoa.
          </p>
          {error && (
            <p className="mt-2 text-xs text-rose-600">
              Erro ao carregar pessoas: {error.message}
            </p>
          )}
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm">
          {pessoas.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhuma pessoa encontrada para exibir o currículo.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pessoas.map((pessoa) => (
                <Link
                  key={pessoa.id}
                  href={`/pessoas/${pessoa.id}/curriculo`}
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 transition hover:border-violet-200 hover:bg-white"
                >
                  {pessoa.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pessoa.foto_url}
                      alt={pessoa.nome ?? "Foto"}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
                      {(pessoa.nome ?? "CD")
                        .split(" ")
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-900">
                      {pessoa.nome ?? "Pessoa"}
                    </span>
                    <span className="text-xs text-violet-600">
                      Ver currículo
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
