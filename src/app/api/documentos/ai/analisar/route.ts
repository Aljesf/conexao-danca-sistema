import { NextResponse } from "next/server";
import type { AiAnalyzeResp } from "@/lib/documentos/ai.types";
import { iaAnalisarContrato } from "@/lib/ia/documentos/iaAnalisarContrato";

type ApiResp<T> = { ok: boolean; data?: T; message?: string };

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { texto?: string };
    const texto = String(body.texto || "").trim();

    if (!texto) {
      return NextResponse.json(
        { ok: false, message: "Texto do contrato e obrigatorio." } satisfies ApiResp<never>,
        { status: 400 },
      );
    }

    const data = await iaAnalisarContrato(texto);

    return NextResponse.json({ ok: true, data } satisfies ApiResp<AiAnalyzeResp>);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro interno ao analisar contrato.";
    return NextResponse.json(
      { ok: false, message } satisfies ApiResp<never>,
      { status: 500 },
    );
  }
}
