export default function CafeHomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Ballet Cafe</h1>
          <p className="mt-1 text-sm text-slate-600">
            Operacao do Cafe: caixa e visao rapida do dia (dashboard basico sera evoluido).
          </p>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold">Dashboard</div>
          <p className="mt-1 text-sm text-slate-600">
            (MVP) Em breve: total vendido hoje, quantidade de vendas e top produtos.
          </p>
        </div>
      </div>
    </div>
  );
}
