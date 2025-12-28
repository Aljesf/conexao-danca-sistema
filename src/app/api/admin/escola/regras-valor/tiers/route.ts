import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

type TierRow = {
  tier_id: number;
  tier_grupo_id: number;
  politica_id: number | null;
  tabela_id: number | null;
  tabela_item_id: number | null;
  ajuste_tipo: string | null;
  ajuste_valor_centavos: number | null;
  ordem: number;
  valor_centavos: number;
  ativo: boolean;
  created_at: string | null;
};

function toInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Math.trunc(Number(v));
  return null;
}

function parseAjusteTipo(value: unknown): "override" | "percentual" | "fixo" | null {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!raw) return null;
  if (raw === "override" || raw === "percentual" || raw === "fixo") return raw;
  return null;
}

export async function GET(req: Request) {
  const supabase = await getSupabaseServerSSR();
  const url = new URL(req.url);
  const grupoId = toInt(url.searchParams.get("grupo_id"));
  const tabelaId = toInt(url.searchParams.get("tabela_id"));
  const itemId = toInt(url.searchParams.get("tabela_item_id"));
  const politicaId = toInt(url.searchParams.get("politica_id"));

  if (!grupoId) {
    return NextResponse.json({ error: "Parametro 'grupo_id' e obrigatorio." }, { status: 400 });
  }

  let query = supabase
    .from("financeiro_tiers")
    .select(
      "tier_id,tier_grupo_id,politica_id,tabela_id,tabela_item_id,ajuste_tipo,ajuste_valor_centavos,ordem,valor_centavos,ativo,created_at",
    )
    .eq("tier_grupo_id", grupoId)
    .order("ordem", { ascending: true })
    .order("tier_id", { ascending: true });

  if (tabelaId) query = query.eq("tabela_id", tabelaId);
  if (itemId) query = query.eq("tabela_item_id", itemId);
  if (politicaId) query = query.eq("politica_id", politicaId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tiers: (data ?? []) as TierRow[] });
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServerSSR();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

  const grupoId = toInt(body?.tier_grupo_id);
  const ordem = toInt(body?.ordem);
  const valorCentavos = toInt(body?.valor_centavos);
  const politicaId = toInt(body?.politica_id);
  const tabelaId = toInt(body?.tabela_id);
  const tabelaItemId = toInt(body?.tabela_item_id);
  const ajusteTipo = parseAjusteTipo(body?.ajuste_tipo);
  const ajusteValor = toInt(body?.ajuste_valor_centavos);

  if (!grupoId) {
    return NextResponse.json({ error: "Campo 'tier_grupo_id' e obrigatorio." }, { status: 400 });
  }
  if (!ordem || ordem <= 0) {
    return NextResponse.json({ error: "Campo 'ordem' e obrigatorio." }, { status: 400 });
  }
  if (!tabelaId) {
    return NextResponse.json({ error: "Campo 'tabela_id' e obrigatorio." }, { status: 400 });
  }
  if (!tabelaItemId) {
    return NextResponse.json({ error: "Campo 'tabela_item_id' e obrigatorio." }, { status: 400 });
  }
  if (!politicaId) {
    return NextResponse.json({ error: "Campo 'politica_id' e obrigatorio." }, { status: 400 });
  }
  if (!ajusteTipo) {
    return NextResponse.json({ error: "Campo 'ajuste_tipo' invalido." }, { status: 400 });
  }
  if (ajusteValor === null || !Number.isFinite(ajusteValor)) {
    return NextResponse.json({ error: "Campo 'ajuste_valor_centavos' e obrigatorio." }, { status: 400 });
  }

  const payload: Record<string, unknown> = {
    tier_grupo_id: grupoId,
    ordem,
    politica_id: politicaId,
    tabela_id: tabelaId,
    tabela_item_id: tabelaItemId,
    ajuste_tipo: ajusteTipo,
    ajuste_valor_centavos: ajusteValor,
  };

  if (typeof valorCentavos === "number" && Number.isFinite(valorCentavos)) {
    payload.valor_centavos = valorCentavos;
  } else if (ajusteTipo === "override") {
    payload.valor_centavos = ajusteValor;
  }
  if (typeof body?.ativo === "boolean") payload.ativo = body.ativo;

  const { data, error } = await supabase
    .from("financeiro_tiers")
    .insert(payload)
    .select(
      "tier_id,tier_grupo_id,politica_id,tabela_id,tabela_item_id,ajuste_tipo,ajuste_valor_centavos,ordem,valor_centavos,ativo,created_at",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tier: data }, { status: 201 });
}
