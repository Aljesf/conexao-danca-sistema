import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { getNeofinBilling } from "@/lib/neofinClient";

type RouteContext = { params: Promise<{ id: string }> };

type CobrancaSyncRow = {
  id: number;
  status: string;
  neofin_charge_id: string | null;
  neofin_payload: Record<string, unknown> | null;
  link_pagamento: string | null;
  linha_digitavel: string | null;
};

function firstNonEmptyString(...values: Array<unknown>): string | null {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return null;
}

function extractBillingInfo(body: unknown, fallbackId?: string) {
  const maybeObj = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const candidates: Array<Record<string, unknown>> = [];

  if (Array.isArray(body)) {
    for (const item of body) {
      if (item && typeof item === "object") candidates.push(item as Record<string, unknown>);
    }
  }

  const billings = maybeObj?.billings;
  if (Array.isArray(billings)) {
    for (const item of billings) {
      if (item && typeof item === "object") candidates.push(item as Record<string, unknown>);
    }
  }

  const data = maybeObj?.data;
  if (Array.isArray(data)) {
    for (const item of data) {
      if (item && typeof item === "object") candidates.push(item as Record<string, unknown>);
    }
  }

  const billing = candidates[0] ?? maybeObj ?? null;

  const chargeId =
    firstNonEmptyString(
      billing?.id,
      billing?.billing_id,
      billing?.charge_id,
      billing?.integration_identifier,
      billing?.integrationIdentifier,
      maybeObj?.billing_id,
      maybeObj?.charge_id,
      maybeObj?.integration_identifier,
      fallbackId,
    ) ?? null;

  const paymentLink =
    firstNonEmptyString(
      billing?.payment_link,
      billing?.payment_url,
      billing?.link_pagamento,
      billing?.url,
      billing?.link,
      billing?.billet_url,
      billing?.boleto_url,
      maybeObj?.payment_link,
      maybeObj?.payment_url,
    ) ?? null;

  const digitableLine =
    firstNonEmptyString(
      billing?.digitable_line,
      billing?.linha_digitavel,
      billing?.digitableLine,
      billing?.boleto_linha_digitavel,
      billing?.boleto_digitable_line,
      billing?.barcode,
      billing?.bar_code,
      maybeObj?.digitable_line,
      maybeObj?.linha_digitavel,
    ) ?? null;

  return { chargeId, paymentLink, digitableLine };
}

function readRemoteStatus(remoteBody: unknown): string | null {
  const maybeObj = remoteBody && typeof remoteBody === "object" ? (remoteBody as Record<string, unknown>) : null;
  const billings = Array.isArray(maybeObj?.billings)
    ? (maybeObj?.billings as unknown[])
    : Array.isArray(maybeObj?.data)
      ? (maybeObj?.data as unknown[])
      : [];
  const firstBilling =
    billings.find((item) => item && typeof item === "object") ?? (maybeObj && typeof maybeObj === "object" ? maybeObj : null);

  const candidate =
    firstNonEmptyString(
      (firstBilling as any)?.status,
      (firstBilling as any)?.billing_status,
      (firstBilling as any)?.charge_status,
      maybeObj?.status,
      maybeObj?.billing_status,
      maybeObj?.charge_status,
    ) ?? null;

  return candidate ? candidate.toUpperCase() : null;
}

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

  const { supabase } = auth;
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

  const billingInfo = extractBillingInfo(remote.body, cobranca.neofin_charge_id);
  const remoteStatus = readRemoteStatus(remote.body);
  const nextStatus = mapStatusInterno(remoteStatus, cobranca.status);

  const { data: updated, error: updateErr } = await supabase
    .from("cobrancas")
    .update({
      status: nextStatus,
      neofin_payload: remote.body ?? null,
      link_pagamento: billingInfo.paymentLink ?? cobranca.link_pagamento ?? null,
      linha_digitavel: billingInfo.digitableLine ?? cobranca.linha_digitavel ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cobranca.id)
    .select("id,status,neofin_charge_id,link_pagamento,linha_digitavel,neofin_payload,updated_at")
    .single();

  if (updateErr || !updated) {
    return NextResponse.json(
      { ok: false, error: "erro_atualizar_cobranca_local", detail: updateErr?.message ?? null },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, status: nextStatus, data: updated }, { status: 200 });
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  return syncCobranca(req, ctx);
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  return syncCobranca(req, ctx);
}

