import { NextRequest, NextResponse } from "next/server";
import {
  supabaseAdmin,
  obterSnapshotPorData,
} from "@/lib/financeiro/dashboardInteligente";

export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const dataBase = searchParams.get("data_base");
  if (!dataBase) {
    return NextResponse.json(
      { ok: false, error: "data_base obrigatorio (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  try {
    const { snapshot, analise } = await obterSnapshotPorData(supabaseAdmin, dataBase);
    if (!snapshot) {
      return NextResponse.json(
        { ok: false, error: "Snapshot nao encontrado para a data informada." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, snapshot, analise });
  } catch (err) {
    console.error("[GET /api/financeiro/dashboard-inteligente/historico] Erro:", err);
    return NextResponse.json(
      { ok: false, error: "Erro ao consultar historico do dashboard inteligente." },
      { status: 500 }
    );
  }
}
