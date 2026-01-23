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
    const userIds = rawUsers.map((u) => u.id).filter(Boolean);

    // 1) Busca profiles por user_id
    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("user_id, full_name, is_admin, pessoa_id")
      .in("user_id", userIds);

    if (profErr) {
      console.error("[api/admin/usuarios] profiles error:", profErr);
    }

    const profMap = new Map<
      string,
      { full_name: string | null; is_admin: boolean | null; pessoa_id: number | string | null }
    >();

    (profiles ?? []).forEach((p) => {
      profMap.set(String(p.user_id), {
        full_name: p.full_name ?? null,
        is_admin: p.is_admin ?? null,
        pessoa_id: p.pessoa_id ?? null,
      });
    });

    // 2) Busca pessoas em lote (pelo id real)
    const pessoaIds = (profiles ?? [])
      .map((p) => p.pessoa_id)
      .filter((x) => x !== null && x !== undefined);

    const pessoasMap = new Map<
      string,
      { id: number | string; nome: string | null; email: string | null; cpf: string | null }
    >();

    if (pessoaIds.length > 0) {
      const { data: pessoas, error: pesErr } = await supabase
        .from("pessoas")
        .select("id, nome, email, cpf")
        .in("id", pessoaIds as Array<number | string>);

      if (pesErr) {
        console.error("[api/admin/usuarios] pessoas error:", pesErr);
      } else {
        (pessoas ?? []).forEach((pp) => {
          pessoasMap.set(String(pp.id), {
            id: pp.id,
            nome: pp.nome ?? null,
            email: pp.email ?? null,
            cpf: pp.cpf ?? null,
          });
        });
      }
    }

    const users = rawUsers.map((u) => {
      const prof = profMap.get(u.id) ?? null;
      const pessoaId = prof?.pessoa_id ?? null;
      const pessoa = pessoaId !== null ? pessoasMap.get(String(pessoaId)) ?? null : null;

      return {
        // Compatibilidade com UI
        id: u.id,
        uid: u.id,

        email: u.email ?? null,
        phone: (u.phone ?? null) as string | null,
        created_at: u.created_at ?? null,
        last_sign_in_at: u.last_sign_in_at ?? null,

        // Profile
        nome: prof?.full_name ?? null,
        admin: prof?.is_admin ?? null,
        is_admin: prof?.is_admin ?? null,

        // Vinculo real (profiles -> pessoas)
        pessoaId,
        pessoa,
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
        debug: {
          rawUsersCount: rawUsers.length,
          profilesCount: (profiles ?? []).length,
          pessoaIdsCount: pessoaIds.length,
          pessoaIdsSample: pessoaIds.slice(0, 10),
          pessoasCount: pessoasMap.size,
          pessoaKeysSample: Array.from(pessoasMap.keys()).slice(0, 10),
        },
      },
      { status: 200 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: "internal_error", message: msg }, { status: 500 });
  }
}
