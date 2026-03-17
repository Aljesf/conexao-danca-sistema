import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { requireUser } from "@/lib/supabase/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { listarFormasPagamentoElegiveis } from "@/lib/financeiro/formas-pagamento-saas";

const QuerySchema = z.object({
  comprador_pessoa_id: z.string().trim().optional(),
  comprador_tipo: z.string().trim().optional(),
  centro_custo_id: z.string().trim().optional(),
});

function parseOptionalInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.trunc(parsed);
}

function upper(value: string | null | undefined) {
  return typeof value === "string"
    ? value
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
    : "";
}

function mapTipoFluxoCafe(value: string, codigo: string) {
  switch (value) {
    case "DINHEIRO":
    case "PIX":
    case "CREDIARIO":
      return "IMEDIATO" as const;
    case "CARTAO":
      return "CARTAO_EXTERNO" as const;
    case "CONTA_INTERNA_ALUNO":
      return "CARTAO_CONEXAO_ALUNO" as const;
    case "CONTA_INTERNA_COLABORADOR":
      return upper(codigo).includes("CARTAO_CONEXAO")
        ? ("CARTAO_CONEXAO_COLABORADOR" as const)
        : ("CONTA_INTERNA" as const);
    default:
      return "IMEDIATO" as const;
  }
}

export async function GET(request: NextRequest) {
  const denied = await guardApiByRole(request as unknown as Request);
  if (denied) return denied as unknown as NextResponse;

  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const url = new URL(request.url);
    const parsed = QuerySchema.safeParse({
      comprador_pessoa_id: url.searchParams.get("comprador_pessoa_id") ?? undefined,
      comprador_tipo: url.searchParams.get("comprador_tipo") ?? undefined,
      centro_custo_id: url.searchParams.get("centro_custo_id") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "query_invalida", detalhe: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const data = await listarFormasPagamentoElegiveis({
      supabase,
      compradorPessoaId: parseOptionalInt(parsed.data.comprador_pessoa_id),
      compradorTipo: parsed.data.comprador_tipo ?? null,
      centroCustoId: parseOptionalInt(parsed.data.centro_custo_id),
      contexto: "CAFE",
    });

    return NextResponse.json(
      {
        centro_custo_id: data.centro_custo_id,
        comprador: data.comprador,
        conta_interna: data.conta_interna,
        opcoes: data.opcoes.map((item) => ({
          id: item.id,
          codigo: item.codigo,
          nome: item.nome,
          label: item.descricao_exibicao,
          tipo_fluxo: mapTipoFluxoCafe(item.tipo_fluxo, item.codigo),
          exige_conta_conexao: item.exige_conta_interna,
          exige_troco: item.exige_troco,
          exige_maquininha: item.exige_maquininha,
          exige_bandeira: item.exige_bandeira,
          habilitado: item.habilitado,
          motivo_bloqueio: item.motivo_bloqueio,
          conta_financeira_id: item.conta_financeira_id,
          cartao_maquina_id: item.cartao_maquina_id,
          carteira_tipo: item.carteira_tipo,
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "falha_listar_opcoes_pagamento_cafe",
        detalhe: error instanceof Error ? error.message : "erro_desconhecido",
      },
      { status: 500 },
    );
  }
}
