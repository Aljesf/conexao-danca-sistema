import { NextRequest, NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

type ItemInput = {
  question_id: string;
  ordem: number;
  obrigatoria: boolean;
  cond_question_id?: string | null;
  cond_equals_value?: string | null;
};

export async function PUT(req: NextRequest, ctx: { params: { id: string } }) {
  const denied = await guardApiByRole(req as unknown as Request);
  if (denied) return denied as unknown as NextResponse;

  try {
    const supabase = getSupabaseServiceClient();
    const templateId = ctx.params.id;

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
    }

    const items = body.items;
    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "items deve ser uma lista." }, { status: 400 });
    }

    const normalized: ItemInput[] = items.map((it, idx) => {
      const r = (it ?? {}) as Record<string, unknown>;
      const ordemRaw = typeof r.ordem === "number" ? r.ordem : Number(r.ordem);
      return {
        question_id: String(r.question_id ?? ""),
        ordem: Number.isFinite(ordemRaw) ? ordemRaw : idx,
        obrigatoria: Boolean(r.obrigatoria),
        cond_question_id: r.cond_question_id ? String(r.cond_question_id) : null,
        cond_equals_value: r.cond_equals_value ? String(r.cond_equals_value) : null,
      };
    });

    if (normalized.some((x) => !x.question_id)) {
      return NextResponse.json({ error: "question_id e obrigatorio em todos os itens." }, { status: 400 });
    }

    const { error: delErr } = await supabase
      .from("form_template_items")
      .delete()
      .eq("template_id", templateId);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    const insertRows = normalized.map((x) => ({
      template_id: templateId,
      question_id: x.question_id,
      ordem: x.ordem,
      obrigatoria: x.obrigatoria,
      cond_question_id: x.cond_question_id,
      cond_equals_value: x.cond_equals_value,
    }));

    const { data, error: insErr } = await supabase
      .from("form_template_items")
      .insert(insertRows)
      .select("id");

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
