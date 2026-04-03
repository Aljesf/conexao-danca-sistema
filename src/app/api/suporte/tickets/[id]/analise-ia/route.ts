import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { isSuporteAnaliseIaModo } from "@/lib/suporte/constants";
import {
  loadSupportTicketForAnalysis,
  runSupportTicketAnalysis,
} from "@/lib/suporte/processar-analise-ticket-ia";

function parseId(raw: string) {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function logSupportTicketAnalysis(level: "info" | "warn" | "error", payload: Record<string, unknown>) {
  const message = `[SuporteTicketAnaliseIA] ${JSON.stringify(payload)}`;
  if (level === "error") {
    console.error(message);
    return;
  }
  if (level === "warn") {
    console.warn(message);
    return;
  }
  console.info(message);
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const params = await ctx.params;
  const id = parseId(params.id);
  if (!id) {
    return NextResponse.json({ ok: false, error: "id_invalido" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const modoRaw = body?.modoAnaliseIA ?? body?.modo;
  if (!isSuporteAnaliseIaModo(modoRaw)) {
    return NextResponse.json({ ok: false, error: "modo_analise_ia_invalido" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin", { uid: auth.userId });
  if (adminError) {
    return NextResponse.json({ ok: false, error: adminError.message }, { status: 500 });
  }
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const ticket = await loadSupportTicketForAnalysis(supabase, id);
  if (!ticket) {
    return NextResponse.json({ ok: false, error: "ticket_nao_encontrado" }, { status: 404 });
  }

  try {
    const updatedTicket = await runSupportTicketAnalysis({
      supabase,
      ticket,
      modo: modoRaw,
      requestedBy: auth.userId,
      log: logSupportTicketAnalysis,
    });

    return NextResponse.json({
      ok: true,
      ticket: updatedTicket,
      analysis: {
        requested: Boolean(updatedTicket.analise_ia_solicitada),
        status: updatedTicket.analise_ia_status ?? "nao_solicitada",
        mode: updatedTicket.analise_ia_modo ?? null,
      },
    });
  } catch (error) {
    const updatedTicket = await loadSupportTicketForAnalysis(supabase, id);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "falha_analise_ia",
        ticket: updatedTicket,
        analysis: {
          requested: Boolean(updatedTicket?.analise_ia_solicitada),
          status: updatedTicket?.analise_ia_status ?? "falhou",
          mode: updatedTicket?.analise_ia_modo ?? modoRaw,
        },
      },
      { status: 500 },
    );
  }
}

