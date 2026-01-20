import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { responseId: string };

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  const supabase = await createClient();
  const { responseId } = await ctx.params;

  const { data: response, error: e1 } = await supabase
    .from("form_responses")
    .select(
      `
      id,
      template_id,
      pessoa_id,
      status,
      started_at,
      submitted_at,
      created_at,
      updated_at,
      pessoas:pessoa_id ( id, nome, telefone, email ),
      form_templates:template_id ( id, nome, descricao, status, versao )
    `
    )
    .eq("id", responseId)
    .maybeSingle();

  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });
  if (!response) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: answers, error: e2 } = await supabase
    .from("form_response_answers")
    .select(
      `
      id,
      question_id,
      valor_texto,
      valor_numero,
      valor_boolean,
      valor_data,
      valor_opcao,
      form_questions:question_id (
        id,
        codigo,
        titulo,
        tipo
      )
    `
    )
    .eq("response_id", responseId)
    .order("created_at", { ascending: true });

  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  const answerIds = (answers ?? []).map((a) => a.id).filter(Boolean);
  let selected: Record<string, { option_id: string; valor: string; rotulo: string }[]> =
    {};

  if (answerIds.length > 0) {
    const { data: sel, error: e3 } = await supabase
      .from("form_response_selected_options")
      .select(
        `
        response_answer_id,
        option_id,
        form_question_options:option_id ( id, valor, rotulo )
      `
      )
      .in("response_answer_id", answerIds);

    if (e3) return NextResponse.json({ error: e3.message }, { status: 500 });

    selected = (sel ?? []).reduce((acc, row) => {
      const key = row.response_answer_id as string;
      const opt = row.form_question_options as unknown as {
        id: string;
        valor: string;
        rotulo: string;
      } | null;
      if (!opt) return acc;
      acc[key] = acc[key] ?? [];
      acc[key].push({ option_id: opt.id, valor: opt.valor, rotulo: opt.rotulo });
      return acc;
    }, {} as Record<string, { option_id: string; valor: string; rotulo: string }[]>);
  }

  return NextResponse.json({
    response,
    answers: (answers ?? []).map((a) => ({
      ...a,
      selected_options: selected[a.id] ?? [],
    })),
  });
}
