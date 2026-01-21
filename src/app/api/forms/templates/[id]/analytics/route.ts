import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { id: string };

async function tryGetResponseIds(supabase: any, templateId: string) {
  const s1 = await supabase.from("form_submissions").select("id").eq("template_id", templateId);

  if (!s1.error) {
    const ids = (s1.data ?? []).map((r: any) => r.id);
    return { ok: true as const, ids, source: "form_submissions" as const };
  }

  const s2 = await supabase.from("form_responses").select("id").eq("template_id", templateId);

  if (!s2.error) {
    const ids = (s2.data ?? []).map((r: any) => r.id);
    return { ok: true as const, ids, source: "form_responses" as const };
  }

  return { ok: false as const, error1: s1.error, error2: s2.error };
}

async function tryGetTemplateQuestions(supabase: any, templateId: string) {
  const candidates = [
    "form_template_questions",
    "form_templates_questions",
    "form_template_itens",
    "form_template_fields",
  ];

  for (const table of candidates) {
    const { data, error } = await supabase
      .from(table)
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
      .order("ordem", { ascending: true });

    if (!error) return { ok: true as const, data: data ?? [], source: table };
  }

  return { ok: false as const };
}

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  const supabase = await createClient();
  const { id: templateId } = await ctx.params;

  const r = await tryGetResponseIds(supabase, templateId);
  if (!r.ok) {
    return NextResponse.json(
      {
        error: "failed_to_load_response_ids",
        submissions_error: r.error1?.message ?? String(r.error1),
        responses_error: r.error2?.message ?? String(r.error2),
      },
      { status: 500 }
    );
  }

  const responseIds = r.ids;
  const totalResponses = responseIds.length;

  const q = await tryGetTemplateQuestions(supabase, templateId);
  if (!q.ok) {
    return NextResponse.json({
      template_id: templateId,
      totalResponses,
      byQuestion: [],
      sourceResponses: r.source,
      sourceTemplateQuestions: null,
      warning: "junction_table_not_found",
    });
  }

  const questions = q.data;
  const questionIds = (questions ?? [])
    .map((row: any) => row?.form_questions?.id)
    .filter(Boolean) as string[];

  let answers: any[] = [];
  if (responseIds.length > 0) {
    const a1 = await supabase
      .from("form_submission_answers")
      .select("id, submission_id, question_id, valor_opcao, valor_numero, valor_boolean")
      .in("submission_id", responseIds);

    if (!a1.error) {
      answers = a1.data ?? [];
    } else {
      const a2 = await supabase
        .from("form_response_answers")
        .select("id, response_id, question_id, valor_opcao, valor_numero, valor_boolean")
        .in("response_id", responseIds);

      if (!a2.error) {
        answers = a2.data ?? [];
      } else {
        return NextResponse.json({
          template_id: templateId,
          totalResponses,
          byQuestion: [],
          sourceResponses: r.source,
          sourceTemplateQuestions: q.source,
          warning: "answers_table_not_found_or_query_failed",
          error1: a1.error?.message ?? String(a1.error),
          error2: a2.error?.message ?? String(a2.error),
        });
      }
    }
  }

  let optionsByQuestion: Record<string, { id: string; valor: string; rotulo: string }[]> = {};
  if (questionIds.length > 0) {
    const { data: opts, error: e3 } = await supabase
      .from("form_question_options")
      .select("id, question_id, valor, rotulo, ordem, ativo")
      .in("question_id", questionIds)
      .eq("ativo", true)
      .order("ordem", { ascending: true });

    if (!e3) {
      optionsByQuestion = (opts ?? []).reduce((acc: any, o: any) => {
        acc[o.question_id] = acc[o.question_id] ?? [];
        acc[o.question_id].push({ id: o.id, valor: o.valor, rotulo: o.rotulo });
        return acc;
      }, {} as Record<string, { id: string; valor: string; rotulo: string }[]>);
    }
  }

  const byQuestion = (questions ?? [])
    .map((row: any) => {
      const qq = row.form_questions as { id: string; codigo: string; titulo: string; tipo: string } | null;
      if (!qq) return null;

      const qAnswers = answers.filter((a) => a.question_id === qq.id);
      const tipo = qq.tipo;

      if (tipo === "ESCOLHA_UNICA") {
        const opts = optionsByQuestion[qq.id] ?? [];
        const counts = opts.map((o) => {
          const c = qAnswers.filter((a) => a.valor_opcao === o.valor).length;
          const pct = totalResponses > 0 ? Math.round((c / totalResponses) * 1000) / 10 : 0;
          return { valor: o.valor, rotulo: o.rotulo, count: c, percent: pct };
        });
        return { ...qq, totalResponses, kind: "CHOICE", counts };
      }

      if (tipo === "SIM_NAO") {
        const yes = qAnswers.filter((a) => a.valor_boolean === true).length;
        const no = qAnswers.filter((a) => a.valor_boolean === false).length;
        const yesPct = totalResponses > 0 ? Math.round((yes / totalResponses) * 1000) / 10 : 0;
        const noPct = totalResponses > 0 ? Math.round((no / totalResponses) * 1000) / 10 : 0;
        return {
          ...qq,
          totalResponses,
          kind: "BOOLEAN",
          counts: [
            { valor: "SIM", rotulo: "Sim", count: yes, percent: yesPct },
            { valor: "NAO", rotulo: "Nao", count: no, percent: noPct },
          ],
        };
      }

      if (tipo === "ESCALA" || tipo === "NUMERO") {
        const nums = qAnswers.map((a) => a.valor_numero).filter((n) => typeof n === "number") as number[];
        const min = nums.length ? Math.min(...nums) : null;
        const max = nums.length ? Math.max(...nums) : null;
        const avg = nums.length ? Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 100) / 100 : null;
        return { ...qq, totalResponses, kind: "NUMERIC", stats: { min, max, avg, filled: nums.length } };
      }

      const filled = qAnswers.length;
      return { ...qq, totalResponses, kind: "BASIC", filled };
    })
    .filter(Boolean);

  return NextResponse.json({
    template_id: templateId,
    totalResponses,
    byQuestion,
    sourceResponses: r.source,
    sourceTemplateQuestions: q.source,
  });
}
