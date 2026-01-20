import { NextRequest, NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

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
    const questions = (body as { questions?: unknown })?.questions;

    if (!Array.isArray(questions)) {
      return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
    }

    const payload = questions.map((q: any) => ({
      id: q.id ?? undefined,
      form_id: q.form_id,
      titulo: q.titulo,
      tipo: q.tipo,
      ordem: q.ordem,
      ativo: q.ativo,
      ...(q.id ? {} : { codigo: q.codigo }),
    }));

    const { error } = await supabase.from("form_questions").upsert(payload, {
      onConflict: "id",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
