export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type Plano = {
  id: number;
  titulo: string;
  descricao: string | null;
  periodicidade: "MENSAL" | "AVISTA" | "PARCELADO";
  numero_parcelas: number;
  permite_prorata: boolean;
  ativo: boolean;
};

function toBool(value: FormDataEntryValue | null): boolean {
  return value === "on";
}

export default async function Page({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) redirect("/admin/escola/configuracoes/matriculas/planos-pagamento");

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("matricula_planos_pagamento")
    .select("id,titulo,descricao,periodicidade,numero_parcelas,permite_prorata,ativo")
    .eq("id", id)
    .single();

  const plano = data as Plano | null;

  if (error || !plano) {
    return (
      <div className="p-6">
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Plano nao encontrado: {error?.message ?? "Erro desconhecido"}
        </div>
      </div>
    );
  }

  async function save(formData: FormData): Promise<void> {
    "use server";
    const supabase2 = getSupabaseAdmin();

    const titulo = String(formData.get("titulo") ?? "").trim();
    const descricao = String(formData.get("descricao") ?? "").trim() || null;
    const periodicidade = String(formData.get("periodicidade") ?? plano.periodicidade).trim();
    const numero_parcelas = Number(formData.get("numero_parcelas") ?? plano.numero_parcelas);
    const permite_prorata = toBool(formData.get("permite_prorata"));
    const ativo = toBool(formData.get("ativo"));

    if (!titulo) throw new Error("Titulo e obrigatorio.");
    if (!"MENSAL AVISTA PARCELADO".split(" ").includes(periodicidade)) {
      throw new Error("Periodicidade invalida.");
    }
    if (!Number.isFinite(numero_parcelas) || numero_parcelas < 1 || numero_parcelas > 36) {
      throw new Error("Numero de parcelas invalido (1..36).");
    }

    const parcelasFinal = periodicidade === "PARCELADO" ? numero_parcelas : 1;

    const { error: updateErr } = await supabase2
      .from("matricula_planos_pagamento")
      .update({
        titulo,
        descricao,
        periodicidade,
        numero_parcelas: parcelasFinal,
        permite_prorata,
        ativo,
      })
      .eq("id", id);

    if (updateErr) throw new Error(updateErr.message);
    redirect(`/admin/escola/configuracoes/matriculas/planos-pagamento/${id}`);
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold">Plano #{plano.id}</h1>
        <p className="text-sm text-muted-foreground">Edite as regras gerais do plano.</p>
      </div>

      <form action={save} className="rounded-md border p-4 space-y-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Titulo</label>
          <input name="titulo" defaultValue={plano.titulo} className="border rounded-md px-3 py-2 text-sm" />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Descricao (opcional)</label>
          <textarea
            name="descricao"
            defaultValue={plano.descricao ?? ""}
            className="border rounded-md px-3 py-2 text-sm"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Periodicidade</label>
            <select name="periodicidade" className="border rounded-md px-3 py-2 text-sm" defaultValue={plano.periodicidade}>
              <option value="MENSAL">MENSAL</option>
              <option value="AVISTA">AVISTA</option>
              <option value="PARCELADO">PARCELADO</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Numero de parcelas</label>
            <input
              name="numero_parcelas"
              type="number"
              defaultValue={plano.numero_parcelas}
              className="border rounded-md px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted-foreground">Para MENSAL/AVISTA, sera salvo como 1.</p>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Permite pro-rata</label>
            <label className="flex items-center gap-2 text-sm mt-2">
              <input name="permite_prorata" type="checkbox" defaultChecked={plano.permite_prorata} />
              Sim
            </label>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input name="ativo" type="checkbox" defaultChecked={plano.ativo} />
          Plano ativo
        </label>

        <div className="flex justify-end">
          <button className="rounded-md bg-black px-3 py-2 text-sm text-white" type="submit">
            Salvar plano
          </button>
        </div>
      </form>
    </div>
  );
}
