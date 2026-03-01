import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  return s.length > 0 ? s : null;
}

function asInt(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
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
  const valorCentavos = asInt(body.valor_centavos);
  const motivoValor = asString(body.motivo_valor);

  const patch: Record<string, unknown> = {};
  if (vencimento) patch.vencimento = vencimento;
  if (meio) patch.meio = meio;
  if (Object.prototype.hasOwnProperty.call(body, "observacao")) patch.observacao = observacao;

  const alterandoValor = valorCentavos !== null;
  if (alterandoValor) {
    if (valorCentavos < 0) {
      return NextResponse.json({ ok: false, error: "valor_invalido" }, { status: 400 });
    }
    if (!motivoValor) {
      return NextResponse.json({ ok: false, error: "motivo_obrigatorio_valor" }, { status: 400 });
    }
    patch.valor_centavos = valorCentavos;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { ok: false, error: "nada_para_atualizar" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: atual, error: atualErr } = await supabase
    .from("financeiro_cobrancas_avulsas")
    .select("id,status,valor_centavos")
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

  const valorAnterior = Number((atual as { valor_centavos?: unknown }).valor_centavos ?? 0);

  const { data, error } = await supabase
    .from("financeiro_cobrancas_avulsas")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: "db_erro", detail: error.message },
      { status: 500 },
    );
  }

  if (alterandoValor) {
    const valorNovo = Number((data as { valor_centavos?: unknown }).valor_centavos ?? 0);
    if (valorNovo !== valorAnterior) {
      const { error: audErr } = await supabase
        .from("financeiro_cobrancas_avulsas_auditoria")
        .insert({
          cobranca_avulsa_id: id,
          campo: "valor_centavos",
          valor_anterior: String(valorAnterior),
          valor_novo: String(valorNovo),
          motivo: motivoValor!,
          criado_por: null,
        });

      if (audErr) {
        return NextResponse.json({
          ok: true,
          cobranca: data,
          warning: "auditoria_falhou",
          warning_detail: audErr.message,
        });
      }
    }
  }

  return NextResponse.json({ ok: true, cobranca: data });
}
