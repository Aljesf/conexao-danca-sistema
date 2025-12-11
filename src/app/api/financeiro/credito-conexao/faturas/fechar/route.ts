import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

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
export async function POST(req: Request) {
  try {
    const supabase = await getSupabaseServer();
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
        tipo_conta,
        dia_fechamento,
        dia_vencimento
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
      .select("id, valor_centavos")
      .eq("conta_conexao_id", contaConexaoId)
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

    // Somar valor total da fatura
    const valorTotal = lancamentos.reduce((acc, l) => acc + (l.valor_centavos ?? 0), 0);

    if (valorTotal <= 0) {
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
        valor_total_centavos: valorTotal,
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
      valor_total_centavos: valorTotal,
    });
  } catch (err: any) {
    console.error("Erro inesperado ao fechar fatura Credito Conexao", err);
    return NextResponse.json(
      { ok: false, error: "erro_interno_fechar_fatura" },
      { status: 500 },
    );
  }
}
