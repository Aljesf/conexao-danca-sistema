// src/app/api/auditoria/log/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ⚠️ ROTA INTERNA – PERIGO – USA SERVICE ROLE
// Esta rota deve existir APENAS em ambiente de servidor.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service Role — acesso total
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      acao,
      entidade,
      entidadeId,
      detalhes,
      userId // opcional: caso você queira passar explicitamente
    } = body;

    // ------------------------
    // 📌 1. Validação básica
    // ------------------------
    if (!acao) {
      return NextResponse.json(
        { error: "Campo 'acao' é obrigatório." },
        { status: 400 }
      );
    }

    // entidade e entidadeId podem ser nulos dependendo do tipo de log

    // ------------------------
    // 📌 2. Pega usuário logado (caso não seja passado no body)
    // ------------------------
    let actingUserId = userId;

    if (!actingUserId) {
      const { data } = await supabaseAdmin.auth.getUser();

      if (!data?.user) {
        return NextResponse.json(
          { error: "Não foi possível identificar o usuário para auditoria." },
          { status: 401 }
        );
      }

      actingUserId = data.user.id;
    }

    // ------------------------
    // 📌 3. Insere log na auditoria
    // ------------------------
    const { error: auditError } = await supabaseAdmin
      .from("auditoria_logs")
      .insert({
        user_id: actingUserId,
        acao,
        entidade: entidade || null,
        entidade_id: entidadeId || null,
        detalhes: detalhes || {},
      });

    if (auditError) {
      return NextResponse.json(
        { error: "Erro ao registrar auditoria.", details: auditError },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Log de auditoria registrado." },
      { status: 201 }
    );
  } catch (err) {
    console.error("Erro em /api/auditoria/log:", err);
    return NextResponse.json(
      { error: "Erro inesperado ao registrar auditoria." },
      { status: 500 }
    );
  }
}
