import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { headers } from "next/headers";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

async function getCanonicalBaseUrl(): Promise<string> {
  const envUrl =
    process.env.PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL;

  if (envUrl) return envUrl.replace(/\/+$/, "");

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
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

    const baseUrl = await getCanonicalBaseUrl();

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
