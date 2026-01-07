import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type FlagsSupport = {
  financeiro: boolean;
  principal: boolean;
};

let cachedFlags: FlagsSupport | null = null;

function asNumberId(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("id_invalido");
  }
  return n;
}

function asOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asOptionalBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  return null;
}

async function resolveFlagsSupport(supabase: Awaited<ReturnType<typeof createClient>>): Promise<FlagsSupport> {
  if (cachedFlags) return cachedFlags;

  const { data, error } = await supabase
    .from("information_schema.columns")
    .select("column_name")
    .eq("table_schema", "public")
    .eq("table_name", "vinculos");

  if (error) {
    cachedFlags = { financeiro: false, principal: false };
    return cachedFlags;
  }

  const columns = new Set(
    (data ?? []).map((row) => String((row as { column_name?: string | null }).column_name ?? "")),
  );

  cachedFlags = {
    financeiro: columns.has("is_responsavel_financeiro"),
    principal: columns.has("is_responsavel_principal"),
  };

  return cachedFlags;
}

function buildSelect(flags: FlagsSupport) {
  const cols = ["id", "aluno_id", "responsavel_id", "parentesco"];
  if (flags.financeiro) cols.push("is_responsavel_financeiro");
  if (flags.principal) cols.push("is_responsavel_principal");
  cols.push("responsavel:pessoas!vinculos_responsavel_id_fkey(id,nome,email,telefone)");
  return cols.join(",");
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const pessoaId = asNumberId(id);
    const supabase = await createClient();
    const flags = await resolveFlagsSupport(supabase);
    const select = buildSelect(flags);

    const { data, error } = await supabase.from("vinculos").select(select).eq("aluno_id", pessoaId).order("id");

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const items = (data ?? []).map((row) => {
      const raw = row as Record<string, unknown>;
      return {
        ...raw,
        is_responsavel_financeiro: flags.financeiro ? Boolean(raw.is_responsavel_financeiro) : false,
        is_responsavel_principal: flags.principal ? Boolean(raw.is_responsavel_principal) : false,
      };
    });

    return NextResponse.json({ items });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro_inesperado";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const pessoaId = asNumberId(id);
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

    if (!body) {
      return NextResponse.json({ error: "body_required" }, { status: 400 });
    }

    const responsavelId = Number(body.responsavel_id);
    if (!Number.isFinite(responsavelId) || responsavelId <= 0) {
      return NextResponse.json({ error: "responsavel_id_invalido" }, { status: 400 });
    }

    const supabase = await createClient();
    const flags = await resolveFlagsSupport(supabase);

    const payload: Record<string, unknown> = {
      aluno_id: pessoaId,
      responsavel_id: responsavelId,
      parentesco: asOptionalString(body.parentesco),
    };

    if (flags.financeiro) {
      const flagValue = asOptionalBoolean(body.is_responsavel_financeiro);
      if (flagValue !== null) payload.is_responsavel_financeiro = flagValue;
    }

    if (flags.principal) {
      const flagValue = asOptionalBoolean(body.is_responsavel_principal);
      if (flagValue !== null) payload.is_responsavel_principal = flagValue;
    }

    const { error } = await supabase.from("vinculos").insert(payload);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro_inesperado";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const pessoaId = asNumberId(id);
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

    if (!body) {
      return NextResponse.json({ error: "body_required" }, { status: 400 });
    }

    const vinculoIdRaw = body.vinculo_id;
    const vinculoId = asNumberId(String(vinculoIdRaw ?? ""));

    const supabase = await createClient();
    const flags = await resolveFlagsSupport(supabase);

    const patch: Record<string, unknown> = {};

    if (Object.prototype.hasOwnProperty.call(body, "parentesco")) {
      patch.parentesco = asOptionalString(body.parentesco);
    }

    if (flags.financeiro && Object.prototype.hasOwnProperty.call(body, "is_responsavel_financeiro")) {
      const flagValue = asOptionalBoolean(body.is_responsavel_financeiro);
      if (flagValue !== null) patch.is_responsavel_financeiro = flagValue;
    }

    if (flags.principal && Object.prototype.hasOwnProperty.call(body, "is_responsavel_principal")) {
      const flagValue = asOptionalBoolean(body.is_responsavel_principal);
      if (flagValue !== null) patch.is_responsavel_principal = flagValue;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "nenhuma_alteracao" }, { status: 400 });
    }

    const { error } = await supabase.from("vinculos").update(patch).eq("id", vinculoId).eq("aluno_id", pessoaId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro_inesperado";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const pessoaId = asNumberId(id);
    const url = new URL(req.url);
    const vinculoIdParam = url.searchParams.get("vinculo_id");

    if (!vinculoIdParam) {
      return NextResponse.json({ error: "vinculo_id_obrigatorio" }, { status: 400 });
    }

    const vinculoId = asNumberId(vinculoIdParam);
    const supabase = await createClient();

    const { error } = await supabase.from("vinculos").delete().eq("id", vinculoId).eq("aluno_id", pessoaId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro_inesperado";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
