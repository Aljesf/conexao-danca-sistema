import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ pessoaId: string }> },
) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;

  const { pessoaId: pessoaIdRaw } = await ctx.params;
  const pessoaId = Number(pessoaIdRaw);
  if (!Number.isFinite(pessoaId) || pessoaId <= 0) {
    return NextResponse.json(
      { ok: false, error: "pessoa_id_invalido" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("vw_dependente_financeiro_responsaveis")
    .select(
      "responsavel_pessoa_id,responsavel_nome,responsavel_cpf,responsavel_telefone,ativo,origem_tipo,origem_id,atualizado_em",
    )
    .eq("dependente_pessoa_id", pessoaId)
    .eq("ativo", true)
    .order("responsavel_nome", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, error: "db_erro", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, responsaveis: data ?? [] });
}
