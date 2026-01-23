import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { requireUser } from "@/lib/supabase/api-auth";

function getServiceRoleKey(): string | null {
  // Aceita variacoes comuns
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE ?? null;
}

export async function GET(request: NextRequest) {
  try {
    // 1) Autenticacao padrao (cookie -> user)
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const { supabase, userId } = auth;

    // 2) RBAC: exige admin
    const { data: isAdmin, error: adminErr } = await supabase.rpc("is_admin", {
      uid: userId,
    });

    if (adminErr) {
      return NextResponse.json(
        { error: "admin_check_failed", message: adminErr.message },
        { status: 500 }
      );
    }

    if (!isAdmin) {
      return NextResponse.json(
        { error: "forbidden", message: "Acesso negado (admin obrigatorio)." },
        { status: 403 }
      );
    }

    // 3) Parametros
    const { searchParams } = new URL(request.url);
    const limitRaw = searchParams.get("limit");
    const offsetRaw = searchParams.get("offset");

    const limit = Math.min(Math.max(Number(limitRaw ?? 50) || 50, 1), 200);
    const offset = Math.max(Number(offsetRaw ?? 0) || 0, 0);

    // 4) Service role obrigatorio para listar usuarios no Auth Admin
    const serviceRoleKey = getServiceRoleKey();
    if (!serviceRoleKey) {
      return NextResponse.json(
        {
          error: "missing_service_role",
          message:
            "Variavel SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_SERVICE_ROLE) nao configurada no servidor.",
        },
        { status: 500 }
      );
    }

    // 5) Admin client (sem cookies; operacao server-side)
    const adminClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        cookies: {
          getAll() {
            return [];
          },
          setAll() {
            // no-op
          },
        },
      }
    );

    // 6) Listagem via Auth Admin API
    const { data, error } = await adminClient.auth.admin.listUsers({
      page: Math.floor(offset / limit) + 1,
      perPage: limit,
    });

    if (error) {
      return NextResponse.json(
        { error: "list_users_failed", message: error.message },
        { status: 500 }
      );
    }

    const rawUsers = data.users ?? [];

    // Buscar vinculos em lote
    const userIds = rawUsers.map((u) => u.id).filter(Boolean);
    const vinculos: Array<{
      user_id: string;
      pessoa_id: string | number | null;
      pessoas?: { id: string | number; nome: string | null; email: string | null; cpf: string | null } | null;
    }> = [];

    if (userIds.length > 0) {
      const { data: vincData, error: vincErr } = await supabase
        .from("usuario_pessoa_vinculos")
        .select("user_id,pessoa_id,pessoas:public.pessoas(id,nome,email,cpf)")
        .in("user_id", userIds);

      if (vincErr) {
        console.error("[api/admin/usuarios] vinculos error:", vincErr);
      } else {
        vinculos.push(...((vincData ?? []) as typeof vinculos));
      }
    }

    const vincMap = new Map<
      string,
      {
        pessoa_id: string | number | null;
        pessoa: { id: string | number; nome: string | null; email: string | null; cpf: string | null } | null;
      }
    >();

    vinculos.forEach((v) => {
      vincMap.set(String(v.user_id), {
        pessoa_id: v.pessoa_id ?? null,
        pessoa: v.pessoas ?? null,
      });
    });

    const users = rawUsers.map((u) => {
      const link = vincMap.get(u.id) ?? null;
      const pessoa = link?.pessoa ?? null;

      return {
        // Compatibilidade com a UI:
        id: u.id,
        uid: u.id,
        user_id: u.id,

        email: u.email ?? null,
        phone: (u.phone ?? null) as string | null,
        created_at: u.created_at ?? null,
        last_sign_in_at: u.last_sign_in_at ?? null,

        // Vinculo com pessoa (se existir)
        pessoaId: link?.pessoa_id ?? null,
        pessoa_id: link?.pessoa_id ?? null,
        pessoa,
        nome: pessoa?.nome ?? null,
      };
    });

    return NextResponse.json(
      {
        // PADRAO ESPERADO PELO FRONT:
        users,
        // Alias opcional (nao faz mal e aumenta compatibilidade)
        usuarios: users,
        meta: {
          page: Math.floor(offset / limit) + 1,
          perPage: limit,
          // o SDK nem sempre traz total; deixe opcional
          total: (data as unknown as { total?: number })?.total ?? null,
        },
      },
      { status: 200 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: "internal_error", message: msg }, { status: 500 });
  }
}
