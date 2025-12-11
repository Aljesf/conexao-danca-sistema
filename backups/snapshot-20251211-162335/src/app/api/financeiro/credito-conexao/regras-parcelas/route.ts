import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

// GET /api/financeiro/credito-conexao/regras-parcelas
// Lista regras de parcelamento do Cartao Conexao.
export async function GET(req: Request) {
  try {
    const supabase = await getSupabaseServer();
    const { searchParams } = new URL(req.url);

    const tipoConta = searchParams.get("tipo_conta"); // ALUNO / COLABORADOR / null
    const ativo = searchParams.get("ativo"); // "true"/"false"/null

    let query = supabase
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
        centro_custo_id,
        categoria_financeira_id,
        ativo,
        created_at,
        updated_at
      `,
      )
      .order("tipo_conta", { ascending: true })
      .order("numero_parcelas_min", { ascending: true });

    if (tipoConta) {
      query = query.eq("tipo_conta", tipoConta);
    }

    if (ativo === "true") {
      query = query.eq("ativo", true);
    } else if (ativo === "false") {
      query = query.eq("ativo", false);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao listar regras de parcelamento Credito Conexao", error);
      return NextResponse.json(
        { ok: false, error: "erro_listar_regras_parcelamento", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, regras: data ?? [] });
  } catch (err: any) {
    console.error("Erro inesperado em GET /regras-parcelas", err);
    return NextResponse.json(
      { ok: false, error: "erro_interno_regras_parcelas_get" },
      { status: 500 },
    );
  }
}

// POST /api/financeiro/credito-conexao/regras-parcelas
// Cria ou atualiza uma regra de parcelamento.
export async function POST(req: Request) {
  try {
    const supabase = await getSupabaseServer();
    const body = await req.json();

    const {
      id,
      tipo_conta,
      numero_parcelas_min,
      numero_parcelas_max,
      valor_minimo_centavos,
      taxa_percentual,
      taxa_fixa_centavos,
      centro_custo_id,
      categoria_financeira_id,
      ativo,
    } = body ?? {};

    if (!tipo_conta || !["ALUNO", "COLABORADOR"].includes(tipo_conta)) {
      return NextResponse.json(
        { ok: false, error: "tipo_conta_obrigatorio_ou_invalido" },
        { status: 400 },
      );
    }

    const numMin = Number(numero_parcelas_min);
    const numMax = Number(numero_parcelas_max);

    if (!numMin || !numMax || numMin < 1 || numMax < numMin) {
      return NextResponse.json(
        { ok: false, error: "faixa_parcelas_invalida" },
        { status: 400 },
      );
    }

    const valorMin = Number(valor_minimo_centavos ?? 0);
    const taxaPerc = Number(taxa_percentual ?? 0);
    const taxaFixa = Number(taxa_fixa_centavos ?? 0);

    const payload: any = {
      tipo_conta,
      numero_parcelas_min: numMin,
      numero_parcelas_max: numMax,
      valor_minimo_centavos: valorMin,
      taxa_percentual: taxaPerc,
      taxa_fixa_centavos: taxaFixa,
      centro_custo_id: centro_custo_id ?? null,
      categoria_financeira_id: categoria_financeira_id ?? null,
      ativo: typeof ativo === "boolean" ? ativo : true,
      updated_at: new Date().toISOString(),
    };

    let result;

    if (id) {
      const { data, error } = await supabase
        .from("credito_conexao_regras_parcelas")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Erro ao atualizar regra de parcelamento Credito Conexao", error);
        return NextResponse.json(
          {
            ok: false,
            error: "erro_atualizar_regra_parcelamento",
            details: error.message,
          },
          { status: 500 },
        );
      }

      result = data;
    } else {
      const insertPayload = {
        ...payload,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("credito_conexao_regras_parcelas")
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        console.error("Erro ao criar regra de parcelamento Credito Conexao", error);
        return NextResponse.json(
          { ok: false, error: "erro_criar_regra_parcelamento", details: error.message },
          { status: 500 },
        );
      }

      result = data;
    }

    return NextResponse.json({ ok: true, regra: result });
  } catch (err: any) {
    console.error("Erro inesperado em POST /regras-parcelas", err);
    return NextResponse.json(
      { ok: false, error: "erro_interno_regras_parcelas_post" },
      { status: 500 },
    );
  }
}
