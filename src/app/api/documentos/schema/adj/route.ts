import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

type ApiResp<T> = { ok: boolean; data?: T; message?: string };

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const table = String(url.searchParams.get("table") || "").trim();

  if (!table) {
    return NextResponse.json(
      { ok: false, message: "Parametro table e obrigatorio." } satisfies ApiResp<never>,
      { status: 400 },
    );
  }

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const { data, error } = await supabase.rpc("documentos_schema_adj", { p_table: table });

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message } satisfies ApiResp<never>,
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data } satisfies ApiResp<unknown>);
}

