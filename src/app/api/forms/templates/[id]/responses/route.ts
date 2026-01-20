import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { id: string };

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  const supabase = await createClient();
  const { id } = await ctx.params;

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
    .eq("template_id", id)
    .order("submitted_at", { ascending: false, nullsFirst: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    items: data ?? [],
    total: (data ?? []).length,
  });
}
