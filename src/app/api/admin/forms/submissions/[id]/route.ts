import { NextRequest, NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

type PessoaResumo = { id: number; nome: string | null };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(req as unknown as Request);
  if (denied) return denied as unknown as NextResponse;

  try {
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "submission_id_invalido" }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();

    const { data: submission, error: subErr } = await supabase
      .from("form_submissions")
      .select(
        "id, template_id, pessoa_id, responsavel_id, public_token, created_at, submitted_at"
      )
      .eq("id", id)
      .maybeSingle();

    if (subErr) {
      return NextResponse.json({ error: subErr.message }, { status: 500 });
    }
    if (!submission) {
      return NextResponse.json({ error: "submission_nao_encontrada" }, { status: 404 });
    }

    const pessoaIds = [submission.pessoa_id, submission.responsavel_id]
      .filter((v) => Number.isFinite(Number(v)))
      .map((v) => Number(v));

    let pessoasById = new Map<number, PessoaResumo>();
    if (pessoaIds.length > 0) {
      const { data: pessoas, error: pessoasErr } = await supabase
        .from("pessoas")
        .select("id,nome")
        .in("id", pessoaIds);
      if (pessoasErr) {
        return NextResponse.json({ error: pessoasErr.message }, { status: 500 });
      }
      pessoasById = new Map(
        (pessoas ?? []).map((row) => [Number(row.id), { id: Number(row.id), nome: row.nome ?? null }])
      );
    }

    const { data: answers, error: ansErr } = await supabase
      .from("form_submission_answers")
      .select(
        "template_item_id, question_id, question_titulo_snapshot, value_text, value_number, value_bool, value_date, value_json, option_rotulos_snapshot, created_at"
      )
      .eq("submission_id", id)
      .order("created_at", { ascending: true });

    if (ansErr) {
      return NextResponse.json({ error: ansErr.message }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        submission,
        pessoa: submission.pessoa_id ? pessoasById.get(Number(submission.pessoa_id)) ?? null : null,
        responsavel: submission.responsavel_id ? pessoasById.get(Number(submission.responsavel_id)) ?? null : null,
        answers: answers ?? [],
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(req as unknown as Request);
  if (denied) return denied as unknown as NextResponse;

  try {
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "submission_id_invalido" }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase.from("form_submissions").delete().eq("id", id).select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "submission_nao_encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
