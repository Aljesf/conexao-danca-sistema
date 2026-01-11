import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { guardApiByRole } from "@/lib/auth/roleGuard";

// GET /api/financeiro/credito-conexao/contas
// Lista todas as contas de Crédito Conexão (sem joins por enquanto).
export async function GET(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  try {
    const supabase = await getSupabaseServer();
    const { searchParams } = new URL(req.url);
    const tipoConta = searchParams.get("tipo_conta"); // ALUNO / COLABORADOR / null

    const baseSelect = `
      id,
      pessoa_titular_id,
      tipo_conta,
      descricao_exibicao,
      dia_fechamento,
      dia_vencimento,
      centro_custo_principal_id,
      conta_financeira_origem_id,
      conta_financeira_destino_id,
      limite_maximo_centavos,
      limite_autorizado_centavos,
      ativo,
      created_at
    `;

    let joinQuery = supabase
      .from("credito_conexao_contas")
      .select(
        `
          ${baseSelect},
          titular:pessoas!credito_conexao_contas_pessoa_titular_fkey (
            id,
            nome,
            cpf
          )
        `,
      )
      .order("ativo", { ascending: false })
      .order("id", { ascending: true });

    if (tipoConta) {
      joinQuery = joinQuery.eq("tipo_conta", tipoConta);
    }

    const { data: contasJoin, error: joinError } = await joinQuery;

    if (!joinError) {
      return NextResponse.json({ ok: true, contas: contasJoin ?? [] });
    }

    let baseQuery = supabase
      .from("credito_conexao_contas")
      .select(baseSelect)
      .order("ativo", { ascending: false })
      .order("id", { ascending: true });

    if (tipoConta) {
      baseQuery = baseQuery.eq("tipo_conta", tipoConta);
    }

    const { data: contasBase, error: baseError } = await baseQuery;

    if (baseError) {
      console.error("Erro ao listar credito_conexao_contas", baseError);
      return NextResponse.json(
        {
          ok: false,
          error: "erro_listar_contas_credito_conexao",
          details: baseError.message,
        },
        { status: 500 },
      );
    }

    const pessoaIds = Array.from(
      new Set((contasBase ?? []).map((c) => c.pessoa_titular_id).filter(Boolean)),
    ) as number[];

    const { data: pessoas, error: pessoasError } = await supabase
      .from("pessoas")
      .select("id, nome, cpf")
      .in("id", pessoaIds);

    if (pessoasError) {
      console.error("Erro ao listar pessoas (titulares)", pessoasError);
      return NextResponse.json(
        { ok: false, error: "erro_listar_titulares", details: pessoasError.message },
        { status: 500 },
      );
    }

    const pessoasMap = new Map<number, { id: number; nome: string | null; cpf: string | null }>();
    for (const p of pessoas ?? []) {
      pessoasMap.set(p.id, { id: p.id, nome: p.nome ?? null, cpf: (p as { cpf?: string | null }).cpf ?? null });
    }

    const contasOut = (contasBase ?? []).map((c) => ({
      ...c,
      titular: pessoasMap.get(c.pessoa_titular_id) ?? null,
    }));

    return NextResponse.json({ ok: true, contas: contasOut });
  } catch (err: any) {
    console.error("Erro inesperado em GET /credito-conexao/contas", err);
    return NextResponse.json(
      { ok: false, error: "erro_interno_credito_conexao_get" },
      { status: 500 },
    );
  }
}

// POST /api/financeiro/credito-conexao/contas
// Cria ou atualiza uma conta de Crédito Conexão.
export async function POST(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  try {
    const supabase = await getSupabaseServer();
    const body = await req.json();

    const {
      id,
      pessoa_titular_id,
      tipo_conta,
      descricao_exibicao,
      dia_fechamento,
      dia_vencimento,
      centro_custo_principal_id,
      conta_financeira_origem_id,
      conta_financeira_destino_id,
      limite_maximo_centavos,
      limite_autorizado_centavos,
      ativo,
    } = body ?? {};

    if (!pessoa_titular_id || !tipo_conta) {
      return NextResponse.json(
        { ok: false, error: "pessoa_titular_e_tipo_conta_obrigatorios" },
        { status: 400 },
      );
    }

    if (!["ALUNO", "COLABORADOR"].includes(tipo_conta)) {
      return NextResponse.json(
        { ok: false, error: "tipo_conta_invalido" },
        { status: 400 },
      );
    }

    const payload: any = {
      pessoa_titular_id: Number(pessoa_titular_id),
      tipo_conta,
      descricao_exibicao: descricao_exibicao || null,
      dia_fechamento: dia_fechamento ?? 10,
      dia_vencimento: dia_vencimento ?? null,
      centro_custo_principal_id: centro_custo_principal_id ?? null,
      conta_financeira_origem_id: conta_financeira_origem_id ?? null,
      conta_financeira_destino_id: conta_financeira_destino_id ?? null,
      limite_maximo_centavos:
        typeof limite_maximo_centavos === "number" ? limite_maximo_centavos : null,
      limite_autorizado_centavos:
        typeof limite_autorizado_centavos === "number" ? limite_autorizado_centavos : null,
      ativo: typeof ativo === "boolean" ? ativo : true,
      updated_at: new Date().toISOString(),
    };

    let result;

    if (id) {
      const { data, error } = await supabase
        .from("credito_conexao_contas")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Erro ao atualizar conta de Crédito Conexão", error);
        return NextResponse.json(
          { ok: false, error: "erro_atualizar_conta_credito_conexao", details: error.message },
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
        .from("credito_conexao_contas")
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        console.error("Erro ao criar conta de Crédito Conexão", error);
        return NextResponse.json(
          { ok: false, error: "erro_criar_conta_credito_conexao", details: error.message },
          { status: 500 },
        );
      }

      result = data;
    }

    return NextResponse.json({ ok: true, conta: result });
  } catch (err: any) {
    console.error("Erro inesperado em POST /credito-conexao/contas", err);
    return NextResponse.json(
      { ok: false, error: "erro_interno_credito_conexao_post" },
      { status: 500 },
    );
  }
}


