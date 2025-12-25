import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function sbAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing env");
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

    const { data: turmas, error } = await supabase
      .from("turmas")
      .select("turma_id,nome,curso,nivel,tipo_turma,ano_referencia,capacidade,status,ativo")
      .eq("ativo", true)
      .eq("curso", curso)
      .in("status", ["ATIVA", "EM_PREPARACAO"]);

    if (error) {
      return NextResponse.json({ ok: false, error: "erro_listar_turmas", message: error.message }, { status: 500 });
    }

    const turmaIds = Array.from(
      new Set((turmas ?? []).map((t) => Number((t as { turma_id: number }).turma_id)).filter((id) => id > 0)),
    );

    const servicoByTurma = new Map<number, number>();
    if (turmaIds.length > 0) {
      const { data: servicos, error: sErr } = await supabase
        .from("servicos")
        .select("id,referencia_id,referencia_tipo,ativo")
        .eq("referencia_tipo", "TURMA")
        .eq("ativo", true)
        .in("referencia_id", turmaIds);

      if (sErr) {
        console.error("[opcoes/turmas] erro ao buscar servicos:", sErr.message);
      } else {
        (servicos ?? []).forEach((s) => {
          const refId = Number((s as { referencia_id: number }).referencia_id);
          const servicoId = Number((s as { id: number }).id);
          if (refId && servicoId) servicoByTurma.set(refId, servicoId);
        });
      }
    }

    const lista = (turmas ?? []).map((t) => {
      const turmaId = Number((t as { turma_id: number }).turma_id);
      return {
        ...t,
        suggested: idade !== null ? true : false,
        idade_base: idade,
        servico_id: servicoByTurma.get(turmaId) ?? null,
      };
    });

    return NextResponse.json({ ok: true, turmas: lista, idade }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro_interno";
    return NextResponse.json({ ok: false, error: "erro_interno", message: msg }, { status: 500 });
  }
}
