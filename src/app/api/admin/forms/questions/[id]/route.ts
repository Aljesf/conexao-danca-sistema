import { NextRequest, NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

type QuestionType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "boolean"
  | "single_choice"
  | "multi_choice"
  | "scale";

type OptionInput = {
  valor: string;
  rotulo: string;
  ordem: number;
  ativo: boolean;
};

const QUESTION_TYPES: QuestionType[] = [
  "text",
  "textarea",
  "number",
  "date",
  "boolean",
  "single_choice",
  "multi_choice",
  "scale",
];

function toNumberOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toNullableString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s ? s : null;
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const denied = await guardApiByRole(req as unknown as Request);
  if (denied) return denied as unknown as NextResponse;

  try {
    const id = ctx.params.id;
    if (!id) return NextResponse.json({ error: "Parametro id invalido." }, { status: 400 });

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};

    if (body.codigo !== undefined) {
      const codigo = String(body.codigo ?? "").trim();
      if (!codigo) return NextResponse.json({ error: "codigo invalido." }, { status: 400 });
      patch.codigo = codigo;
    }

    if (body.titulo !== undefined) {
      const titulo = String(body.titulo ?? "").trim();
      if (!titulo) return NextResponse.json({ error: "titulo invalido." }, { status: 400 });
      patch.titulo = titulo;
    }

    if (body.tipo !== undefined) {
      const tipo = String(body.tipo ?? "").trim() as QuestionType;
      if (!QUESTION_TYPES.includes(tipo)) {
        return NextResponse.json({ error: "tipo invalido." }, { status: 400 });
      }
      patch.tipo = tipo;
    }

    if (body.descricao !== undefined) patch.descricao = toNullableString(body.descricao);
    if (body.ajuda !== undefined) patch.ajuda = toNullableString(body.ajuda);
    if (body.placeholder !== undefined) patch.placeholder = toNullableString(body.placeholder);
    if (body.ativo !== undefined) patch.ativo = Boolean(body.ativo);

    if (body.min_num !== undefined) patch.min_num = toNumberOrNull(body.min_num);
    if (body.max_num !== undefined) patch.max_num = toNumberOrNull(body.max_num);
    if (body.min_len !== undefined) patch.min_len = toNumberOrNull(body.min_len);
    if (body.max_len !== undefined) patch.max_len = toNumberOrNull(body.max_len);
    if (body.scale_min !== undefined) patch.scale_min = toNumberOrNull(body.scale_min);
    if (body.scale_max !== undefined) patch.scale_max = toNumberOrNull(body.scale_max);

    const optionsRaw = body.options;
    const hasOptions = optionsRaw !== undefined;
    let normalizedOptions: OptionInput[] = [];

    if (hasOptions) {
      if (!Array.isArray(optionsRaw)) {
        return NextResponse.json({ error: "options deve ser uma lista." }, { status: 400 });
      }

      normalizedOptions = optionsRaw.map((opt, idx) => {
        const r = (opt ?? {}) as Record<string, unknown>;
        const valor = String(r.valor ?? "").trim();
        const rotulo = String(r.rotulo ?? "").trim();
        const ordemRaw = typeof r.ordem === "number" ? r.ordem : Number(r.ordem);
        const ordem = Number.isFinite(ordemRaw) ? ordemRaw : idx;
        const ativo = r.ativo === undefined ? true : Boolean(r.ativo);

        return { valor, rotulo, ordem, ativo };
      });

      const invalid = normalizedOptions.some((opt) => !opt.valor || !opt.rotulo);
      if (invalid) {
        return NextResponse.json(
          { error: "options invalidas: valor e rotulo sao obrigatorios." },
          { status: 400 }
        );
      }
    }

    if (Object.keys(patch).length === 0 && !hasOptions) {
      return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();

    if (Object.keys(patch).length > 0) {
      const { data: updated, error } = await supabase
        .from("form_questions")
        .update(patch)
        .eq("id", id)
        .select("id")
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!updated) return NextResponse.json({ error: "Pergunta nao encontrada." }, { status: 404 });
    }

    if (hasOptions) {
      const { error: delErr } = await supabase
        .from("form_question_options")
        .delete()
        .eq("question_id", id);

      if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

      if (normalizedOptions.length > 0) {
        const insertRows = normalizedOptions.map((opt) => ({
          question_id: id,
          valor: opt.valor,
          rotulo: opt.rotulo,
          ordem: opt.ordem,
          ativo: opt.ativo,
        }));

        const { error: insErr } = await supabase.from("form_question_options").insert(insertRows);
        if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
      }
    }

    const { data, error: fetchErr } = await supabase
      .from("form_questions")
      .select("*, form_question_options(*)")
      .eq("id", id)
      .single();

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
