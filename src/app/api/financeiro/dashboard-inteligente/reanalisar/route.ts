import { NextResponse } from "next/server";
import {
  supabaseAdmin,
  gerarESalvarSnapshot,
} from "@/lib/financeiro/dashboardInteligente";

export async function POST() {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  try {
    const { snapshot, analise } = await gerarESalvarSnapshot(supabaseAdmin, {
      comAnaliseGpt: true,
    });

    return NextResponse.json({ ok: true, snapshot, analise });
  } catch (err) {
    console.error("[POST /api/financeiro/dashboard-inteligente/reanalisar] Erro:", err);
    return NextResponse.json(
      { ok: false, error: "Erro ao reanalisar dashboard inteligente." },
      { status: 500 }
    );
  }
}
