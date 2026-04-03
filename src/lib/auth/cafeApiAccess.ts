import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { requireUser as requireCookieUser } from "@/lib/supabase/api-auth";
import { getSupabaseServiceRole } from "@/lib/supabaseServer";

type BearerUser = {
  id: string;
  email: string | null;
};

type ActiveRoleRow = {
  role: {
    codigo: string | null;
    ativo: boolean | null;
  } | null;
};

type FlexibleUserContext = {
  userId: string;
  email: string | null;
  authMode: "bearer" | "cookie";
};

const UNAUTHORIZED_MESSAGE = "Sessao expirada. Faca login novamente.";

function buildUnauthorizedResponse(): NextResponse {
  return NextResponse.json(
    {
      error: "unauthorized",
      message: UNAUTHORIZED_MESSAGE,
      debug: {
        hasCookies: false,
        cookieNames: [],
      },
    },
    { status: 401 },
  );
}

function buildForbiddenResponse(message = "Sem permissao."): NextResponse {
  return NextResponse.json({ error: "forbidden", message }, { status: 403 });
}

function extractBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header) return null;

  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

function startsWithAny(path: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

async function resolveBearerUser(request: NextRequest): Promise<BearerUser | null> {
  const bearer = extractBearerToken(request);
  if (!bearer) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("SUPABASE_ANON_NAO_CONFIGURADO");
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${bearer}`,
      },
    },
  });

  const { data, error } = await supabase.auth.getUser(bearer);
  if (error || !data.user) return null;

  return {
    id: data.user.id,
    email: data.user.email ?? null,
  };
}

async function listRoleCodesForUser(userId: string): Promise<string[]> {
  const supabase = getSupabaseServiceRole();
  const { data, error } = await supabase
    .from("usuario_roles")
    .select("role:roles_sistema(codigo, ativo)")
    .eq("user_id", userId);

  if (error || !data) {
    return [];
  }

  const rows = data as ActiveRoleRow[];
  return Array.from(
    new Set(
      rows
        .map((row) => row.role)
        .filter((role): role is NonNullable<ActiveRoleRow["role"]> => Boolean(role?.codigo) && (role?.ativo ?? true))
        .map((role) => String(role.codigo).trim().toUpperCase()),
    ),
  );
}

async function authorizeBearerForPath(request: NextRequest, userId: string): Promise<NextResponse | null> {
  const roles = await listRoleCodesForUser(userId);
  const path = request.nextUrl.pathname;

  if (roles.includes("ADMIN")) return null;
  if (!roles.length) {
    return buildForbiddenResponse();
  }

  if (roles.includes("EQUIPE_CADASTRO_BASE")) {
    const allow = ["/api/pessoas", "/api/alunos", "/api/turmas", "/api/academico"];
    const deny = [
      "/api/admin",
      "/api/administracao",
      "/api/loja",
      "/api/cafe",
      "/api/financeiro",
      "/api/matriculas",
      "/api/credito-conexao",
    ];

    if (startsWithAny(path, deny)) {
      return buildForbiddenResponse("Acesso bloqueado para este papel.");
    }

    if (startsWithAny(path, allow)) {
      return null;
    }

    return buildForbiddenResponse("API nao liberada para este papel.");
  }

  return null;
}

export async function guardCafeApiRequest(request: NextRequest): Promise<NextResponse | null> {
  const bearerUser = await resolveBearerUser(request);
  if (bearerUser) {
    return authorizeBearerForPath(request, bearerUser.id);
  }

  return guardApiByRole(request);
}

export async function requireCafeApiUser(request: NextRequest): Promise<FlexibleUserContext | NextResponse> {
  const bearerUser = await resolveBearerUser(request);
  if (bearerUser) {
    const denied = await authorizeBearerForPath(request, bearerUser.id);
    if (denied) return denied;

    return {
      userId: bearerUser.id,
      email: bearerUser.email,
      authMode: "bearer",
    };
  }

  const denied = await guardApiByRole(request);
  if (denied) return denied;

  const auth = await requireCookieUser(request);
  if (auth instanceof NextResponse) {
    return auth;
  }

  return {
    userId: auth.userId,
    email: null,
    authMode: "cookie",
  };
}

export async function requireAuthenticatedApiUser(request: NextRequest): Promise<FlexibleUserContext | NextResponse> {
  const bearerUser = await resolveBearerUser(request);
  if (bearerUser) {
    return {
      userId: bearerUser.id,
      email: bearerUser.email,
      authMode: "bearer",
    };
  }

  const auth = await requireCookieUser(request);
  if (auth instanceof NextResponse) {
    return buildUnauthorizedResponse();
  }

  return {
    userId: auth.userId,
    email: null,
    authMode: "cookie",
  };
}
