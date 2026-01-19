import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  try {
    const supabase = getSupabaseServiceClient();
    const { token } = await ctx.params;

    const { data: submission, error: subErr } = await supabase
      .from("form_submissions")
      .select("id, template_id, template_versao, pessoa_id, responsavel_id")
      .eq("public_token", token)
      .single();

    if (subErr || !submission) {
      return NextResponse.json({ error: "Link invalido ou expirado." }, { status: 404 });
    }

    const { data: template, error: tplErr } = await supabase
      .from("form_templates")
      .select("id, nome, descricao, status, versao, header_image_url, footer_image_url, intro_text_md, outro_text_md")
      .eq("id", submission.template_id)
      .single();

    if (tplErr || !template || template.status !== "published") {
      return NextResponse.json({ error: "Formulario indisponivel." }, { status: 404 });
    }

    const { data: items, error: itemsErr } = await supabase
      .from("form_template_items")
      .select(
        "id, question_id, ordem, obrigatoria, cond_question_id, cond_equals_value, form_questions:question_id ( id, codigo, titulo, descricao, tipo, ajuda, placeholder, min_num, max_num, min_len, max_len, scale_min, scale_max, form_question_options (id, valor, rotulo, ordem, ativo) )"
      )
      .eq("template_id", template.id)
      .order("ordem", { ascending: true });

    if (itemsErr) {
      return NextResponse.json({ error: itemsErr.message }, { status: 500 });
    }

    const { data: blocks, error: blocksErr } = await supabase
      .from("form_template_blocos")
      .select(
        "id, ordem, tipo, question_id, titulo, texto_md, imagem_url, alinhamento, obrigatoria, form_questions:question_id ( id, codigo, titulo, descricao, tipo, ajuda, placeholder, min_num, max_num, min_len, max_len, scale_min, scale_max, form_question_options (id, valor, rotulo, ordem, ativo) )"
      )
      .eq("template_id", template.id)
      .order("ordem", { ascending: true });

    if (blocksErr) {
      return NextResponse.json({ error: blocksErr.message }, { status: 500 });
    }

    const itemsByQuestion = new Map(
      (items ?? []).map((item) => [String(item.question_id), item])
    );

    const blocksOutput =
      blocks && blocks.length > 0
        ? blocks.map((block) => {
            const questionId = block.question_id ?? block.form_questions?.id ?? null;
            const item = questionId ? itemsByQuestion.get(questionId) ?? null : null;
            return {
              ...block,
              template_item_id: item?.id ?? null,
              cond_question_id: item?.cond_question_id ?? null,
              cond_equals_value: item?.cond_equals_value ?? null,
              obrigatoria: item?.obrigatoria ?? block.obrigatoria ?? false,
            };
          })
        : (items ?? []).map((item, idx) => ({
            id: item.id,
            ordem: Number.isFinite(item.ordem) ? item.ordem : idx,
            tipo: "PERGUNTA",
            question_id: String(item.question_id),
            titulo: null,
            texto_md: null,
            imagem_url: null,
            alinhamento: null,
            obrigatoria: Boolean(item.obrigatoria),
            cond_question_id: item.cond_question_id ?? null,
            cond_equals_value: item.cond_equals_value ?? null,
            template_item_id: item.id,
            form_questions: item.form_questions ?? null,
          }));

    return NextResponse.json({
      data: {
        submission,
        template,
        items: items ?? [],
        blocks: blocksOutput,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  try {
    const supabase = getSupabaseServiceClient();
    const { token } = await ctx.params;

    const { data: submission, error: subErr } = await supabase
      .from("form_submissions")
      .select("id, template_id")
      .eq("public_token", token)
      .single();

    if (subErr || !submission) {
      return NextResponse.json({ error: "Link invalido ou expirado." }, { status: 404 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
    }

    const answers = body.answers;
    if (!Array.isArray(answers)) {
      return NextResponse.json({ error: "answers deve ser uma lista." }, { status: 400 });
    }

    const rows = answers.map((a) => {
      const r = (a ?? {}) as Record<string, unknown>;
      return {
        submission_id: submission.id,
        template_item_id: String(r.template_item_id ?? ""),
        question_id: String(r.question_id ?? ""),
        value_text: r.value_text ? String(r.value_text) : null,
        value_number: r.value_number ?? null,
        value_bool: r.value_bool ?? null,
        value_date: r.value_date ?? null,
        value_json: r.value_json ?? null,
        question_titulo_snapshot: String(r.question_titulo_snapshot ?? ""),
        option_rotulos_snapshot: r.option_rotulos_snapshot
          ? String(r.option_rotulos_snapshot)
          : null,
      };
    });

    const invalid = rows.some((r) => !r.template_item_id || !r.question_id || !r.question_titulo_snapshot);
    if (invalid) {
      return NextResponse.json({ error: "Itens invalidos em answers." }, { status: 400 });
    }

    const { error } = await supabase.from("form_submission_answers").insert(rows);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
