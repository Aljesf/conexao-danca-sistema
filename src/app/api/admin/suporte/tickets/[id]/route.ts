import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

const STATUS_VALUES = ["ABERTO", "EM_ANALISE", "EM_ANDAMENTO", "RESOLVIDO", "FECHADO"] as const;

function normalizeStatus(raw: unknown): (typeof STATUS_VALUES)[number] | null {
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().toUpperCase();
  return STATUS_VALUES.includes(normalized as (typeof STATUS_VALUES)[number])
    ? (normalized as (typeof STATUS_VALUES)[number])
    : null;
}

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(_req);
  if (denied) return denied;

  try {
    const params = await ctx.params;
    const id = parseId(params.id);
    if (!id) return NextResponse.json({ ok: false, error: "id_invalido" }, { status: 400 });

    const supabase = getSupabaseServiceClient();

    const { data, error } = await supabase
      .from("nasc_observacoes")
      .select(
        "id,created_at,updated_at,created_by,app_context,pathname,full_url,page_title,entity_ref,observacao,user_agent,viewport_json,context_json,status,triagem_notas",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: "erro_buscar", details: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ ok: false, error: "nao_encontrado" }, { status: 404 });

    let createdByName: string | null = null;
    if (typeof data.created_by === "string") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id,full_name")
        .eq("user_id", data.created_by)
        .maybeSingle();
      createdByName = typeof profile?.full_name === "string" ? profile.full_name : null;
    }

    return NextResponse.json(
      { ok: true, ticket: { ...data, created_by_name: createdByName } },
      { status: 200 },
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "erro_interno";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  try {
    const params = await ctx.params;
    const id = parseId(params.id);
    if (!id) return NextResponse.json({ ok: false, error: "id_invalido" }, { status: 400 });

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 });

    const patch: Record<string, unknown> = {};

    if ("status" in body) {
      const status = normalizeStatus(body.status);
      if (!status) {
        return NextResponse.json({ ok: false, error: "status_invalido" }, { status: 400 });
      }
      patch.status = status;
    }

    if ("triagem_notas" in body) {
      if (body.triagem_notas === null) {
        patch.triagem_notas = null;
      } else if (typeof body.triagem_notas === "string") {
        const normalized = body.triagem_notas.trim();
        patch.triagem_notas = normalized.length ? normalized : null;
      } else {
        return NextResponse.json({ ok: false, error: "triagem_notas_invalido" }, { status: 400 });
      }
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: false, error: "patch_vazio" }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    const { error } = await supabase.from("nasc_observacoes").update(patch).eq("id", id);

    if (error) {
      return NextResponse.json({ ok: false, error: "erro_atualizar", details: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "erro_interno";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
