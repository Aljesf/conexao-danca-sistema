import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { id: string };

type TemplateQuestionRow = {
  question_id: string;
  ordem: number | null;
  ativo?: boolean | null;
};

type QuestionRow = {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
};

type SubmissionRow = {
  id: string;
  created_at: string | null;
  submitted_at: string | null;
};

type AnswerRow = {
  submission_id: string;
  question_id: string;
} & Record<string, unknown>;

function pickBoolean(a: AnswerRow): boolean | null {
  const candidates = [
    "value_boolean",
    "value_bool",
    "valor_boolean",
    "valor_bool",
    "boolean_value",
    "bool_value",
  ];

  for (const key of candidates) {
    const v = a[key];
    if (typeof v === "boolean") return v;
  }
  return null;
}

function pickNumber(a: AnswerRow): number | null {
  const candidates = [
    "value_number",
    "value_num",
    "valor_numero",
    "valor_number",
    "number_value",
    "num_value",
  ];

  for (const key of candidates) {
    const v = a[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

function percent(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 1000) / 10;
}

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  const supabase = await createClient();
  const { id: templateId } = await ctx.params;

  if (!templateId) {
    return NextResponse.json({ error: "template_id nao informado" }, { status: 400 });
  }

  const { data: subs, error: eSubs } = await supabase
    .from("form_submissions")
    .select("id, created_at, submitted_at")
    .eq("template_id", templateId);

  if (eSubs) {
    return NextResponse.json(
      { error: "Erro ao buscar submissions", details: eSubs.message },
      { status: 500 }
    );
  }

  const submissions = (subs ?? []) as SubmissionRow[];
  const submissionIds = submissions.map((s) => s.id);

  const totalResponses = submissions.length;
  const firstAt =
    submissions
      .map((s) => s.submitted_at ?? s.created_at)
      .filter((v): v is string => Boolean(v))
      .sort()[0] ?? null;

  const lastAt =
    submissions
      .map((s) => s.submitted_at ?? s.created_at)
      .filter((v): v is string => Boolean(v))
      .sort()
      .slice(-1)[0] ?? null;

  const { data: tqs, error: eTqs } = await supabase
    .from("form_template_questions")
    .select("question_id, ordem, ativo")
    .eq("template_id", templateId)
    .order("ordem", { ascending: true });

  if (eTqs) {
    return NextResponse.json(
      { error: "Erro ao buscar vinculo template-perguntas", details: eTqs.message },
      { status: 500 }
    );
  }

  const templateQuestionsRaw = (tqs ?? []) as TemplateQuestionRow[];
  const templateQuestions = templateQuestionsRaw.filter((r) => r.ativo !== false);

  const questionIds = templateQuestions.map((r) => r.question_id);

  if (questionIds.length === 0) {
    return NextResponse.json({
      template_id: templateId,
      totalResponses,
      firstAt,
      lastAt,
      byQuestion: [],
    });
  }

  const { data: qs, error: eQs } = await supabase
    .from("form_questions")
    .select("id, codigo, titulo, tipo")
    .in("id", questionIds)
    .eq("ativo", true);

  if (eQs) {
    return NextResponse.json(
      { error: "Erro ao buscar perguntas", details: eQs.message },
      { status: 500 }
    );
  }

  const questions = (qs ?? []) as QuestionRow[];

  let answers: AnswerRow[] = [];
  if (submissionIds.length > 0) {
    const { data: ans, error: eAns } = await supabase
      .from("form_submission_answers")
      .select("*")
      .in("submission_id", submissionIds);

    if (eAns) {
      return NextResponse.json(
        { error: "Erro ao buscar respostas", details: eAns.message },
        { status: 500 }
      );
    }

    answers = (ans ?? []) as AnswerRow[];
  }

  const byQuestion = questions
    .map((q) => {
      const qAnswers = answers.filter((a) => a.question_id === q.id);

      if (q.tipo === "BOOLEAN") {
        const yes = qAnswers.filter((a) => pickBoolean(a) === true).length;
        const no = qAnswers.filter((a) => pickBoolean(a) === false).length;
        return {
          ...q,
          kind: "BOOLEAN",
          totalResponses,
          counts: [
            { valor: "SIM", rotulo: "Sim", count: yes, percent: percent(yes, totalResponses) },
            { valor: "NAO", rotulo: "Nao", count: no, percent: percent(no, totalResponses) },
          ],
        };
      }

      if (q.tipo === "ESCALA" || q.tipo === "NUMERO") {
        const nums = qAnswers
          .map((a) => pickNumber(a))
          .filter((n): n is number => typeof n === "number");

        const sum = nums.reduce((acc, n) => acc + n, 0);
        const avg = nums.length > 0 ? sum / nums.length : null;

        return {
          ...q,
          kind: "NUMERIC",
          totalResponses,
          filled: qAnswers.length,
          avg,
          min: nums.length > 0 ? Math.min(...nums) : null,
          max: nums.length > 0 ? Math.max(...nums) : null,
        };
      }

      return { ...q, kind: "BASIC", totalResponses, filled: qAnswers.length };
    })
    .sort((a, b) => {
      const oa = templateQuestions.find((t) => t.question_id === a.id)?.ordem ?? 0;
      const ob = templateQuestions.find((t) => t.question_id === b.id)?.ordem ?? 0;
      return oa - ob;
    });

  return NextResponse.json({
    template_id: templateId,
    totalResponses,
    firstAt,
    lastAt,
    byQuestion,
  });
}
