"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Item = {
  id: number;
  servico_id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  tipo_item: string;
  obrigatorio: boolean;
  ativo: boolean;
};

type Preco = {
  id: number;
  item_id: number;
  valor_centavos: number;
  moeda: string;
  ativo: boolean;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
};

function fmtBRL(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseMoneyToCentavos(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const num = Number(normalized);
  if (!Number.isFinite(num)) return null;
  return Math.round(num * 100);
}

export default function AdminEscolaServicoDetalhePage() {
  const params = useParams<{ servicoId?: string }>();
  const servicoId = useMemo(() => Number(params?.servicoId), [params?.servicoId]);
  const servicoIdValido = Number.isInteger(servicoId) && servicoId > 0;

  const [itens, setItens] = useState<Item[]>([]);
  const [precosPorItem, setPrecosPorItem] = useState<Record<number, Preco[]>>({});
  const [erro, setErro] = useState<string | null>(null);

  const [novoCodigo, setNovoCodigo] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novoTipo, setNovoTipo] = useState("PADRAO");

  async function carregarItens() {
    if (!servicoIdValido) return;
    setErro(null);
    const r = await fetch(`/api/admin/escola/servicos/${servicoId}/itens`);
    const j = (await r.json()) as { ok: boolean; itens?: Item[]; message?: string };
    if (!r.ok || !j.ok) {
      setErro(j.message ?? "Falha ao carregar itens.");
      return;
    }
    setItens(j.itens ?? []);
  }

  async function carregarPrecos(itemId: number) {
    const r = await fetch(`/api/admin/escola/itens/${itemId}/precos`);
    const j = (await r.json()) as { ok: boolean; precos?: Preco[]; message?: string };
    if (!r.ok || !j.ok) {
      setErro(j.message ?? `Falha ao carregar precos do item ${itemId}.`);
      return;
    }
    setPrecosPorItem((prev) => ({ ...prev, [itemId]: j.precos ?? [] }));
  }

  useEffect(() => {
    void carregarItens();
  }, [servicoIdValido, servicoId]);

  useEffect(() => {
    itens.forEach((it) => void carregarPrecos(it.id));
  }, [itens]);

  async function criarItem() {
    if (!servicoIdValido) return;
    setErro(null);
    const r = await fetch(`/api/admin/escola/servicos/${servicoId}/itens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo: novoCodigo, nome: novoNome, tipo_item: novoTipo }),
    });
    const j = (await r.json()) as { ok: boolean; message?: string };
    if (!r.ok || !j.ok) {
      setErro(j.message ?? "Falha ao criar item.");
      return;
    }
    setNovoCodigo("");
    setNovoNome("");
    setNovoTipo("PADRAO");
    await carregarItens();
  }

  async function definirPreco(itemId: number, valorBRL: string) {
    setErro(null);
    const centavos = parseMoneyToCentavos(valorBRL);
    if (centavos === null) {
      setErro("Valor invalido.");
      return;
    }

    const r = await fetch(`/api/admin/escola/itens/${itemId}/precos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ valor_centavos: centavos, ativo: true }),
    });
    const j = (await r.json()) as { ok: boolean; message?: string };
    if (!r.ok || !j.ok) {
      setErro(j.message ?? "Falha ao salvar preco.");
      return;
    }
    await carregarPrecos(itemId);
  }

  if (!servicoIdValido) {
    return (
      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Servico invalido</h1>
        <p style={{ marginTop: 6, opacity: 0.8 }}>ID de servico nao informado.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>Servico #{servicoId} - Itens e precos</h1>

      {erro ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #fca5a5", background: "#fee2e2" }}>
          {erro}
        </div>
      ) : null}

      <div style={{ marginTop: 12, padding: 12, border: "1px solid #e5e7eb", borderRadius: 8 }}>
        <h2 style={{ fontWeight: 700 }}>Novo item</h2>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <input
            value={novoCodigo}
            onChange={(e) => setNovoCodigo(e.target.value)}
            placeholder="Codigo (ex.: MENSALIDADE)"
          />
          <input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Nome (ex.: Mensalidade)"
          />
          <select value={novoTipo} onChange={(e) => setNovoTipo(e.target.value)}>
            <option value="PADRAO">PADRAO</option>
            <option value="COREOGRAFIA">COREOGRAFIA</option>
            <option value="PERSONAGEM">PERSONAGEM</option>
            <option value="TAXA">TAXA</option>
            <option value="EXTRA">EXTRA</option>
          </select>
          <button type="button" onClick={criarItem}>
            Criar item
          </button>
        </div>
        <p style={{ marginTop: 8, opacity: 0.7 }}>
          Para turmas, o item tipico e MENSALIDADE. Para projeto artistico, crie PARTICIPACAO,
          COREOGRAFIAS e PERSONAGENS.
        </p>
      </div>

      <div style={{ marginTop: 12, border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th style={{ textAlign: "left", padding: 10 }}>Codigo</th>
              <th style={{ textAlign: "left", padding: 10 }}>Nome</th>
              <th style={{ textAlign: "left", padding: 10 }}>Tipo</th>
              <th style={{ textAlign: "left", padding: 10 }}>Preco ativo</th>
              <th style={{ textAlign: "left", padding: 10 }}>Definir preco (R$)</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((it) => {
              const precos = precosPorItem[it.id] ?? [];
              const ativo = precos.find((p) => p.ativo) ?? null;

              return (
                <tr key={it.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td style={{ padding: 10 }}>{it.codigo}</td>
                  <td style={{ padding: 10 }}>{it.nome}</td>
                  <td style={{ padding: 10 }}>{it.tipo_item}</td>
                  <td style={{ padding: 10 }}>{ativo ? fmtBRL(ativo.valor_centavos) : "-"}</td>
                  <td style={{ padding: 10 }}>
                    <input
                      placeholder="Ex.: 120,00"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          void definirPreco(it.id, (e.target as HTMLInputElement).value);
                        }
                      }}
                    />
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Enter para salvar</div>
                  </td>
                </tr>
              );
            })}
            {itens.length === 0 ? (
              <tr>
                <td style={{ padding: 10 }} colSpan={5}>
                  Nenhum item cadastrado ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
