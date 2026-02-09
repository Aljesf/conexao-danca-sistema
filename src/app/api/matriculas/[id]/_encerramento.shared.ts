export type CobrancaRow = {
  id: number;
  valor_centavos: number;
  vencimento: string;
  data_pagamento: string | null;
  status: string;
};

export function computeCobrancasParaCancelar(rows: CobrancaRow[], hojeISO: string): CobrancaRow[] {
  // Regra: cancelar somente futuras (vencimento >= hoje) e nao pagas.
  return rows.filter((c) => {
    if (c.data_pagamento) return false;
    return c.vencimento >= hojeISO;
  });
}
