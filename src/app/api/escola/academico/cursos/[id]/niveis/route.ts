import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/authorize";

type NivelRow = {
  id: number;
  nome: string;
  curso_id: number | null;
  idade_minima: number | null;
  idade_maxima: number | null;
  faixa_etaria_sugerida: string | null;
  pre_requisito_nivel_id: number | null;
  observacoes: string | null;
  ordem?: number | null;
};

function asId(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: idRaw } = await ctx.params;
    const cursoId = asId(idRaw);
    if (!cursoId) {
      return NextResponse.json({ error: "curso_id_invalido" }, { status: 400 });
    }

    await requirePermission({ kind: "ANY_AUTHENTICATED" });

    let admin;
    try {
      admin = getSupabaseAdmin();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "ENV_NAO_CONFIGURADA";
      return NextResponse.json(
        { error: "ENV_NAO_CONFIGURADA", details: msg, curso_id: cursoId, fonte: "niveis" },
        { status: 500 },
      );
    }

    const selectCols =
      "id,nome,curso_id,idade_minima,idade_maxima,faixa_etaria_sugerida,pre_requisito_nivel_id,observacoes,ordem";

    const { data: orderedData, error: orderedError } = await admin
      .from("niveis")
      .select(selectCols)
      .eq("curso_id", cursoId)
      .order("ordem", { ascending: true });

    if (!orderedError) {
      return NextResponse.json({ niveis: orderedData ?? [] }, { status: 200 });
    }

    const { data: fallbackData, error: fallbackError } = await admin
      .from("niveis")
      .select(selectCols)
      .eq("curso_id", cursoId)
      .order("nome", { ascending: true });

    if (fallbackError) {
      return NextResponse.json(
        {
          error: "erro_listar_niveis",
          details: fallbackError.message,
          hint: (fallbackError as { hint?: string }).hint ?? null,
          code: (fallbackError as { code?: string }).code ?? null,
          curso_id: cursoId,
          fonte: "niveis",
        },
        { status: 500 },
      );
    }

    const niveis = (fallbackData ?? []) as NivelRow[];
    return NextResponse.json({ niveis }, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "erro_interno";
    const status = message === "Nao autenticado." ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}
