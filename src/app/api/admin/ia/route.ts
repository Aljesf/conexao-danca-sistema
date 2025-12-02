import { NextResponse } from "next/server";
import { adminAskAi, type AdminAiMessage } from "@/lib/openaiClient";

type RequestBody = {
  messages: AdminAiMessage[];
  mode?: "economico" | "padrao" | "profundo";
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;

    if (!body?.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: "Corpo inválido. Esperado { messages: AdminAiMessage[] }." },
        { status: 400 }
      );
    }

    const mode = body.mode || "economico";

    // Apenas loga se a chave estiver ausente (sem expor o valor)
    if (!process.env.OPENAI_API_KEY) {
      console.error(
        "[API /api/admin/ia] OPENAI_API_KEY não definida no ambiente do servidor."
      );
      return NextResponse.json(
        {
          error: "OPENAI_API_KEY não está configurada no servidor.",
        },
        { status: 500 }
      );
    }

    const answer = await adminAskAi(body.messages, mode);

    return NextResponse.json({ answer });
  } catch (error: any) {
    console.error("[API /api/admin/ia] Erro ao consultar IA:", error);
    const details =
      error?.message ||
      error?.toString?.() ||
      "Erro desconhecido ao chamar o modelo de IA.";
    return NextResponse.json(
      {
        error: "Erro interno ao consultar o assistente de IA.",
        details,
      },
      { status: 500 }
    );
  }
}
