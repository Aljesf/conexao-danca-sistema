import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { requireUser } from "@/lib/supabase/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { buildReferenciaMatriculaItemCompetencia } from "@/lib/matriculas/matriculaItens";
import { inserirMatriculaEventoSupabase } from "@/lib/matriculas/eventos";

type Params = {
  params: Promise<{
    itemId?: string;
  }>;
};

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function isDateISO(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function PATCH(request: Request, { params }: Params) {
  const denied = await guardApiByRole(request as any);
  if (denied) return denied as any;

  const auth = await requireUser(request as any);
  if (auth instanceof NextResponse) return auth;

  try {
    const { itemId: rawItemId } = await params;
    const itemId = parsePositiveInt(rawItemId);
    if (!itemId) {
      return NextResponse.json({ ok: false, error: "item_id_invalido" }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const dataFim = isDateISO(body.data_fim) ? body.data_fim : new Date().toISOString().slice(0, 10);
    const cancelamentoTipo =
      typeof body.cancelamento_tipo === "string" && body.cancelamento_tipo.trim()
        ? body.cancelamento_tipo.trim()
        : "OPERACIONAL";
    const observacoes =
      typeof body.observacoes === "string" && body.observacoes.trim() ? body.observacoes.trim() : null;

    const admin = getSupabaseAdmin();
    const db = admin as unknown as { from: (table: string) => any };

    const { data: item, error: itemError } = await db
      .from("matricula_itens")
      .select("id,matricula_id,modulo_id,status,data_inicio,data_fim,descricao")
      .eq("id", itemId)
      .maybeSingle();

    if (itemError) throw itemError;
    if (!item) {
      return NextResponse.json({ ok: false, error: "item_nao_encontrado" }, { status: 404 });
    }

    const statusAtual = String(item.status ?? "").toUpperCase();
    if (statusAtual === "CANCELADO") {
      return NextResponse.json({ ok: false, error: "item_ja_cancelado" }, { status: 409 });
    }

    const { error: itemUpdateError } = await db
      .from("matricula_itens")
      .update({
        status: "CANCELADO",
        data_fim: dataFim,
        cancelamento_tipo: cancelamentoTipo,
        cancelado_em: new Date().toISOString(),
        observacoes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId);

    if (itemUpdateError) throw itemUpdateError;

    const { data: vinculosAtivos, error: vinculosError } = await admin
      .from("turma_aluno")
      .select("turma_aluno_id,turma_id,aluno_pessoa_id,dt_inicio,dt_fim,status")
      .eq("matricula_item_id", itemId)
      .is("dt_fim", null);

    if (vinculosError) throw vinculosError;

    const vinculoIds = (vinculosAtivos ?? [])
      .map((row) => Number((row as { turma_aluno_id?: number }).turma_aluno_id))
      .filter((value) => Number.isInteger(value) && value > 0);

    let vinculosEncerrados = 0;
    if (vinculoIds.length > 0) {
      const { error: encerrarError } = await admin
        .from("turma_aluno")
        .update({
          dt_fim: dataFim,
          status: "encerrado",
        })
        .in("turma_aluno_id", vinculoIds);

      if (encerrarError) throw encerrarError;
      vinculosEncerrados = vinculoIds.length;
    }

    const referenciaPrefix = `matricula-item:${itemId}:competencia:`;
    const { data: lancamentosPendentes, error: lancamentosError } = await admin
      .from("credito_conexao_lancamentos")
      .select("id,competencia,referencia_item,status,cobranca_id")
      .like("referencia_item", `${referenciaPrefix}%`)
      .in("status", ["PENDENTE_FATURA", "FATURADO"]);

    if (lancamentosError) throw lancamentosError;

    const pendenciasFinanceirasDetectadas = (lancamentosPendentes ?? []).map((row) => {
      const referencia = typeof row.referencia_item === "string" ? row.referencia_item : null;
      const competencia =
        typeof row.competencia === "string" && row.competencia
          ? row.competencia
          : referencia?.replace(referenciaPrefix, "") ?? null;
      return {
        lancamento_id: Number(row.id ?? 0) || null,
        cobranca_id: Number(row.cobranca_id ?? 0) || null,
        competencia,
        referencia_item:
          referencia ??
          (competencia ? buildReferenciaMatriculaItemCompetencia(itemId, competencia) : null),
        status: typeof row.status === "string" ? row.status : null,
      };
    });

    await inserirMatriculaEventoSupabase(db, {
      matricula_id: Number(item.matricula_id ?? 0),
      tipo_evento: "MODULO_REMOVIDO",
      modulo_id: Number(item.modulo_id ?? 0) || null,
      observacao: observacoes ?? "Cancelamento administrativo do item.",
      created_by: auth.userId,
      dados: {
        item_id: itemId,
        cancelamento_tipo: cancelamentoTipo,
        vinculos_encerrados: vinculosEncerrados,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        item_cancelado: {
          id: itemId,
          matricula_id: Number(item.matricula_id ?? 0) || null,
          descricao: typeof item.descricao === "string" ? item.descricao : null,
          status: "CANCELADO",
          data_fim: dataFim,
          cancelamento_tipo: cancelamentoTipo,
          observacoes,
        },
        vinculos_encerrados: vinculosEncerrados,
        pendencias_financeiras_detectadas: pendenciasFinanceirasDetectadas,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "erro_interno";
    return NextResponse.json({ ok: false, error: "falha_cancelar_item", details: message }, { status: 500 });
  }
}
