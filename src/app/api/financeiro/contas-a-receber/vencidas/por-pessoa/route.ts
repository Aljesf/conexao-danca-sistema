import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { listarTitulosVencidosPorPessoa } from "@/lib/financeiro/contas-receber-auditoria";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

export async function GET(req: NextRequest) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const pessoaId = Number(searchParams.get("pessoa_id"));
  if (!Number.isFinite(pessoaId) || pessoaId <= 0) {
    return NextResponse.json({ ok: false, error: "pessoa_id_invalido" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const titulos = await listarTitulosVencidosPorPessoa(supabase, pessoaId);

    return NextResponse.json({
      ok: true,
      pessoa_id: pessoaId,
      titulos: titulos.map((item) => ({
        cobranca_id: item.cobranca_id,
        pessoa_id: item.pessoa_id,
        vencimento: item.vencimento,
        dias_atraso: item.atraso_dias,
        valor_centavos: item.valor_centavos,
        saldo_aberto_centavos: item.valor_aberto_centavos,
        origem_tipo: item.origem_tipo,
        origem_id: item.origem_id,
        status_cobranca: item.status_cobranca,
        bucket_vencimento: item.bucket,
        situacao_saas: item.status_interno,
        origem_label: item.origem_label,
        origem_secundaria: item.origem_secundaria,
        origem_tecnica: item.origem_tecnica,
        origem_badge_label: item.origem_badge_label,
        origem_badge_tone: item.origem_badge_tone,
        origemAgrupadorTipo: item.origemAgrupadorTipo,
        origemAgrupadorId: item.origemAgrupadorId,
        origemItemTipo: item.origemItemTipo,
        origemItemId: item.origemItemId,
        contaInternaId: item.contaInternaId,
        origemLabel: item.origemLabel,
        migracaoContaInternaStatus: item.migracaoContaInternaStatus,
      })),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: "erro_listar_titulos_vencidos",
        details: error instanceof Error ? error.message : "erro_desconhecido",
      },
      { status: 500 },
    );
  }
}
