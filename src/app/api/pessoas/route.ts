// src/app/api/pessoas/route.ts
import { NextResponse } from "next/server";
import { getSupabaseRoute } from "@/lib/supabaseRoute";
import type { Pessoa } from "@/types/pessoa";

/**
 * GET /api/pessoas
 * Lista todas as pessoas cadastradas.
 */
export async function GET() {
  const supabase = getSupabaseRoute();

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
      { error: "Dados inválidos: nome é obrigatório." },
      { status: 400 }
    );
  }

  const {
    nome,
    email,
    telefone,
    nascimento,
    cpf,
    tipo_pessoa,
    observacoes,
    ativo,
  } = body as Partial<Pessoa>;

  // Se quiser já salvar quem criou, podemos pegar o user aqui também:
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const createdBy = user?.id ?? null;

  const { data, error } = await supabase
    .from("pessoas")
    .insert({
      nome,
      email: email ?? null,
      telefone: telefone ?? null,
      nascimento: nascimento ?? null,
      cpf: cpf ?? null,
      tipo_pessoa: tipo_pessoa ?? "FISICA",
      observacoes: observacoes ?? null,
      ativo: ativo ?? true,
      created_by: createdBy,
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
    console.error("POST /api/pessoas erro:", error);
    return NextResponse.json(
      { error: "Erro ao criar pessoa." },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
