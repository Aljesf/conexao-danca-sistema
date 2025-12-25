import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function sbAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing env NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

function idadeFromNascimento(nascimento: string | null): number | null {
  if (!nascimento) return null;
  const m = nascimento.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  const hoje = new Date();
  let idade = hoje.getUTCFullYear() - ano;
  const mesA = hoje.getUTCMonth() + 1;
  const diaA = hoje.getUTCDate();
  if (mesA < mes || (mesA === mes && diaA < dia)) idade -= 1;
  return idade;
}

export async function GET(req: Request) {
  try {
    const supabase = sbAdmin();
    const url = new URL(req.url);
    const tipo = (url.searchParams.get("tipo") ?? "REGULAR").trim();
    const curso = (url.searchParams.get("curso") ?? "").trim();
    const alunoId = Number(url.searchParams.get("aluno_id") ?? "");

    if (!curso) {
      return NextResponse.json({ ok: false, error: "curso_obrigatorio" }, { status: 400 });
    }

    let idade: number | null = null;
    if (alunoId) {
      const { data: pessoa, error: pErr } = await supabase
        .from("pessoas")
        .select("nascimento")
        .eq("id", alunoId)
        .maybeSingle();

      if (!pErr && pessoa) {
        idade = idadeFromNascimento((pessoa as { nascimento: string | null }).nascimento ?? null);
      }
    }

    const tipoTurma = tipo === "CURSO_LIVRE" ? "CURSO_LIVRE" : "REGULAR";

    const { data: turmas, error } = await supabase
      .from("turmas")
      .select("turma_id,nome,curso,nivel,tipo_turma,ano_referencia,capacidade,status,ativo")
      .eq("ativo", true)
      .eq("curso", curso)
      .eq("tipo_turma", tipoTurma)
      .in("status", ["ATIVA", "EM_PREPARACAO"])
      .order("nome", { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: "erro_listar_turmas", message: error.message }, { status: 500 });
    }

    const lista = (turmas ?? []).map((t) => ({ ...(t as Record<string, unknown>), suggested: idade !== null }));

    return NextResponse.json({ ok: true, turmas: lista, idade }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro_interno";
    return NextResponse.json({ ok: false, error: "erro_interno", message: msg }, { status: 500 });
  }
}
