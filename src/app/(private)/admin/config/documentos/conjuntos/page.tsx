"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SystemPage } from "@/components/system/SystemPage";
import { SystemContextCard } from "@/components/system/SystemContextCard";
import { SystemHelpCard } from "@/components/system/SystemHelpCard";
import { SystemSectionCard } from "@/components/system/SystemSectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Conjunto = {
  id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
};

export default function DocumentosConjuntosPage() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [itens, setItens] = useState<Conjunto[]>([]);

  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);

  const helpItems = useMemo(
    () => [
      "Conjuntos organizam documentos institucionalmente (ex.: Matrícula Regular, Bolsa Movimento).",
      "Cada conjunto possui grupos internos (Documento principal, Termos obrigatórios, etc.).",
      "Depois você vincula modelos a cada grupo.",
    ],
    []
  );

  async function carregar() {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/documentos/conjuntos");
      const json = (await res.json()) as { ok?: boolean; data?: Conjunto[]; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.message ?? "Falha ao carregar conjuntos.");
      setItens(json.data ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }

  async function criar() {
    setSalvando(true);
    setErro(null);
    setOkMsg(null);
    try {
      const res = await fetch("/api/documentos/conjuntos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo,
          nome,
          descricao: descricao.trim() ? descricao.trim() : null,
          ativo: true,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; data?: Conjunto; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.message ?? "Falha ao criar conjunto.");
      setCodigo("");
      setNome("");
      setDescricao("");
      setOkMsg("Conjunto criado com sucesso.");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao criar.");
    } finally {
      setSalvando(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  return (
    <SystemPage>
      <SystemContextCard
        title="Documentos — Conjuntos"
        subtitle="Gerencie conjuntos institucionais reutilizáveis (ex.: Matrícula Regular, Bolsa Movimento, Venda Loja)."
      >
        <div className="mt-2">
          <Link className="text-sm underline text-slate-600" href="/admin/config/documentos">
            Voltar ao hub de Documentos
          </Link>
        </div>
      </SystemContextCard>

      <SystemHelpCard items={helpItems} />

      {erro ? (
        <SystemSectionCard title="Erro" description="Corrija antes de continuar.">
          <div className="text-sm text-red-700">{erro}</div>
        </SystemSectionCard>
      ) : null}

      {okMsg ? (
        <SystemSectionCard title="Sucesso" description="Operação concluída.">
          <div className="text-sm text-green-700">{okMsg}</div>
        </SystemSectionCard>
      ) : null}

      <SystemSectionCard title="Cadastrar conjunto" description="Crie um conjunto institucional de documentos.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Código</label>
            <Input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ex.: MATRICULA_REGULAR"
            />
            <p className="text-xs text-slate-500 mt-1">Use caixa alta. Espaços viram underscore automaticamente.</p>
          </div>
          <div>
            <label className="text-sm font-medium">Nome</label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Matrícula Regular" />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Descrição</label>
            <Input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Opcional (uso interno)."
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <Button onClick={() => void criar()} disabled={salvando || !codigo.trim() || !nome.trim()}>
            {salvando ? "Salvando..." : "Criar conjunto"}
          </Button>
        </div>
      </SystemSectionCard>

      <SystemSectionCard title="Conjuntos cadastrados" description="Clique em um conjunto para gerenciar grupos e modelos.">
        {loading ? (
          <div className="text-sm text-slate-600">Carregando...</div>
        ) : itens.length === 0 ? (
          <div className="text-sm text-slate-600">Nenhum conjunto cadastrado.</div>
        ) : (
          <div className="grid gap-3">
            {itens.map((c) => (
              <Link
                key={c.id}
                href={`/admin/config/documentos/conjuntos/${c.id}`}
                className="no-underline"
              >
                <div className="border border-slate-200 rounded-xl p-4 bg-white hover:bg-slate-50 transition">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold">{c.nome}</div>
                      <div className="text-xs text-slate-600 mt-1">
                        Código: {c.codigo} • Ativo: {c.ativo ? "Sim" : "Não"}
                      </div>
                      {c.descricao ? <div className="text-sm text-slate-600 mt-2">{c.descricao}</div> : null}
                    </div>
                    <div className="text-sm text-slate-600">Gerenciar →</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </SystemSectionCard>
    </SystemPage>
  );
}
