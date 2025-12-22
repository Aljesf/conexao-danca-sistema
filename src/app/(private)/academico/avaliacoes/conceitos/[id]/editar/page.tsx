import { notFound } from "next/navigation";

import { buscarConceito } from "@/lib/avaliacoes/conceitosServer";

import { ConceitoForm } from "../../ConceitoForm";

export default async function EditarConceitoPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (Number.isNaN(id)) {
    notFound();
  }

  const conceito = await buscarConceito(id);
  if (!conceito) {
    notFound();
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Avaliações
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">📚 Editar conceito</h1>
          <p className="text-sm text-slate-500">
            Ajuste os dados do conceito selecionado.
          </p>
        </header>

        <ConceitoForm
          conceitoId={id}
          defaultValues={{
            codigo: conceito.codigo ?? "",
            rotulo: conceito.rotulo ?? "",
            descricao: conceito.descricao ?? "",
            ordem: conceito.ordem ?? 1,
            cor_hex: conceito.cor_hex ?? "",
            ativo: conceito.ativo ?? true,
          }}
        />
      </div>
    </div>
  );
}
