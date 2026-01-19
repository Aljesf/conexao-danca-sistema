import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

function parseId(param: string): number | null {
  const id = Number(param);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const cursoLivreId = parseId(id);
  if (!cursoLivreId) {
    return NextResponse.json({ error: "id_invalido" }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Usuario nao autenticado." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("cursos_livres")
    .select("*")
    .eq("id", cursoLivreId)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "curso_livre_nao_encontrado", message: error?.message },
      { status: 404 },
    );
  }

  return NextResponse.json({ curso_livre: data }, { status: 200 });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const cursoLivreId = parseId(id);
  if (!cursoLivreId) {
    return NextResponse.json({ error: "id_invalido" }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Usuario nao autenticado." }, { status: 401 });
  }

  const payload: unknown = await req.json();
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "payload_invalido" }, { status: 400 });
  }

  const p = payload as Record<string, unknown>;
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const allowed = [
    "nome",
    "classificacao",
    "descricao",
    "publico_alvo",
    "data_inicio",
    "data_fim",
    "status",
    "idade_minima",
    "idade_maxima",
    "observacoes",
  ] as const;

  for (const key of allowed) {
    if (key in p) {
      updateData[key] = p[key];
    }
  }

  const { error } = await supabase.from("cursos_livres").update(updateData).eq("id", cursoLivreId);

  if (error) {
    return NextResponse.json(
      { error: "falha_atualizar_curso_livre", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
