type TipoPrimeiraCobranca = "ENTRADA_PRORATA" | "MENSALIDADE_CHEIA_CARTAO";
type ModoLiquidacaoAutomatica = "MOVIMENTO" | "LANCAR_NO_CARTAO";

export async function liquidarPrimeiraMatricula(params: {
  baseUrl: string;
  cookieHeader: string;
  matriculaId: number;
  tipoPrimeiraCobranca: TipoPrimeiraCobranca;
  modo: ModoLiquidacaoAutomatica;
  observacoes?: string | null;
}): Promise<
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; error: string; detail: string; payload?: Record<string, unknown> }
> {
  const { baseUrl, cookieHeader, matriculaId, tipoPrimeiraCobranca, modo, observacoes } = params;

  try {
    const res = await fetch(`${baseUrl}/api/matriculas/liquidacao-primeira`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: cookieHeader,
      },
      body: JSON.stringify({
        matricula_id: matriculaId,
        tipo_primeira_cobranca: tipoPrimeiraCobranca,
        modo,
        observacoes: observacoes ?? null,
      }),
      cache: "no-store",
    });

    const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const error = typeof raw.error === "string" ? raw.error : "falha_liquidar_primeira_matricula";
      const detailRaw = raw.detail ?? raw.details ?? raw.message;
      const detail = typeof detailRaw === "string" && detailRaw.trim() ? detailRaw : `HTTP ${res.status}`;
      return { ok: false, error, detail, payload: raw };
    }

    return { ok: true, payload: raw };
  } catch (err) {
    const detail = err instanceof Error ? err.message : "erro_desconhecido";
    return { ok: false, error: "falha_liquidar_primeira_matricula", detail };
  }
}
