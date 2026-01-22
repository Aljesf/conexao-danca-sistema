import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

type PessoaRow = {
  id: number;
  nome: string | null;
  cpf?: string | null;
  telefone?: string | null;
  email?: string | null;
};

type MatriculaRow = Record<string, unknown> & {
  id: number;
  pessoa_id: number;
  responsavel_financeiro_id: number;
};

function norm(s: string): string {
  return s.trim();
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  const url = new URL(req.url);
  const qRaw = url.searchParams.get("q") ?? "";
  const q = norm(qRaw);

  if (q.length < 2) {
    return NextResponse.json({ data: [] }, { status: 200 });
  }

  const { data: pessoas, error: pessoasErr } = await supabase
    .from("pessoas")
    .select("id,nome,cpf,telefone,email")
    .or(
      [
        `nome.ilike.%${q}%`,
        `cpf.ilike.%${q}%`,
        `telefone.ilike.%${q}%`,
        `email.ilike.%${q}%`,
      ].join(","),
    )
    .limit(30);

  if (pessoasErr) {
    return NextResponse.json({ error: pessoasErr.message }, { status: 500 });
  }

  const pessoaIds = (pessoas ?? [])
    .map((p) => Number((p as Record<string, unknown>).id))
    .filter((id) => Number.isFinite(id));

  if (pessoaIds.length === 0) {
    return NextResponse.json({ data: [] }, { status: 200 });
  }

  const { data: matriculas, error: matErr } = await supabase
    .from("matriculas")
    .select("*")
    .or(
      [
        `pessoa_id.in.(${pessoaIds.join(",")})`,
        `responsavel_financeiro_id.in.(${pessoaIds.join(",")})`,
      ].join(","),
    )
    .limit(30);

  if (matErr) {
    return NextResponse.json({ error: matErr.message }, { status: 500 });
  }

  const mats = (matriculas ?? []) as unknown as MatriculaRow[];

  const idsToFetch = new Set<number>();
  for (const m of mats) {
    idsToFetch.add(Number(m.pessoa_id));
    idsToFetch.add(Number(m.responsavel_financeiro_id));
  }

  const idsArr = Array.from(idsToFetch).filter((id) => Number.isFinite(id));
  const { data: pessoas2, error: pessoas2Err } = await supabase
    .from("pessoas")
    .select("id,nome,cpf,telefone,email")
    .in("id", idsArr);

  if (pessoas2Err) {
    return NextResponse.json({ error: pessoas2Err.message }, { status: 500 });
  }

  const mapPessoa = new Map<number, PessoaRow>();
  for (const p of (pessoas2 ?? []) as unknown as PessoaRow[]) {
    mapPessoa.set(Number(p.id), p);
  }

  const data = mats.map((m) => {
    const aluno = mapPessoa.get(Number(m.pessoa_id)) ?? null;
    const resp = mapPessoa.get(Number(m.responsavel_financeiro_id)) ?? null;

    const alunoNome = aluno?.nome ?? `Pessoa #${m.pessoa_id}`;
    const respNome = resp?.nome ?? `Pessoa #${m.responsavel_financeiro_id}`;

    return {
      matricula_id: m.id,
      pessoa_id: m.pessoa_id,
      responsavel_financeiro_id: m.responsavel_financeiro_id,
      label: `Matricula #${m.id} - Aluno: ${alunoNome} - Resp.: ${respNome}`,
      aluno_nome: aluno?.nome ?? null,
      responsavel_nome: resp?.nome ?? null,
      tipo_matricula: (m as Record<string, unknown>).tipo_matricula ?? null,
      ano_referencia: (m as Record<string, unknown>).ano_referencia ?? null,
      status: (m as Record<string, unknown>).status ?? null,
    };
  });

  return NextResponse.json({ data }, { status: 200 });
}


