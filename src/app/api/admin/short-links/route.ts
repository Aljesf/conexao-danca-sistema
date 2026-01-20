import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

function normalizeBaseUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, "");
}

function resolveEnvBaseUrl(): string | null {
  return normalizeBaseUrl(
    process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL,
  );
}

async function getCanonicalBaseUrl(
  supabase: ReturnType<typeof getSupabaseServiceClient>,
  req: Request,
): Promise<string> {
  const { data, error } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "public_base_url")
    .maybeSingle();
  const configUrl = error ? null : normalizeBaseUrl(data?.value ?? null);
  if (configUrl) return configUrl;

  const envUrl = resolveEnvBaseUrl();
  if (envUrl) return envUrl;

  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { target_path?: string } | null;

    if (!body?.target_path) {
      return NextResponse.json({ error: "target_path_obrigatorio" }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    const targetPath = body.target_path;

    const { data: existing } = await supabase
      .from("short_links")
      .select("code")
      .eq("target_path", targetPath)
      .eq("ativo", true)
      .maybeSingle();

    const baseUrl = await getCanonicalBaseUrl(supabase, req);

    if (existing?.code) {
      return NextResponse.json({
        short_url: `${baseUrl}/l/${existing.code}`,
        short_path: `/l/${existing.code}`,
      });
    }

    const code = nanoid(7);

    const { error } = await supabase.from("short_links").insert({
      code,
      target_path: targetPath,
      ativo: true,
    });

    if (error) throw error;

    return NextResponse.json({
      short_url: `${baseUrl}/l/${code}`,
      short_path: `/l/${code}`,
    });
  } catch {
    return NextResponse.json({ error: "erro_ao_gerar_link" }, { status: 500 });
  }
}
