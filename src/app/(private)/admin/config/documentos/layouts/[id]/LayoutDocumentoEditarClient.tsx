"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SystemContextCard } from "@/components/system/SystemContextCard";
import { SystemHelpCard } from "@/components/system/SystemHelpCard";
import { SystemPage } from "@/components/system/SystemPage";
import { SystemSectionCard } from "@/components/system/SystemSectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/RichTextEditor/RichTextEditor";

type LayoutDetalhe = {
  layout_id: number;
  nome: string;
  tags: string[];
  cabecalho_html?: string | null;
  rodape_html?: string | null;
  ativo: boolean;
  created_at?: string;
  updated_at?: string | null;
};

type ApiResp<T> = { ok?: boolean; data?: T; message?: string };

export default function LayoutDocumentoEditarClient({ id }: { id: string }) {
  const layoutId = Number(id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [tags, setTags] = useState("");
  const [cabecalhoHtml, setCabecalhoHtml] = useState("<p></p>");
  const [rodapeHtml, setRodapeHtml] = useState("<p></p>");
  const [ativo, setAtivo] = useState(true);

  async function carregar() {
    if (!Number.isFinite(layoutId)) {
      setErro("ID invalido.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch(`/api/documentos/layouts/${layoutId}`, { cache: "no-store" });
      const json = (await res.json()) as ApiResp<LayoutDetalhe>;
      if (!res.ok || !json.ok || !json.data) throw new Error(json.message || "Falha ao carregar layout.");
      const data = json.data;
      setNome(data.nome ?? "");
      setTags((data.tags ?? []).join(", "));
      setCabecalhoHtml(data.cabecalho_html ?? "<p></p>");
      setRodapeHtml(data.rodape_html ?? "<p></p>");
      setAtivo(Boolean(data.ativo));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutId]);

  async function salvar() {
    setSaving(true);
    setErro(null);
    setOkMsg(null);
    if (!nome.trim()) {
      setErro("Nome e obrigatorio.");
      setSaving(false);
      return;
    }
    try {
      const res = await fetch(`/api/documentos/layouts/${layoutId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          tags: tags.trim(),
          cabecalho_html: cabecalhoHtml,
          rodape_html: rodapeHtml,
          ativo,
        }),
      });
      const json = (await res.json()) as ApiResp<unknown>;
      if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao salvar layout.");
      setOkMsg("Layout atualizado com sucesso.");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SystemPage>
      <SystemContextCard title="Editar layout" subtitle="Atualize cabecalho e rodape reutilizaveis.">
        <div className="flex flex-wrap gap-3 text-sm">
          <Link className="text-slate-600 underline" href="/admin/config/documentos/layouts">
            Voltar para layouts
          </Link>
          <Link className="text-slate-600 underline" href="/admin/config/documentos">
            Voltar ao hub
          </Link>
        </div>
        {loading ? <p className="text-xs text-slate-500">Carregando...</p> : null}
      </SystemContextCard>

      <SystemHelpCard
        items={[
          "Layouts ativos podem ser selecionados nos modelos.",
          "Atualizar o layout nao altera emitidos ja gerados.",
        ]}
      />

      <SystemSectionCard
        title="Dados gerais"
        description={`ID: ${Number.isFinite(layoutId) ? layoutId : "-"}`}
        footer={
          <Button onClick={() => void salvar()} disabled={saving}>
            {saving ? "Salvando..." : "Salvar layout"}
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
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Tags (separadas por virgula)</label>
            <div className="mt-1">
              <Input value={tags} onChange={(e) => setTags(e.target.value)} />
            </div>
          </div>
          <div className="md:col-span-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
              Ativo
            </label>
          </div>
        </div>
      </SystemSectionCard>

      <SystemSectionCard title="Cabecalho">
        <div className="mt-2">
          <RichTextEditor
            valueHtml={cabecalhoHtml}
            onChangeHtml={setCabecalhoHtml}
            minHeightPx={200}
            enableVariables={false}
            enableImages
          />
        </div>
      </SystemSectionCard>

      <SystemSectionCard title="Rodape">
        <div className="mt-2">
          <RichTextEditor
            valueHtml={rodapeHtml}
            onChangeHtml={setRodapeHtml}
            minHeightPx={160}
            enableVariables={false}
            enableImages
          />
        </div>
      </SystemSectionCard>
    </SystemPage>
  );
}
