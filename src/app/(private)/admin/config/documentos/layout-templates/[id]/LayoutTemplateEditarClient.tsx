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

type LayoutTemplateDetalhe = {
  layout_template_id: number;
  tipo: "HEADER" | "FOOTER";
  nome: string;
  tags: string[];
  height_px: number;
  html: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string | null;
};

type ApiResp<T> = { ok?: boolean; data?: T; message?: string };

export default function LayoutTemplateEditarClient({ id }: { id: string }) {
  const layoutTemplateId = Number(id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [tipo, setTipo] = useState<"HEADER" | "FOOTER">("HEADER");
  const [nome, setNome] = useState("");
  const [tags, setTags] = useState("");
  const [heightPx, setHeightPx] = useState<number>(120);
  const [html, setHtml] = useState("<p></p>");
  const [ativo, setAtivo] = useState(true);

  async function carregar() {
    if (!Number.isFinite(layoutTemplateId)) {
      setErro("ID invalido.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch(`/api/documentos/layout-templates/${layoutTemplateId}`, { cache: "no-store" });
      const json = (await res.json()) as ApiResp<LayoutTemplateDetalhe>;
      if (!res.ok || !json.ok || !json.data) throw new Error(json.message || "Falha ao carregar template.");
      const data = json.data;
      setTipo(data.tipo ?? "HEADER");
      setNome(data.nome ?? "");
      setTags((data.tags ?? []).join(", "));
      setHeightPx(Number(data.height_px) || 120);
      setHtml(data.html ?? "<p></p>");
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
  }, [layoutTemplateId]);

  async function salvar() {
    setSaving(true);
    setErro(null);
    setOkMsg(null);
    if (!nome.trim()) {
      setErro("Nome e obrigatorio.");
      setSaving(false);
      return;
    }
    if (!Number.isFinite(heightPx) || heightPx <= 0) {
      setErro("Altura invalida.");
      setSaving(false);
      return;
    }
    try {
      const res = await fetch(`/api/documentos/layout-templates/${layoutTemplateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          tags: tags.trim(),
          height_px: heightPx,
          html,
          ativo,
        }),
      });
      const json = (await res.json()) as ApiResp<unknown>;
      if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao salvar template.");
      setOkMsg("Template atualizado com sucesso.");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SystemPage>
      <SystemContextCard title="Editar layout template" subtitle="Atualize HTML e altura fisica do template.">
        <div className="flex flex-wrap gap-3 text-sm">
          <Link className="text-slate-600 underline" href="/admin/config/documentos/layout-templates">
            Voltar para templates
          </Link>
          <Link className="text-slate-600 underline" href="/admin/config/documentos">
            Voltar ao hub
          </Link>
        </div>
        {loading ? <p className="text-xs text-slate-500">Carregando...</p> : null}
      </SystemContextCard>

      <SystemHelpCard
        items={[
          "Templates ativos podem ser selecionados nos modelos.",
          "A altura fisica define o espaco reservado no PDF.",
          "Atualizar o template nao altera emitidos ja gerados.",
        ]}
      />

      <SystemSectionCard
        title="Dados gerais"
        description={`ID: ${Number.isFinite(layoutTemplateId) ? layoutTemplateId : "-"} | Tipo: ${tipo}`}
        footer={
          <Button onClick={() => void salvar()} disabled={saving}>
            {saving ? "Salvando..." : "Salvar template"}
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
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Nome</label>
            <div className="mt-1">
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Altura (px)</label>
            <div className="mt-1">
              <Input type="number" min={40} value={heightPx} onChange={(e) => setHeightPx(Number(e.target.value))} />
            </div>
          </div>
          <div className="md:col-span-3">
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

      <SystemSectionCard title="HTML do template">
        <div className="mt-2">
          <RichTextEditor
            valueHtml={html}
            onChangeHtml={setHtml}
            minHeightPx={200}
            enableVariables={false}
            enableImages
          />
        </div>
      </SystemSectionCard>
    </SystemPage>
  );
}
