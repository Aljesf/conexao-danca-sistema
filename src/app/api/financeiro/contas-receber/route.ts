import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { guardApiByRole } from "@/lib/auth/roleGuard";

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
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const centro_custo_id = parseNumber(searchParams.get("centro_custo_id"));
  const pessoa_id = parseNumber(searchParams.get("pessoa_id"));
  const data_inicio = searchParams.get("data_inicio");
  const data_fim = searchParams.get("data_fim");

  try {
    let query = supabaseAdmin
      .from("cobrancas")
      .select(
        `
        id,
        descricao,
        valor_centavos,
        vencimento,
        status,
        data_pagamento,
        pessoa_id,
        centro_custo_id,
        pessoas:pessoa_id (nome),
        centros_custo:centro_custo_id (codigo, nome)
      `
      )
      .order("vencimento", { ascending: true })
      .order("id", { ascending: false });

    if (status && status !== "TODOS") query = query.eq("status", status);
    if (centro_custo_id) query = query.eq("centro_custo_id", centro_custo_id);
    if (pessoa_id) query = query.eq("pessoa_id", pessoa_id);
    if (data_inicio) query = query.gte("vencimento", data_inicio);
    if (data_fim) query = query.lte("vencimento", data_fim);

    const { data: cobrancas, error } = await query;
    if (error) {
      console.error("[GET /api/financeiro/contas-receber] Erro ao listar cobrancas:", error);
      return NextResponse.json(
        { ok: false, error: "Erro ao listar contas a receber." },
        { status: 500 }
      );
    }

    const ids = (cobrancas || []).map((c: any) => c.id);
    let recebimentosMap = new Map<number, number>();

    if (ids.length > 0) {
      const { data: recebimentos, error: errRec } = await supabaseAdmin
        .from("recebimentos")
        .select("cobranca_id, valor_centavos")
        .in("cobranca_id", ids);

      if (errRec) {
        console.error("[GET /api/financeiro/contas-receber] Erro ao buscar recebimentos:", errRec);
        return NextResponse.json(
          { ok: false, error: "Erro ao calcular recebimentos das cobrancas." },
          { status: 500 }
        );
      }

      recebimentosMap = (recebimentos || []).reduce((map, r: any) => {
        const key = Number(r.cobranca_id);
        map.set(key, (map.get(key) || 0) + Number(r.valor_centavos || 0));
        return map;
      }, new Map<number, number>());
    }

    const cobrancasComTotais = (cobrancas || []).map((c: any) => {
      const total_recebido_centavos = recebimentosMap.get(c.id) || 0;
      const saldo_centavos = Math.max(Number(c.valor_centavos || 0) - total_recebido_centavos, 0);
      return {
        ...c,
        pessoa_nome: c.pessoas?.nome ?? null,
        centro_custo_codigo: c.centros_custo?.codigo ?? null,
        centro_custo_nome: c.centros_custo?.nome ?? null,
        total_recebido_centavos,
        saldo_centavos,
      };
    });

    return NextResponse.json({ ok: true, cobrancas: cobrancasComTotais });
  } catch (err) {
    console.error("[GET /api/financeiro/contas-receber] Erro inesperado:", err);
    return NextResponse.json(
      { ok: false, error: "Erro inesperado ao listar contas a receber." },
      { status: 500 }
    );
  }
}
