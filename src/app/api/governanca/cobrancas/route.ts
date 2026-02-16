import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

type CobrancaRow = {
  id: number;
  pessoa_id: number;
  descricao: string;
  vencimento: string;
  valor_centavos: number;
  status: string;
  neofin_charge_id: string | null;
  link_pagamento: string | null;
  linha_digitavel: string | null;
  created_at: string;
  updated_at: string;
  pessoa: { nome: string | null } | null;
};

type CobrancaGovernancaItem = {
  id: number;
  pessoa_id: number;
  pessoa_nome: string | null;
  descricao: string;
  vencimento: string;
  valor_centavos: number;
  status: string;
  neofin_charge_id: string | null;
  link_pagamento: string | null;
  linha_digitavel: string | null;
  created_at: string;
  updated_at: string;
};

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const url = new URL(req.url);
  const status = url.searchParams.get("status")?.trim() ?? "";
  const somenteIntegradas = ["1", "true", "sim"].includes(
    (url.searchParams.get("somente_integradas") ?? "").toLowerCase(),
  );
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();

  let query = supabase
    .from("cobrancas")
    .select(
      `
      id,
      pessoa_id,
      descricao,
      vencimento,
      valor_centavos,
      status,
      neofin_charge_id,
      link_pagamento,
      linha_digitavel,
      created_at,
      updated_at,
      pessoa:pessoas(nome)
      `,
    )
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  if (somenteIntegradas) {
    query = query.not("neofin_charge_id", "is", null);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[GET /api/governanca/cobrancas] erro:", error);
    return NextResponse.json(
      { ok: false, error: "erro_listar_cobrancas", detail: error.message },
      { status: 500 },
    );
  }

  let items: CobrancaGovernancaItem[] = ((data ?? []) as CobrancaRow[]).map((row) => ({
    id: row.id,
    pessoa_id: row.pessoa_id,
    pessoa_nome: row.pessoa?.nome ?? null,
    descricao: row.descricao,
    vencimento: row.vencimento,
    valor_centavos: row.valor_centavos,
    status: row.status,
    neofin_charge_id: row.neofin_charge_id,
    link_pagamento: row.link_pagamento,
    linha_digitavel: row.linha_digitavel,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  if (q) {
    items = items.filter((item) => {
      const pessoaNome = (item.pessoa_nome ?? "").toLowerCase();
      const descricao = (item.descricao ?? "").toLowerCase();
      const chargeId = (item.neofin_charge_id ?? "").toLowerCase();
      const linha = (item.linha_digitavel ?? "").toLowerCase();
      const itemId = String(item.id);
      return (
        pessoaNome.includes(q) ||
        descricao.includes(q) ||
        chargeId.includes(q) ||
        linha.includes(q) ||
        itemId.includes(q)
      );
    });
  }

  return NextResponse.json({ ok: true, data: items }, { status: 200 });
}

