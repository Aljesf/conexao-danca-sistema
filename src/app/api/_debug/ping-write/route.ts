import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return json({
    ok: true,
    endpoint: "api/_debug/ping-write",
    methods: ["GET", "POST"],
    env: {
      hasSupabaseUrl: !!url,
      hasServiceRoleKey: !!serviceKey,
    },
  });
}

export async function POST(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return json(
        { ok: false, error: "ENV_MISSING", env: { hasSupabaseUrl: !!url, hasServiceRoleKey: !!serviceKey } },
        500
      );
    }

    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json().catch(() => ({}));
    const { error } = await supabase.from("debug_vercel_pings").insert({
      source: "vercel",
      payload: body ?? null,
    });

    if (error) return json({ ok: false, error: "INSERT_FAILED", details: error }, 500);

    return json({ ok: true });
  } catch (e: unknown) {
    return json({ ok: false, error: "UNEXPECTED", details: String(e) }, 500);
  }
}
