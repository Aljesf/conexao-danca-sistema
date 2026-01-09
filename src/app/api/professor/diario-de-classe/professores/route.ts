import { NextResponse } from "next/server";
import { getUserOrThrow, isAdminUser } from "../_lib/auth";

type ColaboradorRow = {
  id: number;
  pessoa_id: number | null;
  pessoa?: { nome?: string | null } | null;
};

export async function GET() {
  const auth = await getUserOrThrow();
  if (!auth.ok) return NextResponse.json(auth, { status: auth.status });

  const { supabase, user } = auth;

  let admin = false;
  try {
    admin = await isAdminUser(supabase, user.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ERRO_PERMISSAO_ADMIN";
    return NextResponse.json({ ok: false, code: msg }, { status: 500 });
  }

  if (!admin) return NextResponse.json({ ok: false, code: "SOMENTE_ADMIN" }, { status: 403 });

  const { data, error } = await supabase
    .from("colaboradores")
    .select("id, pessoa_id, pessoa:pessoas(nome)")
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, code: "ERRO_LISTAR_PROFESSORES", message: error.message },
      { status: 500 }
    );
  }

  const professores = (data as ColaboradorRow[] | null)?.map((r) => ({
    colaborador_id: r.id,
    pessoa_id: r.pessoa_id,
    nome: r.pessoa?.nome ?? null,
  })) ?? [];

  return NextResponse.json({ ok: true, professores });
}
