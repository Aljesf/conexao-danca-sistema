import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitizeQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function buildIlike(q: string): string {
  return `%${q.replace(/%/g, "").replace(/_/g, "")}%`;
}

export async function GET(req: Request) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "nao_autenticado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = sanitizeQuery(url.searchParams.get("q") ?? "");

  if (q.length < 2) {
    return NextResponse.json({ ok: true, pessoas: [], turmas: [], matriculas: [] });
  }

  const like = buildIlike(q);
  const qDigits = q.replace(/\D/g, "");
  const likeDigits = qDigits ? `%${qDigits}%` : null;

  const pessoaOrParts = [
    `nome.ilike.${like}`,
    `email.ilike.${like}`,
    `razao_social.ilike.${like}`,
    `nome_fantasia.ilike.${like}`,
  ];
  if (likeDigits) {
    pessoaOrParts.push(`cpf.ilike.${likeDigits}`, `cnpj.ilike.${likeDigits}`);
  }

  const [pessoasRes, turmasRes] = await Promise.all([
    supabase
      .from("pessoas")
      .select("id,nome,email,cpf,cnpj,razao_social,nome_fantasia")
      .or(pessoaOrParts.join(","))
      .order("nome", { ascending: true })
      .limit(10),
    supabase
      .from("turmas")
      .select("turma_id,nome,status")
      .ilike("nome", like)
      .order("nome", { ascending: true })
      .limit(10),
  ]);

  if (pessoasRes.error) {
    return NextResponse.json({ ok: false, error: "erro_busca_pessoas" }, { status: 500 });
  }

  if (turmasRes.error) {
    return NextResponse.json({ ok: false, error: "erro_busca_turmas" }, { status: 500 });
  }

  let matriculas = [] as Array<{
    id: number;
    pessoa_id: number | null;
    ano_referencia: number | null;
    status: string | null;
  }>;

  if (qDigits) {
    const qNumber = Number(qDigits);
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
  }

  return NextResponse.json({
    ok: true,
    pessoas: pessoasRes.data ?? [],
    turmas: turmasRes.data ?? [],
    matriculas,
  });
}
