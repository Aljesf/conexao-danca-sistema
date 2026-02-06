import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { jsonError, zodToValidationError } from "@/lib/http/api-errors";
import { guardApiByRole } from "@/lib/auth/roleGuard";

const BeneficiarioUpdateSchema = z.object({
  relatorio_socioeconomico: z.string().min(10).optional(),
  dados_complementares: z.record(z.unknown()).optional(),
  observacoes: z.string().optional(),
  termo_consentimento_assinado: z.boolean().optional(),
  termo_participacao_assinado: z.boolean().optional(),
  contrato_assinado: z.boolean().optional(),
  documentos_refs: z.record(z.unknown()).optional(),
});

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(_ as any);
  if (denied) return denied as any;
  try {
    const supabase = getSupabaseServiceClient();
    const { id } = await ctx.params;

    const { data, error } = await supabase
      .from("movimento_beneficiarios")
      .select(
        [
          "id",
          "pessoa_id",
          "status",
          "exercicio_ano",
          "valido_ate",
          "criado_em",
          "relatorio_socioeconomico",
          "observacoes",
          "termo_consentimento_assinado",
          "termo_participacao_assinado",
          "contrato_assinado",
          "pessoas (id,nome,cpf,email)",
        ].join(","),
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: "falha_buscar", message: error.message, code: error.code ?? null },
        { status: 500 },
      );
    }
    if (!data) {
      return NextResponse.json(
        { ok: false, error: "nao_encontrado", message: "Beneficiario nao encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ERRO_INESPERADO";
    return NextResponse.json(
      { ok: false, error: "falha_buscar", message: msg, code: null },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  try {
    const supabase = getSupabaseServiceClient();
    const { id } = await ctx.params;

    const bodyUnknown = await req.json();
    const body = BeneficiarioUpdateSchema.parse(bodyUnknown);

    const updatePayload: Record<string, unknown> = {};
    if (typeof body.relatorio_socioeconomico === "string") updatePayload.relatorio_socioeconomico = body.relatorio_socioeconomico;
    if (typeof body.observacoes === "string") updatePayload.observacoes = body.observacoes;
    if (typeof body.termo_consentimento_assinado === "boolean") updatePayload.termo_consentimento_assinado = body.termo_consentimento_assinado;
    if (typeof body.termo_participacao_assinado === "boolean") updatePayload.termo_participacao_assinado = body.termo_participacao_assinado;
    if (typeof body.contrato_assinado === "boolean") updatePayload.contrato_assinado = body.contrato_assinado;

    if (body.dados_complementares) updatePayload.dados_complementares = body.dados_complementares as unknown;
    if (body.documentos_refs) updatePayload.documentos_refs = body.documentos_refs as unknown;

    const { data, error } = await supabase
      .from("movimento_beneficiarios")
      .update(updatePayload)
      .eq("id", id)
      .select(
        [
          "id",
          "pessoa_id",
          "status",
          "exercicio_ano",
          "valido_ate",
          "criado_em",
          "relatorio_socioeconomico",
          "observacoes",
          "termo_consentimento_assinado",
          "termo_participacao_assinado",
          "contrato_assinado",
          "pessoas (id,nome,cpf,email)",
        ].join(","),
      )
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("BENEFICIARIO_NAO_ENCONTRADO");

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return jsonError(zodToValidationError(err));
  }
}
