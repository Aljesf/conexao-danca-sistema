import Link from "next/link";

export default function AdminBolsasHomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Bolsas & Projetos Sociais</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestao institucional de projetos sociais, tipos de bolsa, concessoes e investimento (ledger) - sem mexer no
            caixa.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" href="/administracao/bolsas/projetos">
              Projetos sociais
            </Link>
            <Link className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" href="/administracao/bolsas/tipos">
              Tipos de bolsa
            </Link>
            <Link
              className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
              href="/administracao/bolsas/concessoes"
            >
              Concessoes
            </Link>
            <Link className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" href="/administracao/bolsas/ledger">
              Ledger (investimento)
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold">MVP</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Primeiro cadastre 1 Projeto Social (ex.: Movimento Conexao Danca).</li>
            <li>Depois cadastre Tipos de Bolsa (Integral, Percentual, Valor final familia).</li>
            <li>Depois crie Concessoes para alunos (pessoas).</li>
            <li>Por fim, gere um lancamento no ledger por competencia (YYYY-MM).</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
