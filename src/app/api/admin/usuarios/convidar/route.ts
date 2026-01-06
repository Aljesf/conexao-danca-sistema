import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

type ConvidarUsuarioPayload = {
  pessoa_id: number;
  email: string;
  roles_ids?: string[];
  roles_codigos?: string[];
  rolesCodigos?: string[];
  is_admin?: boolean;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());
}

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`ENV ausente no servidor: ${name}`);
  return v;
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("ENV ausente no servidor: SUPABASE_URL");
  const serviceKey = mustGetEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("user_id, is_admin")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (profErr || !profile?.is_admin) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const body = (await req.json()) as Partial<ConvidarUsuarioPayload>;
    const pessoa_id = Number(body.pessoa_id);
    const email = String(body.email ?? "").trim().toLowerCase();
    const roles_ids = Array.isArray(body.roles_ids) ? body.roles_ids : [];
    const roles_codigos = Array.isArray(body.rolesCodigos)
      ? body.rolesCodigos
      : Array.isArray(body.roles_codigos)
        ? body.roles_codigos
        : [];
    const rolesIdsValid = roles_ids.filter((roleId) => typeof roleId === "string" && roleId.trim().length > 0);
    const rolesCodigosValid = roles_codigos.filter(
      (roleCodigo) => typeof roleCodigo === "string" && roleCodigo.trim().length > 0,
    );
    const is_admin = Boolean(body.is_admin);

    if (!Number.isFinite(pessoa_id) || pessoa_id <= 0) {
      return NextResponse.json({ ok: false, error: "pessoa_id_invalido" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ ok: false, error: "email_invalido" }, { status: 400 });
    }
    if (rolesIdsValid.length === 0 && rolesCodigosValid.length === 0) {
      return NextResponse.json({ ok: false, error: "roles_obrigatorias" }, { status: 400 });
    }

    let admin: ReturnType<typeof createClient>;
    try {
      admin = getSupabaseAdmin();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "env_incompleta";
      return NextResponse.json(
        { ok: false, error: "env_incompleta", details: msg },
        { status: 500 },
      );
    }

    const { data: pessoa, error: pessoaErr } = await admin
      .from("pessoas")
      .select("id, nome")
      .eq("id", pessoa_id)
      .maybeSingle();

    if (pessoaErr || !pessoa) {
      return NextResponse.json({ ok: false, error: "pessoa_nao_encontrada" }, { status: 404 });
    }

    const fallbackSiteUrl =
      process.env.NODE_ENV === "production"
        ? process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000"
        : "http://localhost:3000";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? fallbackSiteUrl;
    const redirectTo = `${siteUrl}/auth/definir-senha`;

    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { origem: "admin_usuarios", pessoa_id },
    });

    if (inviteErr) {
      console.error("[INVITE] supabase invite error:", {
        message: inviteErr.message,
        name: (inviteErr as { name?: string } | null)?.name,
        status: (inviteErr as { status?: number } | null)?.status,
        code: (inviteErr as { code?: string } | null)?.code,
      });
      return NextResponse.json(
        { ok: false, code: "invite_failed", error: inviteErr.message },
        { status: 400 },
      );
    }

    if (!invited?.user) {
      return NextResponse.json(
        { ok: false, code: "invite_failed", error: "invite sem user.id" },
        { status: 400 },
      );
    }

    const newUserId = invited.user.id;

    const { error: upsertErr } = await admin.from("profiles").upsert(
      {
        user_id: newUserId,
        full_name: pessoa.nome,
        is_admin,
        pessoa_id,
      },
      { onConflict: "user_id" }
    );

    if (upsertErr) {
      console.error("[INVITE] profile upsert error:", upsertErr);
      return NextResponse.json(
        { ok: false, error: "profile_upsert_failed", details: upsertErr.message },
        { status: 500 },
      );
    }

    const { error: clearRolesErr } = await admin.from("usuario_roles").delete().eq("user_id", newUserId);
    if (clearRolesErr) {
      console.error("[INVITE] usuario_roles clear error:", clearRolesErr);
      return NextResponse.json(
        { ok: false, error: "usuario_roles_failed", details: clearRolesErr.message },
        { status: 500 },
      );
    }

    if (rolesCodigosValid.length > 0) {
      for (const roleCodigo of rolesCodigosValid) {
        const { error: roleErr } = await admin.rpc("assign_role_to_user", {
          p_user_id: newUserId,
          p_role_codigo: roleCodigo,
        });
        if (roleErr) {
          console.error("[INVITE] role assign error:", roleErr);
          return NextResponse.json(
            { ok: false, error: "role_failed", details: roleErr.message },
            { status: 400 },
          );
        }
      }
    } else {
      const rolesToInsert = rolesIdsValid.map((role_id) => ({
        user_id: newUserId,
        role_id,
      }));

      const { error: rolesErr } = await admin.from("usuario_roles").insert(rolesToInsert);

      if (rolesErr) {
        console.error("[INVITE] usuario_roles insert error:", rolesErr);
        return NextResponse.json(
          { ok: false, error: "usuario_roles_failed", details: rolesErr.message },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      ok: true,
      user: { id: newUserId, email },
      pessoa: { id: pessoa.id, nome: pessoa.nome },
      invite: { sent: true, redirectTo },
    });
  } catch (e: unknown) {
    console.error("[INVITE] handler error:", e);
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ ok: false, error: "internal_error", details: msg }, { status: 500 });
  }
}
