import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { requireUser } from "@/lib/supabase/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { criarComandaCafe, listarComandasCafe } from "@/lib/cafe/caixa";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function firstNumber(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
    if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
      return Math.trunc(Number(value));
    }
  }
  return null;
}

function statusFromError(message: string): number {
  switch (message) {
    case "payload_invalido":
    case "itens_obrigatorios":
    case "itens_invalidos":
    case "produto_nao_encontrado":
    case "produto_inativo":
    case "colaborador_pessoa_id_obrigatorio":
    case "conta_interna_exige_colaborador":
    case "competencia_obrigatoria_para_conta_interna":
    case "forma_pagamento_obrigatoria":
    case "saldo_em_aberto_obrigatorio_para_conta_interna":
    case "competencia_invalida":
    case "comprador_nao_identificado_nao_pode_usar_conta_interna":
    case "cartao_conexao_aluno_exige_aluno_identificado":
    case "comprador_obrigatorio_para_fluxo_futuro":
    case "conta_conexao_nao_encontrada":
    case "conta_interna_aluno_nao_encontrada":
    case "conta_interna_colaborador_nao_encontrada":
      return 400;
    case "saldo_insuficiente":
      return 409;
    case "competencia_fechada_para_conta_interna":
      return 409;
    default:
      return 500;
  }
}

export async function GET(request: NextRequest) {
  const denied = await guardApiByRole(request as any);
  if (denied) return denied as any;

  try {
    console.log("[CAFE_CAIXA][GET] query params recebidos");
    const supabase = getSupabaseAdmin();
    const url = new URL(request.url);
    const data = await listarComandasCafe(supabase, url.searchParams);
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (error) {
    console.error("[CAFE_CAIXA][GET][ERRO]", error);
    return NextResponse.json(
      {
        error: "falha_listar_comandas_cafe",
        detalhe: error instanceof Error ? error.message : "erro_desconhecido",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const denied = await guardApiByRole(request as any);
  if (denied) return denied as any;

  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json().catch(() => null);
    console.log("[CAFE_CAIXA][POST] body:", JSON.stringify(body, null, 2));
    if (isRecord(body)) {
      const formaPagamento = firstString(body, [
        "forma_pagamento",
        "formaPagamento",
        "metodo_pagamento",
        "metodoPagamento",
      ])?.toUpperCase();
      const tipoQuitacao = firstString(body, ["tipo_quitacao", "tipoQuitacao"])?.toUpperCase();
      const contaInternaSolicitada =
        formaPagamento === "CONTA_INTERNA" ||
        formaPagamento === "CREDIARIO_COLAB" ||
        formaPagamento === "CONTA_INTERNA_COLABORADOR" ||
        formaPagamento === "CARTAO_CONEXAO_COLABORADOR" ||
        formaPagamento === "CARTAO_CONEXAO_COLAB" ||
        tipoQuitacao === "CONTA_INTERNA_COLABORADOR";

      if (contaInternaSolicitada) {
        const colaboradorPessoaId = firstNumber(body, ["colaborador_pessoa_id", "colaboradorPessoaId"]);
        const competencia = firstString(body, ["data_competencia", "dataCompetencia", "competencia"]);

        if (!colaboradorPessoaId) {
          return NextResponse.json(
            { error: "falha_criar_comanda_cafe", detalhe: "conta_interna_exige_colaborador" },
            { status: 400 },
          );
        }

        if (!competencia) {
          return NextResponse.json(
            { error: "falha_criar_comanda_cafe", detalhe: "competencia_obrigatoria_para_conta_interna" },
            { status: 400 },
          );
        }
      }
    }
    const data = await criarComandaCafe({
      supabase,
      body,
      userId: auth.userId,
    });
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    const detalhe = error instanceof Error ? error.message : "erro_desconhecido";
    console.error("[CAFE_CAIXA][POST][ERRO]", error);
    return NextResponse.json(
      {
        error: "falha_criar_comanda_cafe",
        detalhe,
      },
      { status: statusFromError(detalhe) },
    );
  }
}
