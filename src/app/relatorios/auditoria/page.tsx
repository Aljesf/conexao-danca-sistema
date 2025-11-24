import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import type { Pessoa } from "@/types/pessoa";

type RouteParams = {
  params: { id: string };
};

// Campos padrão da tabela pessoas
const pessoaSelect = `
  id,
  user_id,
  nome,
  nome_social,
  email,
  telefone,
  telefone_secundario,
  nascimento,
  genero,
  estado_civil,
  nacionalidade,
  naturalidade,
  cpf,
  cnpj,
  razao_social,
  nome_fantasia,
  inscricao_estadual,
  tipo_pessoa,
  ativo,
  observacoes,
  neofin_customer_id,
  foto_url,
  endereco,
  created_at,
  updated_at,
  created_by,
  updated_by
`;

// Função que carrega a pessoa e resolve os nomes de quem criou/atualizou
async function carregarPessoaComNomes(id: string) {
  const supabase = getSupabaseServer();

  // 1) Busca o registro da pessoa
  const { data: pessoaData, error } = await supabase
    .from("pessoas")
    .select(pessoaSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar pessoa:", error);
    return { data: null as any, error };
  }

  if (!pessoaData) {
    return { data: null as any, error: new Error("Pessoa não encontrada") };
  }

  let createdByName: string | null = null;
  let updatedByName: string | null = null;

  // Função auxiliar para resolver nome a partir de um user_id
  async function resolverNomePorUserId(userId: string | null) {
    if (!userId) return null;

    // 1) tenta pegar o full_name em profiles
    const { data: perfil, error: perfilError } = await supabase
      .from("profiles")
      .select("full_name, pessoa_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (perfilError) {
      console.error("Erro ao buscar perfil:", perfilError);
      return null;
    }

    if (perfil?.full_name) {
      return perfil.full_name;
    }

    // 2) se não tiver full_name, tenta usar a pessoa vinculada
    if (perfil?.pessoa_id) {
      const { data: pessoaVinculada, error: pessoaError } = await supabase
        .from("pessoas")
        .select("nome")
        .eq("id", perfil.pessoa_id)
        .maybeSingle();

      if (pessoaError) {
        console.error("Erro ao buscar pessoa vinculada ao perfil:", pessoaError);
        return null;
      }

      if (pessoaVinculada?.nome) {
        return pessoaVinculada.nome;
      }
    }

    return null;
  }

  // Resolve criador
  createdByName = await resolverNomePorUserId(pessoaData.created_by);

  // Resolve editor
  updatedByName = await resolverNomePorUserId(pessoaData.updated_by);

  // 3) Monta o objeto Pessoa com os campos extras de nome
  const pessoa: Pessoa = {
    ...(pessoaData as any),
    created_by_name: createdByName,
    updated_by_name: updatedByName,
  };

  return { data: pessoa, error: null };
}

/* ========= GET /api/pessoas/[id] ========= */
export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = params;

  const { data, error } = await carregarPessoaComNomes(id);

  if (error) {
    if (error.message === "Pessoa não encontrada") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error("GET /pessoas/[id] erro:", error);
    return NextResponse.json(
      { error: "Erro ao carregar pessoa." },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}

/* ========= PUT /api/pessoas/[id] ========= */
export async function PUT(req: Request, { params }: RouteParams) {
  const { id } = params;
  const supabase = getSupabaseServer();

  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 }
    );
  }

  const {
    nome,
    nome_social,
    email,
    telefone,
    telefone_secundario,
    nascimento,
    genero,
    estado_civil,
    nacionalidade,
    naturalidade,
    cpf,
    observacoes,
    updated_by, // id do usuário vindo do front (handleSalvar)
  } = body as Partial<Pessoa> & { updated_by?: string | null };

  // Atualiza dados da pessoa
  const { error: updateError } = await supabase
    .from("pessoas")
    .update({
      nome,
      nome_social,
      email,
      telefone,
      telefone_secundario,
      nascimento: nascimento || null,
      genero,
      estado_civil,
      nacionalidade,
      naturalidade,
      cpf,
      observacoes,
      updated_by: updated_by ?? null,
    })
    .eq("id", id);

  if (updateError) {
    console.error("PUT /pessoas/[id] erro UPDATE:", updateError);
    return NextResponse.json(
      { error: "Erro ao salvar alterações." },
      { status: 500 }
    );
  }

  // Recarrega pessoa já com "Criado por" / "Atualizado por" resolvidos
  const { data, error } = await carregarPessoaComNomes(id);

  if (error) {
    console.error("Erro ao recarregar pessoa após update:", error);
    return NextResponse.json(
      { error: "Erro ao carregar dados atualizados." },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
