import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { ExpurgoCobrancasError, expurgarCobrancas } from "@/lib/financeiro/expurgo-cobrancas";
import { isExpurgoTipo, type ExpurgoTipo } from "@/lib/financeiro/expurgo-types";
import { getSupabaseServerAuth } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type ExpurgoLoteBody = {
  cobranca_ids?: unknown;
  motivo?: unknown;
  tipo?: unknown;
};

function parseBody(body: ExpurgoLoteBody): {
  cobrancaIds: number[];
  motivo: string | null;
  tipo: ExpurgoTipo | null;
} {
  const cobrancaIds = Array.isArray(body.cobranca_ids)
    ? body.cobranca_ids
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
        .map((value) => Math.trunc(value))
        .filter((value) => value > 0)
    : [];

  const motivo = typeof body.motivo === "string" ? body.motivo.trim() : "";

  return {
    cobrancaIds,
    motivo: motivo.length > 0 ? motivo : null,
    tipo: isExpurgoTipo(body.tipo) ? body.tipo : null,
  };
}

export async function POST(req: NextRequest) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  const authClient = await getSupabaseServerAuth();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ ok: false, error: "usuario_nao_autenticado" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as ExpurgoLoteBody | null;
  const { cobrancaIds, motivo, tipo } = parseBody(body ?? {});

  if (cobrancaIds.length === 0) {
    return NextResponse.json({ ok: false, error: "cobranca_ids_invalidos" }, { status: 400 });
  }

  if (!motivo) {
    return NextResponse.json({ ok: false, error: "motivo_obrigatorio" }, { status: 400 });
  }

  if (!tipo) {
    return NextResponse.json({ ok: false, error: "tipo_obrigatorio" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  try {
    const result = await expurgarCobrancas({
      supabase,
      cobrancaIds,
      motivo,
      tipo,
      userId: user.id,
    });

    return NextResponse.json({
      ok: true,
      cobranca_ids: result.cobrancaIds,
      expurgadas_qtd: result.cobrancaIds.length,
      expurgada_por: user.id,
      expurgo_motivo: result.expurgoMotivo,
      tipo,
    });
  } catch (error) {
    if (error instanceof ExpurgoCobrancasError) {
      return NextResponse.json(
        { ok: false, error: error.code, details: error.details ?? error.message },
        { status: error.status },
      );
    }

    const message = error instanceof Error ? error.message : "erro_expurgar_lote";
    return NextResponse.json({ ok: false, error: "erro_expurgar_lote", details: message }, { status: 500 });
  }
}

