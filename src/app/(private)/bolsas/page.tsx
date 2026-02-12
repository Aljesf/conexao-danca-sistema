import Link from "next/link";

export default function BolsasHomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Bolsas & Projetos Sociais</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Contexto institucional para gestao de projetos sociais, concessoes de bolsa e ledger de investimento.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" href="/bolsas/projetos">
              Projetos sociais
            </Link>
            <Link className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" href="/bolsas/tipos">
              Tipos de bolsa
            </Link>
            <Link className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" href="/bolsas/concessoes">
              Concessoes
            </Link>
            <Link className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" href="/bolsas/ledger">
              Ledger de investimento
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
