import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

type Pessoa = {
  id: number;
  nome: string;
  nascimento: string | null;
  foto_url: string | null;
};

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return badRequest("Parametro obrigatorio: date=YYYY-MM-DD");
  }

  const d = new Date(`${date}T00:00:00.000Z`);
  const day = d.getUTCDate();
  const month = d.getUTCMonth() + 1;

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  const { data, error } = await supabase
    .from("pessoas")
    .select("id,nome,nascimento,foto_url")
    .not("nascimento", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = (data ?? []).filter((p: Pessoa) => {
    const n = p.nascimento ? new Date(`${p.nascimento}T00:00:00.000Z`) : null;
    if (!n || Number.isNaN(n.getTime())) return false;
    return n.getUTCDate() === day && n.getUTCMonth() + 1 === month;
  });

  return NextResponse.json({ date, items });
}

