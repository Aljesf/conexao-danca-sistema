import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[/api/financeiro/formas-pagamento/dicionario] Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas."
  );
}

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("formas_pagamento")
    .select("id, codigo, nome, tipo_base, ativo")
    .order("ativo", { ascending: false })
    .order("nome", { ascending: true });

  if (error) {
    console.error("Erro ao listar formas_pagamento (dicionario)", error);
    return NextResponse.json(
      { ok: false, error: "Erro ao listar formas de pagamento." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, formas: data ?? [] });
}
