import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";
import { guardApiByRole } from "@/lib/auth/roleGuard";

function parseId(param: string): number | null {
  const id = Number(param);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const supabase = await getSupabaseServerSSR();
  const { id } = await ctx.params;
  const tabelaId = parseId(id);

  if (!tabelaId) {
    return NextResponse.json({ error: "id_invalido" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("escola_precos_cursos_livres")
    .select("*")
    .eq("id", tabelaId)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "tabela_nao_encontrada", message: error?.message },
      { status: 404 },
    );
  }

  return NextResponse.json({ tabela: data }, { status: 200 });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const supabase = await getSupabaseServerSSR();
  const { id } = await ctx.params;
  const tabelaId = parseId(id);

  if (!tabelaId) {
    return NextResponse.json({ error: "id_invalido" }, { status: 400 });
  }

  const payload: unknown = await req.json();
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "payload_invalido" }, { status: 400 });
  }

  const { data: atual, error: atualErr } = await supabase
    .from("escola_precos_cursos_livres")
    .select("curso_livre_id")
    .eq("id", tabelaId)
    .single();

  if (atualErr || !atual) {
    return NextResponse.json(
      { error: "tabela_nao_encontrada", message: atualErr?.message },
      { status: 404 },
    );
  }

  const p = payload as Record<string, unknown>;
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const allowed = ["titulo", "ano_referencia", "ativo", "regras_json"] as const;

  for (const key of allowed) {
    if (key in p) {
      updateData[key] = p[key];
    }
  }

  if (updateData.ativo === true) {
    await supabase
      .from("escola_precos_cursos_livres")
      .update({ ativo: false })
      .eq("curso_livre_id", atual.curso_livre_id);
  }

  const { error } = await supabase.from("escola_precos_cursos_livres").update(updateData).eq("id", tabelaId);

  if (error) {
    return NextResponse.json(
      { error: "falha_atualizar_tabela", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
