import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { id: string };

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  const supabase = await createClient();
  const { id: templateId } = await ctx.params;

  // 1) Submissions
  const { data: subs, error: eSubs } = await supabase
    .from("form_submissions")
    .select("id, created_at, submitted_at")
    .eq("template_id", templateId);

  if (eSubs) {
    return NextResponse.json({ error: eSubs.message }, { status: 500 });
  }

  const submissionIds = (subs ?? []).map((s) => s.id);
  const totalResponses = submissionIds.length;

  const dates = (subs ?? [])
    .map((s) => s.submitted_at ?? s.created_at)
    .filter(Boolean)
    .map((d) => new Date(d).getTime())
    .sort((a, b) => a - b);

  const firstAt = dates.length ? new Date(dates[0]).toISOString() : null;
  const lastAt = dates.length ? new Date(dates[dates.length - 1]).toISOString() : null;

  // 2) Perguntas do template
  const { data: tq, error: eTq } = await supabase
    .from("form_template_questions")
    .select(
      `
      ordem,
      question_id,
      form_questions:question_id (
        id, codigo, titulo, tipo
      )
    `
    )
    .eq("template_id", templateId)
    .order("ordem");

  if (eTq) {
    return NextResponse.json({
      template_id: templateId,
      totalResponses,
      firstAt,
      lastAt,
      byQuestion: [],
      warning: "form_template_questions_failed",
    });
  }

  const questions = tq ?? [];
  const questionIds = questions.map((q) => q.form_questions?.id).filter(Boolean);

  // 3) Answers
  let answers: any[] = [];
  if (submissionIds.length) {
    const { data: a, error: eA } = await supabase
      .from("form_submission_answers")
      .select("submission_id, question_id, valor_texto, valor_numero, valor_boolean, valor_data, valor_opcao")
      .in("submission_id", submissionIds);

    if (eA) {
      return NextResponse.json({ error: eA.message }, { status: 500 });
    }
    answers = a ?? [];
  }

  // 4) Options
  let optionsByQuestion: Record<string, any[]> = {};
  if (questionIds.length) {
    const { data: opts } = await supabase
      .from("form_question_options")
      .select("question_id, valor, rotulo")
      .in("question_id", questionIds)
      .eq("ativo", true);

    optionsByQuestion = (opts ?? []).reduce((acc, o) => {
      acc[o.question_id] = acc[o.question_id] ?? [];
      acc[o.question_id].push(o);
      return acc;
    }, {} as Record<string, any[]>);
  }

  // 5) Analytics por pergunta
  const byQuestion = questions
    .map((row) => {
      const q = row.form_questions;
      if (!q) return null;

      const qAnswers = answers.filter((a) => a.question_id === q.id);

      if (q.tipo === "ESCOLHA_UNICA") {
        const opts = optionsByQuestion[q.id] ?? [];
        const counts = opts.map((o) => {
          const c = qAnswers.filter((a) => a.valor_opcao === o.valor).length;
          const pct = totalResponses ? Math.round((c / totalResponses) * 1000) / 10 : 0;
          return { valor: o.valor, rotulo: o.rotulo, count: c, percent: pct };
        });
        return { ...q, kind: "CHOICE", totalResponses, counts };
      }

      if (q.tipo === "SIM_NAO") {
        const yes = qAnswers.filter((a) => a.valor_boolean === true).length;
        const no = qAnswers.filter((a) => a.valor_boolean === false).length;
        return {
          ...q,
          kind: "BOOLEAN",
          totalResponses,
          counts: [
            { valor: "SIM", rotulo: "Sim", count: yes, percent: totalResponses ? Math.round((yes / totalResponses) * 1000) / 10 : 0 },
            { valor: "NAO", rotulo: "Nao", count: no, percent: totalResponses ? Math.round((no / totalResponses) * 1000) / 10 : 0 },
          ],
        };
      }

      if (q.tipo === "ESCALA" || q.tipo === "NUMERO") {
        const nums = qAnswers.map((a) => a.valor_numero).filter((n) => typeof n === "number");
        const min = nums.length ? Math.min(...nums) : null;
        const max = nums.length ? Math.max(...nums) : null;
        const avg = nums.length ? Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 100) / 100 : null;
        return { ...q, kind: "NUMERIC", totalResponses, stats: { min, max, avg, filled: nums.length } };
      }

      if (q.tipo === "TEXTO_CURTO" || q.tipo === "TEXTO_LONGO") {
        const texts = qAnswers.map((a) => a.valor_texto).filter((t) => t && t.trim());
        return { ...q, kind: "TEXT", totalResponses, filled: texts.length, samples: texts.slice(0, 50) };
      }

      return { ...q, kind: "BASIC", totalResponses, filled: qAnswers.length };
    })
    .filter(Boolean);

  return NextResponse.json({
    template_id: templateId,
    totalResponses,
    firstAt,
    lastAt,
    byQuestion,
  });
}
