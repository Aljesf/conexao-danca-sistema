import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { buildCafeDashboard } from "@/lib/cafe/dashboard";

const QuerySchema = z.object({
  periodo: z.enum(["7d", "15d", "30d", "hoje", "mes"]).optional(),
  data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  data_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function GET(request: NextRequest) {
  const denied = await guardApiByRole(request as unknown as Request);
  if (denied) return denied as unknown as NextResponse;

  try {
    const url = new URL(request.url);
    const parsed = QuerySchema.safeParse({
      periodo: url.searchParams.get("periodo") ?? undefined,
      data_inicio: url.searchParams.get("data_inicio") ?? undefined,
      data_fim: url.searchParams.get("data_fim") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "query_invalida", detalhe: parsed.error.flatten() }, { status: 400 });
    }

    const data = await buildCafeDashboard({
      periodo: parsed.data.periodo ?? "30d",
      dataInicio: parsed.data.data_inicio ?? null,
      dataFim: parsed.data.data_fim ?? null,
    });

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "falha_carregar_dashboard_cafe",
        detalhe: error instanceof Error ? error.message : "erro_desconhecido",
      },
      { status: 500 },
    );
  }
}
