import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { guardApiByRole } from "@/lib/auth/roleGuard";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(_req as any);
  if (denied) return denied as any;
  const auth = await requireUser(_req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const { id } = await params;
  const faturaId = Number(id);

  if (!faturaId || Number.isNaN(faturaId)) {
    return NextResponse.json({ ok: false, error: "id_invalido" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("credito_conexao_fatura_lancamentos")
    .select(
      `
      lancamento:credito_conexao_lancamentos (
        id,
        conta_conexao_id,
        origem_sistema,
        origem_id,
        descricao,
        valor_centavos,
        numero_parcelas,
        data_lancamento,
        status,
        composicao_json,
        created_at
      )
    `
    )
    .eq("fatura_id", faturaId);

  if (error) {
    console.error("Erro ao listar lançamentos da fatura", error);
    return NextResponse.json({ ok: false, error: "erro_listar_lancamentos" }, { status: 500 });
  }

  const lancamentos = (data ?? []).map((row: any) => row.lancamento).filter(Boolean);

  return NextResponse.json({ ok: true, lancamentos });
}


