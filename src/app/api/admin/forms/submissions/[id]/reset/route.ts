import { NextRequest, NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(req as unknown as Request);
  if (denied) return denied as unknown as NextResponse;

  try {
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "submission_id_invalido" }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();

    const { data: submission, error: subErr } = await supabase
      .from("form_submissions")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (subErr) {
      return NextResponse.json({ error: subErr.message }, { status: 500 });
    }
    if (!submission) {
      return NextResponse.json({ error: "submission_nao_encontrada" }, { status: 404 });
    }

    const { error: delErr } = await supabase
      .from("form_submission_answers")
      .delete()
      .eq("submission_id", id);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    const { error: updErr } = await supabase
      .from("form_submissions")
      .update({ submitted_at: null })
      .eq("id", id);

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
