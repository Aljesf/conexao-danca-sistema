import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

function parseNumber(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const centro_custo_id = parseNumber(searchParams.get("centro_custo_id"));
  const categoria_id = parseNumber(searchParams.get("categoria_id"));
  const pessoa_id = parseNumber(searchParams.get("pessoa_id"));
  const data_inicio = searchParams.get("data_inicio");
  const data_fim = searchParams.get("data_fim");

  try {
    let query = supabaseAdmin
      .from("contas_pagar")
      .select(
        `
        id,
        descricao,
        observacoes,
        vencimento,
        valor_centavos,
        status,
        centro_custo_id,
        categoria_id,
        pessoa_id,
        centros_custo:centro_custo_id (codigo, nome),
        categorias_financeiras:categoria_id (codigo, nome, tipo),
        pessoas:pessoa_id (nome)
      `
      )
      .order("vencimento", { ascending: true })
      .order("id", { ascending: false });

    if (status && status !== "TODOS") {
      query = query.eq("status", status);
    }
    if (centro_custo_id) query = query.eq("centro_custo_id", centro_custo_id);
    if (categoria_id) query = query.eq("categoria_id", categoria_id);
    if (pessoa_id) query = query.eq("pessoa_id", pessoa_id);
    if (data_inicio) query = query.gte("vencimento", data_inicio);
    if (data_fim) query = query.lte("vencimento", data_fim);

    const { data: contas, error } = await query;
    if (error) {
      console.error("[GET /api/financeiro/contas-pagar] Erro ao listar contas:", error);
      return NextResponse.json({ ok: false, error: "Erro ao listar contas a pagar." }, { status: 500 });
    }

    const ids = (contas || []).map((c: any) => c.id);
    let pagamentosMap = new Map<number, number>();

    if (ids.length > 0) {
      const { data: pagamentos, error: errPag } = await supabaseAdmin
        .from("contas_pagar_pagamentos")
        .select("conta_pagar_id, valor_principal_centavos, juros_centavos, desconto_centavos")
        .in("conta_pagar_id", ids);

      if (errPag) {
        console.error("[GET /api/financeiro/contas-pagar] Erro ao buscar pagamentos:", errPag);
        return NextResponse.json(
          { ok: false, error: "Erro ao calcular pagamentos das contas." },
          { status: 500 }
        );
      }

      pagamentosMap = (pagamentos || []).reduce((map, p: any) => {
        const key = Number(p.conta_pagar_id);
        const parcial =
          Number(p.valor_principal_centavos || 0) +
          Number(p.juros_centavos || 0) -
          Number(p.desconto_centavos || 0);
        map.set(key, (map.get(key) || 0) + parcial);
        return map;
      }, new Map<number, number>());
    }

    const contasComTotais = (contas || []).map((c: any) => {
      const total_pago_centavos = pagamentosMap.get(c.id) || 0;
      const saldo_centavos = Math.max(Number(c.valor_centavos || 0) - total_pago_centavos, 0);
      return {
        ...c,
        centro_custo_codigo: c.centros_custo?.codigo ?? null,
        centro_custo_nome: c.centros_custo?.nome ?? null,
        categoria_codigo: c.categorias_financeiras?.codigo ?? null,
        categoria_nome: c.categorias_financeiras?.nome ?? null,
        pessoa_nome: c.pessoas?.nome ?? null,
        total_pago_centavos,
        saldo_centavos,
      };
    });

    return NextResponse.json({ ok: true, contas: contasComTotais });
  } catch (err) {
    console.error("[GET /api/financeiro/contas-pagar] Erro inesperado:", err);
    return NextResponse.json(
      { ok: false, error: "Erro inesperado ao listar contas a pagar." },
      { status: 500 }
    );
  }
}

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
