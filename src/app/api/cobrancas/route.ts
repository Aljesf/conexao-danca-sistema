// src/app/api/cobrancas/route.ts
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServerSSR";
import { upsertNeofinBilling } from "@/lib/neofinClient";
import { logAuditoria, resolverNomeDoUsuario } from "@/lib/auditoriaLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NovaCobrancaPayload = {
  pessoa_id: number;
  descricao: string;
  valor_centavos: number;
  vencimento: string;
  metodo_pagamento?: string | null;
};

type Pessoa = {
  id: number;
  nome: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
};

type Cobranca = {
  id: number;
  pessoa_id: number;
  descricao: string;
  valor_centavos: number;
  moeda: string;
  vencimento: string;
  data_pagamento: string | null;
  status: string;
  metodo_pagamento: string | null;
  neofin_charge_id: string | null;
  link_pagamento: string | null;
  created_at: string;
  updated_at: string;
  pessoa?: Pessoa | null;
};

// GET /api/cobrancas -> lista cobrancas com dados basicos da pessoa
export async function GET() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Usuário não autenticado." },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from("cobrancas")
    .select(
      `
      id,
      pessoa_id,
      descricao,
      valor_centavos,
      moeda,
      vencimento,
      data_pagamento,
      status,
      metodo_pagamento,
      neofin_charge_id,
      link_pagamento,
      created_at,
      updated_at,
      pessoa:pessoas (
        id,
        nome,
        cpf,
        email,
        telefone
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[GET /api/cobrancas] erro:", error);
    return NextResponse.json(
      { error: "Erro ao buscar cobrancas." },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: data as Cobranca[] }, { status: 200 });
}

// POST /api/cobrancas -> cria cobranca e tenta integrar com Neofin
export async function POST(req: Request) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const usuarioId = user?.id ?? null;
  if (!usuarioId) {
    return NextResponse.json(
      { error: "Usuário não autenticado." },
      { status: 401 }
    );
  }

  let payload: NovaCobrancaPayload;
  try {
    payload = (await req.json()) as NovaCobrancaPayload;
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisicao invalido." },
      { status: 400 }
    );
  }

  if (!payload.pessoa_id || !payload.descricao || !payload.valor_centavos || !payload.vencimento) {
    return NextResponse.json(
      { error: "Campos obrigatorios: pessoa_id, descricao, valor_centavos, vencimento." },
      { status: 400 }
    );
  }

  // 1) Busca a pessoa responsavel
  const { data: pessoa, error: ePessoa } = await supabase
    .from("pessoas")
    .select("id, nome, cpf, email, telefone")
    .eq("id", payload.pessoa_id)
    .single<Pessoa>();

  if (ePessoa || !pessoa) {
    return NextResponse.json(
      { error: "Pessoa responsavel nao encontrada." },
      { status: 404 }
    );
  }

  // 2) Validacao de CPF
  if (!pessoa.cpf) {
    return NextResponse.json(
      {
        error: "CPF nao informado para essa pessoa. Para gerar cobranca, o responsavel financeiro precisa ter CPF cadastrado.",
      },
      { status: 400 }
    );
  }

  const documentoLimpo = (pessoa.cpf || "").replace(/\D/g, "");
  if (!documentoLimpo || documentoLimpo.length !== 11) {
    return NextResponse.json(
      {
        error: "CPF informado e invalido. Verifique o cadastro do responsavel financeiro.",
      },
      { status: 400 }
    );
  }

  // 3) Verifica se a pessoa tem papel RESPONSAVEL_FINANCEIRO
  const { data: roles, error: eRoles } = await supabase
    .from("pessoas_roles")
    .select("id, role")
    .eq("pessoa_id", payload.pessoa_id)
    .eq("role", "RESPONSAVEL_FINANCEIRO");

  if (eRoles) {
    console.error("[POST /api/cobrancas] erro ao buscar papeis:", eRoles);
    return NextResponse.json(
      {
        error: eRoles.message ?? "Erro ao verificar papeis da pessoa.",
      },
      { status: 500 }
    );
  }

  if (!roles || roles.length === 0) {
    return NextResponse.json(
      {
        error: "Esta pessoa nao esta marcada como RESPONSAVEL_FINANCEIRO. Atualize os papeis antes de gerar a cobranca.",
      },
      { status: 400 }
    );
  }

  // 4) Cria a cobranca localmente
  const { data: novaCobranca, error: eInsert } = await supabase
    .from("cobrancas")
    .insert({
      pessoa_id: payload.pessoa_id,
      descricao: payload.descricao,
      valor_centavos: payload.valor_centavos,
      moeda: "BRL",
      vencimento: payload.vencimento,
      metodo_pagamento: payload.metodo_pagamento ?? null,
      status: "PENDENTE",
    })
    .select(
      `
      id,
      pessoa_id,
      descricao,
      valor_centavos,
      moeda,
      vencimento,
      data_pagamento,
      status,
      metodo_pagamento,
      neofin_charge_id,
      link_pagamento,
      created_at,
      updated_at
    `
    )
    .single<Cobranca>();

  if (eInsert || !novaCobranca) {
    console.error("[POST /api/cobrancas] erro ao criar cobranca:", eInsert);
    return NextResponse.json(
      { error: "Erro ao criar cobranca." },
      { status: 500 }
    );
  }

  // 5) Integra com a Neofin (idempotencia pelo integrationIdentifier)
  const integrationIdentifier = `cobranca-${novaCobranca.id}`;

  const neofinResult = await upsertNeofinBilling({
    integrationIdentifier,
    amountCentavos: novaCobranca.valor_centavos,
    dueDate: novaCobranca.vencimento,
    description: novaCobranca.descricao,
    customer: {
      nome: pessoa.nome,
      cpf: documentoLimpo,
      email: pessoa.email,
      telefone: pessoa.telefone,
    },
  });

  if (!neofinResult.ok) {
    console.error("[Neofin] Falha ao enfileirar cobranca na criacao:", neofinResult);

    await supabase
      .from("cobrancas")
      .update({ status: "ERRO_INTEGRACAO" })
      .eq("id", novaCobranca.id);

    return NextResponse.json(
      {
        error: "Cobranca criada localmente, mas falhou ao integrar com a Neofin.",
        neofin: neofinResult,
      },
      { status: 502 }
    );
  }

  // 6) Atualiza cobranca com identificador Neofin
  const { data: cobrancaAtualizada, error: eUpdate } = await supabase
    .from("cobrancas")
    .update({
      neofin_charge_id: integrationIdentifier,
      status: "PENDENTE",
    })
    .eq("id", novaCobranca.id)
    .select(
      `
      id,
      pessoa_id,
      descricao,
      valor_centavos,
      moeda,
      vencimento,
      data_pagamento,
      status,
      metodo_pagamento,
      neofin_charge_id,
      link_pagamento,
      created_at,
      updated_at
    `
    )
    .single<Cobranca>();

  if (eUpdate || !cobrancaAtualizada) {
    console.error("[POST /api/cobrancas] erro ao atualizar cobranca apos integracao:", eUpdate);
    return NextResponse.json(
      {
        error: "Cobranca foi enviada para a Neofin, mas ocorreu um erro ao atualizar os dados locais.",
        neofin: neofinResult,
      },
      { status: 500 }
    );
  }

  const usuarioNome = await resolverNomeDoUsuario(usuarioId);
  await logAuditoria({
    usuario_id: usuarioId ?? "",
    usuario_nome: usuarioNome,
    entidade: "cobranca",
    entidade_id: cobrancaAtualizada.id,
    acao: "CREATE",
    descricao: `Criou cobranca #${cobrancaAtualizada.id} para pessoa ${pessoa.nome} (#${pessoa.id})`,
  });

  return NextResponse.json(
    {
      data: cobrancaAtualizada,
      neofin: neofinResult,
    },
    { status: 201 }
  );
}
