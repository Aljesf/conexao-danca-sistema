import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

type TurmaRow = {
  turma_id: number;
  nome: string;
  tipo_turma: string | null;
  status: string | null;
  turno: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  curso_livre_id: number | null;
};

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
    .from("turmas")
    .select("turma_id,nome,tipo_turma,status,turno,data_inicio,data_fim,curso_livre_id")
    .eq("curso_livre_id", cursoLivreId)
    .order("nome", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "falha_listar_turmas", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ turmas: (data ?? []) as TurmaRow[] }, { status: 200 });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
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
  const turmaId = typeof p.turma_id === "number" ? p.turma_id : null;

  if (turmaId) {
    const { error } = await supabase
      .from("turmas")
      .update({ curso_livre_id: cursoLivreId, tipo_turma: "CURSO_LIVRE" })
      .eq("turma_id", turmaId);

    if (error) {
      return NextResponse.json(
        { error: "falha_vincular_turma", message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const { data: cursoLivre, error: cursoLivreError } = await supabase
    .from("cursos_livres")
    .select("id,nome,data_inicio,data_fim")
    .eq("id", cursoLivreId)
    .single();

  if (cursoLivreError || !cursoLivre) {
    return NextResponse.json(
      {
        error: "curso_livre_nao_encontrado",
        message: cursoLivreError?.message ?? "Curso livre nao encontrado.",
      },
      { status: 404 },
    );
  }

  const modalidadeNome =
    typeof p.modalidade_nome === "string"
      ? p.modalidade_nome.trim()
      : typeof p.nome === "string"
        ? p.nome.trim()
        : "";

  if (!modalidadeNome) {
    return NextResponse.json({ error: "modalidade_nome_obrigatorio" }, { status: 400 });
  }

  const area = typeof p.area === "string" ? p.area.trim() : "";
  const turno = typeof p.turno === "string" ? p.turno.trim() : "";
  const professorId = typeof p.professor_id === "number" ? p.professor_id : null;

  const dataInicio =
    typeof p.data_inicio === "string" && p.data_inicio.trim()
      ? p.data_inicio
      : cursoLivre.data_inicio ?? null;
  const dataFim =
    typeof p.data_fim === "string" && p.data_fim.trim() ? p.data_fim : cursoLivre.data_fim ?? null;

  const nomeFinalParts = [cursoLivre.nome, modalidadeNome];
  if (turno) nomeFinalParts.push(turno);
  const nomeFinal = nomeFinalParts.join(" - ");

  const insertData = {
    nome: nomeFinal,
    tipo_turma: "CURSO_LIVRE",
    curso_livre_id: cursoLivreId,
    curso: area || null,
    turno: turno || null,
    professor_id: professorId,
    status: typeof p.status === "string" ? p.status : "EM_PREPARACAO",
    data_inicio: dataInicio,
    data_fim: dataFim,
    capacidade: typeof p.capacidade === "number" ? p.capacidade : null,
    observacoes: typeof p.observacoes === "string" ? p.observacoes : null,
  };

  const { data, error } = await supabase.from("turmas").insert(insertData).select("turma_id").single();

  if (error) {
    return NextResponse.json(
      { error: "falha_criar_turma_curso_livre", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ turma_id: data.turma_id }, { status: 201 });
}
