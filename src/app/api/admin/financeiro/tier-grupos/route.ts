import { NextResponse } from "next/server";
import { createClient, type PostgrestError } from "@supabase/supabase-js";

type TierGrupo = {
  tier_grupo_id: number;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string | null;
};

type Tier = {
  tier_id: number;
  tier_grupo_id: number;
  ordem: number;
  valor_centavos: number;
  ativo: boolean;
};

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error("ENV ausente: NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

function isMissingRelation(err: unknown): boolean {
  const e = err as PostgrestError | null;
  return !!e && typeof e.code === "string" && e.code === "42P01";
}

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: "bad_request", message }, { status: 400 });
}

function serverError(message: string, details?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: "server_error", message, details: details ?? null }, { status: 500 });
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data: grupos, error: gruposErr } = await supabase
      .from("financeiro_tier_grupos")
      .select("tier_grupo_id,nome,descricao,ativo,created_at")
      .order("tier_grupo_id", { ascending: true });

    if (gruposErr) {
      if (isMissingRelation(gruposErr)) {
        return NextResponse.json(
          { ok: true, grupos: [], warning: "Tabela financeiro_tier_grupos nao existe (migracao pendente)." },
          { status: 200 },
        );
      }
      return serverError("Falha ao listar grupos de tier.", { error: gruposErr });
    }

    const grupoRows = (grupos ?? []) as TierGrupo[];
    const grupoIds = grupoRows.map((g) => Number(g.tier_grupo_id)).filter((id) => Number.isFinite(id) && id > 0);

    let tiers: Tier[] = [];
    if (grupoIds.length) {
      const { data: tiersData, error: tiersErr } = await supabase
        .from("financeiro_tiers")
        .select("tier_id,tier_grupo_id,ordem,valor_centavos,ativo")
        .in("tier_grupo_id", grupoIds)
        .order("ordem", { ascending: true });

      if (tiersErr) {
        if (isMissingRelation(tiersErr)) {
          return NextResponse.json(
            { ok: true, grupos: grupoRows.map((g) => ({ ...g, tiers: [] })), warning: "Tabela financeiro_tiers nao existe (migracao pendente)." },
            { status: 200 },
          );
        }
        return serverError("Falha ao listar tiers.", { error: tiersErr });
      }

      tiers = (tiersData ?? []) as Tier[];
    }

    const tiersPorGrupo = new Map<number, Tier[]>();
    tiers.forEach((t) => {
      const id = Number(t.tier_grupo_id);
      const list = tiersPorGrupo.get(id) ?? [];
      list.push(t);
      tiersPorGrupo.set(id, list);
    });

    const gruposOut = grupoRows.map((g) => ({
      ...g,
      tiers: tiersPorGrupo.get(Number(g.tier_grupo_id)) ?? [],
    }));

    return NextResponse.json({ ok: true, grupos: gruposOut }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado ao listar grupos.";
    return serverError(message);
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const body = (await req.json().catch(() => null)) as { nome?: string; descricao?: string | null; ativo?: boolean } | null;

    const nome = typeof body?.nome === "string" ? body.nome.trim() : "";
    if (!nome) return badRequest("nome e obrigatorio.");

    const payload = {
      nome,
      descricao: body?.descricao ?? null,
      ativo: typeof body?.ativo === "boolean" ? body.ativo : true,
    };

    const { data, error } = await supabase
      .from("financeiro_tier_grupos")
      .insert(payload)
      .select("tier_grupo_id,nome,descricao,ativo,created_at")
      .single();

    if (error) {
      if (isMissingRelation(error)) {
        return NextResponse.json(
          { ok: false, error: "schema_missing", message: "Tabela financeiro_tier_grupos nao existe (migracao pendente)." },
          { status: 409 },
        );
      }
      return serverError("Falha ao criar grupo.", { error });
    }

    return NextResponse.json({ ok: true, grupo: data }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado ao criar grupo.";
    return serverError(message);
  }
}
