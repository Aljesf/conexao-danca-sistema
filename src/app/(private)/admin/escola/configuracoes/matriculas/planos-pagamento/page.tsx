export const dynamic = "force-dynamic";

import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type Plano = {
  id: number;
  titulo: string;
  descricao: string | null;
  periodicidade: "MENSAL" | "AVISTA" | "PARCELADO";
  numero_parcelas: number;
  permite_prorata: boolean;
  ativo: boolean;
  created_at: string;
};

export default async function Page() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("matricula_planos_pagamento")
    .select("id,titulo,descricao,periodicidade,numero_parcelas,permite_prorata,ativo,created_at")
    .order("ativo", { ascending: false })
    .order("created_at", { ascending: false });

  const planos = (data ?? []) as Plano[];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Planos de pagamento (Matricula)</h1>
          <p className="text-sm text-muted-foreground">
            Configure como o pagamento pode ser parcelado/recorrente. A <b>Tabela de Matricula</b> define valores; o
            <b> Plano</b> define apenas <i>como pagar</i>.
          </p>
        </div>

        <Link
          href="/admin/escola/configuracoes/matriculas/planos-pagamento/novo"
          className="inline-flex items-center rounded-md bg-black px-3 py-2 text-sm text-white"
        >
          Novo plano
        </Link>
      </div>

      <div className="rounded-md border p-4">
        <div className="font-medium">Entenda esta tela</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            <b>Periodicidade</b>: Mensal, A vista ou Parcelado.
          </li>
          <li>
            <b>Numero de parcelas</b> faz sentido para <b>PARCELADO</b>. Para MENSAL e AVISTA, manter 1.
          </li>
          <li>
            <b>Permite pro-rata</b>: se o plano aceita pro-rata quando a matricula ocorre apos o corte.
          </li>
        </ul>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Falha ao carregar planos: {error.message}
        </div>
      ) : null}

      <div className="rounded-md border overflow-hidden">
        <div className="grid grid-cols-12 bg-muted px-3 py-2 text-xs font-medium">
          <div className="col-span-1">ID</div>
          <div className="col-span-4">Titulo</div>
          <div className="col-span-2">Periodicidade</div>
          <div className="col-span-1">Parcelas</div>
          <div className="col-span-2">Pro-rata</div>
          <div className="col-span-1">Ativo</div>
          <div className="col-span-1 text-right">Acoes</div>
        </div>

        {planos.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">Nenhum plano cadastrado.</div>
        ) : (
          <div className="divide-y">
            {planos.map((p) => (
              <div key={p.id} className="grid grid-cols-12 px-3 py-2 text-sm items-center">
                <div className="col-span-1">{p.id}</div>
                <div className="col-span-4">{p.titulo}</div>
                <div className="col-span-2">{p.periodicidade}</div>
                <div className="col-span-1">{p.numero_parcelas}</div>
                <div className="col-span-2">{p.permite_prorata ? "Permite" : "Nao"}</div>
                <div className="col-span-1">{p.ativo ? "Sim" : "Nao"}</div>
                <div className="col-span-1 text-right">
                  <Link className="underline" href={`/admin/escola/configuracoes/matriculas/planos-pagamento/${p.id}`}>
                    Abrir
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
