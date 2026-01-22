import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

// GET /api/teste -> lista atÃ© 50 registros
export async function GET() {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const { data, error } = await supabase
    .from("teste")
    .select("*")
    .order("id", { ascending: true })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 200 });
}

// POST /api/teste -> insere { conteudo: "..." }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const texto = String(body?.conteudo ?? "").trim();
  if (!texto) {
    return NextResponse.json({ error: "conteudo obrigatÃ³rio" }, { status: 400 });
  }

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const { error } = await supabase.from("teste").insert([{ conteudo: texto }]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true }, { status: 201 });
}

