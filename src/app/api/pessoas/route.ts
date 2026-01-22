// src/app/api/pessoas/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/api-auth";
import { logAuditoria, resolverNomeDoUsuario } from "@/lib/auditoriaLog";
import { normalizeCpf, validateCpf } from "@/lib/validators/cpf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorJson(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

const PessoaUpsertSchema = z
  .object({
    nome: z.string().min(2),
    nome_social: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
    telefone: z.string().optional().nullable(),
    telefone_secundario: z.string().optional().nullable(),
    nascimento: z.string().optional().nullable(),
    genero: z.string().optional().nullable(),
    estado_civil: z.string().optional().nullable(),
    nacionalidade: z.string().optional().nullable(),
    naturalidade: z.string().optional().nullable(),
    cpf: z.string().optional().nullable(),
    cnpj: z.string().optional().nullable(),
    tipo_pessoa: z.string().optional().nullable(),
    observacoes: z.string().optional().nullable(),
    ativo: z.boolean().optional(),
  })
  .passthrough();

function sanitizeCpfForDb(cpfRaw: string | null | undefined): string | null {
  const cleaned = normalizeCpf(cpfRaw ?? "");
  return cleaned.length === 0 ? null : cleaned;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const search = (url.searchParams.get("search") ?? "").trim();
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const { supabase } = auth;

    if (search) {
      const like = `%${search}%`;
      const { data, error } = await supabase
        .from("pessoas")
        .select("id,nome,email,telefone,cpf,ativo")
        .or(
          `nome.ilike.${like},nome_social.ilike.${like},cpf.ilike.${like},email.ilike.${like},telefone.ilike.${like}`,
        )
        .limit(20)
        .order("nome", { ascending: true });

      if (error) {
        console.error("GET /api/pessoas search erro:", error);
        return errorJson(500, { error: "Erro ao buscar pessoas." });
      }

      return NextResponse.json({ pessoas: data ?? [] });
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

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const { supabase, userId } = auth;

    const body = await request.json().catch(() => null);
    const parsed = PessoaUpsertSchema.safeParse(body);
    if (!parsed.success) {
      return errorJson(400, { error: "PAYLOAD_INVALIDO", issues: parsed.error.issues });
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
    } = parsed.data;

    const createdBy = userId;
    const updatedBy = createdBy;
    const onlyDigits = (v: string) => (v || "").replace(/\D/g, "");
    const cpfValue = sanitizeCpfForDb(cpf);
    const cnpjValue = cnpj && (cnpj as string).trim() !== "" ? onlyDigits(cnpj as string) : null;

    if (cpfValue) {
      const v = validateCpf(cpfValue);
      if (!v.ok) {
        return errorJson(400, { error: "CPF_INVALIDO", reason: v.reason });
      }
    }

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
      userId: userId,
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




