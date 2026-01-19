import { NextRequest, NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

type CleanupPayload = {
  pessoa_id?: number | null;
  responsavel_id?: number | null;
  template_id?: string | null;
  keep?: "latest" | "latest_answered";
};

type SubmissionRow = {
  id: string;
  created_at: string | null;
  submitted_at: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const denied = await guardApiByRole(req as unknown as Request);
  if (denied) return denied as unknown as NextResponse;

  try {
    const supabase = getSupabaseServiceClient();
    const body = (await req.json().catch(() => null)) as CleanupPayload | null;

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "payload_invalido" }, { status: 400 });
    }

    const templateId = body.template_id ?? null;
    if (!templateId || !UUID_RE.test(templateId)) {
      return NextResponse.json({ error: "template_id_invalido" }, { status: 400 });
    }

    const pessoaId = body.pessoa_id ?? null;
    const responsavelId = body.responsavel_id ?? null;
    if (!pessoaId && !responsavelId) {
      return NextResponse.json({ error: "Informe pessoa_id ou responsavel_id." }, { status: 400 });
    }

    const keep = body.keep ?? "latest";

    let q = supabase
      .from("form_submissions")
      .select("id, created_at, submitted_at")
      .eq("template_id", templateId);

    if (pessoaId && responsavelId) {
      q = q.or(`pessoa_id.eq.${pessoaId},responsavel_id.eq.${responsavelId}`);
    } else if (pessoaId) {
      q = q.eq("pessoa_id", pessoaId);
    } else if (responsavelId) {
      q = q.eq("responsavel_id", responsavelId);
    }

    const { data: subs, error: sErr } = await q;
    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
    if (!subs || subs.length === 0) {
      return NextResponse.json({ data: { kept_id: null, deleted_count: 0 } }, { status: 200 });
    }

    const subIds = subs.map((s) => s.id);
    const { data: answers, error: aErr } = await supabase
      .from("form_submission_answers")
      .select("submission_id")
      .in("submission_id", subIds);
    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

    const countMap = new Map<string, number>();
    for (const a of answers ?? []) {
      const sid = (a as { submission_id: string }).submission_id;
      countMap.set(sid, (countMap.get(sid) ?? 0) + 1);
    }

    const rows = (subs as SubmissionRow[]).map((s) => ({
      ...s,
      answers_count: countMap.get(s.id) ?? 0,
    }));

    const sortByDateDesc = (a: string | null, b: string | null) => {
      const da = a ? new Date(a).getTime() : 0;
      const db = b ? new Date(b).getTime() : 0;
      return db - da;
    };

    let ordered: typeof rows;
    if (keep === "latest_answered") {
      const answered = rows.filter((r) => r.answers_count > 0);
      const pending = rows.filter((r) => r.answers_count === 0);
      answered.sort((a, b) => {
        const primary = sortByDateDesc(a.submitted_at, b.submitted_at);
        if (primary !== 0) return primary;
        return sortByDateDesc(a.created_at, b.created_at);
      });
      pending.sort((a, b) => sortByDateDesc(a.created_at, b.created_at));
      ordered = [...answered, ...pending];
    } else {
      ordered = rows.slice().sort((a, b) => sortByDateDesc(a.created_at, b.created_at));
    }

    const keepId = ordered[0]?.id ?? null;
    const deleteIds = ordered.slice(1).map((r) => r.id);
    if (!keepId || deleteIds.length === 0) {
      return NextResponse.json({ data: { kept_id: keepId, deleted_count: 0 } }, { status: 200 });
    }

    const { error: delErr } = await supabase.from("form_submissions").delete().in("id", deleteIds);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    return NextResponse.json({ data: { kept_id: keepId, deleted_count: deleteIds.length } }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
