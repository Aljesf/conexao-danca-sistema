import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { isTechAdmin } from "@/lib/auth/authorize";
import { createAdminClient } from "@/lib/supabase/admin";
import { getNeofinBilling } from "@/lib/neofinClient";
import { extractNeofinBillingDetails } from "@/lib/neofinBilling";

export const runtime = "nodejs";

const PAID_REMOTE_STATUSES = new Set([
  "PAID", "PAGO", "RECEIVED", "SETTLED", "COMPLETED",
]);

type CobrancaPollRow = {
  id: number;
  status: string;
  neofin_charge_id: string;
  link_pagamento: string | null;
};

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;
  const { supabase, userId } = auth;

  const admin = await isTechAdmin(userId);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Sem permissao." }, { status: 403 });
  }

  // ── 1. Buscar cobranças com neofin_charge_id ──
  const { data: rawCobrancas, error: queryErr } = await supabase
    .from("cobrancas")
    .select("id, status, neofin_charge_id, link_pagamento")
    .not("neofin_charge_id", "is", null)
    .order("id", { ascending: true })
    .limit(100);

  if (queryErr) {
    return NextResponse.json({ ok: false, error: queryErr.message }, { status: 500 });
  }

  const cobrancas = (rawCobrancas ?? []) as unknown as CobrancaPollRow[];

  const pendentes = cobrancas.filter(
    (c) => !c.link_pagamento || ["PENDENTE", "AGUARDANDO", "ABERTA", "EM_ABERTO", "EM_ATRASO"].includes(c.status),
  );

  if (pendentes.length === 0) {
    return NextResponse.json({ ok: true, atualizadas: 0, erros: 0 });
  }

  const adminDb = createAdminClient();
  let atualizadas = 0;
  let erros = 0;

  for (const row of pendentes) {
    try {
      const remote = await getNeofinBilling({ identifier: row.neofin_charge_id });

      if (!remote.ok) {
        erros++;
        continue;
      }

      const billingInfo = extractNeofinBillingDetails(remote.body, {
        identifier: row.neofin_charge_id,
        integrationIdentifier: row.neofin_charge_id,
      });

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (billingInfo.paymentLink) {
        updates.link_pagamento = billingInfo.paymentLink;
      }

      if (billingInfo.billingId) {
        updates.neofin_payload = {
          ...(typeof remote.body === "object" && remote.body ? (remote.body as Record<string, unknown>) : {}),
          billing_number: billingInfo.billingId,
        };
      }

      const remoteStatus = billingInfo.remoteStatus?.toUpperCase() ?? null;
      if (remoteStatus && PAID_REMOTE_STATUSES.has(remoteStatus)) {
        updates.status = "PAGO";
      }

      const { error: updateErr } = await adminDb
        .from("cobrancas")
        .update(updates)
        .eq("id", row.id);

      if (updateErr) {
        erros++;
      } else {
        atualizadas++;
      }
    } catch {
      erros++;
    }
  }

  return NextResponse.json({ ok: true, atualizadas, erros });
}
