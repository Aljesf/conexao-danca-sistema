import { NextRequest, NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

type TemplateStatus = "draft" | "published" | "archived";

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const denied = await guardApiByRole(req as unknown as Request);
  if (denied) return denied as unknown as NextResponse;

  try {
    const supabase = getSupabaseServiceClient();
    const id = ctx.params.id;

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
    }

    const status = String(body.status ?? "") as TemplateStatus;
    if (!["draft", "published", "archived"].includes(status)) {
      return NextResponse.json(
        { error: "status invalido (draft|published|archived)." },
        { status: 400 }
      );
    }

    const patch: Record<string, unknown> = { status };
    if (status === "published") {
      patch.published_at = new Date().toISOString();
      patch.archived_at = null;
    }
    if (status === "archived") {
      patch.archived_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("form_templates")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
