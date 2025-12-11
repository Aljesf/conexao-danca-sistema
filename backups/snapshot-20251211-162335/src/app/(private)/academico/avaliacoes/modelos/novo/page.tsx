import { listarConceitos } from "@/lib/avaliacoes/conceitosServer";
import { ModeloForm } from "../ModeloForm";

export default async function NovoModeloPage() {
  const conceitos = await listarConceitos();
  const conceitosAtivos = conceitos.filter((c) => c.ativo ?? true);

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Avaliações
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">Novo modelo de avaliação</h1>
          <p className="text-sm text-slate-500">
            Defina grupos e conceitos permitidos para aplicar nas turmas.
          </p>
        </header>

        <ModeloForm conceitos={conceitosAtivos} />
      </div>
    </div>
  );
}
