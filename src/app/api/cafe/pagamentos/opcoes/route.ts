import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { requireUser } from "@/lib/supabase/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { listarOpcoesPagamentoCafe } from "@/lib/cafe/financeiro";

const QuerySchema = z.object({
  comprador_pessoa_id: z.string().trim().optional(),
  comprador_tipo: z.string().trim().optional(),
  centro_custo_id: z.string().trim().optional(),
});

function parseOptionalInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.trunc(parsed);
}

export async function GET(request: NextRequest) {
  const denied = await guardApiByRole(request as unknown as Request);
  if (denied) return denied as unknown as NextResponse;

  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const url = new URL(request.url);
    const parsed = QuerySchema.safeParse({
      comprador_pessoa_id: url.searchParams.get("comprador_pessoa_id") ?? undefined,
      comprador_tipo: url.searchParams.get("comprador_tipo") ?? undefined,
      centro_custo_id: url.searchParams.get("centro_custo_id") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "query_invalida", detalhe: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const data = await listarOpcoesPagamentoCafe({
      supabase,
      compradorPessoaId: parseOptionalInt(parsed.data.comprador_pessoa_id),
      compradorTipoInformado: parsed.data.comprador_tipo ?? null,
      centroCustoId: parseOptionalInt(parsed.data.centro_custo_id),
    });

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "falha_listar_opcoes_pagamento_cafe",
        detalhe: error instanceof Error ? error.message : "erro_desconhecido",
      },
      { status: 500 },
    );
  }
}
