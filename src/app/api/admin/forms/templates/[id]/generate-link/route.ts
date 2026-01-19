import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

function makeToken(): string {
  return randomBytes(24).toString("hex");
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(req as unknown as Request);
  if (denied) return denied as unknown as NextResponse;

  try {
    const supabase = getSupabaseServiceClient();
    const { id: templateId } = await ctx.params;

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
    }

    const pessoa_id = toNumberOrNull(body.pessoa_id);
    const responsavel_id = toNumberOrNull(body.responsavel_id);

    const { data: tpl, error: tErr } = await supabase
      .from("form_templates")
      .select("id, status, versao")
      .eq("id", templateId)
      .single();

    if (tErr || !tpl) {
      return NextResponse.json({ error: "Template nao encontrado." }, { status: 404 });
    }

    if (tpl.status !== "published") {
      return NextResponse.json({ error: "Template precisa estar publicado." }, { status: 400 });
    }

    const token = makeToken();

    const { data: submission, error: sErr } = await supabase
      .from("form_submissions")
      .insert({
        template_id: templateId,
        template_versao: tpl.versao,
        pessoa_id,
        responsavel_id,
        public_token: token,
        status: "submitted",
      })
      .select("id, public_token")
      .single();

    if (sErr) {
      return NextResponse.json({ error: sErr.message }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const publicUrl = baseUrl
      ? `${baseUrl}/public/forms/${submission.public_token}`
      : `/public/forms/${submission.public_token}`;

    return NextResponse.json({
      data: {
        submission_id: submission.id,
        public_token: submission.public_token,
        public_url: publicUrl,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
