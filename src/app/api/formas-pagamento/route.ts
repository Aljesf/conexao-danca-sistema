import { requireUser } from "@/lib/supabase/api-auth";
import { NextResponse, type NextRequest } from "next/server";

/**
 * MVP: devolve as formas de pagamento ativas para alimentar selects.
 * Fonte de verdade: public.formas_pagamento (schema já existe).
 */
export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  // (MVP) Sem checagem rígida de role aqui; pode adicionar is_admin depois.
  const { data, error } = await supabase
    .from("formas_pagamento")
    .select("codigo,nome,tipo_base,ativo")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, error: "server_error", message: "Falha ao listar formas de pagamento.", details: error },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data }, { status: 200 });
}

