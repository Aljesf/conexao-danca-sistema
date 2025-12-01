import { notFound } from "next/navigation";

import { listarConceitos } from "@/lib/avaliacoes/conceitosServer";
import { buscarModelo } from "@/lib/avaliacoes/modelosServer";
import type { ModeloAvaliacao } from "@/types/avaliacoes";
import { ModeloForm } from "../../ModeloForm";

export default async function EditarModeloPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (Number.isNaN(id)) {
    notFound();
  }

  const [modelo, conceitos] = await Promise.all([
    buscarModelo(id),
    listarConceitos(),
  ]);

  if (!modelo) {
    notFound();
  }

  const conceitosAtivos = conceitos.filter((c) => c.ativo ?? true);

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Avaliações
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">Editar modelo</h1>
          <p className="text-sm text-slate-500">
            Ajuste o modelo de avaliação selecionado.
          </p>
        </header>

        <ModeloForm
          modeloId={id}
          conceitos={conceitosAtivos}
          defaultValues={{
            nome: (modelo as ModeloAvaliacao).nome ?? "",
            descricao: modelo.descricao ?? "",
            tipo_avaliacao: modelo.tipo_avaliacao ?? "PRATICA",
            obrigatoria: modelo.obrigatoria ?? false,
            grupos: modelo.grupos ?? [],
            conceitos_ids: modelo.conceitos_ids ?? [],
            ativo: modelo.ativo ?? true,
          }}
        />
      </div>
    </div>
  );
}
