import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const VariantSchema = z.enum(["color", "white", "transparent"]);

export async function POST(req: Request) {
  const url = new URL(req.url);
  const variant = VariantSchema.safeParse(url.searchParams.get("variant"));

  if (!variant.success) {
    return NextResponse.json({ error: "variant_invalida" }, { status: 400 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "form_data_invalido" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "arquivo_obrigatorio" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const filePath = `conectarte/logo-${variant.data}.${ext}`;

  const supabase = await createClient();
  const { error: upErr } = await supabase.storage
    .from("system-branding")
    .upload(filePath, file, { upsert: true, contentType: file.type });

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { data: pub } = supabase.storage.from("system-branding").getPublicUrl(filePath);

  const fieldMap: Record<typeof variant.data, string> = {
    color: "logo_color_url",
    white: "logo_white_url",
    transparent: "logo_transparent_url",
  };

  const { data: current, error: curErr } = await supabase
    .from("system_settings")
    .select("id")
    .order("id", { ascending: true })
    .limit(1)
    .single();

  if (curErr || !current) {
    return NextResponse.json({ error: "settings_nao_encontrado" }, { status: 404 });
  }

  const { error: updErr } = await supabase
    .from("system_settings")
    .update({ [fieldMap[variant.data]]: pub.publicUrl })
    .eq("id", current.id);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, publicUrl: pub.publicUrl }, { status: 200 });
}

