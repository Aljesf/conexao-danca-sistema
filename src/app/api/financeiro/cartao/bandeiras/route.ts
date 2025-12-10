import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[/api/financeiro/cartao/bandeiras] Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas."
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
    .from("cartao_bandeiras")
    .select("id, nome, codigo, ativo, created_at, updated_at")
    .order("ativo", { ascending: false })
    .order("nome", { ascending: true });

  if (error) {
    console.error("[GET /api/financeiro/cartao/bandeiras] Erro ao listar cartao_bandeiras:", error);
    return NextResponse.json(
      { error: "Erro ao listar bandeiras de cartao" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, bandeiras: data ?? [] });
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

  const { id, nome, codigo, ativo } = body ?? {};

  if (!nome) {
    return NextResponse.json(
      { error: "Nome da bandeira e obrigatorio." },
      { status: 400 }
    );
  }

  const payloadBase = {
    nome: String(nome).trim(),
    codigo: codigo ? String(codigo).trim() : null,
    ativo: typeof ativo === "boolean" ? ativo : true,
  };

  const idNum = Number(id);
  if (Number.isFinite(idNum) && idNum > 0) {
    const payload = { ...payloadBase, updated_at: new Date().toISOString() };

    const { data, error } = await supabaseAdmin
      .from("cartao_bandeiras")
      .update(payload)
      .eq("id", idNum)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[POST /api/financeiro/cartao/bandeiras] Erro ao atualizar bandeira:", error);
      return NextResponse.json(
        { error: "Erro ao atualizar bandeira de cartao" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, bandeira: data });
  }

  const { data, error } = await supabaseAdmin
    .from("cartao_bandeiras")
    .insert(payloadBase)
    .select()
    .maybeSingle();

  if (error) {
    console.error("[POST /api/financeiro/cartao/bandeiras] Erro ao criar bandeira:", error);
    return NextResponse.json(
      { error: "Erro ao criar bandeira de cartao" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, bandeira: data });
}
