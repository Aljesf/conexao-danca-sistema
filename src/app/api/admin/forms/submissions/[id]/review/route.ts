import { NextRequest, NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { requireUser } from "@/lib/supabase/api-auth";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

type ReviewStatus = "PENDENTE_REVISAO" | "OK" | "AJUSTE_SOLICITADO" | "INVALIDADO";

type ReviewPayload = {
  review_status?: ReviewStatus;
  review_note?: string;
};

const allowedStatuses = new Set<ReviewStatus>([
  "PENDENTE_REVISAO",
  "OK",
  "AJUSTE_SOLICITADO",
  "INVALIDADO",
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(req as unknown as Request);
  if (denied) return denied as unknown as NextResponse;

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "submission_id_invalido" }, { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as ReviewPayload | null;
    const reviewStatus = body?.review_status;

    if (!reviewStatus || !allowedStatuses.has(reviewStatus)) {
      return NextResponse.json({ error: "review_status_obrigatorio" }, { status: 400 });
    }

    const note = typeof body?.review_note === "string" ? body.review_note : null;

    const supabase = getSupabaseServiceClient();
    const { data: updated, error: upErr } = await supabase
      .from("form_submissions")
      .update({
        review_status: reviewStatus,
        review_note: note && note.trim() ? note.trim() : null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: auth.userId,
      })
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (upErr) {
      return NextResponse.json(
        { error: "falha_update", details: upErr.message },
        { status: 500 }
      );
    }

    if (!updated) {
      return NextResponse.json({ error: "submission_nao_encontrada" }, { status: 404 });
    }

    const { data: row, error: selErr } = await supabase
      .from("form_submissions_status_v")
      .select(
        "id,status_auto,review_status,status_final,answered_count,reviewed_at,reviewed_by,review_note"
      )
      .eq("id", id)
      .maybeSingle();

    if (selErr) {
      return NextResponse.json(
        { error: "falha_select", details: selErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, submission: row });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
