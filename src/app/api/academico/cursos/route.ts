import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

type CursoRow = {
  id: number;
  nome: string;
};

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

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
