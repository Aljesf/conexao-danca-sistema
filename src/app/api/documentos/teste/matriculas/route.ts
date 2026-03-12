import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

type MatriculaRow = {
  id: number;
  pessoa_id: number | null;
  vinculo_id: number | null;
  created_at: string | null;
};

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? "40");
  const limit = Number.isFinite(limitParam) && limitParam > 0 && limitParam <= 100 ? limitParam : 40;

  const { data: matriculas, error } = await auth.supabase
    .from("matriculas")
    .select("id,pessoa_id,vinculo_id,created_at")
    .order("id", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (matriculas ?? []) as MatriculaRow[];
  const pessoaIds = Array.from(
    new Set(rows.map((row) => Number(row.pessoa_id)).filter((id) => Number.isFinite(id) && id > 0)),
  );
  const turmaIds = Array.from(
    new Set(rows.map((row) => Number(row.vinculo_id)).filter((id) => Number.isFinite(id) && id > 0)),
  );

  const [{ data: pessoas }, { data: turmas }] = await Promise.all([
    pessoaIds.length > 0
      ? auth.supabase.from("pessoas").select("id,nome").in("id", pessoaIds)
      : Promise.resolve({ data: [] as Array<{ id: number; nome: string | null }> }),
    turmaIds.length > 0
      ? auth.supabase.from("turmas").select("turma_id,nome").in("turma_id", turmaIds)
      : Promise.resolve({ data: [] as Array<{ turma_id: number; nome: string | null }> }),
  ]);

  const pessoaMap = new Map<number, string>(
    ((pessoas ?? []) as Array<{ id: number; nome: string | null }>).map((item) => [
      Number(item.id),
      String(item.nome ?? "").trim(),
    ]),
  );
  const turmaMap = new Map<number, string>(
    ((turmas ?? []) as Array<{ turma_id: number; nome: string | null }>).map((item) => [
      Number(item.turma_id),
      String(item.nome ?? "").trim(),
    ]),
  );

  const data = rows.map((row) => {
    const alunoNome = pessoaMap.get(Number(row.pessoa_id)) || "Aluno sem nome";
    const cursoNome = turmaMap.get(Number(row.vinculo_id)) || "Curso nao identificado";
    const ano = typeof row.created_at === "string" ? row.created_at.slice(0, 4) : "";

    return {
      id: row.id,
      aluno_nome: alunoNome,
      curso_nome: cursoNome,
      ano,
      label: `${alunoNome} - ${cursoNome} (#${row.id})`,
    };
  });

  return NextResponse.json(data, { status: 200 });
}
