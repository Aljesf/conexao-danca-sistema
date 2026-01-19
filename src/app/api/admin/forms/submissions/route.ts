import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

type TemplateMini = { id: string; nome: string; status: string };

type SubmissionRow = {
  id: string;
  public_token: string | null;
  created_at: string;
  submitted_at: string | null;
  template: TemplateMini;
  answers_count: number;
  has_answers: boolean;
};

function toInt(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: Request) {
  try {
    const supabase = getSupabaseServiceClient();
    const url = new URL(req.url);

    const pessoaId = toInt(url.searchParams.get("pessoa_id"));
    const responsavelId = toInt(url.searchParams.get("responsavel_id"));
    const templateId = url.searchParams.get("template_id");
    const limitRaw = toInt(url.searchParams.get("limit"));
    const limit = limitRaw && limitRaw > 0 ? Math.min(limitRaw, 50) : 20;

    if (!pessoaId && !responsavelId) {
      return NextResponse.json(
        { error: "Informe pessoa_id ou responsavel_id." },
        { status: 400 }
      );
    }

    let q = supabase
      .from("form_submissions")
      .select("id, public_token, created_at, submitted_at, template_id")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (pessoaId && responsavelId) {
      q = q.or(`pessoa_id.eq.${pessoaId},responsavel_id.eq.${responsavelId}`);
    } else if (pessoaId) {
      q = q.eq("pessoa_id", pessoaId);
    } else if (responsavelId) {
      q = q.eq("responsavel_id", responsavelId);
    }
    if (templateId) q = q.eq("template_id", templateId);

    const { data: subs, error: sErr } = await q;
    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

    const templateIds = Array.from(
      new Set((subs ?? []).map((s) => s.template_id).filter(Boolean))
    ) as string[];
    const subIds = (subs ?? []).map((s) => s.id);

    const [tplRes, ansRes] = await Promise.all([
      templateIds.length
        ? supabase
            .from("form_templates")
            .select("id,nome,status")
            .in("id", templateIds)
        : Promise.resolve({ data: [], error: null as unknown }),
      subIds.length
        ? supabase
            .from("form_submission_answers")
            .select("submission_id")
            .in("submission_id", subIds)
        : Promise.resolve({ data: [], error: null as unknown }),
    ]);

    const tplMap = new Map<string, TemplateMini>();
    for (const t of (tplRes as { data?: TemplateMini[] }).data ?? []) {
      tplMap.set(t.id, { id: t.id, nome: t.nome, status: t.status });
    }

    const countMap = new Map<string, number>();
    for (const a of (ansRes as { data?: Array<{ submission_id: string }> }).data ?? []) {
      const sid = a.submission_id;
      countMap.set(sid, (countMap.get(sid) ?? 0) + 1);
    }

    const out: SubmissionRow[] = (subs ?? []).map((s) => {
      const c = countMap.get(s.id) ?? 0;
      const tpl =
        tplMap.get(s.template_id) ??
        ({ id: s.template_id, nome: "Template", status: "unknown" } satisfies TemplateMini);
      return {
        id: s.id,
        public_token: s.public_token ?? null,
        created_at: s.created_at,
        submitted_at: (s as { submitted_at?: string | null }).submitted_at ?? null,
        template: tpl,
        answers_count: c,
        has_answers: c > 0,
      };
    });

    return NextResponse.json({ data: out });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro desconhecido." },
      { status: 500 }
    );
  }
}
