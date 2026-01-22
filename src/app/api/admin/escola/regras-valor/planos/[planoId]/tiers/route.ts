import { NextResponse, type NextRequest } from "next/server";
import { requireUser, type ApiAuthContext } from "@/lib/supabase/api-auth";
import { guardApiByRole } from "@/lib/auth/roleGuard";

type ErrorLike = { code?: string; message?: string } | null;

function toInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Math.trunc(Number(v));
  return null;
}

function isValidAjusteTipo(v: unknown): v is "override" | "percentual" | "fixo" {
  return v === "override" || v === "percentual" || v === "fixo";
}

function isMissingColumn(err: ErrorLike) {
  if (!err) return false;
  if (err.code === "42703") return true;
  return typeof err.message === "string" && err.message.includes("does not exist") && err.message.includes("column");
}

async function fetchTiers(
  supabase: ApiAuthContext["supabase"],
  politicaCol: "politica_id" | "politica_preco_id",
  planoId: number,
  grupoId: number | null,
) {
  let query = supabase.from("financeiro_tiers").select("*").eq(politicaCol, planoId).order("ordem", { ascending: true });
  if (grupoId) query = query.eq("tier_grupo_id", grupoId);
  return query;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ planoId: string }> }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const { planoId } = await ctx.params;
  const pid = toInt(planoId);
  if (!pid) return NextResponse.json({ error: "planoId invalido." }, { status: 400 });

  const url = new URL(req.url);
  const grupoId = toInt(url.searchParams.get("grupo_id"));

  let { data, error } = await fetchTiers(supabase, "politica_id", pid, grupoId);
  if (error && isMissingColumn(error)) {
    ({ data, error } = await fetchTiers(supabase, "politica_preco_id", pid, grupoId));
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tiers: data ?? [] });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ planoId: string }> }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const { planoId } = await ctx.params;
  const pid = toInt(planoId);
  if (!pid) return NextResponse.json({ error: "planoId invalido." }, { status: 400 });

  const body = (await req.json().catch(() => null)) as
    | {
        tier_grupo_id?: unknown;
        tabela_id?: unknown;
        tabela_item_id?: unknown;
        ordem?: unknown;
        ajuste_tipo?: unknown;
        ajuste_valor_centavos?: unknown;
        valor_centavos?: unknown;
        ativo?: unknown;
      }
    | null;

  const tierGrupoId = toInt(body?.tier_grupo_id);
  const tabelaId = toInt(body?.tabela_id);
  const itemId = toInt(body?.tabela_item_id);
  const ordem = toInt(body?.ordem);
  const ajusteTipo = isValidAjusteTipo(body?.ajuste_tipo) ? body?.ajuste_tipo : null;
  const ajusteValor = toInt(body?.ajuste_valor_centavos);
  const valorCentavos = toInt(body?.valor_centavos);

  if (!tierGrupoId) {
    return NextResponse.json({ error: "Campo 'tier_grupo_id' e obrigatorio." }, { status: 400 });
  }
  if (!tabelaId || !itemId || !ordem || !ajusteTipo || ajusteValor === null) {
    return NextResponse.json(
      { error: "Campos obrigatorios: tabela_id, tabela_item_id, ordem, ajuste_tipo, ajuste_valor_centavos." },
      { status: 400 },
    );
  }

  const payload: Record<string, unknown> = {
    tier_grupo_id: tierGrupoId,
    tabela_id: tabelaId,
    tabela_item_id: itemId,
    ordem,
    ajuste_tipo: ajusteTipo,
    ajuste_valor_centavos: ajusteValor,
  };

  if (typeof valorCentavos === "number" && Number.isFinite(valorCentavos)) {
    payload.valor_centavos = valorCentavos;
  } else if (ajusteTipo === "override") {
    payload.valor_centavos = ajusteValor;
  }
  if (typeof body?.ativo === "boolean") payload.ativo = body.ativo;

  let insertPayload = { ...payload, politica_id: pid };
  let result = await supabase.from("financeiro_tiers").insert(insertPayload).select("*").single();
  if (result.error && isMissingColumn(result.error)) {
    insertPayload = { ...payload, politica_preco_id: pid };
    result = await supabase.from("financeiro_tiers").insert(insertPayload).select("*").single();
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ tier: result.data }, { status: 201 });
}

