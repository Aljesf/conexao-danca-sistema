import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

const BUCKET = "suporte";
const MAX_BYTES = 8 * 1024 * 1024;

function extFromMime(contentType: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("webp")) return "webp";
  return "bin";
}

async function ensureBucket() {
  const supabase = getSupabaseServiceClient();
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;

  const exists = (buckets ?? []).some((bucket) => bucket.name === BUCKET);
  if (exists) return;

  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
  });

  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw error;
  }
}

function decodeBase64Payload(base64Input: string) {
  const match = base64Input.match(/^data:(.+);base64,(.+)$/);
  const contentType = match?.[1] ?? "image/png";
  const base64 = match?.[2] ?? base64Input;
  const buffer = Buffer.from(base64, "base64");
  return { bytes: new Uint8Array(buffer), contentType };
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  await ensureBucket();
  const supabase = getSupabaseServiceClient();

  let bytes: Uint8Array | null = null;
  let contentType = "image/png";

  const contentHeader = request.headers.get("content-type") ?? "";

  if (contentHeader.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as { base64?: string } | null;
    if (!body?.base64) {
      return NextResponse.json({ ok: false, error: "base64_obrigatorio" }, { status: 400 });
    }
    const decoded = decodeBase64Payload(body.base64);
    bytes = decoded.bytes;
    contentType = decoded.contentType;
  } else {
    const form = await request.formData().catch(() => null);
    const file = form?.get("file") ?? form?.get("blob");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "arquivo_obrigatorio" }, { status: 400 });
    }

    bytes = new Uint8Array(await file.arrayBuffer());
    contentType = file.type || "image/png";
  }

  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ ok: false, error: "arquivo_precisa_ser_imagem" }, { status: 400 });
  }

  if (!bytes || bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "imagem_invalida_ou_muito_grande" }, { status: 400 });
  }

  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const ext = extFromMime(contentType);
  const path = `tickets/${year}/${month}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType,
    upsert: false,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ ok: true, screenshot_url: data.publicUrl });
}
