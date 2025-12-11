import { ConceitoForm } from "../ConceitoForm";

export default function NovoConceitoPage() {
  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Avaliações
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">Novo conceito</h1>
          <p className="text-sm text-slate-500">
            Cadastre um conceito para usar nas avaliações das turmas.
          </p>
        </header>

        <ConceitoForm />
      </div>
    </div>
  );
}
