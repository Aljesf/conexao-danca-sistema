import { NextRequest, NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const denied = await guardApiByRole(req as unknown as Request);
  if (denied) return denied as unknown as NextResponse;

  try {
    const supabase = getSupabaseServiceClient();
    const id = ctx.params.id;

    const { data: template, error: tErr } = await supabase
      .from("form_templates")
      .select("id, nome, descricao, status, versao, created_at, updated_at, published_at, archived_at")
      .eq("id", id)
      .single();

    if (tErr || !template) {
      return NextResponse.json({ error: "Template nao encontrado." }, { status: 404 });
    }

    const { data: items, error: iErr } = await supabase
      .from("form_template_items")
      .select(
        "id, ordem, obrigatoria, cond_question_id, cond_equals_value, form_questions:question_id ( id, codigo, titulo, descricao, tipo, ajuda, placeholder, min_num, max_num, min_len, max_len, scale_min, scale_max, form_question_options (id, valor, rotulo, ordem, ativo) )"
      )
      .eq("template_id", id)
      .order("ordem", { ascending: true });

    if (iErr) {
      return NextResponse.json({ error: iErr.message }, { status: 500 });
    }

    return NextResponse.json({ data: { template, items: items ?? [] } }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const denied = await guardApiByRole(req as unknown as Request);
  if (denied) return denied as unknown as NextResponse;

  try {
    const supabase = getSupabaseServiceClient();
    const id = ctx.params.id;

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};

    if (body.nome !== undefined) patch.nome = String(body.nome ?? "").trim();
    if (body.descricao !== undefined) patch.descricao = body.descricao ? String(body.descricao) : null;

    const { data, error } = await supabase
      .from("form_templates")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
