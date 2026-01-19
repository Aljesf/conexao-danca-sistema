import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getCookieStore } from "@/lib/nextCookies";

async function supabaseServer() {
  const cookieStore = await getCookieStore();
  return createRouteHandlerClient({ cookies: () => cookieStore });
}

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asId(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: idRaw } = await ctx.params;
    const id = asId(idRaw);
    if (!id) {
      return NextResponse.json({ ok: false, error: "id_invalido" }, { status: 400 });
    }

    const supabase = await supabaseServer();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const { data, error } = await supabase.from("cursos").select("*").eq("id", id).maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: "falha_buscar_curso", message: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, error: "curso_nao_encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro_interno";
    return NextResponse.json({ ok: false, error: "erro_interno", message: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await ctx.params;
    const id = asId(idStr);
    if (!id) {
      return NextResponse.json({ ok: false, error: "id_invalido" }, { status: 400 });
    }

    const supabase = await supabaseServer();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ ok: false, error: "body_required" }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};
    if (Object.prototype.hasOwnProperty.call(body, "nome")) {
      const nome = asText(body.nome);
      if (!nome) return NextResponse.json({ ok: false, error: "nome_obrigatorio" }, { status: 400 });
      patch.nome = nome;
    }
    if (Object.prototype.hasOwnProperty.call(body, "metodologia")) patch.metodologia = asText(body.metodologia);
    if (Object.prototype.hasOwnProperty.call(body, "observacoes")) patch.observacoes = asText(body.observacoes);
    if (Object.prototype.hasOwnProperty.call(body, "situacao")) patch.situacao = asText(body.situacao);
    if (Object.prototype.hasOwnProperty.call(body, "ativo") && typeof body.ativo === "boolean") {
      patch.situacao = body.ativo ? "Ativo" : "Inativo";
    }

    patch.updated_at = new Date().toISOString();

    const { data, error } = await supabase.from("cursos").update(patch).eq("id", id).select("*").single();

    if (error) {
      return NextResponse.json({ ok: false, error: "falha_atualizar_curso", message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro_interno";
    return NextResponse.json({ ok: false, error: "erro_interno", message: msg }, { status: 500 });
  }
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: idRaw } = await ctx.params;
    const id = asId(idRaw);
    if (!id) {
      return NextResponse.json({ ok: false, error: "id_invalido" }, { status: 400 });
    }

    const supabase = await supabaseServer();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const { data, error } = await supabase
      .from("cursos")
      .update({ situacao: "Inativo", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();

    if (!error) {
      return NextResponse.json({ ok: true, data });
    }

    const del = await supabase.from("cursos").delete().eq("id", id);
    if (del.error) {
      return NextResponse.json({ ok: false, error: "falha_excluir_curso", message: del.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro_interno";
    return NextResponse.json({ ok: false, error: "erro_interno", message: msg }, { status: 500 });
  }
}
