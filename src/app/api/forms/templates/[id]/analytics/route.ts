import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { id: string };

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  const supabase = await createClient();
  const { id } = await ctx.params;

  const { data: responses, error: e0 } = await supabase
    .from("form_responses")
    .select("id")
    .eq("template_id", id);

  if (e0) return NextResponse.json({ error: e0.message }, { status: 500 });

  const responseIds = (responses ?? []).map((r) => r.id);
  const totalResponses = responseIds.length;

  const { data: questions, error: e1 } = await supabase
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
    .eq("template_id", id)
    .order("ordem", { ascending: true });

  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  let answers: any[] = [];
  if (responseIds.length > 0) {
    const { data: a, error: e2 } = await supabase
      .from("form_response_answers")
      .select("id, response_id, question_id, valor_opcao, valor_numero, valor_boolean")
      .in("response_id", responseIds);

    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
    answers = a ?? [];
  }

  const questionIds = (questions ?? [])
    .map((q) => q.form_questions?.id)
    .filter(Boolean) as string[];
  let optionsByQuestion: Record<string, { id: string; valor: string; rotulo: string }[]> =
    {};
  if (questionIds.length > 0) {
    const { data: opts, error: e3 } = await supabase
      .from("form_question_options")
      .select("id, question_id, valor, rotulo, ordem, ativo")
      .in("question_id", questionIds)
      .eq("ativo", true)
      .order("ordem", { ascending: true });

    if (e3) return NextResponse.json({ error: e3.message }, { status: 500 });

    optionsByQuestion = (opts ?? []).reduce((acc, o) => {
      acc[o.question_id] = acc[o.question_id] ?? [];
      acc[o.question_id].push({ id: o.id, valor: o.valor, rotulo: o.rotulo });
      return acc;
    }, {} as Record<string, { id: string; valor: string; rotulo: string }[]>);
  }

  const byQuestion = (questions ?? [])
    .map((q) => {
      const qq = q.form_questions as
        | { id: string; codigo: string; titulo: string; tipo: string }
        | null;
      if (!qq) return null;

      const qAnswers = answers.filter((a) => a.question_id === qq.id);
      const tipo = qq.tipo;

      if (tipo === "ESCOLHA_UNICA") {
        const opts = optionsByQuestion[qq.id] ?? [];
        const counts = opts.map((o) => {
          const c = qAnswers.filter((a) => a.valor_opcao === o.valor).length;
          const pct =
            totalResponses > 0
              ? Math.round((c / totalResponses) * 1000) / 10
              : 0;
          return { valor: o.valor, rotulo: o.rotulo, count: c, percent: pct };
        });
        return { ...qq, totalResponses, kind: "CHOICE", counts };
      }

      if (tipo === "SIM_NAO") {
        const yes = qAnswers.filter((a) => a.valor_boolean === true).length;
        const no = qAnswers.filter((a) => a.valor_boolean === false).length;
        const yesPct =
          totalResponses > 0 ? Math.round((yes / totalResponses) * 1000) / 10 : 0;
        const noPct =
          totalResponses > 0 ? Math.round((no / totalResponses) * 1000) / 10 : 0;
        return {
          ...qq,
          totalResponses,
          kind: "BOOLEAN",
          counts: [
            { valor: "SIM", rotulo: "Sim", count: yes, percent: yesPct },
            { valor: "NAO", rotulo: "Não", count: no, percent: noPct },
          ],
        };
      }

      if (tipo === "ESCALA" || tipo === "NUMERO") {
        const nums = qAnswers
          .map((a) => a.valor_numero)
          .filter((n) => typeof n === "number") as number[];
        const min = nums.length ? Math.min(...nums) : null;
        const max = nums.length ? Math.max(...nums) : null;
        const avg = nums.length
          ? Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 100) /
            100
          : null;
        return { ...qq, totalResponses, kind: "NUMERIC", stats: { min, max, avg, filled: nums.length } };
      }

      const filled = qAnswers.length;
      return { ...qq, totalResponses, kind: "BASIC", filled };
    })
    .filter(Boolean);

  return NextResponse.json({
    template_id: id,
    totalResponses,
    byQuestion,
  });
}
