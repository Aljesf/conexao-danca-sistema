// src/app/api/auditoria/log/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { resolverNomeDoUsuario } from "@/lib/auditoriaLog";
import { requireUser } from "@/lib/supabase/api-auth";

// Rota interna que usa service role para registrar logs manuais
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      acao,
      entidade,
      entidadeId,
      descricao,
      usuarioId,
      dadosAnteriores,
      dadosNovos,
      ip,
      userAgent,
    } = body;

    if (!acao || !entidade) {
      return NextResponse.json(
        { error: "Campos 'acao' e 'entidade' sao obrigatorios." },
        { status: 400 }
      );
    }

    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const actingUserId = (usuarioId as string | undefined) || auth.userId;

    const usuarioNome = await resolverNomeDoUsuario(actingUserId);
    const detalhes = {
      descricao: descricao || `${acao} em ${entidade}`,
      usuario_nome: usuarioNome,
      dados_anteriores: dadosAnteriores ?? null,
      dados_novos: dadosNovos ?? null,
    };

    const { error: auditError } = await supabaseAdmin
      .from("auditoria_logs")
      .insert({
        user_id: actingUserId,
        acao,
        entidade,
        entidade_id:
          entidadeId !== undefined && entidadeId !== null
            ? String(entidadeId)
            : null,
        detalhes,
        ip: ip ?? null,
        user_agent: userAgent ?? null,
      });

    if (auditError) {
      console.error("[auditoria/log] erro ao registrar auditoria:", auditError);
      return NextResponse.json(
        { error: "Erro ao registrar auditoria.", details: auditError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Log de auditoria registrado." },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Erro em /api/auditoria/log:", err);
    return NextResponse.json(
      {
        error: "Erro inesperado ao registrar auditoria.",
        details: String(err?.message ?? err),
      },
      { status: 500 }
    );
  }
}
