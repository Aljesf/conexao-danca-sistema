import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  return s.length > 0 ? s : null;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;

  const { id: idRaw } = await ctx.params;
  const id = Number(idRaw);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: "id_invalido" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("vw_financeiro_cobranca_avulsa_detalhe")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, error: "db_erro", detail: error.message },
      { status: 500 },
    );
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "nao_encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, cobranca: data });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;

  const { id: idRaw } = await ctx.params;
  const id = Number(idRaw);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: "id_invalido" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const vencimento = asString(body.vencimento);
  const meio = asString(body.meio);
  const observacao = asString(body.observacao);

  const patch: Record<string, unknown> = {};
  if (vencimento) patch.vencimento = vencimento;
  if (meio) patch.meio = meio;
  if (Object.prototype.hasOwnProperty.call(body, "observacao")) patch.observacao = observacao;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { ok: false, error: "nada_para_atualizar" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: atual, error: atualErr } = await supabase
    .from("financeiro_cobrancas_avulsas")
    .select("id,status")
    .eq("id", id)
    .maybeSingle();

  if (atualErr) {
    return NextResponse.json(
      { ok: false, error: "db_erro", detail: atualErr.message },
      { status: 500 },
    );
  }
  if (!atual) {
    return NextResponse.json({ ok: false, error: "nao_encontrado" }, { status: 404 });
  }

  const statusAtual = String((atual as { status?: unknown }).status ?? "").toUpperCase();
  if (statusAtual === "PAGO" || statusAtual === "CANCELADO") {
    return NextResponse.json(
      { ok: false, error: "status_bloqueia_edicao", status: statusAtual },
      { status: 409 },
    );
  }

  const { data, error } = await supabase
    .from("financeiro_cobrancas_avulsas")
    .update(patch)
    .eq("id", id)
    .select(
      "id,pessoa_id,origem_tipo,origem_id,valor_centavos,vencimento,status,meio,motivo_excecao,observacao,criado_em,pago_em",
    )
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: "db_erro", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, cobranca: data });
}
