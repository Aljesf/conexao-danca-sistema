import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const WordmarkColorSchema = z.enum(["blue", "red", "orange", "green", "pink", "violet"]);
const WordmarkSegmentSchema = z.object({
  text: z.string().min(1),
  color: WordmarkColorSchema,
});

const UpdateSchema = z.object({
  system_name: z.string().min(1).optional(),
  wordmark_segments: z.array(WordmarkSegmentSchema).min(1).optional(),
});

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("system_settings")
    .select("id, system_name, logo_color_url, logo_white_url, logo_transparent_url, wordmark_segments")
    .order("id", { ascending: true })
    .limit(1)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: data }, { status: 200 });
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "payload_invalido", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: current, error: curErr } = await supabase
    .from("system_settings")
    .select("id")
    .order("id", { ascending: true })
    .limit(1)
    .single();

  if (curErr || !current) {
    return NextResponse.json({ error: "settings_nao_encontrado" }, { status: 404 });
  }

  const { error } = await supabase
    .from("system_settings")
    .update(parsed.data)
    .eq("id", current.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

