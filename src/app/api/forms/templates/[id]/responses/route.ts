import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { id: string };

const allowedStatuses = new Set([
  "TODOS",
  "NAO_INICIOU",
  "EM_ANDAMENTO",
  "PENDENTE_REVISAO",
  "CONCLUIDO",
  "AJUSTE_SOLICITADO",
  "INVALIDADO",
]);

export async function GET(req: Request, ctx: { params: Promise<Params> }) {
  const supabase = await createClient();
  const { id: templateId } = await ctx.params;
  const url = new URL(req.url);

  const rawStatus = url.searchParams.get("status");
  const status = rawStatus ? rawStatus.toUpperCase() : "TODOS";
  const statusFilter = allowedStatuses.has(status) ? status : "TODOS";
  const q = url.searchParams.get("q")?.trim();

  let query = supabase
    .from("form_submissions_status_v")
    .select(
      `
      id,
      status_auto,
      status_final,
      review_status,
      answered_count,
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

  if (statusFilter !== "TODOS") {
    query = query.eq("status_final", statusFilter);
  }

  if (q) {
    query = query.ilike("pessoas.nome", `%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      {
        error: "failed_to_load_responses",
        view_error: error.message ?? String(error),
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    items: data ?? [],
    total: data?.length ?? 0,
    source: "form_submissions_status_v",
    status: statusFilter,
    q: q ?? "",
  });
}
