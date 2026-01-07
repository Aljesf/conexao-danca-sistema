import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = {
  params: Promise<{ id?: string }>;
};

function normalizeUf(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toUpperCase().slice(0, 2);
}

function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function asNumberId(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export async function GET(_req: Request, ctx: RouteParams) {
  try {
    const { id } = await ctx.params;
    const pessoaId = asNumberId(id);
    if (!pessoaId) {
      return NextResponse.json({ error: "id_invalido" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: pessoa, error: pessoaError } = await supabase
      .from("pessoas")
      .select("endereco_id")
      .eq("id", pessoaId)
      .maybeSingle();

    if (pessoaError) {
      return NextResponse.json({ error: pessoaError.message }, { status: 400 });
    }

    if (!pessoa) {
      return NextResponse.json({ error: "pessoa_nao_encontrada" }, { status: 404 });
    }

    const enderecoId = (pessoa as { endereco_id?: number | null }).endereco_id ?? null;
    if (!enderecoId) {
      return NextResponse.json({ ok: true, endereco: null, cidade: null, bairro: null });
    }

    const { data: endereco, error: enderecoError } = await supabase
      .from("enderecos")
      .select("id,logradouro,numero,complemento,bairro,cidade,uf,cep,referencia,cidade_id,bairro_id")
      .eq("id", enderecoId)
      .maybeSingle();

    if (enderecoError) {
      return NextResponse.json({ error: enderecoError.message }, { status: 400 });
    }

    if (!endereco) {
      return NextResponse.json({ ok: true, endereco: null, cidade: null, bairro: null });
    }

    const cidadeId = asNumberId((endereco as { cidade_id?: number | null }).cidade_id ?? null);
    const bairroId = asNumberId((endereco as { bairro_id?: number | null }).bairro_id ?? null);

    let cidade: { id: number; nome: string; uf: string } | null = null;
    if (cidadeId) {
      const { data: cidadeRow, error: cidadeError } = await supabase
        .from("enderecos_cidades")
        .select("id,nome,uf")
        .eq("id", cidadeId)
        .maybeSingle();
      if (cidadeError) return NextResponse.json({ error: cidadeError.message }, { status: 400 });
      cidade = (cidadeRow as { id: number; nome: string; uf: string } | null) ?? null;
    }

    let bairro: { id: number; nome: string; cidade_id: number } | null = null;
    if (bairroId) {
      let bairroQuery = supabase
        .from("enderecos_bairros")
        .select("id,nome,cidade_id")
        .eq("id", bairroId);
      if (cidadeId) bairroQuery = bairroQuery.eq("cidade_id", cidadeId);
      const { data: bairroRow, error: bairroError } = await bairroQuery.maybeSingle();
      if (bairroError) return NextResponse.json({ error: bairroError.message }, { status: 400 });
      bairro = (bairroRow as { id: number; nome: string; cidade_id: number } | null) ?? null;
    }

    return NextResponse.json({ ok: true, endereco, cidade, bairro });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro_inesperado";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PUT(req: Request, ctx: RouteParams) {
  try {
    const { id } = await ctx.params;
    const pessoaId = Number(id);
    if (!Number.isFinite(pessoaId) || pessoaId <= 0) {
      return NextResponse.json({ error: "id_invalido" }, { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: "body_required" }, { status: 400 });
    }

    const logradouro = normalizeText(body.logradouro);
    const cidadeId = asNumberId(body.cidade_id);
    const bairroId = asNumberId(body.bairro_id);

    if (!logradouro) {
      return NextResponse.json({ error: "logradouro_obrigatorio" }, { status: 400 });
    }

    if (!cidadeId) {
      return NextResponse.json({ error: "cidade_id_invalido" }, { status: 400 });
    }

    if (!bairroId) {
      return NextResponse.json({ error: "bairro_id_invalido" }, { status: 400 });
    }

    const numero = normalizeText(body.numero) || null;
    const complemento = normalizeText(body.complemento) || null;
    const cep = onlyDigits(normalizeText(body.cep)) || null;
    const referencia = normalizeText(body.referencia) || null;

    const supabase = await createClient();
    const { data: cidadeRow, error: cidadeError } = await supabase
      .from("enderecos_cidades")
      .select("id,nome,uf")
      .eq("id", cidadeId)
      .maybeSingle();

    if (cidadeError) {
      return NextResponse.json({ error: cidadeError.message }, { status: 400 });
    }

    if (!cidadeRow) {
      return NextResponse.json({ error: "cidade_nao_encontrada" }, { status: 404 });
    }

    const { data: bairroRow, error: bairroError } = await supabase
      .from("enderecos_bairros")
      .select("id,nome,cidade_id")
      .eq("id", bairroId)
      .eq("cidade_id", cidadeId)
      .maybeSingle();

    if (bairroError) {
      return NextResponse.json({ error: bairroError.message }, { status: 400 });
    }

    if (!bairroRow) {
      return NextResponse.json({ error: "bairro_nao_encontrado" }, { status: 404 });
    }

    const cidadeNome = String((cidadeRow as { nome?: string }).nome ?? "").trim();
    const bairroNome = String((bairroRow as { nome?: string }).nome ?? "").trim();
    const uf = normalizeUf((cidadeRow as { uf?: string }).uf ?? body.uf) || "PA";
    const { data: pessoa, error: pessoaError } = await supabase
      .from("pessoas")
      .select("endereco_id")
      .eq("id", pessoaId)
      .maybeSingle();

    if (pessoaError) {
      return NextResponse.json({ error: pessoaError.message }, { status: 400 });
    }

    if (!pessoa) {
      return NextResponse.json({ error: "pessoa_nao_encontrada" }, { status: 404 });
    }

    let enderecoId = (pessoa as { endereco_id?: number | null }).endereco_id ?? null;
    const enderecoPayload = {
      logradouro,
      numero,
      complemento,
      bairro: bairroNome || null,
      cidade: cidadeNome || null,
      uf,
      cep,
      referencia,
      cidade_id: cidadeId,
      bairro_id: bairroId,
      updated_at: new Date().toISOString(),
    };

    if (enderecoId) {
      const { error: enderecoError } = await supabase
        .from("enderecos")
        .update(enderecoPayload)
        .eq("id", enderecoId);

      if (enderecoError) {
        return NextResponse.json({ error: enderecoError.message }, { status: 400 });
      }
    } else {
      const { data: enderecoCriado, error: enderecoError } = await supabase
        .from("enderecos")
        .insert(enderecoPayload)
        .select("id")
        .maybeSingle();

      if (enderecoError) {
        return NextResponse.json({ error: enderecoError.message }, { status: 400 });
      }

      enderecoId = enderecoCriado?.id ?? null;
    }

    const enderecoJson = {
      logradouro,
      numero,
      complemento,
      bairro: bairroNome || null,
      cidade: cidadeNome || null,
      uf,
      cep,
      referencia,
      cidade_id: cidadeId,
      bairro_id: bairroId,
    };

    const { error: pessoaUpdateError } = await supabase
      .from("pessoas")
      .update({ endereco_id: enderecoId, endereco: enderecoJson, updated_at: new Date().toISOString() })
      .eq("id", pessoaId);

    if (pessoaUpdateError) {
      return NextResponse.json({ error: pessoaUpdateError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, endereco_id: enderecoId, endereco: enderecoJson });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro_inesperado";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
