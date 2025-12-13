import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[/api/financeiro/contas-financeiras] Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas."
  );
}

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("contas_financeiras")
    .select(
      `
      id,
      codigo,
      nome,
      tipo,
      banco,
      agencia,
      numero_conta,
      centro_custo_id,
      ativo,
      created_at,
      updated_at,
      centros_custo:centro_custo_id ( id, nome )
    `
    )
    .order("ativo", { ascending: false })
    .order("nome", { ascending: true });

  if (error) {
    console.error("[GET /api/financeiro/contas-financeiras] Erro ao listar contas:", error);
    return NextResponse.json(
      { error: "Erro ao listar contas financeiras" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, contas: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalido." }, { status: 400 });
  }

  const {
    id,
    codigo,
    nome,
    tipo,
    banco,
    agencia,
    numero_conta,
    centro_custo_id,
    ativo,
  } = body ?? {};

  if (!codigo || !nome || !tipo) {
    return NextResponse.json(
      { error: "Codigo, nome e tipo sao obrigatorios." },
      { status: 400 }
    );
  }

  const centroIdNum =
    typeof centro_custo_id === "number" ? centro_custo_id : Number(centro_custo_id);
  const payloadBase = {
    codigo: String(codigo).trim(),
    nome: String(nome).trim(),
    tipo: String(tipo).trim(),
    banco: banco ? String(banco).trim() : null,
    agencia: agencia ? String(agencia).trim() : null,
    numero_conta: numero_conta ? String(numero_conta).trim() : null,
    centro_custo_id: Number.isFinite(centroIdNum) ? centroIdNum : null,
    ativo: typeof ativo === "boolean" ? ativo : true,
  };

  const idNum = Number(id);
  if (Number.isFinite(idNum) && idNum > 0) {
    const payload = {
      ...payloadBase,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("contas_financeiras")
      .update(payload)
      .eq("id", idNum)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[POST /api/financeiro/contas-financeiras] Erro ao atualizar conta:", error);
      return NextResponse.json(
        { error: "Erro ao atualizar conta financeira" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, conta: data });
  }

  const { data, error } = await supabaseAdmin
    .from("contas_financeiras")
    .insert(payloadBase)
    .select()
    .maybeSingle();

  if (error) {
    console.error("[POST /api/financeiro/contas-financeiras] Erro ao criar conta:", error);
    return NextResponse.json(
      { error: "Erro ao criar conta financeira" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, conta: data });
}
