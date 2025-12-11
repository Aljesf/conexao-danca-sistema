// src/app/api/auditoria/route.ts
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const usuarioId = url.searchParams.get("usuario_id");
  const dataIni = url.searchParams.get("data_ini");
  const dataFim = url.searchParams.get("data_fim");

  const supabaseAuth = createRouteHandlerClient({ cookies });
  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser();

  if (authError) {
    console.error("[GET /api/auditoria] erro ao validar usuario:", authError);
  }

  if (!user) {
    return NextResponse.json(
      { error: "Usuario nao autenticado." },
      { status: 401 }
    );
  }

  try {
    let query = supabaseAdmin
      .from("auditoria_logs")
      .select(
        `
        id,
        created_at,
        user_id,
        acao,
        entidade,
        entidade_id,
        detalhes,
        ip,
        user_agent,
        profiles:profiles!left(user_id, full_name)
      `
      )
      .order("created_at", { ascending: false });

    if (usuarioId) {
      query = query.eq("user_id", usuarioId);
    }

    if (dataIni) {
      const inicioDoDia = new Date(`${dataIni}T00:00:00Z`);
      if (!Number.isNaN(inicioDoDia.getTime())) {
        query = query.gte("created_at", inicioDoDia.toISOString());
      }
    }

    if (dataFim) {
      const fimDoDia = new Date(`${dataFim}T23:59:59.999Z`);
      if (!Number.isNaN(fimDoDia.getTime())) {
        query = query.lte("created_at", fimDoDia.toISOString());
      }
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const dataNormalizada =
      data?.map((log: any) => {
        const detalhes = log.detalhes || {};
        return {
          id: log.id,
          created_at: log.created_at,
          usuario_id: log.user_id,
          usuario_nome:
            log.profiles?.full_name ??
            detalhes.usuario_nome ??
            log.user_id ??
            "Usuario desconhecido",
          entidade: log.entidade,
          entidade_id: log.entidade_id,
          acao: log.acao,
          descricao:
            detalhes.descricao ??
            detalhes.acao ??
            detalhes.message ??
            detalhes.mensagem ??
            "",
          detalhes: detalhes ?? null,
          ip: log.ip ?? null,
          user_agent: log.user_agent ?? null,
        };
      }) ?? [];

    return NextResponse.json({ data: dataNormalizada }, { status: 200 });
  } catch (error: any) {
    console.error("[GET /api/auditoria] erro na consulta:", error);
    return NextResponse.json(
      {
        error: "Falha ao buscar logs de auditoria",
        details: String(error?.message ?? error),
      },
      { status: 500 }
    );
  }
}
