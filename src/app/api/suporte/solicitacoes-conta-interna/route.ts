import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/api-auth";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { inferirPrioridadePorTipo } from "@/lib/suporte/constants";
import { sanitizeSupportPayload } from "@/lib/suporte/sanitizeSupportPayload";

const PayloadSchema = z.object({
  pessoa_id: z.number().int().positive(),
  tipo_conta: z.enum(["ALUNO", "COLABORADOR"]),
  contexto_origem: z.enum(["CAFE", "LOJA", "ESCOLA"]),
  observacao: z.string().trim().max(1000).nullish(),
});

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json().catch(() => null);
    const parsed = PayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "payload_invalido",
          detalhe: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const payload = parsed.data;
    const tipo = "MELHORIA_SISTEMA" as const;
    const prioridade = inferirPrioridadePorTipo(tipo);
    const descricao = [
      `Solicitacao de criacao/regularizacao de conta interna para ${payload.tipo_conta.toLowerCase()}.`,
      `Pessoa #${payload.pessoa_id}.`,
      `Contexto de origem: ${payload.contexto_origem}.`,
      payload.observacao?.trim() ? `Observacao: ${payload.observacao.trim()}` : null,
    ]
      .filter(Boolean)
      .join(" ");

    const supabase = getSupabaseServiceClient();
    const dadosContexto = sanitizeSupportPayload(
      {
        pessoa_id: payload.pessoa_id,
        tipo_conta: payload.tipo_conta,
        contexto_origem: payload.contexto_origem,
      },
      {
        maxDepth: 4,
        maxStringLength: 400,
        maxSerializedLength: 4000,
      },
    );

    const { data, error } = await supabase
      .from("suporte_tickets")
      .insert({
        tipo,
        prioridade,
        titulo: `Conta interna - ${payload.tipo_conta} - pessoa #${payload.pessoa_id}`,
        descricao,
        contexto_slug: "suporte-conta-interna",
        contexto_nome: "Solicitacoes de conta interna",
        rota_path: `/api/suporte/solicitacoes-conta-interna`,
        pagina_titulo: "Solicitacao de conta interna",
        origem: "API",
        dados_contexto_json: dadosContexto.sanitized,
        dados_tecnicos_json: {
          solicitante_user_id: auth.userId,
        },
        reported_by: auth.userId,
      })
      .select(
        "id,codigo,tipo,status,prioridade,titulo,descricao,contexto_slug,contexto_nome,rota_path,pagina_titulo,screenshot_url,reported_by,responsavel_uuid,created_at,updated_at,resolved_at",
      )
      .single();

    if (error) {
      return NextResponse.json(
        {
          error: "falha_registrar_solicitacao_conta_interna",
          detalhe: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        ticket: data,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "falha_registrar_solicitacao_conta_interna",
        detalhe: error instanceof Error ? error.message : "erro_desconhecido",
      },
      { status: 500 },
    );
  }
}
