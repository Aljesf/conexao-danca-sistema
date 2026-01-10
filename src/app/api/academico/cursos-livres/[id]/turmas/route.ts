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

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const cursoLivreId = parseId(ctx.params.id);
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

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const cursoLivreId = parseId(ctx.params.id);
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

  const nome = typeof p.nome === "string" ? p.nome.trim() : "";
  if (!nome) {
    return NextResponse.json({ error: "nome_turma_obrigatorio" }, { status: 400 });
  }

  const insertData = {
    nome,
    tipo_turma: "CURSO_LIVRE",
    curso_livre_id: cursoLivreId,
    curso: typeof p.curso === "string" ? p.curso : null,
    nivel: typeof p.nivel === "string" ? p.nivel : null,
    turno: typeof p.turno === "string" ? p.turno : null,
    status: typeof p.status === "string" ? p.status : "EM_PREPARACAO",
    data_inicio: typeof p.data_inicio === "string" ? p.data_inicio : null,
    data_fim: typeof p.data_fim === "string" ? p.data_fim : null,
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
