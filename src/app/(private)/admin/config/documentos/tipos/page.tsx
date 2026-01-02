"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SystemContextCard } from "@/components/system/SystemContextCard";
import { SystemHelpCard } from "@/components/system/SystemHelpCard";
import { SystemPage } from "@/components/system/SystemPage";
import { SystemSectionCard } from "@/components/system/SystemSectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TipoDoc = {
  tipo_documento_id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
};

type ApiResp<T> = { ok?: boolean; data?: T; message?: string };

export default function AdminDocumentosTiposPage() {
  const [tipos, setTipos] = useState<TipoDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  async function carregar() {
    setErro(null);
    setLoading(true);
    try {
      const res = await fetch("/api/documentos/tipos?ativo=0", { cache: "no-store" });
      const json = (await res.json()) as ApiResp<TipoDoc[]>;
      if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao carregar tipos.");
      setTipos(json.data ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  async function criar() {
    setErro(null);
    setLoading(true);
    try {
      const payload = {
        codigo: codigo.trim(),
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        ativo: true,
      };

      const res = await fetch("/api/documentos/tipos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as ApiResp<unknown>;
      if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao criar tipo.");

      setCodigo("");
      setNome("");
      setDescricao("");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  return (
    <SystemPage>
      <SystemContextCard
        title="Documentos - Tipos de documento"
        subtitle="Classificacao usada pelos modelos. Documentos emitidos herdam o tipo do modelo."
      >
        <Link className="text-sm underline text-slate-600" href="/admin/config/documentos">
          Voltar ao hub de Documentos
        </Link>
      </SystemContextCard>

      <SystemHelpCard
        items={[
          "Use codigos em caixa alta para padronizar.",
          "Tipos ativos aparecem no cadastro de Modelos.",
        ]}
      />

      <SystemSectionCard
        title="Cadastrar tipo"
        description="Crie um tipo de documento (ex.: CONTRATO_MATRICULA)."
        footer={
          <Button onClick={() => void criar()} disabled={loading || !codigo.trim() || !nome.trim()}>
            Criar tipo
          </Button>
        }
      >
        {erro ? (
          <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Codigo</label>
            <div className="mt-1">
              <Input
                placeholder="Ex.: CONTRATO_MATRICULA"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Nome</label>
            <div className="mt-1">
              <Input
                placeholder="Ex.: Contrato de matricula"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium">Descricao</label>
            <div className="mt-1">
              <Input
                placeholder="Opcional (uso interno)."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>
          </div>
        </div>
      </SystemSectionCard>

      <SystemSectionCard
        title="Tipos cadastrados"
        description="Usados no cadastro de Modelos."
      >
        <div className="flex justify-end">
          <Button onClick={() => void carregar()} disabled={loading} variant="outline">
            {loading ? "Recarregando..." : "Recarregar"}
          </Button>
        </div>

        {erro ? (
          <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
        ) : null}

        {loading ? (
          <p className="text-sm text-slate-600">Carregando...</p>
        ) : tipos.length === 0 ? (
          <p className="text-sm text-slate-600">Nenhum tipo cadastrado.</p>
        ) : (
          <div className="grid gap-3">
            {tipos.map((t) => (
              <div key={t.tipo_documento_id} className="rounded-lg border border-slate-200 bg-white/60 p-4 shadow-sm">
                <div className="text-sm font-semibold">{t.nome}</div>
                <div className="text-xs text-slate-600">{t.codigo}</div>
                {t.descricao ? <div className="mt-1 text-xs text-slate-500">{t.descricao}</div> : null}
                <div className="mt-1 text-xs text-slate-500">Ativo: {t.ativo ? "Sim" : "Nao"}</div>
              </div>
            ))}
          </div>
        )}
      </SystemSectionCard>
    </SystemPage>
  );
}
