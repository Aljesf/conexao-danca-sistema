import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function toBool(value: string | null, fallback: boolean): boolean {
  if (value === null) return fallback;
  return ["1", "true", "yes", "sim"].includes(value.toLowerCase());
}

function toInt(value: string | null, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const search = (url.searchParams.get("search") ?? "").trim();
  const somenteAlunos = toBool(url.searchParams.get("somenteAlunos"), false);
  const somenteInstitucional = toBool(url.searchParams.get("somenteInstitucional"), false);
  const limit = Math.min(toInt(url.searchParams.get("limit"), 30), 200);
  const offset = Math.max(toInt(url.searchParams.get("offset"), 0), 0);

  const supabase = createAdminClient();

  const { data: alunosCanon, error: alunosErr } = await supabase
    .from("vw_alunos_canonico")
    .select("pessoa_id");

  if (alunosErr) {
    return NextResponse.json({ ok: false, error: alunosErr.message }, { status: 500 });
  }

  const alunoIds = new Set<number>((alunosCanon ?? []).map((r) => r.pessoa_id as number));

  const { data: currs, error: currErr } = await supabase
    .from("curriculos_institucionais")
    .select("pessoa_id,tipo_curriculo,habilitado")
    .eq("habilitado", true);

  if (currErr) {
    return NextResponse.json({ ok: false, error: currErr.message }, { status: 500 });
  }

  const currMap = new Map<number, { tipo_curriculo: string; habilitado: boolean }>();
  (currs ?? []).forEach((c) => {
    currMap.set(c.pessoa_id as number, {
      tipo_curriculo: String(c.tipo_curriculo),
      habilitado: Boolean(c.habilitado),
    });
  });

  let pessoasQuery = supabase
    .from("pessoas")
    .select("id,nome,email,telefone,ativo", { count: "exact" })
    .eq("ativo", true)
    .order("nome", { ascending: true })
    .range(offset, offset + limit - 1);

  if (search.length >= 2) {
    const s = search.replaceAll("%", "").replaceAll("_", "");
    pessoasQuery = pessoasQuery.or(`nome.ilike.%${s}%,email.ilike.%${s}%,telefone.ilike.%${s}%`);
  }

  const { data: pessoas, error: pessoasErr, count } = await pessoasQuery;

  if (pessoasErr) {
    return NextResponse.json({ ok: false, error: pessoasErr.message }, { status: 500 });
  }

  const rows = (pessoas ?? [])
    .map((p) => {
      const pessoaId = p.id as number;
      const isAluno = alunoIds.has(pessoaId);
      const curr = currMap.get(pessoaId);
      const hasInstitucional = Boolean(curr?.habilitado);
      const temCurriculo = isAluno || hasInstitucional;

      return {
        pessoa_id: pessoaId,
        nome: p.nome,
        email: p.email,
        telefone: p.telefone,
        ativo: p.ativo,
        is_aluno: isAluno,
        curriculo_institucional_habilitado: hasInstitucional,
        tipo_curriculo_institucional: curr?.tipo_curriculo ?? null,
        tem_curriculo: temCurriculo,
      };
    })
    .filter((r) => {
      if (somenteAlunos) return r.is_aluno === true;
      if (somenteInstitucional) return r.curriculo_institucional_habilitado === true;
      return r.tem_curriculo === true;
    });

  return NextResponse.json({
    ok: true,
    meta: { limit, offset, count: count ?? 0 },
    data: rows,
  });
}
