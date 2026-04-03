import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { requireUser } from "@/lib/supabase/api-auth";

type FormaLiquidacao = {
  forma_pagamento_codigo: string;
  descricao_exibicao: string;
  conta_financeira_id: number | null;
  tipo_base: string | null;
  exige_troco: boolean;
  formas_pagamento: {
    id?: number;
    nome?: string | null;
    codigo?: string | null;
    tipo_base?: string | null;
  } | null;
  contas_financeiras: {
    id?: number;
    codigo?: string | null;
    nome?: string | null;
  } | null;
};

const TIPOS_BASE_EXCLUIDOS = new Set(["CARTEIRA_INTERNA", "CARTAO_CONEXAO"]);
const CODIGOS_EXCLUIDOS = new Set([
  "CARTAO_CONEXAO_ALUNO",
  "CARTAO_CONEXAO_COLAB",
  "CARTAO_CONEXAO_COLABORADOR",
  "CONTA_INTERNA",
  "CONTA_INTERNA_ALUNO",
  "CONTA_INTERNA_COLABORADOR",
  "CREDITO_ALUNO",
  "CREDITO_COLABORADOR",
]);

function upper(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

export async function GET(req: NextRequest) {
  const denied = await guardApiByRole(req as Request);
  if (denied) return denied;

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  const { data, error } = await supabase
    .from("formas_pagamento_contexto")
    .select(
      `
      id,
      forma_pagamento_codigo,
      descricao_exibicao,
      ativo,
      ordem_exibicao,
      conta_financeira_id,
      carteira_tipo,
      formas_pagamento:forma_pagamento_codigo (
        id,
        nome,
        tipo_base,
        codigo,
        ativo
      ),
      contas_financeiras:conta_financeira_id (
        id,
        codigo,
        nome
      )
    `,
    )
    .eq("ativo", true)
    .order("ordem_exibicao", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const vistos = new Set<string>();
  const formas: FormaLiquidacao[] = [];

  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const codigo = upper(row.forma_pagamento_codigo);
    if (!codigo) continue;

    // Excluir formas que não são meios de liquidação real
    if (CODIGOS_EXCLUIDOS.has(codigo)) continue;

    const formaPagamento = row.formas_pagamento as Record<string, unknown> | null;
    const tipoBase = upper(formaPagamento?.tipo_base);
    if (TIPOS_BASE_EXCLUIDOS.has(tipoBase)) continue;

    // Excluir formas inativas na tabela base
    if (formaPagamento && formaPagamento.ativo === false) continue;

    // Deduplicar por codigo
    if (vistos.has(codigo)) continue;
    vistos.add(codigo);

    formas.push({
      forma_pagamento_codigo: row.forma_pagamento_codigo as string,
      descricao_exibicao: (row.descricao_exibicao as string) ?? codigo,
      conta_financeira_id: (row.conta_financeira_id as number | null) ?? null,
      tipo_base: tipoBase || null,
      exige_troco: tipoBase === "DINHEIRO",
      formas_pagamento: formaPagamento
        ? {
            id: formaPagamento.id as number | undefined,
            nome: formaPagamento.nome as string | null,
            codigo: formaPagamento.codigo as string | null,
            tipo_base: formaPagamento.tipo_base as string | null,
          }
        : null,
      contas_financeiras: row.contas_financeiras as FormaLiquidacao["contas_financeiras"],
    });
  }

  return NextResponse.json({ ok: true, formas });
}
