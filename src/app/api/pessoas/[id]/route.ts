// src/app/api/pessoas/[id]/route.ts
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import type { Pessoa } from "@/types/pessoa";

type RouteParams = {
  params: { id: string };
};

// SELECT padrão da tabela pessoas
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

// Resolve um nome a partir do user_id usando profiles e, se necessário, pessoas
async function resolverNomePorUserId(
  supabase: ReturnType<typeof getSupabaseServer>,
  userId: string | null
): Promise<string | null> {
  if (!userId) return null;

  const { data: perfil, error: perfilError } = await supabase
    .from("profiles")
    .select("full_name, pessoa_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (perfilError) {
    console.error("Erro ao buscar perfil:", perfilError);
    return null;
  }

  // 1) Se tiver full_name, usa ele
  if (perfil?.full_name) {
    return perfil.full_name;
  }

  // 2) Se não tiver full_name mas tiver pessoa_id, pega o nome da tabela pessoas
  if (perfil?.pessoa_id) {
    const { data: pessoaVinculada, error: pessoaError } = await supabase
      .from("pessoas")
      .select("nome")
      .eq("id", perfil.pessoa_id)
      .maybeSingle();

    if (pessoaError) {
      console.error("Erro ao buscar pessoa vinculada:", pessoaError);
      return null;
    }

    if (pessoaVinculada?.nome) {
      return pessoaVinculada.nome;
    }
  }

  return null;
}

// Carrega a pessoa e adiciona created_by_name / updated_by_name
async function carregarPessoaComNomes(id: string) {
  const supabase = getSupabaseServer();

  const { data, error } = await supabase
    .from("pessoas")
    .select(pessoaSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar pessoa:", error);
    throw new Error(error.message || "Erro ao buscar pessoa");
  }

  if (!data) {
    return null;
  }

  const pessoa = data as Pessoa & {
    created_by_name?: string | null;
    updated_by_name?: string | null;
  };

  const createdByName = await resolverNomePorUserId(
    supabase,
    pessoa.created_by ?? null
  );
  const updatedByName = await resolverNomePorUserId(
    supabase,
    pessoa.updated_by ?? null
  );

  return {
    ...pessoa,
    created_by_name: createdByName,
    updated_by_name: updatedByName,
  };
}

// GET /api/pessoas/[id] -> detalhes da pessoa
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { error: "ID da pessoa não informado" },
        { status: 400 }
      );
    }

    const pessoa = await carregarPessoaComNomes(id);

    if (!pessoa) {
      return NextResponse.json(
        { error: "Pessoa não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: pessoa }, { status: 200 });
  } catch (error: any) {
    console.error("Erro em GET /api/pessoas/[id]:", error);
    return NextResponse.json(
      {
        error: "Erro interno ao buscar pessoa",
        details: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}

// PUT /api/pessoas/[id] -> atualizar dados da pessoa
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { error: "ID da pessoa não informado" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const supabase = getSupabaseServer();

    const { data, error } = await supabase
      .from("pessoas")
      .update({
        nome: body.nome,
        nome_social: body.nome_social ?? null,
        email: body.email ?? null,
        telefone: body.telefone ?? null,
        telefone_secundario: body.telefone_secundario ?? null,
        nascimento: body.nascimento ?? null,
        genero: body.genero ?? "NAO_INFORMADO",
        estado_civil: body.estado_civil ?? null,
        nacionalidade: body.nacionalidade ?? null,
        naturalidade: body.naturalidade ?? null,
        cpf: body.cpf ?? null,
        observacoes: body.observacoes ?? null,
        updated_by: body.updated_by ?? null,
      })
      .eq("id", id)
      .select(pessoaSelect)
      .maybeSingle();

    if (error) {
      console.error("Erro ao atualizar pessoa:", error);
      return NextResponse.json(
        { error: error.message || "Erro ao atualizar pessoa" },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Pessoa não encontrada para atualização" },
        { status: 404 }
      );
    }

    // Reaproveita helper para trazer created_by_name/updated_by_name
    const pessoaAtualizada = await carregarPessoaComNomes(id);

    return NextResponse.json(
      { data: pessoaAtualizada ?? data },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Erro em PUT /api/pessoas/[id]:", error);
    return NextResponse.json(
      {
        error: "Erro interno ao atualizar pessoa",
        details: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}
