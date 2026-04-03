import { NextResponse, type NextRequest } from "next/server";
import { guardCafeApiRequest, requireCafeApiUser } from "@/lib/auth/cafeApiAccess";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { criarComandaCafe, listarComandasCafe } from "@/lib/cafe/caixa";
import { resolverElegibilidadeContaInterna } from "@/lib/loja/pessoaContaInterna";

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

type TipoQuitacaoPayload =
  | "PAGAMENTO_IMEDIATO"
  | "PAGAMENTO_PARCIAL"
  | "CONTA_INTERNA_ALUNO"
  | "CONTA_INTERNA_COLABORADOR"
  | "IMEDIATA"
  | "PARCIAL"
  | "CARTAO_CONEXAO"
  | "CONTA_INTERNA";

type CaixaVendaPayload = {
  comprador_pessoa_id?: number | null;
  colaborador_pessoa_id?: number | null;
  tipo_quitacao?: TipoQuitacaoPayload | null;
  forma_pagamento_real?: string | null;
  valor_pago_abertura_centavos?: number | null;
  competencia_ano_mes?: string | null;
  data_hora_venda?: string | null;
};

function normalizarTextoOpcional(value: string | null): string | null {
  return value && value.trim() ? value.trim() : null;
}

function normalizarTipoQuitacao(value: string | null): TipoQuitacaoPayload | null {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) return null;

  switch (normalized) {
    case "PAGAMENTO_IMEDIATO":
    case "IMEDIATA":
      return "PAGAMENTO_IMEDIATO";
    case "PAGAMENTO_PARCIAL":
    case "PARCIAL":
      return "PAGAMENTO_PARCIAL";
    case "CONTA_INTERNA_ALUNO":
    case "CARTAO_CONEXAO":
      return "CONTA_INTERNA_ALUNO";
    case "CONTA_INTERNA_COLABORADOR":
    case "CONTA_INTERNA":
      return "CONTA_INTERNA_COLABORADOR";
    default:
      return null;
  }
}

function isCompetenciaAnoMes(value: string | null): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value);
}

