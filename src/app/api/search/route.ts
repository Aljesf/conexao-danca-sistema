import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "nao_autenticado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json({ ok: true, pessoas: [], turmas: [], matriculas: [] });
  }

  const like = `%${q.replace(/%/g, "").replace(/_/g, "")}%`;

  const { data: pessoas, error: pessoasErr } = await supabase
    .from("pessoas")
    .select("id,nome,email,cpf,ativo")
    .or(`nome.ilike.${like},email.ilike.${like},cpf.ilike.${like}`)
    .order("nome", { ascending: true })
    .limit(10);

  if (pessoasErr) {
    return NextResponse.json({ ok: false, error: "erro_busca_pessoas" }, { status: 500 });
  }

  const { data: turmas, error: turmasErr } = await supabase
    .from("turmas")
    .select("turma_id,nome,status")
    .ilike("nome", like)
    .order("nome", { ascending: true })
    .limit(10);

  if (turmasErr) {
    return NextResponse.json({ ok: false, error: "erro_busca_turmas" }, { status: 500 });
  }

  let matriculas = [] as Array<{
    id: number;
    pessoa_id: number | null;
    ano_referencia: number | null;
    status: string | null;
  }>;

  const qNumber = Number(q);
  if (Number.isFinite(qNumber)) {
    const { data: mats, error: matErr } = await supabase
      .from("matriculas")
      .select("id,pessoa_id,ano_referencia,status")
      .eq("id", qNumber)
      .limit(10);

    if (matErr) {
      return NextResponse.json({ ok: false, error: "erro_busca_matriculas" }, { status: 500 });
    }

    matriculas = mats ?? [];
  }

  return NextResponse.json({
    ok: true,
    pessoas: pessoas ?? [],
    turmas: turmas ?? [],
    matriculas,
  });
}
