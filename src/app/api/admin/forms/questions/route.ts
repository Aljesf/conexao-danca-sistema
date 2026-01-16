import { NextRequest, NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

type QuestionInsert = {
  codigo: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  ajuda: string | null;
  placeholder: string | null;
  ativo: boolean;
  min_num: number | null;
  max_num: number | null;
  min_len: number | null;
  max_len: number | null;
  scale_min: number | null;
  scale_max: number | null;
};

function toNumberOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: NextRequest) {
  const denied = await guardApiByRole(req as unknown as Request);
  if (denied) return denied as unknown as NextResponse;

  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("form_questions")
      .select("*, form_question_options(*)")
      .order("created_at", { ascending: false })
      .order("ordem", { foreignTable: "form_question_options", ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await guardApiByRole(req as unknown as Request);
  if (denied) return denied as unknown as NextResponse;

  try {
    const supabase = getSupabaseServiceClient();
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
    }

    const codigo = String(body.codigo ?? "").trim();
    const titulo = String(body.titulo ?? "").trim();
    const tipo = String(body.tipo ?? "").trim();

    if (!codigo || !titulo || !tipo) {
      return NextResponse.json(
        { error: "Campos obrigatorios: codigo, titulo, tipo." },
        { status: 400 }
      );
    }

    const insert: QuestionInsert = {
      codigo,
      titulo,
      descricao: body.descricao ? String(body.descricao) : null,
      tipo,
      ajuda: body.ajuda ? String(body.ajuda) : null,
      placeholder: body.placeholder ? String(body.placeholder) : null,
      ativo: body.ativo === undefined ? true : Boolean(body.ativo),
      min_num: toNumberOrNull(body.min_num),
      max_num: toNumberOrNull(body.max_num),
      min_len: toNumberOrNull(body.min_len),
      max_len: toNumberOrNull(body.max_len),
      scale_min: toNumberOrNull(body.scale_min),
      scale_max: toNumberOrNull(body.scale_max),
    };

    const { data, error } = await supabase
      .from("form_questions")
      .insert(insert)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
