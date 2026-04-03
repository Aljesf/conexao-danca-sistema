import type { SupabaseClient } from "@supabase/supabase-js";

type VerificacaoLimite = {
  permitido: boolean;
  saldo_devedor_centavos: number;
  limite_autorizado_centavos: number;
  limite_disponivel_centavos: number;
  mensagem?: string;
};

/**
 * Verifica se um novo lançamento cabe dentro do limite de crédito da conta.
 * Se limite_autorizado_centavos for 0 ou null, não há limite (ilimitado).
 */
export async function verificarLimiteCreditoConexao(
  supabase: SupabaseClient,
  contaConexaoId: number,
  valorNovoLancamentoCentavos: number,
): Promise<VerificacaoLimite> {
  // Buscar conta com limites
  const { data: conta, error: contaErr } = await supabase
    .from("credito_conexao_contas")
    .select("id,limite_maximo_centavos,limite_autorizado_centavos")
    .eq("id", contaConexaoId)
    .maybeSingle();

  if (contaErr || !conta) {
    return {
      permitido: false,
      saldo_devedor_centavos: 0,
      limite_autorizado_centavos: 0,
      limite_disponivel_centavos: 0,
      mensagem: "Conta não encontrada.",
    };
  }

  const limiteAutorizado = Number((conta as any).limite_autorizado_centavos ?? 0);
  const limiteMaximo = Number((conta as any).limite_maximo_centavos ?? 0);
  const limiteEfetivo = limiteAutorizado > 0 ? limiteAutorizado : limiteMaximo;

  // Sem limite configurado = ilimitado
  if (!limiteEfetivo || limiteEfetivo <= 0) {
    return {
      permitido: true,
      saldo_devedor_centavos: 0,
      limite_autorizado_centavos: 0,
      limite_disponivel_centavos: Number.MAX_SAFE_INTEGER,
    };
  }

  // Calcular saldo devedor atual (PENDENTE_FATURA + FATURADO)
  const { data: lancamentos } = await supabase
    .from("credito_conexao_lancamentos")
    .select("valor_centavos")
    .eq("conta_conexao_id", contaConexaoId)
    .in("status", ["PENDENTE_FATURA", "FATURADO"]);

  const saldoDevedor = (lancamentos ?? []).reduce(
    (sum, l: any) => sum + (Number(l.valor_centavos) || 0),
    0,
  );

  const disponivel = limiteEfetivo - saldoDevedor;
  const permitido = saldoDevedor + valorNovoLancamentoCentavos <= limiteEfetivo;

  return {
    permitido,
    saldo_devedor_centavos: saldoDevedor,
    limite_autorizado_centavos: limiteEfetivo,
    limite_disponivel_centavos: Math.max(0, disponivel),
    mensagem: permitido
      ? undefined
      : `Limite de crédito excedido. Disponível: R$ ${(disponivel / 100).toFixed(2)}. Necessário: R$ ${(valorNovoLancamentoCentavos / 100).toFixed(2)}.`,
  };
}
