import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { id: string };

async function tryListFromSubmissions(supabase: any, templateId: string) {
  const { data, error } = await supabase
    .from("form_submissions")
    .select(
      `
      id,
      status,
      submitted_at,
      created_at,
      pessoa_id,
      pessoas:pessoa_id (
        id,
        nome,
        telefone,
        email
      )
    `
    )
    .eq("template_id", templateId)
    .order("submitted_at", { ascending: false, nullsFirst: false });

  if (error) return { ok: false as const, error };
  return { ok: true as const, data: data ?? [] };
}

async function tryListFromResponses(supabase: any, templateId: string) {
  const { data, error } = await supabase
    .from("form_responses")
    .select(
      `
      id,
      status,
      submitted_at,
      created_at,
      pessoa_id,
      pessoas:pessoa_id (
        id,
        nome,
        telefone,
        email
      )
    `
    )
    .eq("template_id", templateId)
    .order("submitted_at", { ascending: false, nullsFirst: false });

  if (error) return { ok: false as const, error };
  return { ok: true as const, data: data ?? [] };
}

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  const supabase = await createClient();
  const { id: templateId } = await ctx.params;

  const s1 = await tryListFromSubmissions(supabase, templateId);
  if (s1.ok) {
    return NextResponse.json({
      items: s1.data,
      total: s1.data.length,
      source: "form_submissions",
    });
  }

  const s2 = await tryListFromResponses(supabase, templateId);
  if (s2.ok) {
    return NextResponse.json({
      items: s2.data,
      total: s2.data.length,
      source: "form_responses",
    });
  }

  return NextResponse.json(
    {
      error: "failed_to_load_responses",
      submissions_error: s1.error?.message ?? String(s1.error),
      responses_error: (s2 as any).error?.message ?? String((s2 as any).error),
    },
    { status: 500 }
  );
}
