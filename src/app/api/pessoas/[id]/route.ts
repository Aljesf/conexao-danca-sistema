// src/app/api/pessoas/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { logAuditoria, resolverNomeDoUsuario } from "@/lib/auditoriaLog";
import type { Pessoa } from "@/types/pessoas";

type RouteParams = {
  params: Promise<{ id?: string }>;
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
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);

async function resolverNomePorUserId(userId: string | null): Promise<string | null> {
  if (!userId) return null;

  const { data: perfil, error: perfilError } = await supabaseAdmin
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

  if (perfil?.pessoa_id) {
    const { data: pessoaVinculada, error: pessoaError } = await supabaseAdmin
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
  const supabase = await getSupabaseServer();

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

  const [createdByName, updatedByName] = await Promise.all([
    resolverNomePorUserId(pessoa.created_by ?? null),
    resolverNomePorUserId(pessoa.updated_by ?? null),
  ]);

  return {
    ...pessoa,
    created_by_name: createdByName,
    updated_by_name: updatedByName,
  };
}

// GET /api/pessoas/[id] -> detalhes da pessoa
export async function GET(_req: Request, ctx: RouteParams) {
  try {
    const { id } = await ctx.params;
    if (!id) {
      return NextResponse.json(
        { error: "ID da pessoa não informado" },
        { status: 400 }
      );
    }

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
export async function PUT(req: Request, ctx: RouteParams) {
  try {
    const { id } = await ctx.params;
    if (!id) {
      return NextResponse.json(
        { error: "ID da pessoa não informado" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const supabase = await getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: "Usuario nao autenticado." },
        { status: 401 }
      );
    }
    const updatedBy = user.id;
    const cpfValue =
      body.cpf && typeof body.cpf === "string" && body.cpf.trim() !== ""
        ? body.cpf.trim()
        : null;

    // captura dados anteriores para log
    const { data: antigaPessoa } = await supabase
      .from("pessoas")
      .select("*")
      .eq("id", id)
      .maybeSingle();

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
        cpf: cpfValue,
        observacoes: body.observacoes ?? null,
        updated_by: updatedBy,
      })
      .eq("id", id)
      .select(pessoaSelect)
      .maybeSingle();

    if (error) {
      console.error("Erro ao atualizar pessoa:", error);
      const msg =
        error.code === "23505"
          ? "Ja existe uma pessoa ativa com este CPF."
          : error.message || "Erro ao atualizar pessoa";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json(
        { error: "Pessoa não encontrada para atualização" },
        { status: 404 }
      );
    }

    const pessoaAtualizada = await carregarPessoaComNomes(id);

    try {
      const usuarioNome = await resolverNomeDoUsuario(updatedBy);
      await logAuditoria({
        usuario_id: updatedBy,
        usuario_nome: usuarioNome,
        entidade: "pessoa",
        entidade_id: Number(id),
        acao: "UPDATE",
        descricao: `Atualizou pessoa #${id} - ${pessoaAtualizada?.nome ?? data.nome ?? "sem nome"}`,
        dados_anteriores: antigaPessoa ?? null,
        dados_novos: pessoaAtualizada ?? data,
      });
    } catch (e) {
      console.error("[auditoria] falha ao registrar log de atualização de pessoa:", e);
    }

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
