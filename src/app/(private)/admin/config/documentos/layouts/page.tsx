"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SystemContextCard } from "@/components/system/SystemContextCard";
import { SystemHelpCard } from "@/components/system/SystemHelpCard";
import { SystemPage } from "@/components/system/SystemPage";
import { SystemSectionCard } from "@/components/system/SystemSectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/RichTextEditor/RichTextEditor";

type LayoutItem = {
  layout_id: number;
  nome: string;
  tags: string[];
  ativo: boolean;
  created_at?: string;
};

type ApiResp<T> = { ok?: boolean; data?: T; message?: string };

export default function AdminDocumentosLayoutsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [itens, setItens] = useState<LayoutItem[]>([]);

  const [nome, setNome] = useState("");
  const [tags, setTags] = useState("");
  const [cabecalhoHtml, setCabecalhoHtml] = useState("<p></p>");
  const [rodapeHtml, setRodapeHtml] = useState("<p></p>");

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/documentos/layouts?ativo=0", { cache: "no-store" });
      const json = (await res.json()) as ApiResp<LayoutItem[]>;
      if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao carregar layouts.");
      setItens(json.data ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const itensOrdenados = useMemo(
    () => [...itens].sort((a, b) => a.nome.localeCompare(b.nome)),
    [itens],
  );

  const salvar = async () => {
    setSaving(true);
    setErro(null);
    setOkMsg(null);
    if (!nome.trim()) {
      setErro("Nome e obrigatorio.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/documentos/layouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          tags: tags.trim(),
          cabecalho_html: cabecalhoHtml,
          rodape_html: rodapeHtml,
        }),
      });
      const json = (await res.json()) as ApiResp<unknown>;
      if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao salvar layout.");
      setOkMsg("Layout criado com sucesso.");
      setNome("");
      setTags("");
      setCabecalhoHtml("<p></p>");
      setRodapeHtml("<p></p>");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SystemPage>
      <SystemContextCard
        title="Documentos - Layouts"
        subtitle="Cadastre cabecalhos e rodapes reutilizaveis para modelos."
      >
        <Link className="text-sm underline text-slate-600" href="/admin/config/documentos">
          Voltar ao hub de Documentos
        </Link>
      </SystemContextCard>

      <SystemHelpCard
        items={[
          "Layouts sao reutilizaveis: um modelo referencia um layout.",
          "Cabecalho e rodape sao congelados no emitido na emissao.",
          "Use o banco de imagens para inserir logos.",
        ]}
      />

      <SystemSectionCard
        title="Novo layout"
        description="Crie um layout reutilizavel com cabecalho e rodape."
        footer={
          <Button onClick={() => void salvar()} disabled={saving}>
            {saving ? "Salvando..." : "Criar layout"}
          </Button>
        }
      >
        {erro ? (
          <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
        ) : null}
        {okMsg ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {okMsg}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium">Nome</label>
            <div className="mt-1">
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Layout Escola" />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Tags (separadas por virgula)</label>
            <div className="mt-1">
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="escola, cabecalho" />
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="text-sm font-medium">Cabecalho</label>
            <div className="mt-2">
              <RichTextEditor
                valueHtml={cabecalhoHtml}
                onChangeHtml={setCabecalhoHtml}
                minHeightPx={180}
                enableVariables={false}
                enableImages
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="text-sm font-medium">Rodape</label>
            <div className="mt-2">
              <RichTextEditor
                valueHtml={rodapeHtml}
                onChangeHtml={setRodapeHtml}
                minHeightPx={160}
                enableVariables={false}
                enableImages
              />
            </div>
          </div>
        </div>
      </SystemSectionCard>

      <SystemSectionCard title="Layouts cadastrados" description="Edite ou desative layouts existentes.">
        {loading ? (
          <p className="text-sm text-slate-600">Carregando...</p>
        ) : itensOrdenados.length === 0 ? (
          <p className="text-sm text-slate-600">Nenhum layout cadastrado.</p>
        ) : (
          <div className="grid gap-3">
            {itensOrdenados.map((item) => (
              <div key={item.layout_id} className="rounded-lg border border-slate-200 bg-white/60 p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{item.nome}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Tags: {(item.tags ?? []).join(", ") || "-"} | Ativo: {item.ativo ? "Sim" : "Nao"}
                    </div>
                  </div>
                  <Link className="text-sm underline" href={`/admin/config/documentos/layouts/${item.layout_id}`}>
                    Editar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </SystemSectionCard>
    </SystemPage>
  );
}
