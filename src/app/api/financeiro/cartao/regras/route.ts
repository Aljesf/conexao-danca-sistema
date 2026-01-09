import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { guardApiByRole } from "@/lib/auth/roleGuard";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[/api/financeiro/cartao/regras] Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas."
  );
}

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

export async function GET(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("cartao_regras_operacao")
    .select(
      `
      id,
      maquina_id,
      bandeira_id,
      tipo_transacao,
      prazo_recebimento_dias,
      taxa_percentual,
      taxa_fixa_centavos,
      permitir_parcelado,
      max_parcelas,
      ativo,
      created_at,
      updated_at,
      cartao_maquinas:maquina_id ( id, nome ),
      cartao_bandeiras:bandeira_id ( id, nome )
    `
    )
    .order("ativo", { ascending: false })
    .order("maquina_id", { ascending: true })
    .order("bandeira_id", { ascending: true });

  if (error) {
    console.error("[GET /api/financeiro/cartao/regras] Erro ao listar regras:", error);
    return NextResponse.json(
      { error: "Erro ao listar regras de cartao" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, regras: data ?? [] });
}

export async function POST(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
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
    maquina_id,
    bandeira_id,
    tipo_transacao,
    prazo_recebimento_dias,
    taxa_percentual,
    taxa_fixa_centavos,
    permitir_parcelado,
    max_parcelas,
    ativo,
  } = body ?? {};

  if (!maquina_id || !bandeira_id || !tipo_transacao) {
    return NextResponse.json(
      { error: "Maquininha, bandeira e tipo de transacao sao obrigatorios." },
      { status: 400 }
    );
  }

  const payloadBase = {
    maquina_id,
    bandeira_id,
    tipo_transacao,
    prazo_recebimento_dias: prazo_recebimento_dias ?? 30,
    taxa_percentual: taxa_percentual ?? 0,
    taxa_fixa_centavos: taxa_fixa_centavos ?? 0,
    permitir_parcelado: typeof permitir_parcelado === "boolean" ? permitir_parcelado : true,
    max_parcelas: max_parcelas ?? 12,
    ativo: typeof ativo === "boolean" ? ativo : true,
  };

  const idNum = Number(id);
  if (Number.isFinite(idNum) && idNum > 0) {
    const payload = { ...payloadBase, updated_at: new Date().toISOString() };
    const { data, error } = await supabaseAdmin
      .from("cartao_regras_operacao")
      .update(payload)
      .eq("id", idNum)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[POST /api/financeiro/cartao/regras] Erro ao atualizar regra:", error);
      return NextResponse.json(
        { error: "Erro ao atualizar regra de cartao" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, regra: data });
  }

  const { data, error } = await supabaseAdmin
    .from("cartao_regras_operacao")
    .insert(payloadBase)
    .select()
    .maybeSingle();

  if (error) {
    console.error("[POST /api/financeiro/cartao/regras] Erro ao criar regra:", error);
    return NextResponse.json(
      { error: "Erro ao criar regra de cartao" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, regra: data });
}
