import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

type MovimentoInsert = {
  tipo: "ENTRADA" | "SAIDA" | "AJUSTE";
  quantidade: number;
  custo_unitario_centavos?: number | null;
  validade?: string | null; // YYYY-MM-DD
  observacoes?: string | null;
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const denied = await guardApiByRole(req);
  if (denied) return denied as unknown as NextResponse;

  const insumoId = Number(ctx.params.id);
  if (!Number.isFinite(insumoId)) {
    return NextResponse.json({ error: "insumo_id_invalido" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("cafe_insumo_movimentos")
    .select("*")
    .eq("insumo_id", insumoId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 200 });
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const denied = await guardApiByRole(req);
  if (denied) return denied as unknown as NextResponse;

  const insumoId = Number(ctx.params.id);
  if (!Number.isFinite(insumoId)) {
    return NextResponse.json({ error: "insumo_id_invalido" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as MovimentoInsert | null;
  const qtd = toNumber(body?.quantidade);

  if (!body?.tipo) {
    return NextResponse.json({ error: "tipo_obrigatorio" }, { status: 400 });
  }
  if (qtd === null || qtd <= 0) {
    return NextResponse.json({ error: "quantidade_invalida" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  const { data: insumo, error: insumoErr } = await supabase
    .from("cafe_insumos")
    .select("id, saldo_atual")
    .eq("id", insumoId)
    .single();

  if (insumoErr || !insumo) {
    return NextResponse.json({ error: "insumo_nao_encontrado" }, { status: 404 });
  }

  const saldoAtual = Number(insumo.saldo_atual ?? 0);
  const delta = body.tipo === "ENTRADA" ? qtd : body.tipo === "SAIDA" ? -qtd : qtd;
  const novoSaldo = saldoAtual + delta;

  if (novoSaldo < 0) {
    return NextResponse.json({ error: "saldo_negativo_nao_permitido" }, { status: 400 });
  }

  const { data: mov, error: movErr } = await supabase
    .from("cafe_insumo_movimentos")
    .insert({
      insumo_id: insumoId,
      tipo: body.tipo,
      quantidade: qtd,
      custo_unitario_centavos: body.custo_unitario_centavos ?? null,
      validade: body.validade ?? null,
      origem: "MANUAL",
      observacoes: body.observacoes ?? null,
    })
    .select("*")
    .single();

  if (movErr) return NextResponse.json({ error: movErr.message }, { status: 500 });

  const { error: updErr } = await supabase
    .from("cafe_insumos")
    .update({ saldo_atual: novoSaldo })
    .eq("id", insumoId);

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ data: mov, novo_saldo: novoSaldo }, { status: 201 });
}
