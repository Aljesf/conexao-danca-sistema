import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { id: string };

type SbErr = { message: string; hint?: string | null; code?: string | null };

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  const supabase = await createClient();

  const params = await ctx.params;
  const cursoId = Number(params.id);
  if (!Number.isFinite(cursoId)) {
    return NextResponse.json({ error: "curso_id_invalido" }, { status: 400 });
  }

  // 1) Tenta view (se existir)
  const q1 = await supabase
    .from("vw_niveis_ativos")
    .select("id, nome")
    .eq("curso_id", cursoId)
    .order("nome", { ascending: true });

  if (!q1.error) {
    return NextResponse.json({ niveis: q1.data ?? [], fonte: "vw_niveis_ativos" });
  }

  // Log no servidor
  console.error("[niveis] view vw_niveis_ativos indisponivel", { cursoId, error: q1.error });

  // 2) Fallback: tabela "niveis" sem depender de colunas opcionais
  const q2 = await supabase
    .from("niveis")
    .select("id, nome")
    .eq("curso_id", cursoId)
    .order("nome", { ascending: true });

  if (!q2.error) {
    return NextResponse.json({ niveis: q2.data ?? [], fonte: "niveis" });
  }

  console.error("[niveis] erro na tabela niveis", { cursoId, error: q2.error });

  const e1 = q1.error as unknown as SbErr;
  const e2 = q2.error as unknown as SbErr;

  return NextResponse.json(
    {
      error: "erro_listar_niveis",
      curso_id: cursoId,
      tentativas: [
        { fonte: "vw_niveis_ativos", details: e1.message, hint: e1.hint ?? null, code: e1.code ?? null },
        { fonte: "niveis", details: e2.message, hint: e2.hint ?? null, code: e2.code ?? null },
      ],
    },
    { status: 500 },
  );
}
