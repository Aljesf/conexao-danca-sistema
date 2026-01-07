import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function supabaseServer() {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) throw new Error("ENV_MISSING_SUPABASE_PUBLIC");

  return createServerClient(url, anonKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set() {
        // nao necessario em route handlers para este fluxo
      },
      remove() {
        // nao necessario em route handlers para este fluxo
      },
    },
  });
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

export async function GET(_: Request, ctx: { params: { id: string } }) {
  try {
    const id = asId(ctx.params.id);
    if (!id) {
      return NextResponse.json({ ok: false, error: "id_invalido" }, { status: 400 });
    }

    const supabase = supabaseServer();
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

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  try {
    const id = asId(ctx.params.id);
    if (!id) {
      return NextResponse.json({ ok: false, error: "id_invalido" }, { status: 400 });
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

    patch.updated_at = new Date().toISOString();

    const supabase = supabaseServer();
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

export async function DELETE(_: Request, ctx: { params: { id: string } }) {
  try {
    const id = asId(ctx.params.id);
    if (!id) {
      return NextResponse.json({ ok: false, error: "id_invalido" }, { status: 400 });
    }

    const supabase = supabaseServer();
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
