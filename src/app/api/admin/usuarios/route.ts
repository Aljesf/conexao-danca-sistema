import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assertAdmin";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { guardApiByRole } from "@/lib/auth/roleGuard";

export async function GET(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  try {
    const supabase = await getSupabaseServer();
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json({ ok: false, code: "NAO_AUTENTICADO" }, { status: 401 });
    }

    const userId = userData.user.id;

    const { data: adminRowsRaw, error: adminErr } = await supabase
      .from("usuario_roles")
      .select("role_id")
      .eq("user_id", userId);

    if (adminErr) {
      return NextResponse.json(
        { ok: false, code: "ERRO_VERIFICAR_ADMIN", message: adminErr.message },
        { status: 500 }
      );
    }

    const adminRows = (adminRowsRaw ?? []) as Array<{ role_id: string | null }>;
    const roleIds = adminRows.map((r) => r.role_id).filter((id): id is string => Boolean(id));

    if (roleIds.length === 0) {
      return NextResponse.json({ ok: false, code: "SEM_PERMISSAO" }, { status: 403 });
    }

    const { data: adminRoleCheck, error: adminRoleErr } = await supabase
      .from("roles_sistema")
      .select("id")
      .eq("codigo", "ADMIN")
      .in("id", roleIds)
      .limit(1);

    if (adminRoleErr) {
      return NextResponse.json(
        { ok: false, code: "ERRO_VERIFICAR_ADMIN_ROLE", message: adminRoleErr.message },
        { status: 500 }
      );
    }

    if (!adminRoleCheck || adminRoleCheck.length === 0) {
      return NextResponse.json({ ok: false, code: "SEM_PERMISSAO" }, { status: 403 });
    }

    let admin = null as ReturnType<typeof getSupabaseServiceClient> | null;
    try {
      admin = getSupabaseServiceClient();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "SERVICE_ROLE_NAO_CONFIGURADO";
      return NextResponse.json({ ok: false, code: msg }, { status: 500 });
    }

    type ProfileRow = { user_id: string; pessoa_id: number | null };
    const { data: profiles, error: profErr } = await admin.from("profiles").select("user_id, pessoa_id");

    if (profErr) {
      return NextResponse.json(
        { ok: false, code: "ERRO_LISTAR_PROFILES", message: profErr.message },
        { status: 500 }
      );
    }

    const profileRows = (profiles ?? []).filter((p): p is ProfileRow => Boolean(p?.user_id));
    const userIdsAll = Array.from(new Set(profileRows.map((p) => p.user_id)));
    const pessoaIdsAll = Array.from(
      new Set(profileRows.map((p) => p.pessoa_id).filter((v): v is number => typeof v === "number"))
    );

    type PessoaRow = { id: number; nome: string | null; email: string | null; user_id: string | null };
    const pessoasPorId = new Map<number, PessoaRow>();
    const pessoasPorUserId = new Map<string, PessoaRow>();
    let pessoasRows: PessoaRow[] = [];

    if (pessoaIdsAll.length > 0) {
      const { data: pessoas, error: pessoasErr } = await admin
        .from("pessoas")
        .select("id, nome, email, user_id")
        .in("id", pessoaIdsAll);

      if (pessoasErr) {
        return NextResponse.json(
          { ok: false, code: "ERRO_LISTAR_PESSOAS", message: pessoasErr.message },
          { status: 500 }
        );
      }

      pessoasRows = pessoasRows.concat((pessoas ?? []) as PessoaRow[]);
    }

    if (userIdsAll.length > 0) {
      const { data: pessoasByUser, error: pessoasByUserErr } = await admin
        .from("pessoas")
        .select("id, nome, email, user_id")
        .in("user_id", userIdsAll);

      if (pessoasByUserErr) {
        return NextResponse.json(
          { ok: false, code: "ERRO_LISTAR_PESSOAS_POR_USER_ID", message: pessoasByUserErr.message },
          { status: 500 }
        );
      }

      pessoasRows = pessoasRows.concat((pessoasByUser ?? []) as PessoaRow[]);
    }

    for (const p of pessoasRows) {
      const row = { id: p.id, nome: p.nome ?? null, email: p.email ?? null, user_id: p.user_id ?? null };
      if (!pessoasPorId.has(row.id)) {
        pessoasPorId.set(row.id, row);
      }
      if (row.user_id && !pessoasPorUserId.has(row.user_id)) {
        pessoasPorUserId.set(row.user_id, row);
      }
    }

    type UsuarioRoleRow = { user_id: string | null; role_id: string | null };
    const rolesPorUser = new Map<string, string[]>();
    if (userIdsAll.length > 0) {
      const { data: ur, error: urErr } = await admin
        .from("usuario_roles")
        .select("user_id, role_id")
        .in("user_id", userIdsAll);

      if (urErr) {
        return NextResponse.json(
          { ok: false, code: "ERRO_LISTAR_USUARIO_ROLES", message: urErr.message },
          { status: 500 }
        );
      }

      for (const r of (ur ?? []) as UsuarioRoleRow[]) {
        if (!r.user_id || !r.role_id) continue;
        const arr = rolesPorUser.get(r.user_id) ?? [];
        arr.push(r.role_id);
        rolesPorUser.set(r.user_id, arr);
      }
    }

    type RoleInfo = { codigo: string; nome: string };
    type RoleSistemaRow = { id: string; codigo: string; nome: string };
    const allRoleIds = Array.from(new Set(Array.from(rolesPorUser.values()).flat()));
    const rolesMap = new Map<string, RoleInfo>();
    if (allRoleIds.length > 0) {
      const { data: rs, error: rsErr } = await admin
        .from("roles_sistema")
        .select("id, codigo, nome")
        .in("id", allRoleIds);

      if (rsErr) {
        return NextResponse.json(
          { ok: false, code: "ERRO_LISTAR_ROLES_SISTEMA", message: rsErr.message },
          { status: 500 }
        );
      }

      for (const r of (rs ?? []) as RoleSistemaRow[]) {
        rolesMap.set(r.id, { codigo: r.codigo, nome: r.nome });
      }
    }

    type UsuarioRow = {
      user_id: string;
      pessoa_id: number | null;
      nome: string | null;
      email: string | null;
      is_admin: boolean;
      papeis: RoleInfo[];
    };

    const backfillPromises: Array<Promise<unknown>> = [];
    let users: UsuarioRow[] = profileRows.map((p) => {
      let pessoa = typeof p.pessoa_id === "number" ? (pessoasPorId.get(p.pessoa_id) ?? null) : null;
      if (!pessoa) {
        pessoa = pessoasPorUserId.get(p.user_id) ?? null;
        if (pessoa && (p.pessoa_id === null || typeof p.pessoa_id !== "number")) {
          backfillPromises.push(
            admin.from("profiles").update({ pessoa_id: pessoa.id }).eq("user_id", p.user_id)
          );
        }
      }
      const roleIdsUser = rolesPorUser.get(p.user_id) ?? [];
      const papeis = roleIdsUser.map((rid) => rolesMap.get(rid)).filter((x): x is RoleInfo => Boolean(x));
      const isAdmin = papeis.some((r) => r.codigo === "ADMIN");

      return {
        user_id: p.user_id,
        pessoa_id: typeof p.pessoa_id === "number" ? p.pessoa_id : null,
        nome: pessoa?.nome ?? null,
        email: pessoa?.email ?? null,
        is_admin: isAdmin,
        papeis,
      };
    });

    if (backfillPromises.length > 0) {
      await Promise.allSettled(backfillPromises);
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    if (q) {
      const qlc = q.toLowerCase();
      users = users.filter((u) => {
        const nome = (u.nome || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        return nome.includes(qlc) || email.includes(qlc);
      });
    }

    return NextResponse.json({ ok: true, users, usuarios: users, total: users.length }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERRO_INESPERADO";
    return NextResponse.json({ ok: false, code: "ERRO_INESPERADO", message: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const user_id = body?.user_id;
  const is_admin = body?.is_admin;

  if (!user_id || typeof user_id !== "string" || typeof is_admin !== "boolean") {
    return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("profiles")
    .update({ is_admin })
    .eq("user_id", user_id)
    .select("user_id, full_name, is_admin, pessoa_id")
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: "erro_update_admin", details: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: "perfil_nao_encontrado" }, { status: 404 });

  return NextResponse.json({ ok: true, profile: data });
}
