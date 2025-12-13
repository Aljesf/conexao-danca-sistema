import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ApiResponse<T = any> = { ok: boolean; error?: string; data?: T };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

function json<T>(status: number, payload: ApiResponse<T>) {
  return NextResponse.json(payload, { status });
}

function onlyDigits(v?: string | null) {
  return (v ?? "").replace(/\D/g, "");
}

function normalizeUF(v?: string | null) {
  const uf = (v ?? "").trim().toUpperCase();
  return uf.length === 2 ? uf : uf.slice(0, 2);
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return json(500, {
      ok: false,
      error:
        "Configuracao do Supabase ausente. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // ignorar, usaremos objeto vazio
  }

  const {
    tipo_pessoa = "FISICA", // FISICA | JURIDICA
    nome,
    cpf,
    cnpj,
    razao_social,
    nome_fantasia,
    telefone,
    email,
    endereco, // { logradouro, numero, complemento, bairro, cidade, uf, cep, referencia }
  } = body ?? {};

  const tipo = String(tipo_pessoa || "FISICA").toUpperCase();
  if (tipo !== "FISICA" && tipo !== "JURIDICA") {
    return json(400, { ok: false, error: "tipo_pessoa invalido (FISICA/JURIDICA)." });
  }

  const nomeTrim = String(nome ?? "").trim();
  if (nomeTrim.length < 3 && tipo === "FISICA") {
    return json(400, { ok: false, error: "Nome obrigatorio (min 3 caracteres)." });
  }

  const cpfDigits = onlyDigits(cpf);
  const cnpjDigits = onlyDigits(cnpj);

  if (tipo === "FISICA" && cpfDigits && cpfDigits.length !== 11) {
    return json(400, { ok: false, error: "CPF invalido." });
  }
  if (tipo === "JURIDICA" && cnpjDigits && cnpjDigits.length !== 14) {
    return json(400, { ok: false, error: "CNPJ invalido." });
  }

  const end = endereco ?? {};
  const logradouro = String(end.logradouro ?? "").trim();
  const numero = String(end.numero ?? "").trim();
  const complemento = String(end.complemento ?? "").trim();
  const bairro = String(end.bairro ?? "").trim();
  const cidade = String(end.cidade ?? "").trim();
  const uf = normalizeUF(end.uf);
  const cep = onlyDigits(end.cep);
  const referencia = String(end.referencia ?? "").trim();
  const temEnderecoMinimo = !!(logradouro && cidade && uf);

  try {
    let endereco_id: number | null = null;

    if (temEnderecoMinimo) {
      const { data: enderecoCriado, error: errEnd } = await supabaseAdmin
        .from("enderecos")
        .insert({
          logradouro,
          numero: numero || null,
          complemento: complemento || null,
          bairro: bairro || null,
          cidade,
          uf: uf || "PA",
          cep: cep || null,
          referencia: referencia || null,
        })
        .select("id")
        .maybeSingle();

      if (errEnd) {
        console.error("[POST /api/pessoas/rapido] Erro ao criar endereco:", errEnd);
        return json(500, { ok: false, error: "Erro ao salvar endereco." });
      }

      endereco_id = enderecoCriado?.id ?? null;
    }

    const payloadPessoa: any = {
      tipo_pessoa: tipo,
      telefone: telefone ? String(telefone).trim() : null,
      email: email ? String(email).trim() : null,
      endereco_id,
      endereco: temEnderecoMinimo
        ? {
            logradouro,
            numero: numero || null,
            complemento: complemento || null,
            bairro: bairro || null,
            cidade,
            uf: uf || "PA",
            cep: cep || null,
            referencia: referencia || null,
          }
        : null,
    };

    if (tipo === "FISICA") {
      payloadPessoa.nome = nomeTrim;
      payloadPessoa.cpf = cpfDigits || null;
      payloadPessoa.cnpj = null;
      payloadPessoa.razao_social = null;
      payloadPessoa.nome_fantasia = null;
    } else {
      payloadPessoa.nome =
        nomeTrim ||
        (nome_fantasia ? String(nome_fantasia).trim() : razao_social ? String(razao_social).trim() : "Pessoa Juridica");
      payloadPessoa.cnpj = cnpjDigits || null;
      payloadPessoa.cpf = null;
      payloadPessoa.razao_social = razao_social ? String(razao_social).trim() : null;
      payloadPessoa.nome_fantasia = nome_fantasia ? String(nome_fantasia).trim() : null;
    }

    const { data: pessoa, error: errPessoa } = await supabaseAdmin
      .from("pessoas")
      .insert(payloadPessoa)
      .select("id, nome, cpf, cnpj, telefone, email, tipo_pessoa")
      .maybeSingle();

    if (errPessoa) {
      console.error("[POST /api/pessoas/rapido] Erro ao criar pessoa:", errPessoa);
      return json(500, { ok: false, error: "Erro ao cadastrar pessoa." });
    }

    return json(200, { ok: true, data: { pessoa } });
  } catch (e) {
    console.error("[POST /api/pessoas/rapido] Erro inesperado:", e);
    return json(500, { ok: false, error: "Erro inesperado ao cadastrar pessoa." });
  }
}
