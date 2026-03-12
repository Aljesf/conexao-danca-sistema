"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Layers3 } from "lucide-react";
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
};

type ApiResp<T> = { ok?: boolean; data?: T; message?: string };

type Props = {
  tipo: "HEADER" | "FOOTER";
  title: string;
  subtitle: string;
  shortDescription: string;
  hintItems: string[];
  defaultHeightPx: number;
  embedded?: boolean;
};

export function ComponenteReutilizavelPage(props: Props) {
  const { tipo, title, subtitle, shortDescription, hintItems, defaultHeightPx, embedded = false } = props;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [itens, setItens] = useState<LayoutTemplateItem[]>([]);

  const [nome, setNome] = useState("");
  const [tags, setTags] = useState("");
  const [heightPx, setHeightPx] = useState<number>(defaultHeightPx);
  const [ativo, setAtivo] = useState(true);
  const [html, setHtml] = useState("<p></p>");

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/documentos/layout-templates?ativo=0", { cache: "no-store" });
      const json = (await res.json()) as ApiResp<LayoutTemplateItem[]>;
      if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao carregar componentes.");
      setItens((json.data ?? []).filter((item) => item.tipo === tipo));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [tipo]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const itensOrdenados = useMemo(
    () => [...itens].sort((a, b) => a.nome.localeCompare(b.nome)),
    [itens],
  );

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
      const res = await fetch("/api/documentos/layout-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          nome: nome.trim(),
          tags: tags.trim(),
          height_px: heightPx,
          html,
          ativo,
        }),
      });
      const json = (await res.json()) as ApiResp<unknown>;
      if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao salvar componente.");

      setOkMsg(`${title} criado com sucesso.`);
      setNome("");
      setTags("");
      setHtml("<p></p>");
      setHeightPx(defaultHeightPx);
      setAtivo(true);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  const content = (
    <>
      <SystemContextCard title={title} subtitle={subtitle}>
        {!embedded ? (
          <Link className="text-sm underline text-slate-600" href="/admin/config/documentos/configuracao">
            Voltar a configuracao de documentos
          </Link>
        ) : null}
      </SystemContextCard>

      <SystemHelpCard items={hintItems} />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SystemSectionCard
          title={`Cadastrar ${title.toLowerCase()}`}
          description={shortDescription}
          footer={
            <Button onClick={() => void salvar()} disabled={saving}>
              {saving ? "Salvando..." : `Criar ${title.toLowerCase()}`}
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

          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  title: "Identidade institucional",
                  text: tipo === "HEADER" ? "Use este espaco para logo, nome e bloco superior." : "Use este espaco para assinatura, local, data e validacao.",
                },
                {
                  title: "Reaproveitamento",
                  text: "Os componentes podem ser reutilizados em varios modelos sem duplicar HTML.",
                },
                {
                  title: "Controle visual",
                  text: "A altura fisica define o espaco reservado no documento final.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm">
                      <Layers3 className="h-4 w-4" />
                    </span>
                    {item.title}
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{item.text}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
              <div>
                <label className="text-sm font-medium">Nome do componente</label>
                <Input
                  className="mt-1"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder={tipo === "HEADER" ? "Cabecalho institucional padrao" : "Rodape com assinatura e data"}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Ativo e altura (px)</label>
                <div className="mt-1 flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
                    Ativo
                  </label>
                  <Input
                    type="number"
                    min={40}
                    value={heightPx}
                    onChange={(e) => setHeightPx(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Descricao curta / tags de busca</label>
              <Input
                className="mt-1"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="institucional, assinatura, escola"
              />
              <p className="mt-1 text-xs text-slate-500">
                Sem alterar backend, este campo alimenta as tags de busca do componente reutilizavel.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">HTML template</label>
              <div className="mt-2">
                <RichTextEditor
                  valueHtml={html}
                  onChangeHtml={setHtml}
                  minHeightPx={260}
                  enableVariables={false}
                  enableImages
                  pageWidthPx={980}
                />
              </div>
            </div>
          </div>
        </SystemSectionCard>

        <SystemSectionCard
          title={`${title} cadastrados`}
          description="Consulta administrativa para retomar edicao e revisar o que ja existe."
        >
          {loading ? (
            <p className="text-sm text-slate-600">Carregando...</p>
          ) : itensOrdenados.length === 0 ? (
            <p className="text-sm text-slate-600">Nenhum componente cadastrado ainda.</p>
          ) : (
            <div className="grid gap-3">
              {itensOrdenados.map((item) => (
                <div key={item.layout_template_id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{item.nome}</div>
                      <div className="mt-1 text-xs text-slate-600">
                        Altura: {item.height_px}px | Tags: {(item.tags ?? []).join(", ") || "-"} | Ativo:{" "}
                        {item.ativo ? "Sim" : "Nao"}
                      </div>
                    </div>
                    <Link
                      className="text-sm underline text-slate-600"
                      href={`/admin/config/documentos/layout-templates/${item.layout_template_id}`}
                    >
                      Editar componente
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            A edicao detalhada continua disponivel na tela tecnica de layout templates para ajustes finos.
          </div>
        </SystemSectionCard>
      </div>
    </>
  );

  return embedded ? content : <SystemPage>{content}</SystemPage>;
}
