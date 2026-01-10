import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

type CursoRow = {
  id: number;
  nome: string;
  ativo: boolean | null;
  ordem: number | null;
  created_at?: string | null;
};

export async function GET() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Usuario nao autenticado." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("cursos")
    .select("id,nome,ativo,ordem,created_at")
    .order("ordem", { ascending: true, nullsFirst: false })
    .order("nome", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "falha_listar_cursos", message: error.message },
      { status: 500 },
    );
  }

  const cursos = (data ?? []).map((curso: CursoRow) => ({
    id: curso.id,
    nome: curso.nome,
    ativo: curso.ativo ?? true,
    ordem: curso.ordem ?? null,
  }));

  return NextResponse.json({ cursos }, { status: 200 });
}
