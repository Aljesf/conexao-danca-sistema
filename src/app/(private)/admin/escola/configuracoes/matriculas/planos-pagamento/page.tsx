export const dynamic = "force-dynamic";

import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { FinanceHelpCard } from "@/components/FinanceHelpCard";

type Plano = {
  id: number;
  titulo: string | null;
  nome: string | null;
  ciclo_cobranca: "COBRANCA_UNICA" | "COBRANCA_EM_PARCELAS" | "COBRANCA_MENSAL" | null;
  numero_parcelas: number | null;
  permite_prorrata: boolean | null;
  ativo: boolean | null;
  created_at: string;
};

export default async function Page() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("matricula_planos_pagamento")
    .select("id,titulo,nome,ciclo_cobranca,numero_parcelas,permite_prorrata,ativo,created_at")
    .order("ativo", { ascending: false })
    .order("created_at", { ascending: false });

  const planos = (data ?? []) as Plano[];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Planos de pagamento (Matricula)</h1>
              <p className="text-sm text-slate-600">
                O plano define apenas como pagar. Valores ficam na Tabela de Precos.
              </p>
            </div>
            <Link
              href="/admin/escola/configuracoes/matriculas/planos-pagamento/novo"
              className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow"
            >
              Novo plano
            </Link>
          </div>
        </div>

        <FinanceHelpCard
          subtitle="Entenda esta tela"
          items={[
            "Ciclo de cobranca define unico, parcelado ou mensal.",
            "Numero de parcelas so faz sentido para COBRANCA_EM_PARCELAS.",
            "Prorrata afeta apenas a primeira cobranca.",
          ]}
        />

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Falha ao carregar planos: {error.message}
            </div>
          ) : null}

          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">ID</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Titulo</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Ciclo</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Parcelas</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Prorrata</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Ativo</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {planos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-3 text-sm text-slate-600">
                      Nenhum plano cadastrado.
                    </td>
                  </tr>
                ) : (
                  planos.map((p) => {
                    const titulo = p.titulo || p.nome || "Sem titulo";
                    const parcelas = p.ciclo_cobranca === "COBRANCA_EM_PARCELAS" ? p.numero_parcelas ?? "-" : "-";
                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-800">{p.id}</td>
                        <td className="px-3 py-2 text-slate-700">{titulo}</td>
                        <td className="px-3 py-2 text-slate-700">{p.ciclo_cobranca ?? "-"}</td>
                        <td className="px-3 py-2 text-slate-700">{parcelas}</td>
                        <td className="px-3 py-2 text-slate-700">{p.permite_prorrata ? "Permite" : "Nao"}</td>
                        <td className="px-3 py-2 text-slate-700">{p.ativo ? "Sim" : "Nao"}</td>
                        <td className="px-3 py-2 text-right">
                          <Link
                            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                            href={`/admin/escola/configuracoes/matriculas/planos-pagamento/${p.id}`}
                          >
                            Abrir
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
