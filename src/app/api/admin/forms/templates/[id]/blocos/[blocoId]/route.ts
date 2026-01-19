import { NextRequest, NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

const BLOCK_TYPES = new Set(["PERGUNTA", "TEXTO", "IMAGEM", "DIVISOR"]);
const ALIGN_TYPES = new Set(["ESQUERDA", "CENTRO", "DIREITA"]);

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string; blocoId: string }> }) {
  const denied = await guardApiByRole(req as unknown as Request);
  if (denied) return denied as unknown as NextResponse;

  try {
    const supabase = getSupabaseServiceClient();
    const { id: templateId, blocoId } = await ctx.params;

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
    }

    const { data: existing, error: exErr } = await supabase
      .from("form_template_blocos")
      .select("id, template_id, ordem, tipo, question_id, obrigatoria")
      .eq("id", blocoId)
      .eq("template_id", templateId)
      .single();

    if (exErr || !existing) {
      return NextResponse.json({ error: "Bloco nao encontrado." }, { status: 404 });
    }

    const patch: Record<string, unknown> = {};

    if (body.tipo !== undefined) {
      const tipo = String(body.tipo ?? "").toUpperCase();
      if (!BLOCK_TYPES.has(tipo)) {
        return NextResponse.json({ error: "tipo_invalido" }, { status: 400 });
      }
      patch.tipo = tipo;
    }

    if (body.ordem !== undefined) {
      const ordemRaw = typeof body.ordem === "number" ? body.ordem : Number(body.ordem);
      if (!Number.isFinite(ordemRaw)) {
        return NextResponse.json({ error: "ordem_invalida" }, { status: 400 });
      }
      patch.ordem = ordemRaw;
    }

    if (body.question_id !== undefined) {
      patch.question_id = body.question_id ? String(body.question_id) : null;
    }

    if (body.titulo !== undefined) patch.titulo = body.titulo ? String(body.titulo).trim() : null;
    if (body.texto_md !== undefined) patch.texto_md = body.texto_md ? String(body.texto_md) : null;
    if (body.imagem_url !== undefined) patch.imagem_url = body.imagem_url ? String(body.imagem_url).trim() : null;

    if (body.alinhamento !== undefined) {
      const alinhamentoRaw = body.alinhamento ? String(body.alinhamento).toUpperCase() : null;
      patch.alinhamento = alinhamentoRaw && ALIGN_TYPES.has(alinhamentoRaw) ? alinhamentoRaw : null;
    }

    if (body.obrigatoria !== undefined) patch.obrigatoria = Boolean(body.obrigatoria);

    const next = {
      tipo: (patch.tipo as string) ?? existing.tipo,
      ordem: (patch.ordem as number) ?? existing.ordem,
      question_id: (patch.question_id as string | null) ?? existing.question_id,
      obrigatoria: (patch.obrigatoria as boolean) ?? existing.obrigatoria,
    };

    if (next.tipo === "PERGUNTA" && !next.question_id) {
      return NextResponse.json({ error: "question_id_obrigatorio" }, { status: 400 });
    }

    const { error: upErr } = await supabase
      .from("form_template_blocos")
      .update(patch)
      .eq("id", blocoId)
      .eq("template_id", templateId);

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    if (next.tipo === "PERGUNTA" && next.question_id) {
      const itemRow: Record<string, unknown> = {
        template_id: templateId,
        question_id: next.question_id,
        ordem: next.ordem,
        obrigatoria: next.obrigatoria,
      };

      if (body.cond_question_id !== undefined) {
        itemRow.cond_question_id = body.cond_question_id ? String(body.cond_question_id) : null;
      }
      if (body.cond_equals_value !== undefined) {
        itemRow.cond_equals_value = body.cond_equals_value ? String(body.cond_equals_value).trim() : null;
      }

      const { error: itemErr } = await supabase
        .from("form_template_items")
        .upsert([itemRow], { onConflict: "template_id,question_id" });

      if (itemErr) {
        return NextResponse.json({ error: itemErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string; blocoId: string }> }) {
  const denied = await guardApiByRole(req as unknown as Request);
  if (denied) return denied as unknown as NextResponse;

  try {
    const supabase = getSupabaseServiceClient();
    const { id: templateId, blocoId } = await ctx.params;

    const { error } = await supabase
      .from("form_template_blocos")
      .delete()
      .eq("id", blocoId)
      .eq("template_id", templateId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
