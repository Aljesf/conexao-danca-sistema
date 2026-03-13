"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/layout/SectionCard";

type TabelaPreco = {
  id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  is_default: boolean;
  ordem: number;
};

export default function CafeTabelasPrecoPage() {
  const [data, setData] = useState<TabelaPreco[]>([]);
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  async function load() {
    const res = await fetch("/api/cafe/tabelas-preco");
    const json = (await res.json()) as { ok: boolean; data: TabelaPreco[] };
    setData(Array.isArray(json?.data) ? json.data : []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function criar() {
    if (!codigo.trim() || !nome.trim()) return;
    const res = await fetch("/api/cafe/tabelas-preco", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        codigo,
        nome,
        descricao: descricao ? descricao : null,
        is_default: isDefault,
      }),
    });
    if (!res.ok) return;
    setCodigo("");
    setNome("");
    setDescricao("");
    setIsDefault(false);
    await load();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <PageHeader
        eyebrow="Gest\u00e3o do Caf\u00e9"
        title="Gest\u00e3o do Ballet Caf\u00e9 — Tabelas de pre\u00e7o"
        description="Crie tabelas por perfil e mantenha a tabela principal usada pelo Ballet Caf\u00e9."
      />

      <SectionCard
        title="Nova tabela de pre\u00e7o"
        description="Use c\u00f3digos claros para separar aluno, colaborador, eventos e demais cen\u00e1rios comerciais."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium">{"C\u00f3digo"}</label>
            <input
              className="mt-1 w-full rounded-md border p-2"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="ex.: ALUNO"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Nome</label>
            <input
              className="mt-1 w-full rounded-md border p-2"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="ex.: Preço Aluno (Padrão)"
            />
          </div>
          <div>
            <label className="text-sm font-medium">{"Descri\u00e7\u00e3o"}</label>
            <input
              className="mt-1 w-full rounded-md border p-2"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="opcional"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
          />
          <span className="text-sm">Marcar como tabela principal (default)</span>
        </div>
        <div>
          <button
            className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
            onClick={() => void criar()}
          >
            Criar tabela
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="Tabelas cadastradas"
        description="Acompanhe a tabela principal e mantenha os cadastros ativos para uso no PDV e nos produtos."
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="px-2 py-2 text-left">{"C\u00f3digo"}</th>
                <th className="px-2 py-2 text-left">Nome</th>
                <th className="px-2 py-2 text-left">Default</th>
                <th className="px-2 py-2 text-left">Ativo</th>
              </tr>
            </thead>
            <tbody>
              {data.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-2 py-2">{t.codigo}</td>
                  <td className="px-2 py-2">{t.nome}</td>
                  <td className="px-2 py-2">{t.is_default ? "Sim" : "Não"}</td>
                  <td className="px-2 py-2">{t.ativo ? "Sim" : "Não"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">
          {"Edi\u00e7\u00e3o avan\u00e7ada de status e ordena\u00e7\u00e3o pode ser adicionada depois; o foco atual \u00e9 manter a opera\u00e7\u00e3o comercial organizada."}
        </p>
      </SectionCard>
    </div>
  );
}
