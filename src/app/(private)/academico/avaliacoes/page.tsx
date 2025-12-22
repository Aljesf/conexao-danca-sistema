import Link from "next/link";

import { getSupabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

async function carregarMetricas() {
  const supabase = await getSupabaseServer();

  const [{ count: modelosCount, error: modelosError }, { count: conceitosCount, error: conceitosError }, { count: avaliacoesCount, error: avaliacoesError }] =
    await Promise.all([
      supabase.from("avaliacoes_modelo").select("*", { count: "exact", head: true }).eq("ativo", true),
      supabase.from("avaliacoes_conceitos").select("*", { count: "exact", head: true }).eq("ativo", true),
      supabase.from("turma_avaliacoes").select("*", { count: "exact", head: true }),
    ]);

  if (modelosError || conceitosError || avaliacoesError) {
    console.error("Erro no dashboard de avaliações:", modelosError || conceitosError || avaliacoesError);
    return { modelos: 0, conceitos: 0, avaliacoes: 0, erro: true };
  }

  return {
    modelos: modelosCount ?? 0,
    conceitos: conceitosCount ?? 0,
    avaliacoes: avaliacoesCount ?? 0,
    erro: false,
  };
}

export default async function AvaliacoesDashboardPage() {
  const metricas = await carregarMetricas();

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Acadêmico</p>
          <h1 className="text-2xl font-semibold text-slate-900">📚 Avaliações</h1>
          <p className="text-sm text-slate-500">
            Gerencie conceitos, modelos e avaliações aplicadas nas turmas.
          </p>
          {metricas.erro && (
            <p className="text-xs text-rose-600">
              Não foi possível carregar os dados de avaliações.
            </p>
          )}
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CardResumo
            titulo="Modelos ativos"
            valor={metricas.modelos}
            linkHref="/academico/avaliacoes/modelos"
            linkLabel="Ver modelos"
          />
          <CardResumo
            titulo="Conceitos disponíveis"
            valor={metricas.conceitos}
            linkHref="/academico/avaliacoes/conceitos"
            linkLabel="Ver conceitos"
          />
          <CardResumo
            titulo="Avaliações lançadas"
            valor={metricas.avaliacoes}
            linkHref="#"
            linkLabel="Ver turma"
            disabled
          />
        </section>
      </div>
    </div>
  );
}

function CardResumo({
  titulo,
  valor,
  linkHref,
  linkLabel,
  disabled,
}: {
  titulo: string;
  valor: number;
  linkHref: string;
  linkLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm">
      <p className="text-sm text-slate-500">{titulo}</p>
      <p className="text-2xl font-semibold text-violet-700">{valor}</p>
      <div className="mt-2">
        {disabled ? (
          <span className="text-xs text-slate-400">{linkLabel} (em breve)</span>
        ) : (
          <Link href={linkHref} className="text-xs font-semibold text-violet-700 hover:underline">
            {linkLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
