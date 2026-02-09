/* [INÍCIO DO BLOCO] src/app/api/matriculas/[id]/_cobrancas.ts (novo) */
export type CobrancaRow = {
  id: number;
  valor_centavos: number;
  vencimento: string; // YYYY-MM-DD
  data_pagamento: string | null;
  status: string;
};

export function selecionarCobrancasParaCancelar(rows: CobrancaRow[], hojeISO: string): CobrancaRow[] {
  // Regra: cancelar futuras (vencimento >= hoje) e não pagas
  return rows.filter((c) => !c.data_pagamento && c.vencimento >= hojeISO);
}
/* [FIM DO BLOCO] */
