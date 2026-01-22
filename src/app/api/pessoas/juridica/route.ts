import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { normalizeCnpj, validateCnpj } from "@/lib/validators/cnpj";

type Body = {
  razao_social: string;
  nome_fantasia?: string | null;
  cnpj: string;
  inscricao_estadual?: string | null;
  email?: string | null;
  telefone?: string | null;
  telefone_secundario?: string | null;
  observacoes?: string | null;
};

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const { supabase, userId } = auth;

    const body = (await request.json().catch(() => null)) as Body | null;
    if (!body) {
      return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
    }

    const razaoSocial = String(body.razao_social ?? "").trim();
    const cnpjUi = String(body.cnpj ?? "").trim();

    if (!razaoSocial) {
      return NextResponse.json({ error: "Razao social e obrigatoria." }, { status: 400 });
    }

    const cnpj = normalizeCnpj(cnpjUi);
    const v = validateCnpj(cnpj);
    if (!v.ok) {
      return NextResponse.json({ error: `CNPJ invalido (${v.reason}).` }, { status: 400 });
    }

    const { data: existing, error: existingErr } = await supabase
      .from("pessoas")
      .select("id")
      .eq("cnpj", cnpj)
      .maybeSingle();

    if (existingErr) {
      return NextResponse.json({ error: existingErr.message }, { status: 500 });
    }
    if (existing?.id) {
      return NextResponse.json(
        { error: "Ja existe uma pessoa juridica com esse CNPJ.", pessoa_id: existing.id },
        { status: 409 },
      );
    }

    const nomeFantasia = body.nome_fantasia ? String(body.nome_fantasia).trim() : null;
    const inscricaoEstadual = body.inscricao_estadual ? String(body.inscricao_estadual).trim() : null;
    const email = body.email ? String(body.email).trim() : null;
    const telefone = body.telefone ? String(body.telefone).trim() : null;
    const telefoneSecundario = body.telefone_secundario ? String(body.telefone_secundario).trim() : null;
    const observacoes = body.observacoes ? String(body.observacoes).trim() : null;

    const { data: created, error } = await supabase
      .from("pessoas")
      .insert({
        nome: nomeFantasia || razaoSocial,
        tipo_pessoa: "JURIDICA",
        razao_social: razaoSocial,
        nome_fantasia: nomeFantasia,
        cnpj,
        inscricao_estadual: inscricaoEstadual,
        email,
        telefone,
        telefone_secundario: telefoneSecundario,
        observacoes,
        ativo: true,
        created_by: userId,
        updated_by: userId,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro inesperado ao criar PJ.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
