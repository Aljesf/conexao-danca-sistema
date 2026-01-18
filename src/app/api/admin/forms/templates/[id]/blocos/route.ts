import { NextRequest, NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

type BlockInput = {
  tipo?: string;
  ordem?: number;
  question_id?: string | null;
  titulo?: string | null;
  texto_md?: string | null;
  imagem_url?: string | null;
  alinhamento?: string | null;
  obrigatoria?: boolean;
  cond_question_id?: string | null;
  cond_equals_value?: string | null;
};

const BLOCK_TYPES = new Set(["PERGUNTA", "TEXTO", "IMAGEM", "DIVISOR"]);
const ALIGN_TYPES = new Set(["ESQUERDA", "CENTRO", "DIREITA"]);

function normalizeBlock(input: BlockInput, idx: number) {
  const tipo = String(input.tipo ?? "").toUpperCase();
  if (!BLOCK_TYPES.has(tipo)) {
    return { error: `tipo_invalido_${idx}` } as const;
  }

  const ordemRaw = typeof input.ordem === "number" ? input.ordem : Number(input.ordem);
  const ordem = Number.isFinite(ordemRaw) ? ordemRaw : idx;

  const question_id = input.question_id ? String(input.question_id) : null;
  if (tipo === "PERGUNTA" && !question_id) {
    return { error: `question_id_obrigatorio_${idx}` } as const;
  }

  const titulo = input.titulo ? String(input.titulo).trim() : null;
  const texto_md = input.texto_md ? String(input.texto_md) : null;
  const imagem_url = input.imagem_url ? String(input.imagem_url).trim() : null;
  const alinhamentoRaw = input.alinhamento ? String(input.alinhamento).toUpperCase() : null;
  const alinhamento = alinhamentoRaw && ALIGN_TYPES.has(alinhamentoRaw) ? alinhamentoRaw : null;

  const obrigatoria = Boolean(input.obrigatoria);
  const cond_question_id = input.cond_question_id ? String(input.cond_question_id) : null;
  const cond_equals_value = input.cond_equals_value ? String(input.cond_equals_value).trim() : null;

  return {
    tipo,
    ordem,
    question_id: tipo === "PERGUNTA" ? question_id : null,
    titulo,
    texto_md,
    imagem_url,
    alinhamento,
    obrigatoria,
    cond_question_id,
    cond_equals_value,
  } as const;
}

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const denied = await guardApiByRole(req as unknown as Request);
  if (denied) return denied as unknown as NextResponse;

  try {
    const supabase = getSupabaseServiceClient();
    const templateId = ctx.params.id;

    const { data: blocks, error: blocksErr } = await supabase
      .from("form_template_blocos")
      .select(
        "id, template_id, ordem, tipo, question_id, titulo, texto_md, imagem_url, alinhamento, obrigatoria, form_questions:question_id ( id, codigo, titulo, descricao, tipo, ajuda, placeholder, min_num, max_num, min_len, max_len, scale_min, scale_max, form_question_options (id, valor, rotulo, ordem, ativo) )"
      )
      .eq("template_id", templateId)
      .order("ordem", { ascending: true });

    if (blocksErr) {
      return NextResponse.json({ error: blocksErr.message }, { status: 500 });
    }

    const { data: items, error: itemsErr } = await supabase
      .from("form_template_items")
      .select("id, question_id, ordem, obrigatoria, cond_question_id, cond_equals_value")
      .eq("template_id", templateId);

    if (itemsErr) {
      return NextResponse.json({ error: itemsErr.message }, { status: 500 });
    }

    if (blocks && blocks.length > 0) {
      const itemsByQuestion = new Map(
        (items ?? []).map((item) => [String(item.question_id), item])
      );

      const enriched = blocks.map((block) => {
        const item = block.question_id ? itemsByQuestion.get(block.question_id) ?? null : null;
        return {
          ...block,
          obrigatoria: item?.obrigatoria ?? block.obrigatoria ?? false,
          cond_question_id: item?.cond_question_id ?? null,
          cond_equals_value: item?.cond_equals_value ?? null,
        };
      });

      return NextResponse.json({ data: enriched }, { status: 200 });
    }

    const { data: legacyItems, error: legacyErr } = await supabase
      .from("form_template_items")
      .select(
        "id, question_id, ordem, obrigatoria, cond_question_id, cond_equals_value, form_questions:question_id ( id, codigo, titulo, descricao, tipo, ajuda, placeholder, min_num, max_num, min_len, max_len, scale_min, scale_max, form_question_options (id, valor, rotulo, ordem, ativo) )"
      )
      .eq("template_id", templateId)
      .order("ordem", { ascending: true });

    if (legacyErr) {
      return NextResponse.json({ error: legacyErr.message }, { status: 500 });
    }

    const fallback = (legacyItems ?? []).map((item, idx) => ({
      id: item.id,
      template_id: templateId,
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
      form_questions: item.form_questions ?? null,
    }));

    return NextResponse.json({ data: fallback }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const denied = await guardApiByRole(req as unknown as Request);
  if (denied) return denied as unknown as NextResponse;

  try {
    const supabase = getSupabaseServiceClient();
    const templateId = ctx.params.id;

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
    }

    const blocks = body.blocks;
    if (!Array.isArray(blocks)) {
      return NextResponse.json({ error: "blocks deve ser uma lista." }, { status: 400 });
    }

    const normalized = blocks.map((b, idx) => normalizeBlock(b as BlockInput, idx));
    const error = normalized.find((b) => "error" in b);
    if (error && "error" in error) {
      return NextResponse.json({ error: error.error }, { status: 400 });
    }

    const clean = normalized.filter((b) => !("error" in b)) as Array<ReturnType<typeof normalizeBlock>>;
    const seen = new Set<string>();
    for (const block of clean) {
      if (block.tipo !== "PERGUNTA" || !block.question_id) continue;
      if (seen.has(block.question_id)) {
        return NextResponse.json({ error: "question_id duplicado nos blocos." }, { status: 400 });
      }
      if (block.cond_question_id && block.cond_question_id === block.question_id) {
        return NextResponse.json({ error: "cond_question_id nao pode ser igual a question_id." }, { status: 400 });
      }
      seen.add(block.question_id);
    }

    const { error: delErr } = await supabase
      .from("form_template_blocos")
      .delete()
      .eq("template_id", templateId);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    const insertRows = clean.map((b) => ({
      template_id: templateId,
      ordem: b.ordem,
      tipo: b.tipo,
      question_id: b.question_id,
      titulo: b.titulo,
      texto_md: b.texto_md,
      imagem_url: b.imagem_url,
      alinhamento: b.alinhamento,
      obrigatoria: b.obrigatoria,
    }));

    if (insertRows.length > 0) {
      const { error: insErr } = await supabase.from("form_template_blocos").insert(insertRows);
      if (insErr) {
        return NextResponse.json({ error: insErr.message }, { status: 500 });
      }
    }

    const questionBlocks = clean.filter((b) => b.tipo === "PERGUNTA" && b.question_id);
    if (questionBlocks.length > 0) {
      const itemRows = questionBlocks.map((b) => ({
        template_id: templateId,
        question_id: b.question_id,
        ordem: b.ordem,
        obrigatoria: b.obrigatoria,
        cond_question_id: b.cond_question_id,
        cond_equals_value: b.cond_equals_value,
      }));

      const { error: upErr } = await supabase
        .from("form_template_items")
        .upsert(itemRows, { onConflict: "template_id,question_id" });

      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
