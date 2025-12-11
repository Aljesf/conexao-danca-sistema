import { upsertNeofinBilling } from "@/lib/neofinClient";

type Pessoa = {
  id: number;
  nome: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
};

export type CriarCobrancaNeofinInput = {
  supabase: any;
  usuarioId: string | null;

  pessoa_id: number;
  descricao: string;
  valor_centavos: number;
  vencimento: string; // YYYY-MM-DD
  metodo_pagamento?: string | null;

  centro_custo_id?: number | null;

  origem_tipo?: string | null;
  origem_id?: number | null;

  integrationIdentifier: string; // ex.: "credito-conexao-fatura-123"
  exigirResponsavelFinanceiro?: boolean; // default true
};

export async function criarCobrancaLocalEEnviarNeofin(input: CriarCobrancaNeofinInput) {
  const {
    supabase,
    pessoa_id,
    descricao,
    valor_centavos,
    vencimento,
    metodo_pagamento,
    centro_custo_id,
    origem_tipo,
    origem_id,
    integrationIdentifier,
    exigirResponsavelFinanceiro = true,
  } = input;

  // Buscar pessoa
  const { data: pessoa, error: ePessoa } = await supabase
    .from("pessoas")
    .select("id, nome, cpf, email, telefone")
    .eq("id", pessoa_id)
    .single<Pessoa>();

  if (ePessoa || !pessoa) {
    return { ok: false, error: "pessoa_nao_encontrada" as const, details: ePessoa?.message };
  }

  // Validar CPF
  const documentoLimpo = (pessoa.cpf || "").replace(/\D/g, "");
  if (!documentoLimpo || documentoLimpo.length !== 11) {
    return {
      ok: false,
      error: "cpf_invalido_ou_ausente" as const,
      details: "CPF não informado ou inválido para gerar cobrança Neofin.",
    };
  }

  // Validar role RESPONSAVEL_FINANCEIRO (se exigido)
  if (exigirResponsavelFinanceiro) {
    const { data: roles, error: eRoles } = await supabase
      .from("pessoas_roles")
      .select("id, role")
      .eq("pessoa_id", pessoa_id)
      .eq("role", "RESPONSAVEL_FINANCEIRO");

    if (eRoles) {
      return { ok: false, error: "erro_verificar_roles" as const, details: eRoles.message };
    }

    if (!roles || roles.length === 0) {
      return {
        ok: false,
        error: "nao_responsavel_financeiro" as const,
        details: "Pessoa não está marcada como RESPONSAVEL_FINANCEIRO.",
      };
    }
  }

  // Criar cobrança local
  const { data: novaCobranca, error: eInsert } = await supabase
    .from("cobrancas")
    .insert({
      pessoa_id,
      descricao,
      valor_centavos,
      moeda: "BRL",
      vencimento,
      metodo_pagamento: metodo_pagamento ?? null,
      status: "PENDENTE",
      centro_custo_id: centro_custo_id ?? null,
      origem_tipo: origem_tipo ?? null,
      origem_id: origem_id ?? null,
    })
    .select("id, pessoa_id, descricao, valor_centavos, moeda, vencimento, status, neofin_charge_id, link_pagamento")
    .single();

  if (eInsert || !novaCobranca) {
    return { ok: false, error: "erro_criar_cobranca_local" as const, details: eInsert?.message };
  }

  // Enviar para Neofin (mesma estratégia já usada)
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
    await supabase
      .from("cobrancas")
      .update({ status: "ERRO_INTEGRACAO" })
      .eq("id", novaCobranca.id);

    return {
      ok: false,
      error: "erro_integracao_neofin" as const,
      cobranca_id: novaCobranca.id,
      neofin: neofinResult,
    };
  }

  // Atualizar cobrança com marcador de integração
  // (seguindo seu padrão atual: neofin_charge_id = integrationIdentifier)
  const { data: cobrancaAtualizada, error: eUpdate } = await supabase
    .from("cobrancas")
    .update({
      neofin_charge_id: integrationIdentifier,
      status: "PENDENTE",
    })
    .eq("id", novaCobranca.id)
    .select("id, neofin_charge_id, link_pagamento, status")
    .single();

  if (eUpdate || !cobrancaAtualizada) {
    return {
      ok: false,
      error: "erro_atualizar_cobranca_pos_neofin" as const,
      cobranca_id: novaCobranca.id,
      neofin: neofinResult,
      details: eUpdate?.message,
    };
  }

  return {
    ok: true,
    cobranca_id: novaCobranca.id,
    cobranca: cobrancaAtualizada,
    neofin: neofinResult,
  };
}
