import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ ok: false, error: "nao_autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("query") || "").trim();

  if (!query) {
    return NextResponse.json({ ok: true, pessoas: [] }, { status: 200 });
  }

  const ilike = "%" + query.replace(/%/g, "").replace(/_/g, "") + "%";

  const { data, error } = await supabase
    .from("pessoas")
    .select(
      `
      id,
      nome,
      nome_social,
      razao_social,
      nome_fantasia,
      email,
      telefone,
      cpf,
      cnpj,
      tipo_pessoa,
      ativo
    `
    )
    .or(
      [
        `nome.ilike.${ilike}`,
        `nome_social.ilike.${ilike}`,
        `razao_social.ilike.${ilike}`,
        `nome_fantasia.ilike.${ilike}`,
        `cpf.ilike.${ilike}`,
        `cnpj.ilike.${ilike}`,
        `email.ilike.${ilike}`,
      ].join(",")
    )
    .order("nome", { ascending: true })
    .limit(20);

  if (error) {
    console.error("erro_busca_pessoas:", error);
    return NextResponse.json({ ok: false, error: "erro_busca_pessoas" }, { status: 500 });
  }

  const pessoas =
    (data ?? []).map((p: any) => {
      const documento_principal = p.cpf ?? p.cnpj ?? null;
      return {
        id: p.id,
        nome: p.nome ?? p.nome_social ?? p.razao_social ?? p.nome_fantasia ?? null,
        nome_social: p.nome_social ?? null,
        razao_social: p.razao_social ?? null,
        nome_fantasia: p.nome_fantasia ?? null,
        email: p.email ?? null,
        telefone_principal: p.telefone ?? null,
        documento_principal,
        tipo_pessoa: p.tipo_pessoa ?? null,
        ativo: p.ativo,
      };
    }) ?? [];

  return NextResponse.json({ ok: true, pessoas }, { status: 200 });
}
