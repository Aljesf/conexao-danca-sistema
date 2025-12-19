import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

type ConvidarUsuarioPayload = {
  pessoa_id: number;
  email: string;
  roles_ids: string[];
  is_admin?: boolean;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());
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
    const is_admin = Boolean(body.is_admin);

    if (!Number.isFinite(pessoa_id) || pessoa_id <= 0) {
      return NextResponse.json({ ok: false, error: "pessoa_id_invalido" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ ok: false, error: "email_invalido" }, { status: 400 });
    }
    if (roles_ids.length === 0) {
      return NextResponse.json({ ok: false, error: "roles_obrigatorias" }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return NextResponse.json(
        { ok: false, error: "env_incompleta", details: "SUPABASE_SERVICE_ROLE_KEY ausente" },
        { status: 500 }
      );
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: pessoa, error: pessoaErr } = await admin
      .from("pessoas")
      .select("id, nome")
      .eq("id", pessoa_id)
      .maybeSingle();

    if (pessoaErr || !pessoa) {
      return NextResponse.json({ ok: false, error: "pessoa_nao_encontrada" }, { status: 404 });
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const redirectTo = `${siteUrl}/auth/definir-senha`;

    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { origem: "admin_usuarios", pessoa_id },
    });

    if (inviteErr || !invited?.user) {
      return NextResponse.json(
        { ok: false, error: "invite_failed", details: inviteErr?.message ?? null },
        { status: 400 }
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
      return NextResponse.json(
        { ok: false, error: "profile_upsert_failed", details: upsertErr.message },
        { status: 500 }
      );
    }

    await admin.from("usuario_roles").delete().eq("user_id", newUserId);

    const rolesToInsert = roles_ids.map((role_id) => ({
      user_id: newUserId,
      role_id,
    }));

    const { error: rolesErr } = await admin.from("usuario_roles").insert(rolesToInsert);

    if (rolesErr) {
      return NextResponse.json(
        { ok: false, error: "usuario_roles_failed", details: rolesErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      user: { id: newUserId, email },
      pessoa: { id: pessoa.id, nome: pessoa.nome },
      invite: { sent: true, redirectTo },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ ok: false, error: "internal_error", details: msg }, { status: 500 });
  }
}
