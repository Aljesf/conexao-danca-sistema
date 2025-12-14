// src/app/api/pessoas/route.ts
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getCookieStore } from "@/lib/nextCookies";
import { logAuditoria, resolverNomeDoUsuario } from "@/lib/auditoriaLog";
import type { Pessoa } from "@/types/pessoas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorJson(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

export async function GET() {
  try {
    const cookieStore = await getCookieStore();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorJson(401, { error: "Usuario nao autenticado." });
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
      return errorJson(500, { error: "Erro ao listar pessoas." });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error("GET /api/pessoas crash:", err);
    return errorJson(500, { error: "Erro interno ao listar pessoas." });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await getCookieStore();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const body = await req.json().catch(() => null);
    if (!body || !body.nome) {
      return errorJson(400, { error: "Dados invalidos: nome e obrigatorio." });
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
      cnpj,
      tipo_pessoa,
      observacoes,
      ativo,
    } = body as Partial<Pessoa>;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user?.id) {
      return errorJson(401, { error: "Usuario nao autenticado." });
    }

    const createdBy = user.id;
    const updatedBy = createdBy;
    const onlyDigits = (v: string) => (v || "").replace(/\D/g, "");
    const cpfValue = cpf && (cpf as string).trim() !== "" ? onlyDigits(cpf as string) : null;
    const cnpjValue = cnpj && (cnpj as any).trim ? onlyDigits(cnpj as any) : null;

    if (cpfValue) {
      const { data: pessoaCpf } = await supabase
        .from("pessoas")
        .select("id, nome")
        .eq("cpf", cpfValue)
        .maybeSingle();
      if (pessoaCpf?.id) {
        return errorJson(400, {
          error: "cpf_duplicado",
          details: `CPF ja cadastrado para a pessoa ID ${pessoaCpf.id} (${pessoaCpf.nome}).`,
        });
      }
    }

    if (cnpjValue) {
      const { data: pessoaCnpj } = await supabase
        .from("pessoas")
        .select("id, nome")
        .eq("cnpj", cnpjValue)
        .maybeSingle();
      if (pessoaCnpj?.id) {
        return errorJson(400, {
          error: "cnpj_duplicado",
          details: `CNPJ ja cadastrado para a pessoa ID ${pessoaCnpj.id} (${pessoaCnpj.nome}).`,
        });
      }
    }

    const payload = {
      nome,
      nome_social: nome_social || null,
      email: email || null,
      telefone: telefone || null,
      telefone_secundario: telefone_secundario || null,
      nascimento: nascimento || null,
      genero: genero || "NAO_INFORMADO",
      estado_civil: estado_civil || null,
      nacionalidade: nacionalidade || null,
      naturalidade: naturalidade || null,
      cpf: cpfValue,
      cnpj: cnpjValue,
      tipo_pessoa: tipo_pessoa || "FISICA",
      observacoes: observacoes || null,
      ativo: ativo ?? true,
      created_by: createdBy,
      updated_by: updatedBy,
    };

    const { data, error } = await supabase
      .from("pessoas")
      .insert(payload)
      .select(
        `
        id,
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
        tipo_pessoa,
        ativo
      `
      )
      .single();

    if (error) {
      console.error("POST /api/pessoas erro:", error);
      return errorJson(500, { error: "Erro ao criar pessoa." });
    }

    await logAuditoria({
      supabase,
      userId: user.id,
      acao: "CRIAR_PESSOA",
      tabela: "pessoas",
      referencia: (data as any).id,
      descricao: `Criou pessoa ${(data as any).nome}`,
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/pessoas crash:", err);
    return errorJson(500, { error: "Erro interno ao criar pessoa." });
  }
}
