export default function BolsasLedgerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Ledger (Investimento em bolsas)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            MVP: aqui vamos gerar e visualizar lancamentos por competencia (YYYY-MM) sem mexer no modulo financeiro.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Proximo passo aqui: formulario chamando POST /api/bolsas/ledger/gerar (competencia + concessao + valor
            contratado).
          </p>
        </div>
      </div>
    </div>
  );
}
