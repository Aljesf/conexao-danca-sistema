import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

type LiquidacaoModo = "PAGAR_AGORA" | "LANCAR_NO_CARTAO" | "ADIAR_EXCECAO";

type Payload = {
  matricula_id: number;
  tipo_primeira_cobranca: "ENTRADA_PRORATA" | "MENSALIDADE_CHEIA_CARTAO";
  modo: LiquidacaoModo;

  // pagamento no ato (quando PAGAR_AGORA)
  forma_pagamento_id?: number;
  valor_centavos?: number;
  data_pagamento?: string; // YYYY-MM-DD
  observacoes?: string;

  // excecao (quando ADIAR_EXCECAO)
  motivo_excecao?: string;
};

function asInt(n: unknown): number | null {
  if (typeof n === "number" && Number.isFinite(n)) return Math.trunc(n);
  if (typeof n === "string" && n.trim() !== "" && !Number.isNaN(Number(n))) return Math.trunc(Number(n));
  return null;
}

export async function POST(req: Request) {
  // Next.js 15: cookies() é async
  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  }

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "payload_invalido" }, { status: 400 });
  }

  const matriculaId = asInt(body.matricula_id);
  if (!matriculaId) {
    return NextResponse.json({ error: "matricula_id_invalido" }, { status: 400 });
  }

  if (!body.tipo_primeira_cobranca) {
    return NextResponse.json({ error: "tipo_primeira_cobranca_obrigatorio" }, { status: 400 });
  }

  if (!body.modo) {
    return NextResponse.json({ error: "modo_obrigatorio" }, { status: 400 });
  }

  // 1) Carrega matricula
  const { data: matricula, error: errMat } = await supabase
    .from("matriculas")
    .select("id, pessoa_id, responsavel_financeiro_id, primeira_cobranca_status")
    .eq("id", matriculaId)
    .single();

  if (errMat || !matricula) {
    return NextResponse.json({ error: "matricula_nao_encontrada" }, { status: 404 });
  }

  if (matricula.primeira_cobranca_status === "PAGA" || matricula.primeira_cobranca_status === "LANCADA_CARTAO") {
    return NextResponse.json({ error: "matricula_ja_liquidada" }, { status: 409 });
  }

  // 2) Execucao por modo
  if (body.modo === "PAGAR_AGORA") {
    const formaPagamentoId = asInt(body.forma_pagamento_id);
    const valor = asInt(body.valor_centavos);
    const dataPg = typeof body.data_pagamento === "string" ? body.data_pagamento : null;

    if (!formaPagamentoId) {
      return NextResponse.json({ error: "forma_pagamento_id_obrigatorio" }, { status: 400 });
    }
    if (!valor || valor <= 0) {
      return NextResponse.json({ error: "valor_centavos_invalido" }, { status: 400 });
    }
    if (!dataPg) {
      return NextResponse.json({ error: "data_pagamento_obrigatoria" }, { status: 400 });
    }

    // 2.1) Cria cobranca ja como PAGA (porque estamos registrando recebimento no ato)
    const { data: cobranca, error: errCobr } = await supabase
      .from("cobrancas")
      .insert({
        pessoa_id: matricula.responsavel_financeiro_id,
        valor_centavos: valor,
        status: "PAGA",
        descricao: "Entrada (pró-rata) — ato da matrícula",
        origem_tipo: "MATRICULA",
        origem_id: matricula.id,
        data_cobranca: dataPg,
        data_vencimento: dataPg,
      })
      .select("id")
      .single();

    if (errCobr || !cobranca) {
      return NextResponse.json({ error: "falha_criar_cobranca", details: errCobr?.message }, { status: 500 });
    }

    // 2.2) Cria recebimento
    const { data: receb, error: errRec } = await supabase
      .from("recebimentos")
      .insert({
        cobranca_id: cobranca.id,
        valor_centavos: valor,
        forma_pagamento_id: formaPagamentoId,
        data_recebimento: dataPg,
        observacoes: body.observacoes ?? null,
      })
      .select("id")
      .single();

    if (errRec || !receb) {
      return NextResponse.json({ error: "falha_criar_recebimento", details: errRec?.message }, { status: 500 });
    }

    // 2.3) Atualiza matricula marcando como PAGA
    const { error: errUpd } = await supabase
      .from("matriculas")
      .update({
        primeira_cobranca_tipo: body.tipo_primeira_cobranca,
        primeira_cobranca_status: "PAGA",
        primeira_cobranca_valor_centavos: valor,
        primeira_cobranca_cobranca_id: cobranca.id,
        primeira_cobranca_recebimento_id: receb.id,
        primeira_cobranca_forma_pagamento_id: formaPagamentoId,
        primeira_cobranca_data_pagamento: dataPg,
      })
      .eq("id", matricula.id);

    if (errUpd) {
      return NextResponse.json({ error: "falha_atualizar_matricula", details: errUpd.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      status: "PAGA",
      cobranca_id: cobranca.id,
      recebimento_id: receb.id,
    });
  }

  if (body.modo === "LANCAR_NO_CARTAO") {
    const valor = asInt(body.valor_centavos);
    if (!valor || valor <= 0) {
      return NextResponse.json({ error: "valor_centavos_invalido" }, { status: 400 });
    }

    // Descobre conta_conexao_id do responsavel (Cartao Conexao ALUNO)
    const { data: conta, error: errConta } = await supabase
      .from("credito_conexao_contas")
      .select("id")
      .eq("pessoa_titular_id", matricula.responsavel_financeiro_id)
      .eq("tipo_conta", "ALUNO")
      .eq("ativo", true)
      .maybeSingle();

    if (errConta || !conta) {
      return NextResponse.json({ error: "conta_cartao_conexao_nao_encontrada" }, { status: 409 });
    }

    const { data: lanc, error: errLanc } = await supabase
      .from("credito_conexao_lancamentos")
      .insert({
        conta_conexao_id: conta.id,
        origem_sistema: "MATRICULA",
        origem_id: matricula.id,
        descricao: "Mensalidade cheia — matrícula",
        valor_centavos: valor,
        status: "PENDENTE_FATURA",
      })
      .select("id")
      .single();

    if (errLanc || !lanc) {
      return NextResponse.json({ error: "falha_criar_lancamento_cartao", details: errLanc?.message }, { status: 500 });
    }

    const { error: errUpd } = await supabase
      .from("matriculas")
      .update({
        primeira_cobranca_tipo: body.tipo_primeira_cobranca,
        primeira_cobranca_status: "LANCADA_CARTAO",
        primeira_cobranca_valor_centavos: valor,
        primeira_cobranca_data_pagamento: null,
      })
      .eq("id", matricula.id);

    if (errUpd) {
      return NextResponse.json({ error: "falha_atualizar_matricula", details: errUpd.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status: "LANCADA_CARTAO", lancamento_cartao_id: lanc.id });
  }

  if (body.modo === "ADIAR_EXCECAO") {
    const motivo = typeof body.motivo_excecao === "string" ? body.motivo_excecao.trim() : "";
    if (!motivo) {
      return NextResponse.json({ error: "motivo_excecao_obrigatorio" }, { status: 400 });
    }

    const { error: errUpd } = await supabase
      .from("matriculas")
      .update({
        primeira_cobranca_tipo: body.tipo_primeira_cobranca,
        primeira_cobranca_status: "ADIADA_EXCECAO",
        excecao_primeiro_pagamento: true,
        motivo_excecao_primeiro_pagamento: motivo,
        excecao_autorizada_por: auth.user.id,
        excecao_criada_em: new Date().toISOString(),
      })
      .eq("id", matricula.id);

    if (errUpd) {
      return NextResponse.json({ error: "falha_atualizar_matricula", details: errUpd.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status: "ADIADA_EXCECAO" });
  }

  return NextResponse.json({ error: "modo_invalido" }, { status: 400 });
}
