import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

type CursoLivreRow = {
  id: number;
  nome: string;
  classificacao: string;
  status: string;
  data_inicio: string | null;
  data_fim: string | null;
  idade_minima: number | null;
  idade_maxima: number | null;
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
    .from("cursos_livres")
    .select("id,nome,classificacao,status,data_inicio,data_fim,idade_minima,idade_maxima")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "falha_listar_cursos_livres", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ cursos_livres: (data ?? []) as CursoLivreRow[] }, { status: 200 });
}

export async function POST(req: Request) {
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
  const nome = typeof p.nome === "string" ? p.nome.trim() : "";
  if (!nome) {
    return NextResponse.json({ error: "nome_obrigatorio" }, { status: 400 });
  }

  const insertData = {
    nome,
    classificacao: typeof p.classificacao === "string" ? p.classificacao : "WORKSHOP",
    descricao: typeof p.descricao === "string" ? p.descricao : null,
    publico_alvo: typeof p.publico_alvo === "string" ? p.publico_alvo : null,
    data_inicio: typeof p.data_inicio === "string" ? p.data_inicio : null,
    data_fim: typeof p.data_fim === "string" ? p.data_fim : null,
    status: typeof p.status === "string" ? p.status : "RASCUNHO",
    idade_minima: typeof p.idade_minima === "number" ? p.idade_minima : null,
    idade_maxima: typeof p.idade_maxima === "number" ? p.idade_maxima : null,
    observacoes: typeof p.observacoes === "string" ? p.observacoes : null,
  };

  const { data, error } = await supabase.from("cursos_livres").insert(insertData).select("id").single();

  if (error) {
    return NextResponse.json(
      { error: "falha_criar_curso_livre", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
