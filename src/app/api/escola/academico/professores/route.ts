import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/authorize";

type ProfessorRow = {
  id: number;
  nome: string | null;
};

export async function GET() {
  try {
    await requirePermission({ kind: "ANY_AUTHENTICATED" });

    let admin;
    try {
      admin = getSupabaseAdmin();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "ENV_NAO_CONFIGURADA";
      return NextResponse.json(
        { error: "ENV_NAO_CONFIGURADA", details: msg },
        { status: 500 },
      );
    }

    const { data, error } = await admin
      .from("vw_professores")
      .select("id,nome")
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "erro_listar_professores", details: error.message },
        { status: 500 },
      );
    }

    const professores = (data ?? []).map((prof: ProfessorRow) => ({
      id: prof.id,
      nome: prof.nome ?? "Sem nome",
    }));

    return NextResponse.json({ professores }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro inesperado";
    const status = msg === "Nao autenticado." ? 401 : 403;
    return NextResponse.json({ error: msg }, { status });
  }
}
