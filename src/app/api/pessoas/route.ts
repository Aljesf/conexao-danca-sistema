// src/app/api/pessoas/route.ts
import { NextResponse } from "next/server";
import { getSupabaseRoute } from "@/lib/supabaseRoute";
import { logAuditoria, resolverNomeDoUsuario } from "@/lib/auditoriaLog";
import type { Pessoa } from "@/types/pessoas";

/**
 * GET /api/pessoas
 * Lista todas as pessoas cadastradas.
 */
export async function GET() {
  const supabase = getSupabaseRoute();

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
    .from("pessoas")
    .select(
      `
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
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("GET /api/pessoas erro:", error);
    return NextResponse.json(
      { error: "Erro ao listar pessoas." },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}

/**
 * POST /api/pessoas
 * Cria uma nova pessoa.
 */
export async function POST(req: Request) {
  const supabase = getSupabaseRoute();

  const body = await req.json().catch(() => null);

  if (!body || !body.nome) {
    return NextResponse.json(
      { error: "Dados invalidos: nome e obrigatorio." },
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
    tipo_pessoa,
    observacoes,
    ativo,
  } = body as Partial<Pessoa>;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json(
      { error: "Usuário não autenticado." },
      { status: 401 }
    );
  }

  const createdBy = user.id;
  const updatedBy = createdBy;
  const cpfValue = cpf && cpf.trim() !== "" ? cpf.trim() : null;

  const { data, error } = await supabase
    .from("pessoas")
    .insert({
      nome,
      nome_social: nome_social ?? null,
      email: email ?? null,
      telefone: telefone ?? null,
      telefone_secundario: telefone_secundario ?? null,
      nascimento: nascimento ?? null,
      genero: genero ?? "NAO_INFORMADO",
      estado_civil: estado_civil ?? null,
      nacionalidade: nacionalidade ?? null,
      naturalidade: naturalidade ?? null,
      cpf: cpfValue,
      tipo_pessoa: tipo_pessoa ?? "FISICA",
      observacoes: observacoes ?? null,
      ativo: ativo ?? true,
      created_by: createdBy,
      updated_by: updatedBy,
    })
    .select(
      `
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
    `
    )
    .single();

  if (error) {
    const msg =
      error.code === "23505"
        ? "Ja existe uma pessoa ativa com este CPF."
        : "Erro ao criar pessoa.";
    console.error("POST /api/pessoas erro:", error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    const usuarioNome = await resolverNomeDoUsuario(createdBy);
    await logAuditoria({
      usuario_id: createdBy,
      usuario_nome: usuarioNome,
      entidade: "pessoa",
      entidade_id: data.id,
      acao: "CREATE",
      descricao: `Criou pessoa #${data.id} - ${data.nome ?? "sem nome"}`,
      dados_anteriores: null,
      dados_novos: data,
    });
  } catch (e) {
    console.error("[auditoria] falha ao registrar log de criação de pessoa:", e);
  }

  return NextResponse.json({ data });
}
