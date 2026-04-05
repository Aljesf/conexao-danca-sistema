import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { isTechAdmin } from "@/lib/auth/authorize";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const NEOFIN_BASE_URL = process.env.NEOFIN_BASE_URL ?? "https://api.sandbox.neofin.services";
const NEOFIN_API_KEY = process.env.NEOFIN_API_KEY ?? "";
const NEOFIN_SECRET_KEY = process.env.NEOFIN_SECRET_KEY ?? "";

export async function PUT(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;
  const { supabase, userId } = auth;

  const admin = await isTechAdmin(userId);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Sem permissao." }, { status: 403 });
  }

  let body: { integration_identifier?: string; cobranca_id?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body invalido." }, { status: 400 });
  }

  const { integration_identifier, cobranca_id } = body;

  if (!integration_identifier || !cobranca_id) {
    return NextResponse.json(
      { ok: false, error: "integration_identifier e cobranca_id sao obrigatorios." },
      { status: 400 },
    );
  }

  // ── 1. Cancelar na Neofim ──
  try {
    const response = await fetch(
      `${NEOFIN_BASE_URL}/billing/cancel/${encodeURIComponent(integration_identifier)}`,
      {
        method: "PUT",
        headers: {
          "api-key": NEOFIN_API_KEY,
          "secret-key": NEOFIN_SECRET_KEY,
        },
      },
    );

    if (!response.ok) {
      let detail: unknown = null;
      try {
        detail = await response.json();
      } catch { /* ignore */ }

      console.error("[intermediacao-neofim/cancelar] Neofim retornou erro:", response.status, detail);
      return NextResponse.json(
        { ok: false, error: `Neofim retornou status ${response.status}.` },
        { status: 502 },
      );
    }
  } catch (err) {
    console.error("[intermediacao-neofim/cancelar] Erro de rede ao chamar Neofim:", err);
    return NextResponse.json(
      { ok: false, error: "Falha de rede ao chamar a Neofim." },
      { status: 502 },
    );
  }

  // ── 2. Atualizar cobrança local ──
  const adminDb = createAdminClient();
  const { error: updateErr } = await adminDb
    .from("cobrancas")
    .update({ status: "CANCELADO", updated_at: new Date().toISOString() })
    .eq("id", cobranca_id);

  if (updateErr) {
    console.error("[intermediacao-neofim/cancelar] Erro ao atualizar cobranca:", updateErr.message);
    return NextResponse.json(
      { ok: false, error: "Cancelado na Neofim, mas falhou ao atualizar localmente." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
