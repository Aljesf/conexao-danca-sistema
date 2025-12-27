export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { FinanceHelpCard } from "@/components/FinanceHelpCard";
import { PlanosPagamentoForm } from "./PlanosPagamentoForm";

function toBool(v: FormDataEntryValue | null): boolean {
  return v === "on";
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
    if (!["MENSAL", "AVISTA", "PARCELADO"].includes(periodicidade)) throw new Error("Periodicidade invalida.");
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Novo plano de pagamento</h1>
              <p className="text-sm text-slate-600">
                Defina a periodicidade e regras gerais. Valores ficam na Tabela de Matricula.
              </p>
            </div>
          </div>
        </div>

        <FinanceHelpCard
          subtitle="Entenda esta tela"
          items={[
            "Periodicidade define o tipo do plano (mensal, a vista ou parcelado).",
            "Numero de parcelas so faz sentido para PARCELADO.",
            "Permite pro-rata libera entrada proporcional quando matricula apos o corte.",
          ]}
        />

        <PlanosPagamentoForm mode="create" action={create} submitLabel="Criar plano" />
      </div>
    </div>
  );
}
