"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type FaturaRow = {
  id: number;
  conta_conexao_id: number | null;
  periodo_referencia: string | null;
  data_fechamento: string | null;
  data_vencimento: string | null;
  status: string | null;
  valor_total_centavos: number | null;
};

type ContaRow = {
  id: number;
  tipo_conta: string | null;
  pessoa_titular_id: number | null;
  descricao_exibicao: string | null;
};

type PessoaRow = {
  id: number;
  nome: string | null;
  cpf: string | null;
  email: string | null;
};

type LancamentoRow = {
  id: number;
  conta_conexao_id: number | null;
  origem_sistema: string | null;
  origem_id: number | null;
  descricao: string | null;
  valor_centavos: number | null;
  competencia: string | null;
  referencia_item: string | null;
  status: string | null;
  composicao_json: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

type FaturaDetalheData = {
  fatura: FaturaRow;
  conta: ContaRow | null;
  pessoa: PessoaRow | null;
  pivot: Array<{ lancamento_id: number; created_at: string | null }>;
  lancamentos: LancamentoRow[];
};

type FaturaDetalheResponse = {
  ok: boolean;
  data?: FaturaDetalheData;
  error?: string;
};

const EMPTY_LANCAMENTOS: LancamentoRow[] = [];

function brlFromCentavos(v: number): string {
  return (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function FaturaDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FaturaDetalheData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openIds, setOpenIds] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!Number.isFinite(id)) {
      setError("fatura_id_invalido");
      setLoading(false);
      return;
    }

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/credito-conexao/faturas/${id}`);
        const json = (await res.json()) as FaturaDetalheResponse;
        if (!res.ok || !json?.ok) {
          setError(json?.error ?? "falha_carregar_fatura");
          setData(null);
          return;
        }
        setData(json.data ?? null);
      } catch {
        setError("falha_inesperada");
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const fatura = data?.fatura ?? null;
  const lancamentos = data?.lancamentos ?? EMPTY_LANCAMENTOS;

  const somaLancamentos = useMemo(
    () => lancamentos.reduce((acc, l) => acc + (typeof l.valor_centavos === "number" ? l.valor_centavos : 0), 0),
    [lancamentos],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Fatura do Cartao Conexao</CardTitle>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => router.back()}>
                Voltar
              </Button>
              <Button variant="secondary" onClick={() => window.location.reload()}>
                Recarregar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Carregando...</div>
            ) : error ? (
              <div className="text-sm text-red-700">{error}</div>
            ) : !fatura ? (
              <div className="text-sm text-muted-foreground">Fatura nao encontrada.</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="font-medium">Fatura ID:</span> {fatura.id}
                  </div>
                  <div>
                    <span className="font-medium">Conta:</span>{" "}
                    {data?.conta?.descricao_exibicao ?? `#${fatura.conta_conexao_id ?? "-"}`}
                  </div>
                  <div>
                    <span className="font-medium">Titular:</span> {data?.pessoa?.nome ?? "-"}
                  </div>
                  <div>
                    <span className="font-medium">Periodo:</span> {fatura.periodo_referencia ?? "-"}
                  </div>
                  <div>
                    <span className="font-medium">Fechamento:</span> {fatura.data_fechamento ?? "-"}
                  </div>
                  <div>
                    <span className="font-medium">Vencimento:</span> {fatura.data_vencimento ?? "-"}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> {fatura.status ?? "-"}
                  </div>
                </div>

                <div className="space-y-1 text-sm">
                  <div>
                    <span className="font-medium">Total da fatura (registro):</span>{" "}
                    {brlFromCentavos(Number(fatura.valor_total_centavos ?? 0))}
                  </div>
                  <div>
                    <span className="font-medium">Soma dos lancamentos vinculados:</span>{" "}
                    {brlFromCentavos(somaLancamentos)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Se os valores divergirem, o problema esta na pivot (itens vinculados) ou no recalculo.
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lancamentos vinculados a fatura</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Carregando...</div>
            ) : lancamentos.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhum lancamento vinculado a esta fatura.</div>
            ) : (
              <div className="space-y-3">
                {lancamentos.map((l) => (
                  <div key={l.id} className="rounded-lg border bg-white p-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold">{l.descricao ?? "Lancamento"}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          ID: {l.id} • Competencia: {l.competencia ?? "-"} • Ref: {l.referencia_item ?? "-"} • Status:{" "}
                          {l.status ?? "-"}
                        </div>
                      </div>
                      <div className="text-sm font-semibold">{brlFromCentavos(Number(l.valor_centavos ?? 0))}</div>
                    </div>

                    {l.composicao_json ? (
                      <div className="mt-3">
                        <Button
                          variant="secondary"
                          onClick={() => setOpenIds((p) => ({ ...p, [l.id]: !p[l.id] }))}
                        >
                          {openIds[l.id] ? "Ocultar composicao" : "Ver composicao"}
                        </Button>
                        {openIds[l.id] && (
                          <pre className="mt-3 max-h-72 overflow-auto rounded-md bg-slate-50 p-3 text-xs">
{JSON.stringify(l.composicao_json, null, 2)}
                          </pre>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-muted-foreground">Sem composicao_json neste lancamento.</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
