import { NextRequest, NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type Body = {
  forma_pagamento?: string;
  valor_pago_centavos?: number;
  comprovante?: string;
};

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;

  try {
    const id = Number(ctx.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ ok: false, error: "id_invalido" }, { status: 400 });
    }

    const body = (await req.json()) as Body;
    const forma = (body.forma_pagamento ?? "").trim();
    if (!forma) {
      return NextResponse.json({ ok: false, error: "forma_pagamento_obrigatoria" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: cobr, error: e0 } = await supabase
      .from("financeiro_cobrancas_avulsas")
      .select("id,status,valor_centavos")
      .eq("id", id)
      .maybeSingle();

    if (e0) {
      return NextResponse.json({ ok: false, error: "db_erro", detail: e0.message }, { status: 500 });
    }
    if (!cobr) {
      return NextResponse.json({ ok: false, error: "nao_encontrado" }, { status: 404 });
    }
    if (cobr.status === "PAGO") {
      return NextResponse.json({ ok: true, ja_pago: true });
    }
    if (cobr.status === "CANCELADO") {
      return NextResponse.json({ ok: false, error: "cobranca_cancelada" }, { status: 409 });
    }

    const valorPago =
      typeof body.valor_pago_centavos === "number" &&
      Number.isFinite(body.valor_pago_centavos) &&
      body.valor_pago_centavos >= 0
        ? Math.trunc(body.valor_pago_centavos)
        : Number(cobr.valor_centavos);

    const { error: e1 } = await supabase
      .from("financeiro_cobrancas_avulsas")
      .update({
        status: "PAGO",
        pago_em: new Date().toISOString(),
        valor_pago_centavos: valorPago,
        forma_pagamento: forma,
        comprovante: (body.comprovante ?? "").trim() || null,
      })
      .eq("id", id);

    if (e1) {
      return NextResponse.json({ ok: false, error: "db_erro", detail: e1.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "erro_interno" }, { status: 500 });
  }
}