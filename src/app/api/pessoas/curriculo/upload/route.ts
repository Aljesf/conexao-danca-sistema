import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "curriculo-anexos";
const MAX_BYTES = 10 * 1024 * 1024;

function safeFileExt(filename: string): string {
  const parts = filename.split(".");
  const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
  if (!(["pdf", "png", "jpg", "jpeg"].includes(ext))) return "bin";
  return ext;
}

function getPublicObjectUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base) throw new Error("NEXT_PUBLIC_SUPABASE_URL nao configurada.");
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}

export async function POST(req: Request): Promise<Response> {
  const supabase = createAdminClient();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "FormData invalido." }, { status: 400 });
  }

  const pessoaId = Number(form.get("pessoa_id"));
  const tipo = String(form.get("tipo") ?? "").trim();
  const file = form.get("file");

  if (!Number.isFinite(pessoaId)) {
    return NextResponse.json({ ok: false, error: "pessoa_id e obrigatorio." }, { status: 400 });
  }

  if (!(["FORMACAO_EXTERNA", "EXPERIENCIA_ARTISTISTICA", "EXPERIENCIA_ARTISTICA"].includes(tipo))) {
    return NextResponse.json(
      { ok: false, error: "tipo invalido. Use FORMACAO_EXTERNA ou EXPERIENCIA_ARTISTICA." },
      { status: 400 }
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "file e obrigatorio." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "Arquivo muito grande (max. 10MB)." }, { status: 400 });
  }

  const ext = safeFileExt(file.name);
  if (ext === "bin") {
    return NextResponse.json({ ok: false, error: "Tipo de arquivo nao permitido. Use PDF/PNG/JPG." }, { status: 400 });
  }

  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");

  const safeTipo = tipo === "EXPERIENCIA_ARTISTISTICA" ? "EXPERIENCIA_ARTISTICA" : tipo;
  const filename = `${crypto.randomUUID()}.${ext}`;
  const path = `pessoas/${pessoaId}/${safeTipo}/${yyyy}-${mm}/${filename}`;

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const publicUrl = getPublicObjectUrl(path);

  return NextResponse.json({
    ok: true,
    data: {
      bucket: BUCKET,
      path,
      public_url: publicUrl,
      filename: file.name,
      size: file.size,
      mime: file.type,
    },
  });
}
