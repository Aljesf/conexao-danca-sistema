import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

export async function POST(
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
  if (statusAtual === "PAGO") {
    return NextResponse.json(
      { ok: false, error: "nao_pode_cancelar_pago" },
      { status: 409 },
    );
  }
  if (statusAtual === "CANCELADO") {
    return NextResponse.json({ ok: true, status: "CANCELADO" });
  }

  const { error: updateErr } = await supabase
    .from("financeiro_cobrancas_avulsas")
    .update({ status: "CANCELADO" })
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json(
      { ok: false, error: "db_erro", detail: updateErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, status: "CANCELADO" });
}
