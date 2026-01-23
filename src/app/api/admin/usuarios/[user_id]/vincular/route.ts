import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

type Body = {
  pessoa_id: string | number;
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ user_id: string }> }
) {
  const { user_id } = await context.params;

  if (!user_id || user_id === "undefined" || user_id === "null") {
    return NextResponse.json(
      { error: "bad_request", message: "user_id inválido." },
      { status: 400 }
    );
  }

  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const { supabase, userId } = auth;

  const { data: isAdmin, error: adminErr } = await supabase.rpc("is_admin", { uid: userId });
  if (adminErr) {
    return NextResponse.json(
      { error: "admin_check_failed", message: adminErr.message },
      { status: 500 }
    );
  }
  if (!isAdmin) {
    return NextResponse.json(
      { error: "forbidden", message: "Acesso negado (admin obrigatório)." },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  const pessoa_id = body?.pessoa_id;

  if (!pessoa_id) {
    return NextResponse.json(
      { error: "bad_request", message: "pessoa_id é obrigatório." },
      { status: 400 }
    );
  }

  const { data: pessoa, error: pessoaErr } = await supabase
    .from("pessoas")
    .select("id")
    .eq("id", pessoa_id)
    .maybeSingle();

  if (pessoaErr) {
    return NextResponse.json({ error: "db_error", message: pessoaErr.message }, { status: 500 });
  }
  if (!pessoa) {
    return NextResponse.json(
      { error: "not_found", message: "Pessoa não encontrada." },
      { status: 404 }
    );
  }

  const { error: upErr } = await supabase
    .from("usuario_pessoa_vinculos")
    .upsert({ user_id, pessoa_id }, { onConflict: "user_id" });

  if (upErr) {
    return NextResponse.json({ error: "db_error", message: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
