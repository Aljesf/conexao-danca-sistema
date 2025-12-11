import { createClient } from "@supabase/supabase-js";

type LogParams = {
  usuario_id: string;
  usuario_nome?: string | null;
  entidade: string;
  entidade_id?: number | string | null;
  acao: string;
  descricao?: string | null;
  dados_anteriores?: any;
  dados_novos?: any;
  ip?: string | null;
  user_agent?: string | null;
};

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);

export async function resolverNomeDoUsuario(
  userId: string | null
): Promise<string> {
  if (!userId) return "Usuario desconhecido";

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("full_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[auditoria] erro ao resolver nome do usuario:", error);
    return userId;
  }

  return data?.full_name || userId;
}

export async function logAuditoria(params: LogParams) {
  if (!params.usuario_id) {
    const missingIdError = new Error(
      "[auditoria] usuario_id obrigatorio para registrar log"
    );
    console.error(missingIdError);
    return { error: missingIdError };
  }

  const detalhes = {
    descricao: params.descricao ?? null,
    usuario_nome: params.usuario_nome ?? null,
    dados_anteriores: params.dados_anteriores ?? null,
    dados_novos: params.dados_novos ?? null,
  };

  const detalhesValue = Object.values(detalhes).some(
    (value) => value !== null && value !== undefined
  )
    ? detalhes
    : null;

  const { error } = await supabaseAdmin.from("auditoria_logs").insert({
    user_id: params.usuario_id,
    acao: params.acao,
    entidade: params.entidade,
    entidade_id:
      params.entidade_id !== undefined && params.entidade_id !== null
        ? String(params.entidade_id)
        : null,
    detalhes: detalhesValue,
    ip: params.ip ?? null,
    user_agent: params.user_agent ?? null,
  });

  if (error) {
    console.error("[auditoria] falha ao registrar log:", error);
  }

  return { error };
}
