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

type OptionRow = {
  id: string;
  question_id: string;
  valor: string;
  rotulo: string;
  ordem: number | null;
  ativo?: boolean | null;
};

type AnswerRow = {
  submission_id?: string;
  form_submission_id?: string;
  question_id?: string;
} & Record<string, unknown>;

type SelectedOptionRow = Record<string, unknown>;

function percent(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 1000) / 10;
}

function pickString(a: Record<string, unknown>): string | null {
  const candidates = [
    "value_text",
    "valor_texto",
    "texto",
    "text_value",
    "string_value",
    "value",
  ];
  for (const key of candidates) {
    const v = a[key];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return null;
}

function pickBoolean(a: Record<string, unknown>): boolean | null {
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

function pickNumber(a: Record<string, unknown>): number | null {
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

function pickId(row: Record<string, unknown>, candidates: string[]): string | null {
  for (const k of candidates) {
    const v = row[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

function normalizeToken(s: string): string {
  return s.trim().toLowerCase();
}

function parseMultiFromAnswer(a: AnswerRow): string[] {
  const vj = a["value_json"] ?? a["valor_json"];
  if (Array.isArray(vj)) {
    return vj
      .map((x) => (typeof x === "string" ? x : ""))
      .map(normalizeToken)
      .filter((x) => x.length > 0);
  }

  const s = pickString(a as Record<string, unknown>);
  if (!s) return [];

  return s
    .split(/[,;\n]/g)
    .map(normalizeToken)
    .filter((x) => x.length > 0);
}

function safeAvg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sum = nums.reduce((acc, n) => acc + n, 0);
  return sum / nums.length;
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

  const timeline = submissions
    .map((s) => s.submitted_at ?? s.created_at)
    .filter((v): v is string => Boolean(v))
    .sort();

  const firstAt = timeline[0] ?? null;
  const lastAt = timeline.length > 0 ? timeline[timeline.length - 1] : null;

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

  const { data: optRows, error: eOpts } = await supabase
    .from("form_question_options")
    .select("id, question_id, valor, rotulo, ordem, ativo")
    .in("question_id", questionIds)
    .order("ordem", { ascending: true });

  if (eOpts) {
    return NextResponse.json(
      { error: "Erro ao buscar opcoes das perguntas", details: eOpts.message },
      { status: 500 }
    );
  }

  const options = (optRows ?? []) as OptionRow[];
  const optionsByQuestion = new Map<string, OptionRow[]>();
  for (const o of options) {
    if (o.ativo === false) continue;
    const list = optionsByQuestion.get(o.question_id) ?? [];
    list.push(o);
    optionsByQuestion.set(o.question_id, list);
  }

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

  let selectedOptions: SelectedOptionRow[] = [];
  if (submissionIds.length > 0) {
    const { data: selByQ, error: eSelByQ } = await supabase
      .from("form_response_selected_options")
      .select("*")
      .in("question_id", questionIds);

    if (!eSelByQ) {
      selectedOptions = (selByQ ?? []) as SelectedOptionRow[];
    } else {
      const { data: selByQ2, error: eSelByQ2 } = await supabase
        .from("form_response_selected_options")
        .select("*")
        .in("form_question_id", questionIds);

      if (!eSelByQ2) {
        selectedOptions = (selByQ2 ?? []) as SelectedOptionRow[];
      } else {
        selectedOptions = [];
      }
    }
  }

  const soSubmissionKeyCandidates = ["submission_id", "form_submission_id"];
  const soQuestionKeyCandidates = ["question_id", "form_question_id"];
  const soOptionKeyCandidates = [
    "option_id",
    "question_option_id",
    "selected_option_id",
    "form_question_option_id",
  ];

  function soSubmissionId(row: SelectedOptionRow): string | null {
    return pickId(row, soSubmissionKeyCandidates);
  }
  function soQuestionId(row: SelectedOptionRow): string | null {
    return pickId(row, soQuestionKeyCandidates);
  }
  function soOptionId(row: SelectedOptionRow): string | null {
    return pickId(row, soOptionKeyCandidates);
  }

  const soByQuestion = new Map<string, SelectedOptionRow[]>();
  for (const r of selectedOptions) {
    const qid = soQuestionId(r);
    if (!qid) continue;
    const list = soByQuestion.get(qid) ?? [];
    list.push(r);
    soByQuestion.set(qid, list);
  }

  const ansByQuestion = new Map<string, AnswerRow[]>();
  for (const a of answers) {
    const qid = (typeof a.question_id === "string" ? a.question_id : null) ?? null;
    if (!qid) continue;
    const list = ansByQuestion.get(qid) ?? [];
    list.push(a);
    ansByQuestion.set(qid, list);
  }

  const byQuestion = questions
    .map((q) => {
      const qOrder = templateQuestions.find((t) => t.question_id === q.id)?.ordem ?? 0;

      const qAnswers = ansByQuestion.get(q.id) ?? [];
      const qSelected = soByQuestion.get(q.id) ?? [];
      const qOptions = optionsByQuestion.get(q.id) ?? [];

      const filled = qAnswers.length;

      if (q.tipo === "single_choice" || q.tipo === "multi_choice") {
        const countsByOptionId = new Map<string, number>();
        const totalBase = totalResponses;

        for (const r of qSelected) {
          const sid = soSubmissionId(r);
          if (sid && !submissionIds.includes(sid)) continue;

          const oid = soOptionId(r);
          if (!oid) continue;
          countsByOptionId.set(oid, (countsByOptionId.get(oid) ?? 0) + 1);
        }

        if (countsByOptionId.size === 0 && qAnswers.length > 0 && qOptions.length > 0) {
          const byToken = new Map<string, OptionRow>();
          for (const o of qOptions) {
            byToken.set(normalizeToken(o.valor), o);
            byToken.set(normalizeToken(o.rotulo), o);
          }

          if (q.tipo === "single_choice") {
            const seenSubmission = new Set<string>();
            for (const a of qAnswers) {
              const sid =
                (typeof a["submission_id"] === "string" ? (a["submission_id"] as string) : null) ??
                (typeof a["form_submission_id"] === "string"
                  ? (a["form_submission_id"] as string)
                  : null);

              if (sid && seenSubmission.has(sid)) continue;
              if (sid) seenSubmission.add(sid);

              const v = pickString(a as Record<string, unknown>);
              if (!v) continue;

              const opt = byToken.get(normalizeToken(v));
              if (!opt) continue;

              countsByOptionId.set(opt.id, (countsByOptionId.get(opt.id) ?? 0) + 1);
            }
          } else {
            const seen = new Set<string>();
            for (const a of qAnswers) {
              const sid =
                (typeof a["submission_id"] === "string" ? (a["submission_id"] as string) : null) ??
                (typeof a["form_submission_id"] === "string"
                  ? (a["form_submission_id"] as string)
                  : null);

              const items = parseMultiFromAnswer(a);
              for (const item of items) {
                const opt = byToken.get(item);
                if (!opt) continue;

                const dedupKey = sid ? `${sid}|${opt.id}` : opt.id;
                if (seen.has(dedupKey)) continue;
                seen.add(dedupKey);

                countsByOptionId.set(opt.id, (countsByOptionId.get(opt.id) ?? 0) + 1);
              }
            }
          }
        }

        const breakdown = qOptions.map((o) => {
          const c = countsByOptionId.get(o.id) ?? 0;
          return {
            option_id: o.id,
            valor: o.valor,
            rotulo: o.rotulo,
            quantidade: c,
            percentual: percent(c, totalBase),
          };
        });

        return {
          id: q.id,
          codigo: q.codigo,
          titulo: q.titulo,
          tipo: q.tipo,
          ordem: qOrder,
          totalResponses,
          filled,
          analytics: {
            kind: q.tipo,
            total: totalBase,
            opcoes: breakdown,
          },
        };
      }

      if (q.tipo === "boolean") {
        if (qSelected.length > 0 && qOptions.length > 0) {
          const counts = new Map<string, number>();
          for (const r of qSelected) {
            const sid = soSubmissionId(r);
            if (sid && !submissionIds.includes(sid)) continue;

            const oid = soOptionId(r);
            if (!oid) continue;
            counts.set(oid, (counts.get(oid) ?? 0) + 1);
          }
          const totalBase = totalResponses;
          const breakdown = qOptions.map((o) => {
            const c = counts.get(o.id) ?? 0;
            return {
              option_id: o.id,
              valor: o.valor,
              rotulo: o.rotulo,
              quantidade: c,
              percentual: percent(c, totalBase),
            };
          });

          return {
            id: q.id,
            codigo: q.codigo,
            titulo: q.titulo,
            tipo: q.tipo,
            ordem: qOrder,
            totalResponses,
            filled,
            analytics: {
              kind: "boolean",
              total: totalBase,
              opcoes: breakdown,
            },
          };
        }

        const seenSubmission = new Set<string>();
        const bools = qAnswers
          .map((a) => {
            const sid =
              (typeof a["submission_id"] === "string" ? (a["submission_id"] as string) : null) ??
              (typeof a["form_submission_id"] === "string"
                ? (a["form_submission_id"] as string)
                : null);

            if (sid) seenSubmission.add(sid);
            return pickBoolean(a as Record<string, unknown>);
          })
          .filter((v): v is boolean => typeof v === "boolean");

        const yes = bools.filter((v) => v === true).length;
        const no = bools.filter((v) => v === false).length;

        return {
          id: q.id,
          codigo: q.codigo,
          titulo: q.titulo,
          tipo: q.tipo,
          ordem: qOrder,
          totalResponses,
          filled: seenSubmission.size,
          analytics: {
            kind: "boolean",
            total: totalResponses,
            opcoes: [
              {
                valor: "SIM",
                rotulo: "Sim",
                quantidade: yes,
                percentual: percent(yes, totalResponses),
              },
              {
                valor: "NAO",
                rotulo: "Nao",
                quantidade: no,
                percentual: percent(no, totalResponses),
              },
            ],
          },
        };
      }

      if (q.tipo === "number" || q.tipo === "scale") {
        const nums = qAnswers
          .map((a) => pickNumber(a))
          .filter((n): n is number => typeof n === "number");

        const avg = safeAvg(nums);

        return {
          id: q.id,
          codigo: q.codigo,
          titulo: q.titulo,
          tipo: q.tipo,
          ordem: qOrder,
          totalResponses,
          filled: nums.length,
          analytics: {
            kind: q.tipo,
            total: nums.length,
            media: avg,
            min: nums.length > 0 ? Math.min(...nums) : null,
            max: nums.length > 0 ? Math.max(...nums) : null,
          },
        };
      }

      if (q.tipo === "text" || q.tipo === "textarea") {
        const texts = qAnswers
          .map((a) => pickString(a))
          .filter((t): t is string => typeof t === "string" && t.length > 0);

        return {
          id: q.id,
          codigo: q.codigo,
          titulo: q.titulo,
          tipo: q.tipo,
          ordem: qOrder,
          totalResponses,
          filled: texts.length,
          analytics: {
            kind: q.tipo,
            total: texts.length,
            respostas: texts,
          },
        };
      }

      return {
        id: q.id,
        codigo: q.codigo,
        titulo: q.titulo,
        tipo: q.tipo,
        ordem: qOrder,
        totalResponses,
        filled,
        analytics: { kind: "unknown", total: filled },
      };
    })
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

  return NextResponse.json({
    template_id: templateId,
    totalResponses,
    firstAt,
    lastAt,
    byQuestion,
  });
}
