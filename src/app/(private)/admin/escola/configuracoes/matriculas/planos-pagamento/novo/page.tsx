export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

function toBool(value: FormDataEntryValue | null): boolean {
  return value === "on";
}

export default function Page() {
  async function create(formData: FormData): Promise<void> {
    "use server";
    const supabase = getSupabaseAdmin();

    const titulo = String(formData.get("titulo") ?? "").trim();
    const descricao = String(formData.get("descricao") ?? "").trim() || null;
    const periodicidade = String(formData.get("periodicidade") ?? "MENSAL").trim();
    const numero_parcelas = Number(formData.get("numero_parcelas") ?? 1);
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

    const { data, error } = await supabase
      .from("matricula_planos_pagamento")
      .insert({
        titulo,
        descricao,
        periodicidade,
        numero_parcelas: parcelasFinal,
        permite_prorata,
        ativo,
      })
      .select("id")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Falha ao criar plano.");

    redirect(`/admin/escola/configuracoes/matriculas/planos-pagamento/${data.id}`);
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold">Novo plano de pagamento</h1>
        <p className="text-sm text-muted-foreground">
          Defina periodicidade e regras gerais. Valores ficam na <b>Tabela de Matricula</b>.
        </p>
      </div>

      <form action={create} className="rounded-md border p-4 space-y-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Titulo</label>
          <input
            name="titulo"
            className="border rounded-md px-3 py-2 text-sm"
            placeholder="Ex.: Mensal padrao (Cartao Conexao)"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Descricao (opcional)</label>
          <textarea
            name="descricao"
            className="border rounded-md px-3 py-2 text-sm"
            rows={3}
            placeholder="Regras ou observacoes internas."
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Periodicidade</label>
            <select name="periodicidade" className="border rounded-md px-3 py-2 text-sm" defaultValue="MENSAL">
              <option value="MENSAL">MENSAL</option>
              <option value="AVISTA">AVISTA</option>
              <option value="PARCELADO">PARCELADO</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Numero de parcelas</label>
            <input name="numero_parcelas" type="number" defaultValue={1} className="border rounded-md px-3 py-2 text-sm" />
            <p className="text-xs text-muted-foreground">Para MENSAL/AVISTA, sera salvo como 1.</p>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Permite pro-rata</label>
            <label className="flex items-center gap-2 text-sm mt-2">
              <input name="permite_prorata" type="checkbox" defaultChecked />
              Sim
            </label>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input name="ativo" type="checkbox" defaultChecked />
          Plano ativo
        </label>

        <div className="flex justify-end">
          <button className="rounded-md bg-black px-3 py-2 text-sm text-white" type="submit">
            Criar plano
          </button>
        </div>
      </form>
    </div>
  );
}
