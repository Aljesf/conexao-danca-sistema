import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServerSSR";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET: lista alunos
 * Obs.: aqui estou assumindo que ainda existe a view `vw_alunos`.
 * Quando migrarmos tudo para `pessoas` + `pessoas_roles`, podemos
 * refatorar este GET para buscar direto nessas tabelas.
 */
export async function GET() {
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from("vw_alunos")
    .select("*")
    .order("id", { ascending: true })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

/**
 * POST: cria PESSOA e vincula o papel ALUNO
 *
 * Novo fluxo:
 * 1) Insere na tabela `pessoas`
 * 2) Cria vínculo na tabela `pessoas_roles` com tipo_role = "ALUNO"
 * 3) Retorna o objeto no formato que a tela espera
 */
export async function POST(req: Request) {
  const supabase = await getSupabaseServer();
  const body = await req.json();

  // 1) cria a pessoa na tabela `pessoas`
  // Assumindo estrutura atual: id, user_id, nome, email, telefone, nascimento
  const { data: pessoa, error: e1 } = await supabase
    .from("pessoas")
    .insert([
      {
        nome: body.nome,
        email: body.email ?? null,
        telefone: body.telefone ?? null,
        nascimento: body.data_nascimento ?? null,
      },
    ])
    .select("id, nome, email, telefone, nascimento")
    .single();

  if (e1 || !pessoa) {
    return NextResponse.json(
      { error: e1?.message ?? "Erro ao criar pessoa" },
      { status: 500 }
    );
  }

  // 2) vincula o papel ALUNO em `pessoas_roles`
  // Assumindo colunas: pessoa_id (FK para pessoas.id) e tipo_role (text)
  const { error: e2 } = await supabase
    .from("pessoas_roles")
    .insert([{ pessoa_id: pessoa.id, tipo_role: "ALUNO" }]);

  if (e2) {
    // rollback simples: remove a pessoa recém-criada
    await supabase.from("pessoas").delete().eq("id", pessoa.id);

    return NextResponse.json(
      { error: e2.message ?? "Erro ao vincular papel ALUNO" },
      { status: 500 }
    );
  }

  // 3) mapeia para o shape que a tela espera
  const aluno = {
    id: pessoa.id,
    nome: pessoa.nome,
    email: pessoa.email,
    telefone: pessoa.telefone,
    data_nascimento: pessoa.nascimento,
    // campos ainda não existentes na tabela, mas que podem ser úteis
    // para manter compatibilidade com a tela (ajuste conforme evoluir o schema)
    ativo: true,
    created_at: null,
  };

  return NextResponse.json({ data: aluno }, { status: 201 });
}