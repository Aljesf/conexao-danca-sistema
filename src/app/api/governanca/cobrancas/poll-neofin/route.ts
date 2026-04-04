import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCronSecret } from "@/lib/auth/verifyCronSecret";
import { getNeofinBilling } from "@/lib/neofinClient";
import { extractNeofinBillingDetails, looksLikeNeofinBillingNumber } from "@/lib/neofinBilling";
import { confirmarPagamentoCobranca } from "@/lib/financeiro/confirmarPagamentoCobranca";

export const runtime = "nodejs";

const PAID_REMOTE_STATUSES = new Set([
  "PAID", "PAGO", "RECEIVED", "SETTLED", "COMPLETED",
]);

type CobrancaPollRow = {
  id: number;
  status: string;
  neofin_charge_id: string;
  neofin_payload: Record<string, unknown> | null;
};

type PollResult = {
  cobranca_id: number;
  neofin_charge_id: string;
  remote_status: string | null;
  action: "confirmed" | "skipped" | "unchanged" | "error";
  detail?: string;
};

/**
 * GET /api/governanca/cobrancas/poll-neofin
 * Protegida por CRON_SECRET (Vercel Cron a cada 6h).
 * Busca cobranças pendentes com neofin_charge_id e verifica status na Neofim.
 */
export async function GET(req: NextRequest) {
  const denied = verifyCronSecret(req);
  if (denied) return denied;

  const supabase = createAdminClient();

  // Buscar cobranças pendentes que têm neofin_charge_id
  const { data: cobrancas, error: queryErr } = await supabase
    .from("cobrancas")
    .select("id,status,neofin_charge_id,neofin_payload")
    .not("neofin_charge_id", "is", null)
    .in("status", ["PENDENTE", "AGUARDANDO", "ABERTA", "EM_ABERTO", "EM_ATRASO"])
    .order("id", { ascending: true })
    .limit(100);

  if (queryErr) {
    return NextResponse.json(
      { ok: false, error: "query_failed", detail: queryErr.message },
      { status: 500 },
    );
  }

  const rows = (cobrancas ?? []) as CobrancaPollRow[];
  if (rows.length === 0) {
    return NextResponse.json({
      ok: true,
      total: 0,
      confirmed: 0,
      unchanged: 0,
      errors: 0,
      results: [],
    });
  }

  const results: PollResult[] = [];
  let confirmed = 0;
  let unchanged = 0;
  let errCount = 0;

  for (const row of rows) {
    try {
      // Consultar Neofim
      const remote = await getNeofinBilling({ identifier: row.neofin_charge_id });

      if (!remote.ok) {
        const isNotFound = remote.status === 404;
        const detail = isNotFound
          ? "not_found_on_neofim"
          : (remote.message ?? `HTTP ${remote.status}`);

        // Registrar em neofim_webhook_log para auditoria
        await supabase.from("neofim_webhook_log").insert({
          event_type: "POLL_LOOKUP_FAIL",
          billing_id: row.neofin_charge_id,
          payload: { cobranca_id: row.id, status: remote.status, body: remote.body ?? null },
          processed: true,
          error: detail,
        });

        results.push({
          cobranca_id: row.id,
          neofin_charge_id: row.neofin_charge_id,
          remote_status: null,
          action: isNotFound ? "unchanged" : "error",
          detail,
        });
        if (isNotFound) unchanged++;
        else errCount++;
        continue;
      }

      const billingInfo = extractNeofinBillingDetails(remote.body, {
        identifier: row.neofin_charge_id,
        integrationIdentifier: row.neofin_charge_id,
      });
      const neofinInvoiceId = looksLikeNeofinBillingNumber(billingInfo.billingId)
        ? billingInfo.billingId
        : null;
      const remoteStatus = billingInfo.remoteStatus?.toUpperCase() ?? null;
      const updatedAt = new Date().toISOString();

      // Atualizar payload se mudou
      const { error: payloadErr } = await supabase
        .from("cobrancas")
        .update({
          neofin_payload: remote.body ?? null,
          neofin_charge_id: billingInfo.billingId ?? row.neofin_charge_id,
          link_pagamento: billingInfo.paymentLink ?? undefined,
          linha_digitavel: billingInfo.digitableLine ?? billingInfo.barcode ?? undefined,
          updated_at: updatedAt,
        })
        .eq("id", row.id);

      if (payloadErr) {
        results.push({
          cobranca_id: row.id,
          neofin_charge_id: row.neofin_charge_id,
          remote_status: remoteStatus,
          action: "error",
          detail: `payload_update: ${payloadErr.message}`,
        });
        errCount++;
        continue;
      }

      // Se remoto está pago, confirmar pagamento
      if (neofinInvoiceId) {
        const { error: faturaErr } = await supabase
          .from("credito_conexao_faturas")
          .update({
            neofin_invoice_id: neofinInvoiceId,
            updated_at: updatedAt,
          })
          .eq("cobranca_id", row.id);

        if (faturaErr) {
          results.push({
            cobranca_id: row.id,
            neofin_charge_id: row.neofin_charge_id,
            remote_status: remoteStatus,
            action: "error",
            detail: `fatura_update: ${faturaErr.message}`,
          });
          errCount++;
          continue;
        }
      }

      if (remoteStatus && PAID_REMOTE_STATUSES.has(remoteStatus)) {
        const resultado = await confirmarPagamentoCobranca({
          supabase,
          cobrancaId: row.id,
          origemSistema: "POLL_NEOFIM",
          observacoes: `Pagamento confirmado via polling Neofim (charge: ${row.neofin_charge_id})`,
        });

        if (resultado.action === "already_paid") {
          results.push({
            cobranca_id: row.id,
            neofin_charge_id: row.neofin_charge_id,
            remote_status: remoteStatus,
            action: "skipped",
            detail: "already_paid",
          });
          unchanged++;
        } else {
          results.push({
            cobranca_id: row.id,
            neofin_charge_id: row.neofin_charge_id,
            remote_status: remoteStatus,
            action: resultado.ok ? "confirmed" : "error",
            detail: resultado.errors.length > 0 ? resultado.errors.join("; ") : undefined,
          });
          if (resultado.ok) confirmed++;
          else errCount++;
        }
      } else {
        results.push({
          cobranca_id: row.id,
          neofin_charge_id: row.neofin_charge_id,
          remote_status: remoteStatus,
          action: "unchanged",
        });
        unchanged++;
      }
    } catch (err) {
      results.push({
        cobranca_id: row.id,
        neofin_charge_id: row.neofin_charge_id,
        remote_status: null,
        action: "error",
        detail: err instanceof Error ? err.message : "unknown_error",
      });
      errCount++;
    }
  }

  return NextResponse.json({
    ok: true,
    total: rows.length,
    confirmed,
    unchanged,
    errors: errCount,
    results,
  });
}
