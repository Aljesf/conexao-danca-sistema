import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

type CursoRow = {
  id: number;
  nome: string;
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
    .select("id,nome")
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
  }));

  return NextResponse.json({ cursos }, { status: 200 });
}
