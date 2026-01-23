"use client";

import { useEffect, useMemo, useState } from "react";

type Evento = {
  id: number;
  tipo: "PROVENTO" | "DESCONTO";
  descricao: string;
  valor_centavos: number;
  origem_tipo: string | null;
  origem_id: number | null;
};

type FolhaDetalhe = {
  id: number;
  competencia_ano_mes: string;
  colaborador_id: number;
  status: string;
  eventos: Evento[];
};

function fmtCentavos(v: number): string {
  const reais = (v / 100).toFixed(2).replace(".", ",");
  return `R$ ${reais}`;
}

function parseReaisToCentavos(value: string): number | null {
  const normalized = value.trim().replace(/\s+/g, "").replace(",", ".");
  if (!normalized) return null;
  const num = Number(normalized);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num * 100);
}

export default function FolhaColaboradorDetalhePage({ params }: { params: { id: string } }) {
  const folhaId = params.id;

  const [data, setData] = useState<FolhaDetalhe | null>(null);
  const [loading, setLoading] = useState(false);
  const [novoTipo, setNovoTipo] = useState<"PROVENTO" | "DESCONTO">("DESCONTO");
  const [novoDescricao, setNovoDescricao] = useState("");
  const [novoValor, setNovoValor] = useState("");

  const totals = useMemo(() => {
    const evs = data?.eventos ?? [];
    const proventos = evs.filter((e) => e.tipo === "PROVENTO").reduce((a, e) => a + e.valor_centavos, 0);
    const descontos = evs.filter((e) => e.tipo === "DESCONTO").reduce((a, e) => a + e.valor_centavos, 0);
    return { proventos, descontos, liquido: proventos - descontos };
  }, [data]);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/folha/colaboradores/${folhaId}`);
      const j = await r.json();
      setData(j?.data ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function importarFaturas() {
    await fetch(`/api/admin/folha/colaboradores/${folhaId}/importar-faturas`, { method: "POST" });
    await load();
  }

  async function fechar() {
    await fetch(`/api/admin/folha/colaboradores/${folhaId}/fechar`, { method: "POST" });
    await load();
  }

  async function adicionarEvento() {
    const valorCentavos = parseReaisToCentavos(novoValor);
    if (valorCentavos === null) return;
    if (!novoDescricao.trim()) return;

    await fetch(`/api/admin/folha/colaboradores/${folhaId}/eventos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: novoTipo,
        descricao: novoDescricao.trim(),
        valor_centavos: valorCentavos,
      }),
    });
    setNovoDescricao("");
    setNovoValor("");
    await load();
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folhaId]);

  const folhaAberta = data?.status === "ABERTA";

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Folha #{folhaId}</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `Competencia: ${data.competencia_ano_mes} - Status: ${data.status}` : "Carregando..."}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            className="border rounded px-3 py-1 text-sm"
            onClick={() => void importarFaturas()}
            disabled={!folhaAberta}
          >
            Importar faturas (Cartao Conexao)
          </button>
          <button className="border rounded px-3 py-1 text-sm" onClick={() => void fechar()} disabled={!folhaAberta}>
            Fechar folha
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="border rounded p-3">
          <div className="text-xs text-muted-foreground">Proventos</div>
          <div className="text-lg font-semibold">{fmtCentavos(totals.proventos)}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-xs text-muted-foreground">Descontos</div>
          <div className="text-lg font-semibold">{fmtCentavos(totals.descontos)}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-xs text-muted-foreground">Liquido</div>
          <div className="text-lg font-semibold">{fmtCentavos(totals.liquido)}</div>
        </div>
      </div>

      <div className="border rounded p-3 space-y-2">
        <div className="text-sm font-medium">Adicionar evento manual</div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs">Tipo</label>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={novoTipo}
            onChange={(e) => setNovoTipo(e.target.value as "PROVENTO" | "DESCONTO")}
          >
            <option value="PROVENTO">PROVENTO</option>
            <option value="DESCONTO">DESCONTO</option>
          </select>
          <label className="text-xs">Descricao</label>
          <input
            className="border rounded px-2 py-1 text-sm min-w-[220px]"
            value={novoDescricao}
            onChange={(e) => setNovoDescricao(e.target.value)}
          />
          <label className="text-xs">Valor (R$)</label>
          <input
            className="border rounded px-2 py-1 text-sm w-28"
            value={novoValor}
            onChange={(e) => setNovoValor(e.target.value)}
            placeholder="0,00"
          />
          <button className="border rounded px-3 py-1 text-sm" onClick={() => void adicionarEvento()} disabled={!folhaAberta}>
            Adicionar
          </button>
        </div>
      </div>

      <div className="border rounded">
        <div className="p-3 border-b text-sm flex items-center justify-between">
          <span>{loading ? "Carregando..." : `Eventos: ${data?.eventos?.length ?? 0}`}</span>
          <button className="border rounded px-3 py-1 text-sm" onClick={() => void load()}>
            Atualizar
          </button>
        </div>

        <div className="p-3 space-y-2">
          {(data?.eventos ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
          ) : (
            (data?.eventos ?? []).map((e) => (
              <div key={e.id} className="border rounded p-3">
                <div className="flex justify-between">
                  <div className="text-sm font-medium">{e.tipo}</div>
                  <div className="text-sm">{fmtCentavos(e.valor_centavos)}</div>
                </div>
                <div className="text-xs text-muted-foreground">{e.descricao}</div>
                {e.origem_tipo ? (
                  <div className="text-xs text-muted-foreground">
                    origem: {e.origem_tipo} {e.origem_id ? `#${e.origem_id}` : ""}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

