import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
  }
);

type ParamsCtx = {
  params: Promise<{ id: string }>;
};

export async function POST(req: Request, ctx: ParamsCtx) {
  try {
    const { id: pessoaId } = await ctx.params;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado." },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${pessoaId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("fotos-pessoas")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      console.error("Erro upload:", uploadError);
      return NextResponse.json(
        { error: "Erro ao fazer upload." },
        { status: 500 }
      );
    }

    const { data: publicURL } = supabaseAdmin.storage
      .from("fotos-pessoas")
      .getPublicUrl(path);

    const fotoUrl = publicURL.publicUrl;

    const { error: updateError } = await supabaseAdmin
      .from("pessoas")
      .update({ foto_url: fotoUrl })
      .eq("id", pessoaId);

    if (updateError) {
      console.error("Erro update pessoa:", updateError);
      return NextResponse.json(
        { error: "Erro ao atualizar pessoa." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: fotoUrl });
  } catch (e: any) {
    console.error("Erro geral /foto:", e);
    return NextResponse.json(
      { error: e?.message || "Erro inesperado." },
      { status: 500 }
    );
  }
}
