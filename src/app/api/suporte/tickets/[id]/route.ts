import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import {
  isSuporteTicketPrioridade,
  isSuporteTicketStatus,
} from "@/lib/suporte/constants";

function parseId(raw: string) {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function isUuid(value: unknown) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const params = await ctx.params;
  const id = parseId(params.id);
  if (!id) {
    return NextResponse.json({ ok: false, error: "id_invalido" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("suporte_tickets")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ ok: false, error: "ticket_nao_encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ticket: data });
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const params = await ctx.params;
  const id = parseId(params.id);
  if (!id) {
    return NextResponse.json({ ok: false, error: "id_invalido" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};

  if ("status" in body) {
    if (!isSuporteTicketStatus(body.status)) {
      return NextResponse.json({ ok: false, error: "status_invalido" }, { status: 400 });
    }
    patch.status = body.status;
    patch.resolved_at =
      body.status === "CONCLUIDO" || body.status === "CANCELADO" ? new Date().toISOString() : null;
  }

  if ("prioridade" in body) {
    if (!isSuporteTicketPrioridade(body.prioridade)) {
      return NextResponse.json({ ok: false, error: "prioridade_invalida" }, { status: 400 });
    }
    patch.prioridade = body.prioridade;
  }

  if ("responsavel_uuid" in body) {
    if (body.responsavel_uuid !== null && !isUuid(body.responsavel_uuid)) {
      return NextResponse.json({ ok: false, error: "responsavel_uuid_invalido" }, { status: 400 });
    }
    patch.responsavel_uuid = body.responsavel_uuid;
  }

  if ("titulo" in body) {
    patch.titulo = normalizeString(body.titulo, 160);
  }

  if ("descricao" in body) {
    const descricao = normalizeString(body.descricao, 4000);
    if (!descricao) {
      return NextResponse.json({ ok: false, error: "descricao_obrigatoria" }, { status: 400 });
    }
    patch.descricao = descricao;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "patch_vazio" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("suporte_tickets")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ticket: data });
}
