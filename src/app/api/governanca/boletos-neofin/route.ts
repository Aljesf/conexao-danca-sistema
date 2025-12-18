import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

type ListItem = {
  cobranca_id: number;
  pessoa_id: number;
  pessoa_nome: string | null;
  centro_custo_id: number | null;
  centro_custo_codigo: string | null;
  centro_custo_nome: string | null;
  descricao: string;
  valor_centavos: number;
  vencimento: string;
  cobranca_status: string;
  neofin_charge_id: string;
  link_pagamento: string | null;
  linha_digitavel: string | null;
  cobranca_criada_em: string;
  cobranca_atualizada_em: string;
  total_recebido_centavos: number;
  ultimo_pagamento_em: string | null;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const status = searchParams.get("status");
  const q = searchParams.get("q");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const centroCustoId = searchParams.get("centro_custo_id");

  const supabase = await getSupabaseServer();

  let query = supabase
    .from("vw_governanca_boletos_neofin")
    .select("*")
    .order("cobranca_criada_em", { ascending: false });

  if (status) query = query.eq("cobranca_status", status);
  if (centroCustoId) {
    const parsed = Number(centroCustoId);
    if (!Number.isNaN(parsed)) query = query.eq("centro_custo_id", parsed);
  }
  if (from) query = query.gte("vencimento", from);
  if (to) query = query.lte("vencimento", to);

  if (q && q.trim().length > 0) {
    const qq = q.trim().replace(/,/g, " ");
    query = query.or(
      [
        `pessoa_nome.ilike.%${qq}%`,
        `descricao.ilike.%${qq}%`,
        `linha_digitavel.ilike.%${qq}%`,
        `neofin_charge_id.ilike.%${qq}%`,
      ].join(",")
    );
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { ok: false, error: "erro_listar_boletos", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, items: (data ?? []) as ListItem[] });
}
