import type { PoolClient } from "pg";

type RecalcResult = {
  ok: boolean;
  lancamentos_atualizados: number;
  detalhes: Array<{
    lancamento_id: number;
    valor_anterior: number;
    valor_novo: number;
    tier_ordem: number;
  }>;
  errors: string[];
};

/**
 * Após cancelamento de matrícula, recalcula os tiers das matrículas
 * ativas remanescentes do mesmo aluno e atualiza lançamentos PENDENTE_FATURA.
 *
 * Não altera lançamentos já FATURADO ou PAGO.
 */
export async function recalcularTiersAposDesmatricula(params: {
  client: PoolClient;
  alunoId: number;
  anoReferencia: number;
  matriculaCanceladaId: number;
  userId: string;
  baseUrl: string;
}): Promise<RecalcResult> {
  const { client, alunoId, anoReferencia, matriculaCanceladaId, userId, baseUrl } = params;
  const errors: string[] = [];
  const detalhes: RecalcResult["detalhes"] = [];
  let lancamentosAtualizados = 0;

  // 1. Buscar matrículas ativas remanescentes com seus vínculos
  const { rows: matriculasAtivas } = await client.query<{
    id: number;
    servico_id: number | null;
    vinculo_id: number | null;
  }>(
    `SELECT m.id, m.servico_id, m.vinculo_id
     FROM public.matriculas m
     WHERE m.pessoa_id = $1
       AND m.ano_referencia = $2
       AND upper(coalesce(m.status, '')) NOT IN ('CANCELADA', 'CONCLUIDA')
       AND m.id != $3
     ORDER BY m.id`,
    [alunoId, anoReferencia, matriculaCanceladaId],
  );

  if (matriculasAtivas.length === 0) {
    return { ok: true, lancamentos_atualizados: 0, detalhes: [], errors: [] };
  }

  // 2. Para cada matrícula ativa, resolver o novo preço via API interna
  for (const mat of matriculasAtivas) {
    try {
      const turmaId = mat.vinculo_id;
      if (!turmaId) continue;

      // Chamar o resolver de preços internamente
      const resolverUrl = new URL("/api/matriculas/precos/resolver", baseUrl);
      resolverUrl.searchParams.set("aluno_id", String(alunoId));
      resolverUrl.searchParams.set("alvo_tipo", "TURMA");
      resolverUrl.searchParams.set("alvo_id", String(turmaId));
      resolverUrl.searchParams.set("ano", String(anoReferencia));

      const resp = await fetch(resolverUrl.toString(), {
        method: "GET",
        headers: { "x-internal-call": "true" },
      });

      if (!resp.ok) {
        errors.push(`resolver_preco_mat_${mat.id}: HTTP ${resp.status}`);
        continue;
      }

      const json = (await resp.json()) as {
        ok: boolean;
        data?: { valor_final_centavos?: number | null };
      };

      if (!json.ok || !json.data?.valor_final_centavos) {
        continue;
      }

      const novoValor = json.data.valor_final_centavos;

      // 3. Atualizar lançamentos PENDENTE_FATURA dessa matrícula com o novo valor
      const { rows: lancamentos } = await client.query<{
        id: number;
        valor_centavos: number;
      }>(
        `SELECT id, coalesce(valor_centavos, 0)::int as valor_centavos
         FROM public.credito_conexao_lancamentos
         WHERE matricula_id = $1
           AND upper(coalesce(status, '')) = 'PENDENTE_FATURA'
         FOR UPDATE`,
        [mat.id],
      );

      for (const lanc of lancamentos) {
        if (lanc.valor_centavos === novoValor) continue;

        await client.query(
          `UPDATE public.credito_conexao_lancamentos
           SET valor_centavos = $1,
               composicao_json = coalesce(composicao_json, '{}'::jsonb) || jsonb_build_object(
                 'recalculo_tier',
                 jsonb_build_object(
                   'valor_anterior', $2::int,
                   'valor_novo', $1::int,
                   'motivo', 'recalculo_por_cancelamento_matricula',
                   'matricula_cancelada_id', $3::int,
                   'recalculado_em', now(),
                   'recalculado_por', $4::text
                 )
               ),
               updated_at = now()
           WHERE id = $5`,
          [novoValor, lanc.valor_centavos, matriculaCanceladaId, userId, lanc.id],
        );

        detalhes.push({
          lancamento_id: lanc.id,
          valor_anterior: lanc.valor_centavos,
          valor_novo: novoValor,
          tier_ordem: matriculasAtivas.length,
        });
        lancamentosAtualizados++;
      }
    } catch (err) {
      errors.push(`mat_${mat.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 4. Registrar auditoria
  await client.query(
    `INSERT INTO public.auditoria_logs (user_id, acao, entidade, entidade_id, detalhes)
     VALUES ($1, 'RECALCULO_TIERS_DESMATRICULA', 'MATRICULA', $2, $3::jsonb)`,
    [
      userId,
      String(matriculaCanceladaId),
      JSON.stringify({
        motivo: "recalculo_por_cancelamento_matricula",
        matriculas_ativas_remanescentes: matriculasAtivas.map((m) => m.id),
        lancamentos_atualizados: lancamentosAtualizados,
        detalhes,
        errors,
      }),
    ],
  );

  return { ok: errors.length === 0, lancamentos_atualizados: lancamentosAtualizados, detalhes, errors };
}
