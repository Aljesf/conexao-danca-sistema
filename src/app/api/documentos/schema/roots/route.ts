import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

type ApiResp<T> = { ok: boolean; data?: T; message?: string };

type RootRow = {
  root_table: string | null;
  root_pk: string | null;
  label: string | null;
};

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  const { data, error } = await supabase.rpc("documentos_schema_roots_public");
  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message } satisfies ApiResp<never>,
      { status: 500 },
    );
  }

  const rows = Array.isArray(data) ? (data as RootRow[]) : [];
  const out = rows.map((row) => ({
    key: String(row.root_table ?? ""),
    label: String(row.label ?? ""),
    pk: String(row.root_pk ?? "id"),
  }));

  return NextResponse.json({ ok: true, data: out } satisfies ApiResp<typeof out>);
}

