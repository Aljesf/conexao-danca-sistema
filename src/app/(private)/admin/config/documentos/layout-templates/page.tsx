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

type LayoutTemplateItem = {
  layout_template_id: number;
  tipo: "HEADER" | "FOOTER";
  nome: string;
  tags: string[];
  height_px: number;
  ativo: boolean;
  created_at?: string;
};

type ApiResp<T> = { ok?: boolean; data?: T; message?: string };

export default function AdminDocumentosLayoutTemplatesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [itens, setItens] = useState<LayoutTemplateItem[]>([]);

  const [tipo, setTipo] = useState<"HEADER" | "FOOTER">("HEADER");
  const [nome, setNome] = useState("");
  const [tags, setTags] = useState("");
  const [heightPx, setHeightPx] = useState<number>(120);
  const [html, setHtml] = useState("<p></p>");

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/documentos/layout-templates?ativo=0", { cache: "no-store" });
      const json = (await res.json()) as ApiResp<LayoutTemplateItem[]>;
      if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao carregar templates.");
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
    if (!Number.isFinite(heightPx) || heightPx <= 0) {
      setErro("Altura invalida.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/documentos/layout-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          nome: nome.trim(),
          tags: tags.trim(),
          height_px: heightPx,
          html,
        }),
      });
      const json = (await res.json()) as ApiResp<unknown>;
      if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao salvar template.");
      setOkMsg("Template criado com sucesso.");
      setNome("");
      setTags("");
      setHtml("<p></p>");
      setHeightPx(tipo === "FOOTER" ? 80 : 120);
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
        title="Documentos - Layout Templates"
        subtitle="Templates de cabecalho e rodape com altura fisica."
      >
        <Link className="text-sm underline text-slate-600" href="/admin/config/documentos">
          Voltar ao hub de Documentos
        </Link>
      </SystemContextCard>

      <SystemHelpCard
        items={[
          "Templates sao reutilizaveis e definem o HTML do header/footer.",
          "A altura fisica controla o espaco reservado no PDF.",
          "Modelos escolhem templates e congelam no emitido.",
        ]}
      />

      <SystemSectionCard
        title="Novo template"
        description="Crie um template de header ou footer com altura definida."
        footer={
          <Button onClick={() => void salvar()} disabled={saving}>
            {saving ? "Salvando..." : "Criar template"}
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
            <label className="text-sm font-medium">Tipo</label>
            <select
              className="mt-1 w-full rounded-md border p-2 text-sm"
              value={tipo}
              onChange={(e) => {
                const next = e.target.value === "FOOTER" ? "FOOTER" : "HEADER";
                setTipo(next);
                setHeightPx((prev) => {
                  if (next === "FOOTER" && prev === 120) return 80;
                  if (next === "HEADER" && prev === 80) return 120;
                  return prev;
                });
              }}
            >
              <option value="HEADER">HEADER</option>
              <option value="FOOTER">FOOTER</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Altura (px)</label>
            <Input
              type="number"
              min={40}
              value={heightPx}
              onChange={(e) => setHeightPx(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Nome</label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Header escola A" />
          </div>
          <div className="md:col-span-3">
            <label className="text-sm font-medium">Tags (separadas por virgula)</label>
            <div className="mt-1">
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="escola, logo" />
            </div>
          </div>
          <div className="md:col-span-3">
            <label className="text-sm font-medium">HTML do template</label>
            <div className="mt-2">
              <RichTextEditor
                valueHtml={html}
                onChangeHtml={setHtml}
                minHeightPx={200}
                enableVariables={false}
                enableImages
              />
            </div>
          </div>
        </div>
      </SystemSectionCard>

      <SystemSectionCard title="Templates cadastrados" description="Edite ou desative templates existentes.">
        {loading ? (
          <p className="text-sm text-slate-600">Carregando...</p>
        ) : itensOrdenados.length === 0 ? (
          <p className="text-sm text-slate-600">Nenhum template cadastrado.</p>
        ) : (
          <div className="grid gap-3">
            {itensOrdenados.map((item) => (
              <div key={item.layout_template_id} className="rounded-lg border border-slate-200 bg-white/60 p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{item.nome}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Tipo: {item.tipo} | Altura: {item.height_px}px | Tags: {(item.tags ?? []).join(", ") || "-"} | Ativo:{" "}
                      {item.ativo ? "Sim" : "Nao"}
                    </div>
                  </div>
                  <Link
                    className="text-sm underline"
                    href={`/admin/config/documentos/layout-templates/${item.layout_template_id}`}
                  >
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
