import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { isRouteAllowedForContext, normalizeContextoKey } from "@/lib/contexto-home";

const PayloadSchema = z.object({
  contexto: z.string().trim().min(1),
  rota_principal: z.string().trim().min(1),
});

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("usuario_contexto_preferencias")
      .select("contexto,rota_principal")
      .eq("user_id", auth.userId)
      .order("contexto", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "falha_listar_preferencias_contexto", detalhe: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        itens: (data ?? []).map((item) => ({
          contexto: String(item.contexto ?? ""),
          rota_principal: String(item.rota_principal ?? ""),
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "falha_listar_preferencias_contexto",
        detalhe: error instanceof Error ? error.message : "erro_desconhecido",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const raw = await request.json().catch(() => null);
    const parsed = PayloadSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "payload_invalido",
          detalhe: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const contexto = normalizeContextoKey(parsed.data.contexto);
    if (!contexto) {
      return NextResponse.json({ error: "contexto_invalido" }, { status: 400 });
    }

    if (!isRouteAllowedForContext(contexto, parsed.data.rota_principal)) {
      return NextResponse.json({ error: "rota_principal_invalida" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("usuario_contexto_preferencias")
      .upsert(
        {
          user_id: auth.userId,
          contexto,
          rota_principal: parsed.data.rota_principal,
        },
        { onConflict: "user_id,contexto" },
      )
      .select("contexto,rota_principal")
      .single();

    if (error) {
      return NextResponse.json({ error: "falha_salvar_preferencia_contexto", detalhe: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        item: {
          contexto: String(data?.contexto ?? contexto),
          rota_principal: String(data?.rota_principal ?? parsed.data.rota_principal),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "falha_salvar_preferencia_contexto",
        detalhe: error instanceof Error ? error.message : "erro_desconhecido",
      },
      { status: 500 },
    );
  }
}
