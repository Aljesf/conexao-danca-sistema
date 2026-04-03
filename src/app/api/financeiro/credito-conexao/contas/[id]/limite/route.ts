import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { requireUser } from "@/lib/supabase/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

type Body = {
  limite_autorizado_centavos: number;
  motivo?: string;
};

/**
 * PATCH /api/financeiro/credito-conexao/contas/[id]/limite
 * Atualiza o limite de crédito autorizado de uma conta interna.
 * Registra o histórico de alteração.
 */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const denied = await guardApiByRole(req as never);
  if (denied) return denied as never;

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  const contaId = Number(id);
  if (!Number.isFinite(contaId) || contaId <= 0) {
    return NextResponse.json({ ok: false, error: "id_invalido" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const novoLimite = Number(body.limite_autorizado_centavos);
  if (!Number.isFinite(novoLimite) || novoLimite < 0) {
    return NextResponse.json(
      { ok: false, error: "limite_autorizado_centavos deve ser >= 0" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  // Buscar conta atual
  const { data: conta, error: contaErr } = await supabase
    .from("credito_conexao_contas")
    .select("id,limite_autorizado_centavos,limite_maximo_centavos")
    .eq("id", contaId)
    .maybeSingle();

  if (contaErr || !conta) {
    return NextResponse.json({ ok: false, error: "conta_nao_encontrada" }, { status: 404 });
  }

  const limiteAnterior = Number((conta as any).limite_autorizado_centavos ?? 0);

  // Registrar histórico
  await supabase.from("credito_conexao_limite_historico").insert({
    conta_conexao_id: contaId,
    limite_anterior_centavos: limiteAnterior,
    limite_novo_centavos: novoLimite,
    tipo_limite: "AUTORIZADO",
    alterado_por: auth.userId,
    motivo: body.motivo ?? null,
  });

  // Atualizar conta
  const { data: updated, error: updateErr } = await supabase
    .from("credito_conexao_contas")
    .update({
      limite_autorizado_centavos: novoLimite,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contaId)
    .select("id,limite_autorizado_centavos,limite_maximo_centavos")
    .single();

  if (updateErr) {
    return NextResponse.json(
      { ok: false, error: "erro_atualizar_limite", detail: updateErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: updated,
    limite_anterior_centavos: limiteAnterior,
    limite_novo_centavos: novoLimite,
  });
}
