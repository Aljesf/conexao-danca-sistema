import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

const PayloadSchema = z.object({
  pessoa_id: z.union([z.number().int().positive(), z.string().min(1)]),
  email: z.string().trim().email(),
  roles_ids: z.array(z.union([z.string().min(1), z.number().int().positive()])).default([]),
  is_admin: z.boolean().optional(),
});

function parsePessoaId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string") {
    const n = Number(value.trim());
    if (Number.isInteger(n) && n > 0) return n;
  }
  return null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function errorResponse(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json({ ok: false, code, message, details }, { status });
}

export async function POST(req: Request) {
  try {
    const raw = await req.json().catch(() => null);
    const parsed = PayloadSchema.safeParse(raw);

    if (!parsed.success) {
      return errorResponse(400, "PAYLOAD_INVALIDO", "Payload invalido para convite de usuario.", parsed.error.flatten());
    }

    const pessoaId = parsePessoaId(parsed.data.pessoa_id);
    if (!pessoaId) {
      return errorResponse(400, "PESSOA_ID_INVALIDO", "pessoa_id precisa ser um inteiro positivo.");
    }

    const email = normalizeEmail(parsed.data.email);
    const rolesIdsRaw = parsed.data.roles_ids ?? [];
    const rolesIds = rolesIdsRaw
      .map((value) => (typeof value === "number" ? String(value) : value.trim()))
      .filter((value) => value.length > 0);
    const rolesIdsValid = Array.from(new Set(rolesIds));
    const isAdmin = Boolean(parsed.data.is_admin);

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return errorResponse(401, "NAO_AUTENTICADO", "Usuario nao autenticado.");
    }

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("user_id, is_admin")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (profErr) {
      return errorResponse(500, "ERRO_PERMISSAO", "Falha ao verificar permissao.", profErr.message);
    }

    if (!profile?.is_admin) {
      return errorResponse(403, "SEM_PERMISSAO", "Usuario nao autorizado a convidar.");
    }

    let admin: ReturnType<typeof getSupabaseAdmin>;
    try {
      admin = getSupabaseAdmin();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "env_incompleta";
      return errorResponse(500, "ENV_INCOMPLETA", "Variaveis de ambiente ausentes para admin.", msg);
    }

    const { data: pessoa, error: pessoaErr } = await admin
      .from("pessoas")
      .select("id, nome")
      .eq("id", pessoaId)
      .maybeSingle();

    if (pessoaErr) {
      return errorResponse(500, "ERRO_BUSCAR_PESSOA", "Falha ao buscar pessoa.", pessoaErr.message);
    }
    if (!pessoa) {
      return errorResponse(404, "PESSOA_NAO_ENCONTRADA", "Pessoa nao encontrada.");
    }

    const { data: profilePorPessoa, error: dupPessoaErr } = await admin
      .from("profiles")
      .select("user_id, pessoa_id")
      .eq("pessoa_id", pessoaId)
      .maybeSingle();

    if (dupPessoaErr) {
      return NextResponse.json(
        {
          ok: false,
          code: "FALHA_DUP_PESSOA",
          message: "Falha ao checar duplicidade por pessoa.",
          details: dupPessoaErr,
        },
        { status: 500 },
      );
    }

    if (profilePorPessoa?.user_id) {
      return NextResponse.json(
        {
          ok: false,
          code: "USUARIO_JA_EXISTE",
          message: "Ja existe usuario vinculado a esta pessoa.",
          details: { user_id: profilePorPessoa.user_id, pessoa_id: profilePorPessoa.pessoa_id },
        },
        { status: 409 },
      );
    }

    const { data: pessoaPorEmail, error: pessoaEmailErr } = await admin
      .from("pessoas")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (pessoaEmailErr) {
      return NextResponse.json(
        {
          ok: false,
          code: "FALHA_DUP_EMAIL",
          message: "Falha ao checar duplicidade por email.",
          details: pessoaEmailErr,
        },
        { status: 500 },
      );
    }

    if (pessoaPorEmail?.id && pessoaPorEmail.id !== pessoaId) {
      const { data: profilePorEmail, error: dupEmailErr } = await admin
        .from("profiles")
        .select("user_id, pessoa_id")
        .eq("pessoa_id", pessoaPorEmail.id)
        .maybeSingle();

      if (dupEmailErr) {
        return NextResponse.json(
          {
            ok: false,
            code: "FALHA_DUP_EMAIL",
            message: "Falha ao checar duplicidade por email.",
            details: dupEmailErr,
          },
          { status: 500 },
        );
      }

      if (profilePorEmail?.user_id) {
        return NextResponse.json(
          {
            ok: false,
            code: "USUARIO_JA_EXISTE",
            message: "Ja existe usuario cadastrado com este email.",
            details: { user_id: profilePorEmail.user_id, pessoa_id: profilePorEmail.pessoa_id },
          },
          { status: 409 },
        );
      }
    }

    const fallbackSiteUrl =
      process.env.NODE_ENV === "production"
        ? process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000"
        : "http://localhost:3000";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? fallbackSiteUrl;
    const redirectTo = `${siteUrl}/auth/definir-senha`;

    // 4) Criar convite no Supabase Auth (SERVICE ROLE)
    try {
      admin = getSupabaseAdmin();
    } catch (e: unknown) {
      console.error("SERVICE ROLE NAO CONFIGURADA:", e);
      return NextResponse.json(
        {
          ok: false,
          code: "SERVICE_ROLE_NAO_CONFIGURADA",
          message:
            "SUPABASE_SERVICE_ROLE_KEY nao configurada no ambiente. Nao e possivel enviar convite pelo Supabase Auth.",
          details: e instanceof Error ? { message: e.message, stack: e.stack } : String(e),
        },
        { status: 500 },
      );
    }

    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email);

    if (inviteErr) {
      const msg = (inviteErr as { message?: string } | null)?.message?.toLowerCase?.() ?? "";
      const status = (inviteErr as { status?: number } | null)?.status;

      const pareceDuplicado =
        msg.includes("already registered") ||
        msg.includes("already exists") ||
        msg.includes("user exists") ||
        msg.includes("duplicate") ||
        status === 422;

      console.error("ERRO SUPABASE INVITE:", inviteErr);

      if (pareceDuplicado) {
        return NextResponse.json(
          {
            ok: false,
            code: "USUARIO_JA_EXISTE_AUTH",
            message: "Ja existe usuario no Supabase Auth com este email.",
            details: inviteErr,
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          ok: false,
          code: "FALHA_INVITE_AUTH",
          message: "Falha ao convidar usuario no Supabase Auth.",
          details: inviteErr,
        },
        { status: 500 },
      );
    }

    const authUserId = invited?.user?.id;

    if (!authUserId) {
      console.error("INVITE SEM USER.ID:", invited);
      return NextResponse.json(
        {
          ok: false,
          code: "AUTH_USER_ID_NULO",
          message: "Convite criado, mas o Supabase nao retornou o ID do usuario.",
          details: invited,
        },
        { status: 500 },
      );
    }

    const profilePayload: Record<string, unknown> = {
      user_id: authUserId,
      pessoa_id: pessoaId,
      full_name: pessoa.nome,
      is_admin: isAdmin,
    };

    const { error: profileErr } = await admin
      .from("profiles")
      .upsert(profilePayload, { onConflict: "user_id" })
      .select("*")
      .single();

    if (profileErr) {
      return NextResponse.json(
        {
          ok: false,
          code: "FALHA_SALVAR_PROFILE",
          message: "Falha ao salvar profile do usuario.",
          details: profileErr,
        },
        { status: 500 },
      );
    }

    const { error: clearRolesErr } = await admin.from("usuario_roles").delete().eq("user_id", authUserId);
    if (clearRolesErr) {
      return errorResponse(500, "FALHA_LIMPAR_ROLES", "Falha ao limpar roles antigas.", clearRolesErr.message);
    }

    if (rolesIdsValid.length > 0) {
      const rolesPayload = rolesIdsValid.map((roleId) => ({
        user_id: authUserId,
        role_id: roleId,
      }));

      const { error: rolesErr } = await admin.from("usuario_roles").insert(rolesPayload);
      if (rolesErr) {
        return NextResponse.json(
          {
            ok: false,
            code: "FALHA_SALVAR_ROLES",
            message: "Usuario criado, mas falha ao salvar roles.",
            details: rolesErr,
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Convite enviado e usuario registrado com sucesso.",
        user: { id: authUserId, email },
        pessoa: { id: pessoa.id, nome: pessoa.nome },
        invite: { sent: true, redirectTo },
        data: {
          roles_ids: rolesIdsValid,
        },
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    console.error("ERRO_INESPERADO /api/admin/usuarios/convidar:", err);
    return NextResponse.json(
      {
        ok: false,
        code: "ERRO_INESPERADO",
        message: "Erro inesperado ao convidar usuario.",
        details: err instanceof Error ? { message: err.message, stack: err.stack } : String(err),
      },
      { status: 500 },
    );
  }
}
