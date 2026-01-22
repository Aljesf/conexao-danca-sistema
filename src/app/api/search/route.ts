import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitizeQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function buildIlike(q: string): string {
  return `%${q.replace(/%/g, "").replace(/_/g, "")}%`;
}

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  const url = new URL(request.url);
  const q = sanitizeQuery(url.searchParams.get("q") ?? "");
  const qDigits = q.replace(/\D/g, "");
  const hasTextQuery = q.length >= 2;
  const hasIdQuery = qDigits.length >= 1;

  if (!hasTextQuery && !hasIdQuery) {
    return NextResponse.json({ ok: true, pessoas: [], turmas: [], matriculas: [] });
  }

  const like = hasTextQuery ? buildIlike(q) : "";
  const likeDigits = qDigits ? `%${qDigits}%` : null;

  let pessoas: Array<{
    id: number;
    nome: string | null;
    email: string | null;
    cpf: string | null;
    cnpj?: string | null;
    razao_social?: string | null;
    nome_fantasia?: string | null;
  }> = [];
  let turmas: Array<{ turma_id: number; nome: string; status: string | null }> = [];

  if (hasTextQuery) {
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

    pessoas = pessoasRes.data ?? [];
    turmas = turmasRes.data ?? [];
  }

  let matriculas = [] as Array<{
    id: number;
    pessoa_id: number | null;
    ano_referencia: number | null;
    status: string | null;
  }>;

  if (hasIdQuery) {
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

  return NextResponse.json({ ok: true, pessoas, turmas, matriculas });
}
