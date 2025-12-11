// app/api/usuarios/create-from-pessoa/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service Role – apenas no servidor
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { pessoaId, email, senha, roles } = body as {
      pessoaId: number;
      email: string;
      senha: string;
      roles?: string[]; // IDs da tabela roles_sistema
    };

    // ---------------------------
    // Validações básicas
    // ---------------------------
    if (!pessoaId || !email || !senha) {
      return NextResponse.json(
        { error: "pessoaId, email e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const rolesArray = Array.isArray(roles) ? roles : [];

    // ---------------------------
    // 1) Confere se a pessoa existe
    // ---------------------------
    const { data: pessoa, error: pessoaError } = await supabaseAdmin
      .from("pessoas")
      .select("id, nome, email")
      .eq("id", pessoaId)
      .single();

    if (pessoaError || !pessoa) {
      return NextResponse.json(
        { error: "Pessoa não encontrada." },
        { status: 404 }
      );
    }

    // ---------------------------
    // 2) Se houver papéis, busca no banco
    //    para saber se algum é ADMIN
    // ---------------------------
    let hasAdminRole = false;

    if (rolesArray.length > 0) {
      const { data: rolesDb, error: rolesDbError } = await supabaseAdmin
        .from("roles_sistema")
        .select("id, codigo")
        .in("id", rolesArray);

      if (rolesDbError) {
        return NextResponse.json(
          {
            error: "Erro ao buscar papéis no banco.",
            details: rolesDbError,
          },
          { status: 500 }
        );
      }

      hasAdminRole = !!rolesDb?.some((r) => r.codigo === "ADMIN");
    }

    // ---------------------------
    // 3) Cria o usuário no Auth
    // ---------------------------
    const { data: userData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
      });

    if (authError || !userData?.user) {
      return NextResponse.json(
        {
          error: "Erro ao criar usuário no Auth.",
          details: authError,
        },
        { status: 500 }
      );
    }

    const userId = userData.user.id;

    // ---------------------------
    // 4) Cria o profile vinculado à pessoa
    //    is_admin = true se tiver papel ADMIN
    // ---------------------------
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        user_id: userId,
        full_name: pessoa.nome,
        pessoa_id: pessoa.id,
        is_admin: hasAdminRole,
      });

    if (profileError) {
      // Se quiser, aqui poderia remover o usuário do Auth (rollback)
      return NextResponse.json(
        {
          error: "Erro ao criar profile.",
          details: profileError,
        },
        { status: 500 }
      );
    }

    // ---------------------------
    // 5) Cria vínculos em usuario_roles
    // ---------------------------
    if (rolesArray.length > 0) {
      const rowsToInsert = rolesArray.map((roleId) => ({
        user_id: userId,
        // ATENÇÃO: ajuste o nome da coluna se for diferente
        role_id: roleId, // se sua coluna se chamar roles_sistema_id, troque aqui
      }));

      const { error: usuarioRolesError } = await supabaseAdmin
        .from("usuario_roles")
        .insert(rowsToInsert);

      if (usuarioRolesError) {
        return NextResponse.json(
          {
            error: "Usuário criado, mas houve erro ao gravar papéis.",
            details: usuarioRolesError,
          },
          { status: 500 }
        );
      }
    }

    // (Opcional futuramente) 6) Registrar auditoria aqui

    return NextResponse.json(
      {
        message: "Usuário criado e vinculado à pessoa com sucesso.",
        user_id: userId,
        pessoa_id: pessoa.id,
        roles_aplicados: rolesArray,
        is_admin: hasAdminRole,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: "Erro inesperado ao criar usuário.", details: err?.message },
      { status: 500 }
    );
  }
}
