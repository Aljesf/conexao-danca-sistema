import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

/**
 * Rota generica de contas a pagar.
 * IMPORTANTE:
 * - Para compras da loja, prefira usar o fluxo
 *   POST /api/loja/compras/[id] com action "criar_conta_pagar",
 *   que ja resolve centro de custo, categoria e pessoa automaticamente.
 */
export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const {
      titulo,
      descricao_detalhada,
      vencimento,
      valor_centavos,
      centro_custo_id,
      categoria_id,
      pessoa_id,
    } = body ?? {};

    const camposInvalidos =
      !titulo || typeof valor_centavos !== "number" || !Number.isFinite(valor_centavos) || valor_centavos <= 0;

    if (camposInvalidos) {
      console.warn("[POST /api/financeiro/contas-pagar] Payload invalido:", body);
      return NextResponse.json(
        { ok: false, error: "Titulo e valor sao obrigatorios." },
        { status: 400 }
      );
    }

  const { data, error } = await supabaseAdmin
    .from("contas_pagar")
    .insert({
      descricao: titulo,
      observacoes: descricao_detalhada ?? null,
      vencimento: vencimento || null,
      valor_centavos: Math.round(valor_centavos),
      status: "PENDENTE",
      centro_custo_id: centro_custo_id ?? null,
      categoria_id: categoria_id ?? null,
      pessoa_id: pessoa_id ?? null,
    })
    .select("*")
      .maybeSingle();

    if (error || !data) {
      console.error("[POST /api/financeiro/contas-pagar] Erro ao criar conta:", error);
      return NextResponse.json(
        { ok: false, error: "Erro ao criar conta a pagar." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, conta: data });
  } catch (err) {
    console.error("[POST /api/financeiro/contas-pagar] Erro inesperado:", err);
    return NextResponse.json(
      { ok: false, error: "Erro inesperado ao criar conta a pagar." },
      { status: 500 }
    );
  }
}
