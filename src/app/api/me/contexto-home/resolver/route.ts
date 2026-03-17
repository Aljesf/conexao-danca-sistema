import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { getFallbackRouteForContext, normalizeContextoKey } from "@/lib/contexto-home";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const contexto = normalizeContextoKey(new URL(request.url).searchParams.get("contexto"));
    if (!contexto) {
      return NextResponse.json({ error: "contexto_invalido" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("usuario_contexto_preferencias")
      .select("rota_principal")
      .eq("user_id", auth.userId)
      .eq("contexto", contexto)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "falha_resolver_contexto_home", detalhe: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        contexto,
        rota_principal: String(data?.rota_principal ?? getFallbackRouteForContext(contexto)),
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "falha_resolver_contexto_home",
        detalhe: error instanceof Error ? error.message : "erro_desconhecido",
      },
      { status: 500 },
    );
  }
}
