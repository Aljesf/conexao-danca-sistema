import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  const { data, error } = await supabase
    .from("documentos_emitidos")
    .select("id, matricula_id, contrato_modelo_id, status_assinatura, created_at, updated_at, pdf_url, snapshot_financeiro_json")
    .order("id", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 200 });
}

