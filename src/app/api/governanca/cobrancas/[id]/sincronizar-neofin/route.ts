import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/supabase/api-auth";
import { getNeofinBilling } from "@/lib/neofinClient";
import { extractNeofinBillingDetails, looksLikeNeofinBillingNumber } from "@/lib/neofinBilling";
import type { Database, TablesUpdate } from "@/types/supabase.generated";

type RouteContext = { params: Promise<{ id: string }> };

type CobrancaSyncRow = Pick<
  Database["public"]["Tables"]["cobrancas"]["Row"],
  "id" | "status" | "neofin_charge_id" | "link_pagamento" | "linha_digitavel"
> & {
  neofin_payload: Record<string, unknown> | null;
};

function mapStatusInterno(remoteStatus: string | null, currentStatus: string): string {
  if (!remoteStatus) return currentStatus;

  if (["PAID", "PAGO", "RECEIVED", "SETTLED", "COMPLETED"].includes(remoteStatus)) {
    return "PAGO";
  }
  if (["CANCELED", "CANCELLED", "CANCELADO", "VOID", "EXPIRED"].includes(remoteStatus)) {
    return "CANCELADO";
  }
  if (["PENDING", "PENDENTE", "OPEN", "ABERTA", "WAITING", "CREATED", "EM_ABERTO"].includes(remoteStatus)) {
    return "PENDENTE";
  }

  return currentStatus;
}

async function syncCobranca(req: NextRequest, ctx: RouteContext) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const supabase = auth.supabase as unknown as SupabaseClient<Database>;
  const { id } = await ctx.params;
  const cobrancaId = Number(id);

  if (!Number.isFinite(cobrancaId) || cobrancaId <= 0) {
    return NextResponse.json({ ok: false, error: "cobranca_id_invalido" }, { status: 400 });
  }

  const { data: cobranca, error: cobrancaErr } = await supabase
    .from("cobrancas")
    .select("id,status,neofin_charge_id,neofin_payload,link_pagamento,linha_digitavel")
    .eq("id", cobrancaId)
    .maybeSingle<CobrancaSyncRow>();

  if (cobrancaErr || !cobranca) {
    return NextResponse.json({ ok: false, error: "cobranca_nao_encontrada" }, { status: 404 });
  }

  if (!cobranca.neofin_charge_id) {
    return NextResponse.json({ ok: false, error: "cobranca_sem_neofin_charge_id" }, { status: 400 });
  }

  const remote = await getNeofinBilling({ identifier: cobranca.neofin_charge_id });
  if (!remote.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "erro_consultar_neofin",
        detail: remote.message ?? null,
        neofin_status: remote.status,
      },
      { status: remote.status === 404 ? 404 : 502 },
    );
  }

  const billingInfo = extractNeofinBillingDetails(remote.body, {
    identifier: cobranca.neofin_charge_id,
    integrationIdentifier: cobranca.neofin_charge_id,
  });
  const neofinInvoiceId = looksLikeNeofinBillingNumber(billingInfo.billingId)
    ? billingInfo.billingId
    : null;
  const remoteStatus = billingInfo.remoteStatus?.toUpperCase() ?? null;
  const nextStatus = mapStatusInterno(remoteStatus, cobranca.status);
  const updatedAt = new Date().toISOString();
  const cobrancaUpdate: TablesUpdate<"cobrancas"> = {
    status: nextStatus,
    neofin_payload: (remote.body ?? null) as TablesUpdate<"cobrancas">["neofin_payload"],
    neofin_charge_id: billingInfo.billingId ?? cobranca.neofin_charge_id,
    link_pagamento: billingInfo.paymentLink ?? cobranca.link_pagamento ?? null,
    linha_digitavel: billingInfo.digitableLine ?? billingInfo.barcode ?? cobranca.linha_digitavel ?? null,
    updated_at: updatedAt,
  };

  const { data: updated, error: updateErr } = await supabase
    .from("cobrancas")
    .update(cobrancaUpdate)
    .eq("id", cobranca.id)
    .select("id,status,neofin_charge_id,link_pagamento,linha_digitavel,neofin_payload,updated_at")
    .single();

  if (updateErr || !updated) {
    return NextResponse.json(
      { ok: false, error: "erro_atualizar_cobranca_local", detail: updateErr?.message ?? null },
      { status: 500 },
    );
  }

  if (neofinInvoiceId) {
    const faturaUpdate: TablesUpdate<"credito_conexao_faturas"> = {
      neofin_invoice_id: neofinInvoiceId,
      updated_at: updatedAt,
    };
    const { error: faturaErr } = await supabase
      .from("credito_conexao_faturas")
      .update(faturaUpdate)
      .eq("cobranca_id", cobranca.id);

    if (faturaErr) {
      return NextResponse.json(
        { ok: false, error: "erro_atualizar_fatura_local", detail: faturaErr.message },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true, status: nextStatus, data: updated }, { status: 200 });
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  return syncCobranca(req, ctx);
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  return syncCobranca(req, ctx);
}
