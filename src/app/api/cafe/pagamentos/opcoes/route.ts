import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { requireUser } from "@/lib/supabase/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { resolverFormasPagamentoDisponiveis } from "@/lib/financeiro/resolver-formas-pagamento-disponiveis";

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

function mapTipoFluxoCafe(value: string) {
  switch (value) {
    case "DINHEIRO":
    case "PIX":
    case "CREDIARIO":
      return "IMEDIATO" as const;
    case "CARTAO":
      return "CARTAO_EXTERNO" as const;
    case "CONTA_INTERNA_ALUNO":
      return "CONTA_INTERNA_ALUNO" as const;
    case "CONTA_INTERNA_COLABORADOR":
      return "CONTA_INTERNA_COLABORADOR" as const;
    default:
      return "IMEDIATO" as const;
  }
}

function isOpcaoCafePermitida(
  tipoComprador: "NAO_IDENTIFICADO" | "ALUNO" | "COLABORADOR" | "PESSOA_AVULSA",
  tipoFluxo: string,
) {
  if (tipoFluxo === "DINHEIRO" || tipoFluxo === "PIX" || tipoFluxo === "CARTAO") {
    return true;
  }
  if (tipoFluxo === "CONTA_INTERNA_ALUNO") {
    return tipoComprador === "ALUNO";
  }
  if (tipoFluxo === "CONTA_INTERNA_COLABORADOR") {
    return tipoComprador === "COLABORADOR";
  }
  return false;
}

function ordemOpcaoCafe(tipoFluxo: string) {
  switch (tipoFluxo) {
    case "DINHEIRO":
      return 10;
    case "PIX":
      return 20;
    case "CARTAO":
      return 30;
    case "CONTA_INTERNA_ALUNO":
    case "CONTA_INTERNA_COLABORADOR":
      return 40;
    default:
      return 99;
  }
}

export async function GET(request: NextRequest) {
  const denied = await guardApiByRole(request as unknown as Request);
  if (denied) return denied as unknown as NextResponse;

  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const url = new URL(request.url);
    console.log("[CAFE_PAGAMENTOS][GET]", Object.fromEntries(url.searchParams.entries()));
    const parsed = QuerySchema.safeParse({
      comprador_pessoa_id: url.searchParams.get("comprador_pessoa_id") ?? undefined,
      comprador_tipo: url.searchParams.get("comprador_tipo") ?? undefined,
      centro_custo_id: url.searchParams.get("centro_custo_id") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "query_invalida", detalhe: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const data = await resolverFormasPagamentoDisponiveis({
      supabase,
      compradorPessoaId: parseOptionalInt(parsed.data.comprador_pessoa_id),
      compradorTipo: parsed.data.comprador_tipo ?? null,
      centroCustoId: parseOptionalInt(parsed.data.centro_custo_id),
      contexto: "CAFE",
    });

    console.log("[CAFE_PAGAMENTOS][OPCOES]", {
      comprador_pessoa_id: data.comprador.pessoa_id,
      comprador_tipo: data.comprador.tipo,
      centro_custo_id: data.centro_custo_id,
      opcoes: data.opcoes.length,
      erro_controlado: data.erro_controlado,
      conta_interna_elegivel: data.conta_interna.elegivel,
      conta_interna_tipo: data.conta_interna.tipo,
      conta_interna_id: data.conta_interna.conta_id,
      formas_antes_filtro: data.opcoes.map((item) => ({
        codigo: item.codigo,
        label: item.descricao_exibicao,
        tipo_fluxo: item.tipo_fluxo,
        habilitado: item.habilitado,
      })),
    });

    const opcoesFiltradas = data.opcoes
      .filter((item) => isOpcaoCafePermitida(data.comprador.tipo, item.tipo_fluxo))
      .sort((a, b) => {
        const ordemA = ordemOpcaoCafe(a.tipo_fluxo);
        const ordemB = ordemOpcaoCafe(b.tipo_fluxo);
        if (ordemA !== ordemB) return ordemA - ordemB;
        if (a.ordem_exibicao !== b.ordem_exibicao) return a.ordem_exibicao - b.ordem_exibicao;
        return a.descricao_exibicao.localeCompare(b.descricao_exibicao);
      });

    console.log("[CAFE_PAGAMENTOS][OPCOES][FILTRO_FINAL]", {
      comprador_pessoa_id: data.comprador.pessoa_id,
      comprador_tipo: data.comprador.tipo,
      opcoes_finais: opcoesFiltradas.map((item) => ({
        codigo: item.codigo,
        label: item.descricao_exibicao,
        tipo_fluxo: item.tipo_fluxo,
        habilitado: item.habilitado,
        motivo_bloqueio: item.motivo_bloqueio,
      })),
    });

    return NextResponse.json(
      {
        ok: data.ok,
        erro_controlado: data.erro_controlado,
        detalhe: data.detalhe,
        centro_custo_id: data.centro_custo_id,
        comprador: data.comprador,
        conta_interna: data.conta_interna,
        opcoes: opcoesFiltradas.map((item) => ({
          id: item.id,
          codigo: item.codigo,
          nome: item.nome,
          label: item.descricao_exibicao,
          tipo_fluxo: mapTipoFluxoCafe(item.tipo_fluxo),
          exige_conta_conexao: item.exige_conta_interna,
          exige_troco: item.exige_troco,
          exige_maquininha: item.exige_maquininha,
          exige_bandeira: item.exige_bandeira,
          habilitado: item.habilitado,
          motivo_bloqueio: item.motivo_bloqueio,
          conta_financeira_id: item.conta_financeira_id,
          conta_financeira_codigo: item.conta_financeira_codigo,
          conta_financeira_nome: item.conta_financeira_nome,
          cartao_maquina_id: item.cartao_maquina_id,
          cartao_maquina_nome: item.cartao_maquina_nome,
          carteira_tipo: item.carteira_tipo,
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[CAFE_PAGAMENTOS][OPCOES][ERRO]", error);
    const url = new URL(request.url);
    const compradorTipoRaw = upper(url.searchParams.get("comprador_tipo"));
    const compradorTipoFallback =
      compradorTipoRaw === "ALUNO" ||
      compradorTipoRaw === "COLABORADOR" ||
      compradorTipoRaw === "PESSOA_AVULSA"
        ? compradorTipoRaw
        : "NAO_IDENTIFICADO";
    return NextResponse.json(
      {
        ok: false,
        erro_controlado: "falha_listar_opcoes_pagamento_cafe",
        detalhe: error instanceof Error ? error.message : "erro_desconhecido",
        centro_custo_id: null,
        comprador: {
          pessoa_id: parseOptionalInt(url.searchParams.get("comprador_pessoa_id") ?? undefined),
          tipo: compradorTipoFallback,
        },
        conta_interna: {
          elegivel: false,
          tipo: null,
          conta_id: null,
          titular_pessoa_id: null,
          motivo: "Nao foi possivel resolver a conta interna.",
          suporte: {
            pode_solicitar: false,
            payload: null,
          },
        },
        opcoes: [],
      },
      { status: 200 },
    );
  }
}
