import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmarPagamentoCobranca } from "@/lib/financeiro/confirmarPagamentoCobranca";

export const runtime = "nodejs";

const PAID_STATUSES = new Set([
  "PAID", "PAGO", "RECEIVED", "SETTLED", "COMPLETED",
]);

function verifySignature(req: NextRequest): boolean {
  const secret = process.env.NEOFIM_WEBHOOK_SECRET;
  if (!secret) return true; // sem secret configurado = aceita tudo (dev)

  const signature = req.headers.get("x-neofim-signature")
    ?? req.headers.get("x-webhook-signature")
    ?? req.headers.get("authorization");

  if (!signature) return false;

  const token = signature.startsWith("Bearer ") ? signature.slice(7) : signature;
  return token === secret;
}

type WebhookPayload = {
  event?: string;
  type?: string;
  status?: string;
  billing_id?: string;
  billingId?: string;
  id?: string;
  paid_at?: string;
  paidAt?: string;
  payment_date?: string;
  [key: string]: unknown;
};

function extractBillingId(payload: WebhookPayload): string | null {
  return payload.billing_id ?? payload.billingId ?? payload.id ?? null;
}

function extractStatus(payload: WebhookPayload): string | null {
  return payload.status ?? payload.event ?? payload.type ?? null;
}

function extractPaidAt(payload: WebhookPayload): string {
  return (
    payload.paid_at ?? payload.paidAt ?? payload.payment_date ?? new Date().toISOString()
  ).slice(0, 10);
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();

  let payload: WebhookPayload;
  try {
    payload = (await req.json()) as WebhookPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const signature = req.headers.get("x-neofim-signature")
    ?? req.headers.get("x-webhook-signature")
    ?? null;
  const billingId = extractBillingId(payload);
  const eventType = extractStatus(payload);

  // Registrar log imediatamente
  const logInsert = await supabase.from("neofim_webhook_log").insert({
    event_type: eventType,
    billing_id: billingId,
    payload,
    signature,
    processed: false,
  }).select("id").single();

  const logId = logInsert.data?.id ?? null;

  // Validar assinatura
  if (!verifySignature(req)) {
    if (logId) {
      await supabase.from("neofim_webhook_log").update({ error: "invalid_signature" }).eq("id", logId);
    }
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // Se não é evento de pagamento, registrar e retornar
  const statusUpper = (eventType ?? "").toUpperCase();
  if (!PAID_STATUSES.has(statusUpper)) {
    if (logId) {
      await supabase.from("neofim_webhook_log").update({ processed: true }).eq("id", logId);
    }
    return NextResponse.json({ ok: true, action: "ignored", event: eventType });
  }

  if (!billingId) {
    if (logId) {
      await supabase.from("neofim_webhook_log").update({ error: "missing_billing_id" }).eq("id", logId);
    }
    return NextResponse.json({ ok: false, error: "missing_billing_id" }, { status: 400 });
  }

  // Buscar cobrança pelo neofin_charge_id
  const { data: cobranca, error: cobrancaErr } = await supabase
    .from("cobrancas")
    .select("id")
    .eq("neofin_charge_id", billingId)
    .maybeSingle();

  if (cobrancaErr || !cobranca) {
    const errMsg = cobrancaErr?.message ?? "cobranca_nao_encontrada";
    if (logId) {
      await supabase.from("neofim_webhook_log").update({ error: errMsg }).eq("id", logId);
    }
    return NextResponse.json({ ok: false, error: errMsg }, { status: 404 });
  }

  // Processar pagamento usando função reutilizável
  const resultado = await confirmarPagamentoCobranca({
    supabase,
    cobrancaId: cobranca.id,
    dataPagamento: extractPaidAt(payload),
    origemSistema: "WEBHOOK_NEOFIM",
    observacoes: `Pagamento confirmado via webhook Neofim (billing: ${billingId})`,
  });

  // Atualizar log
  if (logId) {
    await supabase.from("neofim_webhook_log").update({
      processed: true,
      error: resultado.errors.length > 0 ? resultado.errors.join("; ") : null,
    }).eq("id", logId);
  }

  return NextResponse.json({
    ok: resultado.ok,
    action: resultado.action,
    cobranca_id: resultado.cobranca_id,
    fatura_id: resultado.fatura_id,
    errors: resultado.errors.length > 0 ? resultado.errors : undefined,
  });
}
