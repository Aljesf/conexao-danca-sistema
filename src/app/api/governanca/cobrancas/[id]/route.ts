import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

type RouteContext = { params: Promise<{ id: string }> };

type CobrancaDetalheRow = {
  id: number;
  pessoa_id: number;
  descricao: string;
  vencimento: string;
  valor_centavos: number;
  status: string;
  neofin_charge_id: string | null;
  link_pagamento: string | null;
  linha_digitavel: string | null;
  neofin_payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  pessoa: { nome: string | null; cpf: string | null; email: string | null; telefone: string | null } | null;
};

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const { id } = await params;
  const cobrancaId = Number(id);

  if (!Number.isFinite(cobrancaId) || cobrancaId <= 0) {
    return NextResponse.json({ ok: false, error: "cobranca_id_invalido" }, { status: 400 });
  }

  const { data, error } = await supabase
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
      neofin_payload,
      created_at,
      updated_at,
      pessoa:pessoas(nome,cpf,email,telefone)
      `,
    )
    .eq("id", cobrancaId)
    .maybeSingle<CobrancaDetalheRow>();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "cobranca_nao_encontrada" }, { status: 404 });
  }

  return NextResponse.json(
    {
      ok: true,
      data: {
        ...data,
        pessoa_nome: data.pessoa?.nome ?? null,
      },
    },
    { status: 200 },
  );
}

