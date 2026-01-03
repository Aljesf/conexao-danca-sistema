import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

type ApiResp<T> = { ok: boolean; data?: T; message?: string };

export async function GET(req: Request) {
  const url = new URL(req.url);
  const table = String(url.searchParams.get("table") || "").trim();

  if (!table) {
    return NextResponse.json(
      { ok: false, message: "Parametro table e obrigatorio." } satisfies ApiResp<never>,
      { status: 400 },
    );
  }

  const supabase = await getSupabaseServerSSR();
  const { data, error } = await supabase.rpc("documentos_schema_table_columns", { p_table: table });

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message } satisfies ApiResp<never>,
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data } satisfies ApiResp<unknown>);
}
