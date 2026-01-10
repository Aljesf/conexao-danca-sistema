import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";
import { guardApiByRole } from "@/lib/auth/roleGuard";

export async function GET(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const supabase = await getSupabaseServerSSR();

  const { data, error } = await supabase
    .from("escola_precos_cursos_livres")
    .select("id,curso_livre_id,titulo,ano_referencia,ativo,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "falha_listar_precos", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ tabelas: data ?? [] }, { status: 200 });
}

export async function POST(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const supabase = await getSupabaseServerSSR();
  const payload: unknown = await req.json();

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "payload_invalido" }, { status: 400 });
  }

  const p = payload as Record<string, unknown>;
  const cursoLivreId = typeof p.curso_livre_id === "number" ? p.curso_livre_id : null;
  const titulo = typeof p.titulo === "string" ? p.titulo.trim() : "";

  if (!cursoLivreId) {
    return NextResponse.json({ error: "curso_livre_id_obrigatorio" }, { status: 400 });
  }
  if (!titulo) {
    return NextResponse.json({ error: "titulo_obrigatorio" }, { status: 400 });
  }

  const ativo = typeof p.ativo === "boolean" ? p.ativo : false;
  const regrasJson = typeof p.regras_json === "object" && p.regras_json ? p.regras_json : {};

  if (ativo) {
    await supabase.from("escola_precos_cursos_livres").update({ ativo: false }).eq("curso_livre_id", cursoLivreId);
  }

  const { data, error } = await supabase
    .from("escola_precos_cursos_livres")
    .insert({
      curso_livre_id: cursoLivreId,
      titulo,
      ano_referencia: typeof p.ano_referencia === "number" ? p.ano_referencia : null,
      ativo,
      regras_json: regrasJson,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "falha_criar_tabela_preco", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
