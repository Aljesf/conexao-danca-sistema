import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { createAdminClient } from "@/lib/supabase/admin";

type FinanceiroConfigRow = {
  dia_fechamento_faturas: number | null;
};

function clampDia(value: unknown): number | null {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const dia = Math.trunc(num);
  if (dia < 1 || dia > 28) return null;
  return dia;
}

export async function GET(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;

  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin
    .from("financeiro_config")
    .select("dia_fechamento_faturas")
    .eq("id", 1)
    .maybeSingle<FinanceiroConfigRow>();

  if (error) {
    return NextResponse.json({ ok: false, error: "erro_ler_config", detail: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, dia_fechamento_faturas: Number(data?.dia_fechamento_faturas ?? 1) },
    { status: 200 },
  );
}

export async function POST(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;

  const body = (await req.json().catch(() => ({}))) as { dia_fechamento_faturas?: unknown };
  const dia = clampDia(body?.dia_fechamento_faturas);

  if (!dia) {
    return NextResponse.json({ ok: false, error: "dia_invalido" }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from("financeiro_config")
    .upsert({ id: 1, dia_fechamento_faturas: dia }, { onConflict: "id" });

  if (error) {
    return NextResponse.json({ ok: false, error: "erro_salvar_config", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, dia_fechamento_faturas: dia }, { status: 200 });
}
