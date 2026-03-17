import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getCobrancaProvider } from "@/lib/financeiro/cobranca/providers";
import { buildDescricaoCobranca } from "@/lib/financeiro/cobranca/descricao";
import type { CobrancaProviderCode } from "@/lib/financeiro/cobranca/providers/types";
import {
  DuplicidadeCobrancaCanonicaError,
  getOrCreateCobrancaCanonicaFatura,
} from "@/lib/credito-conexao/getOrCreateCobrancaCanonicaFatura";

/**
 * POST /api/financeiro/credito-conexao/faturas/fechar
 *
 * Body esperado:
 * {
 *   "conta_conexao_id": number,
 *   "data_referencia"?: "YYYY-MM-DD" (opcional; default = hoje)
 * }
 *
 * Comportamento:
 * - Busca lancamentos PENDENTE_FATURA da conta.
 * - Soma valor_total.
 * - Cria fatura em credito_conexao_faturas.
 * - Cria vinculos em credito_conexao_fatura_lancamentos.
 * - Atualiza lancamentos para status = 'FATURADO'.
 */
export async function POST(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  try {
    const auth = await requireUser(req);
    if (auth instanceof NextResponse) return auth;

    const { supabase } = auth;
    const body = await req.json().catch(() => ({}));

    const contaConexaoId = Number(body.conta_conexao_id);
    const dataReferenciaStr: string | undefined = body.data_referencia;

    if (!contaConexaoId || Number.isNaN(contaConexaoId)) {
      return NextResponse.json(
        { ok: false, error: "conta_conexao_id_obrigatorio" },
        { status: 400 },
      );
    }

    const hoje = new Date();
    const dataRef = dataReferenciaStr ? new Date(dataReferenciaStr) : hoje;

    if (Number.isNaN(dataRef.getTime())) {
      return NextResponse.json(
        { ok: false, error: "data_referencia_invalida" },
        { status: 400 },
      );
    }

    const periodoAno = dataRef.getFullYear();
    const periodoMes = dataRef.getMonth() + 1; // 1..12
    const periodo_ref = `${periodoAno}-${String(periodoMes).padStart(2, "0")}`;

    // Buscar dados da conta (para dia_fechamento / dia_vencimento)
    const { data: conta, error: contaError } = await supabase
      .from("credito_conexao_contas")
      .select(
        `
        id,
        pessoa_titular_id,
        tipo_conta,
        dia_fechamento,
        dia_vencimento,
        centro_custo_principal_id
      `,
      )
      .eq("id", contaConexaoId)
      .single();

    if (contaError || !conta) {
      console.error("Conta Credito Conexao nao encontrada", contaError);
      return NextResponse.json(
        { ok: false, error: "conta_conexao_nao_encontrada" },
        { status: 404 },
      );
    }

    // Determinar datas de fechamento e vencimento da fatura
    // Regra simples: usa data_referencia para o mes/ano, e aplica dia_fechamento/dia_vencimento.
    function construirData(day: number | null | undefined): Date | null {
      if (!day || day < 1 || day > 31) return null;
      return new Date(periodoAno, periodoMes - 1, day);
    }

    const dataFechamento = construirData(conta.dia_fechamento) ?? dataRef;
    const dataVencimento =
      construirData(conta.dia_vencimento) ??
      null; // para COLABORADOR pode ser null; Aluno normalmente usa dia_vencimento

    // Buscar lancamentos PENDENTE_FATURA desta conta
    const { data: lancamentos, error: lancamentosError } = await supabase
      .from("credito_conexao_lancamentos")
      .select("id, valor_centavos, numero_parcelas")
      .eq("conta_conexao_id", contaConexaoId)
      .eq("competencia", periodo_ref)
      .eq("status", "PENDENTE_FATURA");

    if (lancamentosError) {
      console.error("Erro ao buscar lancamentos PENDENTE_FATURA", lancamentosError);
      return NextResponse.json(
        { ok: false, error: "erro_buscar_lancamentos_pendentes" },
        { status: 500 },
      );
    }

    if (!lancamentos || lancamentos.length === 0) {
      // Nada a faturar
      return NextResponse.json(
        {
          ok: false,
          error: "sem_lancamentos_pendentes",
          message: "Nao ha lancamentos pendentes para esta conta.",
        },
        { status: 400 },
      );
    }

    // Regras de parcelamento ativas para o tipo de conta
    const { data: regrasParcelamento, error: regrasError } = await supabase
      .from("credito_conexao_regras_parcelas")
      .select(
        `
        id,
        tipo_conta,
        numero_parcelas_min,
        numero_parcelas_max,
        valor_minimo_centavos,
        taxa_percentual,
        taxa_fixa_centavos,
        ativo
      `,
      )
      .eq("tipo_conta", conta.tipo_conta)
      .eq("ativo", true);

    if (regrasError) {
      console.error("Erro ao buscar regras de parcelamento Crédito Conexão", regrasError);
    }

    const regrasAtivas = regrasParcelamento ?? [];

    // Somar valor total da fatura aplicando taxas por regra de parcelamento
    let valorComprasTotal = 0;
    let valorTaxasTotal = 0;

    for (const lanc of lancamentos ?? []) {
      const valorLanc = lanc.valor_centavos ?? 0;
      valorComprasTotal += valorLanc;

      const nParcelas = lanc.numero_parcelas ?? 1;
      if (!regrasAtivas.length || nParcelas <= 1 || valorLanc <= 0) {
        continue;
      }

      const regra = regrasAtivas.find((r) => {
        const dentroFaixa =
          nParcelas >= (r.numero_parcelas_min ?? 1) &&
          nParcelas <= (r.numero_parcelas_max ?? r.numero_parcelas_min ?? 1);
        const atendeMinimo = valorLanc >= (r.valor_minimo_centavos ?? 0);
        return dentroFaixa && atendeMinimo;
      });

      if (!regra) continue;

      const taxaPerc = Number(regra.taxa_percentual ?? 0);
      const taxaFixa = Number(regra.taxa_fixa_centavos ?? 0);
      const taxaSobreValor = taxaPerc > 0 ? Math.round((valorLanc * taxaPerc) / 100) : 0;
      const taxaTotalLancamento = taxaSobreValor + taxaFixa;

      if (taxaTotalLancamento > 0) {
        valorTaxasTotal += taxaTotalLancamento;
      }
    }

    const valorTotalFatura = valorComprasTotal + valorTaxasTotal;

    if (valorTotalFatura <= 0) {
      return NextResponse.json(
        { ok: false, error: "valor_total_invalido" },
        { status: 400 },
      );
    }

    // Iniciar transacao logica (nao temos BEGIN/COMMIT, entao vamos em passos,
    // mas cuidando para nao deixar estados inconsistentes em caso de erro).
    // 1) Criar fatura
    const { data: fatura, error: faturaError } = await supabase
      .from("credito_conexao_faturas")
      .insert({
        conta_conexao_id: contaConexaoId,
        periodo_referencia: periodo_ref,
        data_fechamento: dataFechamento.toISOString().slice(0, 10),
        data_vencimento: dataVencimento ? dataVencimento.toISOString().slice(0, 10) : null,
        valor_total_centavos: valorTotalFatura,
        valor_taxas_centavos: valorTaxasTotal,
        status: "ABERTA",
      })
      .select()
      .single();

    if (faturaError || !fatura) {
      console.error("Erro ao criar fatura de Credito Conexao", faturaError);
      return NextResponse.json(
        { ok: false, error: "erro_criar_fatura_credito_conexao" },
        { status: 500 },
      );
    }

    const faturaId = fatura.id as number;

    // 1.5) Criar cobranca vinculada a fatura (Cartao Conexao Aluno)
    let cobrancaId: number | null = null;

    if (conta.tipo_conta === "ALUNO") {
      try {
        const pessoaId = conta.pessoa_titular_id;
        if (!pessoaId) {
          console.warn(
            "Conta Credito Conexao ALUNO sem pessoa_titular_id; nao sera gerada cobranca.",
          );
        } else {
          const vencimentoIso = (dataVencimento ?? dataFechamento).toISOString().slice(0, 10);
          const descricao = buildDescricaoCobranca({
            contexto: "FATURA_CREDITO_CONEXAO",
            faturaId,
            periodo: periodo_ref,
            itensDescricao: [],
          });

          const resultadoCobranca = await getOrCreateCobrancaCanonicaFatura({
            supabase,
            faturaId,
            pessoaId,
            descricao,
            valorCentavos: valorTotalFatura,
            vencimentoIso,
          });

          cobrancaId = resultadoCobranca.cobranca.id;

          if (!resultadoCobranca.cobranca.neofin_charge_id) {
            const provider = getCobrancaProvider("NEOFIN" as CobrancaProviderCode);
            const out = await provider.criarCobranca({
              pessoaId,
              descricao,
              valorCentavos: valorTotalFatura,
              vencimentoISO: vencimentoIso,
              referenciaInterna: { tipo: "FATURA_CREDITO_CONEXAO", id: faturaId },
            });

            const { error: updProviderErr } = await supabase
              .from("cobrancas")
              .update({
                neofin_charge_id: out.providerCobrancaId,
                neofin_payload: out.payload ?? null,
                link_pagamento: out.linkPagamento ?? null,
                linha_digitavel: out.linhaDigitavel ?? null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", cobrancaId);

            if (updProviderErr) {
              throw updProviderErr;
            }
          }

          const { error: updateFaturaError } = await supabase
            .from("credito_conexao_faturas")
            .update({ cobranca_id: cobrancaId })
            .eq("id", faturaId);

          if (updateFaturaError) {
            console.error(
              "Erro ao atualizar fatura com cobranca_id",
              updateFaturaError,
            );
          }
        }
      } catch (cobrancaErr) {
        if (cobrancaErr instanceof DuplicidadeCobrancaCanonicaError) {
          return NextResponse.json(
            {
              ok: false,
              error: "duplicidade_cobranca_canonica",
              detail: cobrancaErr.message,
              cobranca_ids: cobrancaErr.cobrancaIds,
              fatura_id: cobrancaErr.faturaId,
            },
            { status: 409 },
          );
        }
        console.error(
          "Erro inesperado ao gerar cobranca da fatura Credito Conexao",
          cobrancaErr,
        );
      }
    }
    // 2) Criar vinculos em credito_conexao_fatura_lancamentos
    const vinculos = lancamentos.map((l) => ({
      fatura_id: faturaId,
      lancamento_id: l.id,
    }));

    const { error: vinculosError } = await supabase
      .from("credito_conexao_fatura_lancamentos")
      .insert(vinculos);

    if (vinculosError) {
      console.error("Erro ao vincular lancamentos a fatura Credito Conexao", vinculosError);
      return NextResponse.json(
        { ok: false, error: "erro_criar_vinculos_fatura" },
        { status: 500 },
      );
    }

    // 3) Atualizar lancamentos para FATURADO
    const idsLancamentos = lancamentos.map((l) => l.id);

    const { error: updateLancamentosError } = await supabase
      .from("credito_conexao_lancamentos")
      .update({ status: "FATURADO" })
      .in("id", idsLancamentos);

    if (updateLancamentosError) {
      console.error("Erro ao atualizar lancamentos para FATURADO", updateLancamentosError);
      return NextResponse.json(
        { ok: false, error: "erro_atualizar_lancamentos_faturados" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      fatura,
      quantidade_lancamentos: lancamentos.length,
      valor_total_centavos: valorTotalFatura,
      valor_taxas_centavos: valorTaxasTotal,
      cobranca_id: cobrancaId,
    });
  } catch (err: any) {
    console.error("Erro inesperado ao fechar fatura Credito Conexao", err);
    return NextResponse.json(
      { ok: false, error: "erro_interno_fechar_fatura" },
      { status: 500 },
    );
  }
}

