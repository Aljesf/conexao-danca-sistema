import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type ApiResp<T> = { ok: boolean; data?: T; message?: string };

export async function POST(req: Request) {
  const supabase = getSupabaseAdmin();

  const form = await req.formData();
  const file = form.get("file");
  const nome = String(form.get("nome") || "").trim();
  const tagsRaw = String(form.get("tags") || "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "Arquivo (file) e obrigatorio." } satisfies ApiResp<never>, {
      status: 400,
    });
  }
  if (!nome) {
    return NextResponse.json({ ok: false, message: "Nome e obrigatorio." } satisfies ApiResp<never>, { status: 400 });
  }
  if (file.type && !file.type.startsWith("image/")) {
    return NextResponse.json({ ok: false, message: "O arquivo deve ser uma imagem." } satisfies ApiResp<never>, {
      status: 400,
    });
  }

  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const bucket = "documentos-imagens";
  const ext = file.name.split(".").pop() || "png";
  const safeBase = nome
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const base = safeBase || "imagem";
  const path = `uploads/${Date.now()}-${base}.${ext.toLowerCase()}`;

  const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || "image/png",
    upsert: false,
  });

  if (upErr) {
    return NextResponse.json({ ok: false, message: upErr.message } satisfies ApiResp<never>, { status: 500 });
  }

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  const public_url = pub.publicUrl;

  const { data: saved, error: dbErr } = await supabase
    .from("documentos_imagens")
    .insert({
      nome,
      tags,
      bucket,
      path,
      public_url,
      mime_type: file.type || null,
      tamanho_bytes: file.size,
    })
    .select("imagem_id,nome,public_url,tags")
    .single();

  if (dbErr) {
    return NextResponse.json({ ok: false, message: dbErr.message } satisfies ApiResp<never>, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: saved } satisfies ApiResp<unknown>, { status: 201 });
}
