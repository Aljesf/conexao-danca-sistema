import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type CobrancaCancelamentoRow = {
  id: number;
  status: string | null;
  data_pagamento: string | null;
  neofin_charge_id: string | null;
};

type RecebimentoRow = {
  valor_centavos: number | null;
};

const STATUSS_QUITADOS = new Set(["PAGO", "PAGA", "RECEBIDO", "RECEBIDA", "LIQUIDADO", "LIQUIDADA", "QUITADO", "QUITADA"]);

function normalizarTexto(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

export async function POST(request: NextRequest, context: RouteContext) {
  const denied = await guardApiByRole(request as Request);
  if (denied) return denied;

  const { id } = await context.params;
  const cobrancaId = Number(id);

  if (!Number.isFinite(cobrancaId) || cobrancaId <= 0) {
    return NextResponse.json({ ok: false, error: "cobranca_id_invalido" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: cobranca, error: cobrancaError } = await supabase
    .from("cobrancas")
    .select("id,status,data_pagamento,neofin_charge_id")
    .eq("id", cobrancaId)
    .maybeSingle<CobrancaCancelamentoRow>();

  if (cobrancaError || !cobranca) {
    return NextResponse.json({ ok: false, error: "cobranca_nao_encontrada" }, { status: 404 });
  }

  const statusAtual = normalizarTexto(cobranca.status);
  if (statusAtual === "CANCELADA") {
    return NextResponse.json(
      {
        ok: true,
        cobranca_id: cobranca.id,
        status: "CANCELADA",
        idempotent: true,
      },
      { status: 200 },
    );
  }

  if (cobranca.neofin_charge_id) {
    return NextResponse.json(
      {
        ok: false,
        error: "cancelamento_neofin_nao_suportado",
        detail: "A cobranca possui charge NeoFin vinculada. Use o fluxo do provedor antes do cancelamento local.",
      },
      { status: 409 },
    );
  }

  const { data: recebimentosData, error: recebimentosError } = await supabase
    .from("recebimentos")
    .select("valor_centavos")
    .eq("cobranca_id", cobrancaId);

  if (recebimentosError) {
    return NextResponse.json(
      {
        ok: false,
        error: "falha_buscar_recebimentos_cobranca",
        detail: recebimentosError.message,
      },
      { status: 500 },
    );
  }

  const totalRecebido = ((recebimentosData ?? []) as RecebimentoRow[]).reduce(
    (acc, item) => acc + (typeof item.valor_centavos === "number" ? item.valor_centavos : 0),
    0,
  );

  if (cobranca.data_pagamento || totalRecebido > 0 || STATUSS_QUITADOS.has(statusAtual)) {
    return NextResponse.json(
      {
        ok: false,
        error: "nao_pode_cancelar_com_recebimentos",
        detail: "Nao e possivel cancelar uma cobranca com pagamento ou recebimento associado.",
      },
      { status: 409 },
    );
  }

  const { data: atualizada, error: updateError } = await supabase
    .from("cobrancas")
    .update({
      status: "CANCELADA",
      updated_at: new Date().toISOString(),
    })
    .eq("id", cobrancaId)
    .select("id,status,updated_at")
    .single();

  if (updateError || !atualizada) {
    return NextResponse.json(
      {
        ok: false,
        error: "falha_cancelar_cobranca",
        detail: updateError?.message ?? null,
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      cobranca_id: atualizada.id,
      status: atualizada.status,
      updated_at: atualizada.updated_at,
    },
    { status: 200 },
  );
}
