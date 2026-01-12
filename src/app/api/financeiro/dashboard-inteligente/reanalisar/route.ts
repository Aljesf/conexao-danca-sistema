import { NextResponse } from "next/server";
import { supabaseAdmin, gerarESalvarSnapshot } from "@/lib/financeiro/dashboardInteligente";
import { guardApiByRole } from "@/lib/auth/roleGuard";

type GptStatus = "OK" | "SEM_CHAVE" | "ERRO" | "PARSER";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function sanitizeError(err: any): string {
  if (!err) return "erro_desconhecido";
  const raw =
    typeof err === "string"
      ? err
      : err?.message || err?.error || err?.statusText || err?.code || JSON.stringify(err);
  return String(raw).slice(0, 180);
}

function buildDiagnostico(
  analise: any,
  hasOpenaiKey: boolean,
  modelConfig: string | null
): {
  diagnostico_gpt: {
    has_openai_key: boolean;
    model_configurado: string | null;
    modo: "FINANCEIRO";
    status: GptStatus;
    motivo: string | null;
  };
  gpt_status: "OK" | "SEM_CHAVE" | "ERRO";
  gpt_error_motivo: string | null;
} {
  const meta = analise?.meta || {};
  let status: GptStatus = "OK";
  let motivo: string | null = null;

  if (!hasOpenaiKey) {
    status = "SEM_CHAVE";
    motivo = "OPENAI_API_KEY ausente no servidor";
  } else if (!analise) {
    status = "ERRO";
    motivo = "analise ausente";
  } else if (meta?.erro_tipo === "SEM_CHAVE") {
    status = "SEM_CHAVE";
    motivo = meta?.erro_msg || "OPENAI_API_KEY ausente no servidor";
  } else if (meta?.erro_tipo === "PARSER") {
    status = "PARSER";
    motivo = meta?.erro_msg || "Falha ao parsear resposta GPT";
  } else if (meta?.erro_tipo === "ERRO") {
    status = "ERRO";
    motivo = meta?.erro_msg || "falha na chamada GPT";
  } else if (meta?.fonte !== "GPT") {
    status = "ERRO";
    motivo = "analise via regras";
  }

  const gpt_status = status === "OK" ? "OK" : status === "SEM_CHAVE" ? "SEM_CHAVE" : "ERRO";
  const gpt_error_motivo = gpt_status === "OK" ? null : motivo;

  return {
    diagnostico_gpt: {
      has_openai_key: hasOpenaiKey,
      model_configurado: modelConfig,
      modo: "FINANCEIRO",
      status,
      motivo,
    },
    gpt_status,
    gpt_error_motivo,
  };
}

export async function POST(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  const hasOpenaiKey = !!process.env.OPENAI_API_KEY;
  const modelUsado = process.env.FINANCEIRO_GPT_MODEL || "gpt-4.1-mini";

  try {
    const { snapshot, analise } = await gerarESalvarSnapshot(supabaseAdmin, {
      comAnaliseGpt: true,
    });

    const diag = buildDiagnostico(analise, hasOpenaiKey, modelUsado);

    if (
      diag.diagnostico_gpt.status !== "OK" &&
      process.env.NODE_ENV !== "production" &&
      (analise as any)?.raw
    ) {
      console.error("[reanalisar] Diagnostico GPT:", { meta: analise?.meta, raw: (analise as any).raw });
    }

    return NextResponse.json({
      ok: true,
      snapshot,
      analise,
      has_openai_key: hasOpenaiKey,
      gpt_status: diag.gpt_status,
      gpt_error_motivo: diag.gpt_error_motivo,
      model_usado: modelUsado,
      diagnostico_gpt: diag.diagnostico_gpt,
    });
  } catch (err) {
    console.error("[POST /api/financeiro/dashboard-inteligente/reanalisar] Erro:", err);
    const hasOpenaiKeyErr = !!process.env.OPENAI_API_KEY;
    const modelUsadoErr = process.env.FINANCEIRO_GPT_MODEL || "gpt-4.1-mini";
    const motivo = sanitizeError(err);
    const diag = buildDiagnostico(null, hasOpenaiKeyErr, modelUsadoErr);
    const gpt_status = hasOpenaiKeyErr ? ("ERRO" as const) : ("SEM_CHAVE" as const);
    const gpt_error_motivo = hasOpenaiKeyErr ? motivo : "OPENAI_API_KEY ausente no servidor";

    return NextResponse.json(
      {
        ok: false,
        error: "Erro ao reanalisar dashboard inteligente.",
        has_openai_key: hasOpenaiKeyErr,
        gpt_status,
        gpt_error_motivo,
        model_usado: modelUsadoErr,
        diagnostico_gpt: {
          ...diag.diagnostico_gpt,
          status: gpt_status === "OK" ? "OK" : gpt_status,
          motivo: gpt_error_motivo,
        },
      },
      { status: 500 }
    );
  }
}
