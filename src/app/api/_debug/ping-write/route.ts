import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return NextResponse.json(
        { ok: false, error: "ENV_MISSING", hasUrl: !!url, hasServiceKey: !!serviceKey },
        { status: 500 }
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

    if (error) {
      return NextResponse.json({ ok: false, error: "INSERT_FAILED", details: error }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: "UNEXPECTED", details: String(e) }, { status: 500 });
  }
}
