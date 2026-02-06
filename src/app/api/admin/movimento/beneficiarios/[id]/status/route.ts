import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMovimentoAdmin } from "@/lib/auth/movimento-guard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { jsonError, zodToValidationError } from "@/lib/http/api-errors";
import { guardApiByRole } from "@/lib/auth/roleGuard";

const StatusSchema = z.object({
  status: z.enum(["EM_ANALISE", "APROVADO", "SUSPENSO", "ENCERRADO"]),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  try {
    const { userId } = await requireMovimentoAdmin();
    const supabase = getSupabaseServiceClient();
    const { id } = await ctx.params;

    const bodyUnknown = await req.json();
    const body = StatusSchema.parse(bodyUnknown);

    const patch: Record<string, unknown> = { status: body.status };

    if (body.status === "APROVADO") {
      patch.aprovado_em = new Date().toISOString();
      patch.aprovado_por = userId;
    }

    const { data, error } = await supabase
      .from("movimento_beneficiarios")
      .update(patch)
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
