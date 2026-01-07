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
    const bairro = normalizeText(body.bairro);
    const cidade = normalizeText(body.cidade);
    const uf = normalizeUf(body.uf);

    if (!logradouro || !bairro || !cidade || !uf) {
      return NextResponse.json(
        { error: "endereco_incompleto", details: "logradouro, bairro, cidade e UF sao obrigatorios." },
        { status: 400 },
      );
    }

    const numero = normalizeText(body.numero) || null;
    const complemento = normalizeText(body.complemento) || null;
    const cep = onlyDigits(normalizeText(body.cep)) || null;
    const referencia = normalizeText(body.referencia) || null;

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

    let enderecoId = (pessoa as { endereco_id?: number | null }).endereco_id ?? null;
    const enderecoPayload = {
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      cep,
      referencia,
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
      bairro,
      cidade,
      uf,
      cep,
      referencia,
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