function statusFromError(message: string): number {
  switch (message) {
    case "payload_invalido":
    case "itens_obrigatorios":
    case "itens_invalidos":
    case "produto_nao_encontrado":
    case "produto_inativo":
    case "colaborador_pessoa_id_obrigatorio":
    case "comprador_pessoa_id_obrigatorio":
    case "conta_interna_exige_colaborador":
    case "competencia_obrigatoria_para_conta_interna":
    case "forma_pagamento_obrigatoria":
    case "data_hora_venda_obrigatoria":
    case "valor_pago_abertura_obrigatorio_para_pagamento_parcial":
    case "saldo_em_aberto_obrigatorio_para_conta_interna":
    case "competencia_invalida":
    case "comprador_nao_identificado_nao_pode_usar_conta_interna":
    case "cartao_conexao_aluno_exige_aluno_identificado":
    case "comprador_obrigatorio_para_fluxo_futuro":
    case "conta_conexao_nao_encontrada":
    case "conta_interna_aluno_nao_encontrada":
    case "conta_interna_colaborador_nao_encontrada":
    case "conta_interna_informada_invalida":
    case "tabela_preco_id_invalida":
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
  const denied = await guardCafeApiRequest(request);
  if (denied) return denied;

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
  const auth = await requireCafeApiUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json().catch(() => null);
    console.log("[CAFE_CAIXA][POST] body:", JSON.stringify(body, null, 2));
    if (isRecord(body)) {
      const payload: CaixaVendaPayload = {
        comprador_pessoa_id: firstNumber(body, [
          "comprador_pessoa_id",
          "compradorPessoaId",
          "comprador_id",
          "compradorId",
          "pagador_pessoa_id",
          "cliente_pessoa_id",
        ]),
        colaborador_pessoa_id: firstNumber(body, [
          "colaborador_pessoa_id",
          "colaboradorPessoaId",
        ]),
        tipo_quitacao: normalizarTipoQuitacao(
          firstString(body, ["tipo_quitacao", "tipoQuitacao"]),
        ),
        forma_pagamento_real: normalizarTextoOpcional(
          firstString(body, [
            "forma_pagamento_real",
            "formaPagamentoReal",
            "forma_pagamento",
            "formaPagamento",
            "metodo_pagamento",
            "metodoPagamento",
          ]),
        ),
        valor_pago_abertura_centavos: firstNumber(body, [
          "valor_pago_abertura_centavos",
          "valorPagoAberturaCentavos",
          "valor_pago_centavos",
          "valorPagoCentavos",
        ]),
        competencia_ano_mes: normalizarTextoOpcional(
          firstString(body, [
            "competencia_ano_mes",
            "competenciaAnoMes",
            "data_competencia",
            "dataCompetencia",
            "competencia",
          ]),
        ),
        data_hora_venda: normalizarTextoOpcional(
          firstString(body, ["data_hora_venda", "dataHoraVenda"]),
        ),
      };
      const compradorPessoaId = firstNumber(body, [
        "comprador_pessoa_id",
        "compradorPessoaId",
        "comprador_id",
        "compradorId",
        "pagador_pessoa_id",
        "cliente_pessoa_id",
      ]);
      const colaboradorPessoaIdInformado = payload.colaborador_pessoa_id ?? null;
      const colaboradorPessoaId = colaboradorPessoaIdInformado ?? compradorPessoaId;
      const formaPagamentoId = firstNumber(body, [
        "forma_pagamento_saas_id",
        "formaPagamentoSaasId",
        "forma_pagamento_id",
        "formaPagamentoId",
      ]);
      const tabelaPrecoId = firstNumber(body, ["tabela_preco_id", "tabelaPrecoId"]);
      const contaInternaId = firstNumber(body, [
        "conta_conexao_id",
        "contaConexaoId",
        "conta_interna_id",
        "contaInternaId",
      ]);
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
      console.log("[CAFE_CAIXA][POST][NORMALIZADO]", {
        comprador_pessoa_id: compradorPessoaId,
        colaborador_pessoa_id: colaboradorPessoaId,
        forma_pagamento_saas_id: formaPagamentoId,
        tabela_preco_id: tabelaPrecoId,
        conta_interna_id: contaInternaId,
        forma_pagamento: formaPagamento,
        tipo_quitacao: tipoQuitacao,
        conta_interna_solicitada: contaInternaSolicitada,
        data_hora_venda: payload.data_hora_venda,
        competencia_ano_mes: payload.competencia_ano_mes,
      });

      if (!compradorPessoaId) {
        return NextResponse.json(
          { error: "falha_criar_comanda_cafe", detalhe: "comprador_pessoa_id_obrigatorio" },
          { status: 400 },
        );
      }

      if (contaInternaSolicitada) {
        const competencia = payload.competencia_ano_mes;

        if (!colaboradorPessoaId) {
          console.warn("[CAFE_CAIXA][POST][VALIDACAO]", {
            motivo: "conta_interna_exige_colaborador",
            comprador_pessoa_id: compradorPessoaId,
            colaborador_pessoa_id: colaboradorPessoaIdInformado,
            conta_interna_id: contaInternaId,
          });
          return NextResponse.json(
            { error: "falha_criar_comanda_cafe", detalhe: "conta_interna_exige_colaborador" },
            { status: 400 },
          );
        }

        if (!competencia) {
          console.warn("[CAFE_CAIXA][POST][VALIDACAO]", {
            motivo: "competencia_obrigatoria_para_conta_interna",
            comprador_pessoa_id: compradorPessoaId,
            colaborador_pessoa_id: colaboradorPessoaId,
            conta_interna_id: contaInternaId,
          });
          return NextResponse.json(
            { error: "falha_criar_comanda_cafe", detalhe: "competencia_obrigatoria_para_conta_interna" },
            { status: 400 },
          );
        }
      }

      if (payload.tipo_quitacao === "CONTA_INTERNA_ALUNO" || payload.tipo_quitacao === "CONTA_INTERNA_COLABORADOR") {
        if (!compradorPessoaId) {
          return NextResponse.json(
            { error: "falha_criar_comanda_cafe", detalhe: "comprador_obrigatorio_para_fluxo_futuro" },
            { status: 400 },
          );
        }

        if (!isCompetenciaAnoMes(payload.competencia_ano_mes ?? null)) {
          return NextResponse.json(
            { error: "falha_criar_comanda_cafe", detalhe: "competencia_obrigatoria_para_conta_interna" },
            { status: 400 },
          );
        }

        const elegibilidade = await resolverElegibilidadeContaInterna(supabase, compradorPessoaId);
        const possuiContaInternaValida =
          payload.tipo_quitacao === "CONTA_INTERNA_ALUNO"
            ? elegibilidade.possuiContaInternaAluno
            : elegibilidade.possuiContaInternaColaborador;

        if (!possuiContaInternaValida) {
          return NextResponse.json(
            {
              error: "falha_criar_comanda_cafe",
              detalhe:
                payload.tipo_quitacao === "CONTA_INTERNA_ALUNO"
                  ? "conta_interna_aluno_nao_encontrada"
                  : "conta_interna_colaborador_nao_encontrada",
            },
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
