import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import {
  agruparCarteiraPorCompetencia,
  listarCarteiraOperacionalCanonica,
  resumirCarteiraOperacional,
} from "@/lib/financeiro/carteira-operacional-canonica";
import { requireUser } from "@/lib/supabase/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

function textOrNull(value: string | null): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function isCompetencia(value: string | null): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value);
}

function normalizarStatusOperacional(value: string | null): "PAGO" | "PENDENTE" | "VENCIDO" | null {
  const normalized = textOrNull(value)?.toUpperCase();
  if (normalized === "PAGO") return "PAGO";
  if (normalized === "PENDENTE" || normalized === "PENDENTE_A_VENCER") return "PENDENTE";
  if (normalized === "VENCIDO" || normalized === "PENDENTE_VENCIDO") return "VENCIDO";
  return null;
}

function normalizarSituacaoNeoFin(
  value: string | null,
): "SEM_FATURA" | "FATURA_SEM_NEOFIN" | "EM_COBRANCA_NEOFIN" | null {
  const normalized = textOrNull(value)?.toUpperCase();
  if (normalized === "EM_COBRANCA_NEOFIN" || normalized === "VINCULADA") return "EM_COBRANCA_NEOFIN";
  if (normalized === "FATURA_SEM_NEOFIN") return "FATURA_SEM_NEOFIN";
  if (normalized === "SEM_FATURA" || normalized === "NAO_VINCULADA") return "SEM_FATURA";
  return null;
}

export async function GET(req: NextRequest) {
  const denied = await guardApiByRole(req as Request);
  if (denied) return denied;

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const competencia = textOrNull(url.searchParams.get("competencia"));
  if (competencia && !isCompetencia(competencia)) {
    return NextResponse.json({ ok: false, error: "competencia_invalida" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const linhas = await listarCarteiraOperacionalCanonica(supabase, {
      busca: textOrNull(url.searchParams.get("busca")) ?? textOrNull(url.searchParams.get("q")) ?? undefined,
      competencia,
      statusOperacional: normalizarStatusOperacional(url.searchParams.get("status_operacional")) ?? undefined,
      situacaoNeoFin:
        normalizarSituacaoNeoFin(url.searchParams.get("situacao_neofin")) ??
        normalizarSituacaoNeoFin(url.searchParams.get("status_neofin")) ??
        undefined,
    });

    return NextResponse.json({
      ok: true,
      resumoGeral: resumirCarteiraOperacional(linhas),
      competencias: agruparCarteiraPorCompetencia(linhas),
      totalCobrancas: linhas.length,
      linhas,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "erro_buscar_carteira_operacional",
        detail: error instanceof Error ? error.message : "erro_desconhecido",
      },
      { status: 500 },
    );
  }
}
