"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SystemContextCard } from "@/components/system/SystemContextCard";
import { SystemHelpCard } from "@/components/system/SystemHelpCard";
import { SystemPage } from "@/components/system/SystemPage";
import { SystemSectionCard } from "@/components/system/SystemSectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EditorRico, type VariavelDoc } from "@/components/documentos/EditorRico";
import type { DocumentoModeloDTO, DocumentoModeloFormato } from "@/lib/documentos/modelos.types";

type TipoDocOpt = { id: number; label: string };
type ConjuntoOpt = { id: number; label: string; grupos: Array<{ id: number; label: string }> };

async function fetchVariaveisAtivas(): Promise<VariavelDoc[]> {
  const res = await fetch("/api/documentos/variaveis?ativo=1", { cache: "no-store" });
  const json = (await res.json()) as {
    data?: Array<{ codigo?: string; descricao?: string }>;
    error?: string;
  };

  if (!res.ok) {
    throw new Error(json.error ?? "Falha ao carregar variaveis.");
  }

  return (json.data ?? [])
    .map((v) => ({
      code: String(v.codigo ?? "").trim(),
      label: String(v.descricao ?? v.codigo ?? "").trim(),
    }))
    .filter((v) => v.code.length > 0);
}

export default function AdminDocumentosModelosPage() {
  const [loading, setLoading] = useState(true);
  const [itens, setItens] = useState<DocumentoModeloDTO[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const [novoTitulo, setNovoTitulo] = useState("");
  const [novoFormato, setNovoFormato] = useState<DocumentoModeloFormato>("RICH_HTML");
  const [novoTextoMarkdown, setNovoTextoMarkdown] = useState("");
  const [novoHtml, setNovoHtml] = useState("<p></p>");
  const [tiposDoc, setTiposDoc] = useState<TipoDocOpt[]>([]);
  const [tipoDocumentoId, setTipoDocumentoId] = useState<number | "">("");
  const [conjuntos, setConjuntos] = useState<ConjuntoOpt[]>([]);
  const [conjuntoId, setConjuntoId] = useState<number | "">("");
  const [conjuntoGrupoId, setConjuntoGrupoId] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [variaveis, setVariaveis] = useState<VariavelDoc[]>([]);
  const [variaveisLoading, setVariaveisLoading] = useState(false);
  const [variaveisErro, setVariaveisErro] = useState<string | null>(null);

  const conteudoOk =
    novoFormato === "RICH_HTML"
      ? novoHtml.replace(/<[^>]+>/g, "").trim().length > 0
      : novoTextoMarkdown.trim().length > 0;

  async function carregar() {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/documentos/modelos", { method: "GET" });
      const json = (await res.json()) as { data?: DocumentoModeloDTO[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar modelos.");
      setItens(json.data ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }

  async function recarregarVariaveis() {
    setVariaveisErro(null);
    setVariaveisLoading(true);
    try {
      const list = await fetchVariaveisAtivas();
      setVariaveis(list);
    } catch (e) {
      setVariaveisErro(e instanceof Error ? e.message : "Erro ao carregar variaveis.");
    } finally {
      setVariaveisLoading(false);
    }
  }

  async function carregarTiposDoc() {
    try {
      const res = await fetch("/api/documentos/tipos?ativo=1", { cache: "no-store" });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: Array<{ tipo_documento_id?: number; nome?: string; codigo?: string }>;
        message?: string;
      };
      if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao carregar tipos.");
      const list = (json.data ?? [])
        .map((t) => ({
          id: Number(t.tipo_documento_id),
          label: `${String(t.nome ?? "").trim()} (${String(t.codigo ?? "").trim()})`,
        }))
        .filter((t) => Number.isFinite(t.id) && t.id > 0);
      setTiposDoc(list);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar tipos.");
    }
  }

  async function carregarConjuntosComGrupos() {
    try {
      const res = await fetch("/api/documentos/conjuntos?include=grupos", { cache: "no-store" });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: Array<{
          id?: number;
          nome?: string;
          codigo?: string;
          grupos?: Array<{ id?: number; nome?: string; codigo?: string }>;
        }>;
        message?: string;
      };
      if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao carregar conjuntos.");
      const list = (json.data ?? [])
        .map((c) => ({
          id: Number(c.id),
          label: `${String(c.nome ?? "").trim()} (${String(c.codigo ?? "").trim()})`,
          grupos: (c.grupos ?? [])
            .map((g) => ({
              id: Number(g.id),
              label: `${String(g.nome ?? "").trim()} (${String(g.codigo ?? "").trim()})`,
            }))
            .filter((g) => Number.isFinite(g.id) && g.id > 0),
        }))
        .filter((c) => Number.isFinite(c.id) && c.id > 0);
      setConjuntos(list);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar conjuntos.");
    }
  }

  async function criarModelo() {
    setSaving(true);
    setErro(null);
    try {
      if (!tipoDocumentoId) {
        throw new Error("Selecione o tipo de documento.");
      }

      const payloadBase = {
        tipo_contrato: "REGULAR",
        titulo: novoTitulo.trim(),
        formato: novoFormato,
        tipo_documento_id: Number(tipoDocumentoId),
        conjunto_grupo_id: conjuntoGrupoId ? Number(conjuntoGrupoId) : null,
        ativo: true,
        placeholders_schema_json: [],
        observacoes: null,
      };

      const payload =
        novoFormato === "RICH_HTML"
          ? {
              ...payloadBase,
              formato: "RICH_HTML",
              conteudo_html: novoHtml,
            }
          : {
              ...payloadBase,
              formato: "MARKDOWN",
              texto_modelo_md: novoTextoMarkdown,
            };

      const res = await fetch("/api/documentos/modelos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { data?: DocumentoModeloDTO; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao criar modelo.");
      setNovoTitulo("");
      setNovoTextoMarkdown("");
      setNovoHtml("<p></p>");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao criar modelo.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void carregar();
    void recarregarVariaveis();
    void carregarTiposDoc();
    void carregarConjuntosComGrupos();
  }, []);

  return (
    <SystemPage>
      <SystemContextCard
        title="Documentos - Modelos"
        subtitle="Templates e placeholders para emissao futura (MVP sem PDF e sem assinatura digital)."
      >
        <Link className="text-sm underline text-slate-600" href="/admin/config/documentos">
          Voltar ao hub de Documentos
        </Link>
      </SystemContextCard>

      <SystemHelpCard
        items={[
          "Crie um modelo inicial e use a tela de detalhe para ajustar texto e schema.",
          "Use placeholders em CAIXA ALTA para variaveis de documento.",
          "Modelos ativos ficam disponiveis para emissao.",
        ]}
      />

      <SystemSectionCard
        title="Novo modelo"
        description="Crie o template inicial e depois edite schema e texto no detalhe."
        footer={
          <Button
            onClick={() => void criarModelo()}
            disabled={saving || !novoTitulo.trim() || !conteudoOk || !tipoDocumentoId}
          >
            {saving ? "Salvando..." : "Criar modelo"}
          </Button>
        }
      >
        {erro ? (
          <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium">Formato</label>
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={novoFormato}
              onChange={(e) => setNovoFormato(e.target.value as DocumentoModeloFormato)}
            >
              <option value="RICH_HTML">Editor rico (HTML)</option>
              <option value="MARKDOWN">Markdown (legado)</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Tipo de documento</label>
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={tipoDocumentoId}
              onChange={(e) => setTipoDocumentoId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Selecione...</option>
              {tiposDoc.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Conjunto</label>
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={conjuntoId}
              onChange={(e) => {
                const next = e.target.value ? Number(e.target.value) : "";
                setConjuntoId(next);
                setConjuntoGrupoId("");
              }}
            >
              <option value="">(Opcional) Selecione...</option>
              {conjuntos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Grupo</label>
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={conjuntoGrupoId}
              onChange={(e) => setConjuntoGrupoId(e.target.value ? Number(e.target.value) : "")}
              disabled={!conjuntoId}
            >
              <option value="">{conjuntoId ? "Selecione..." : "Selecione um conjunto primeiro"}</option>
              {(conjuntos.find((c) => c.id === conjuntoId)?.grupos || []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="text-sm font-medium">Titulo</label>
            <div className="mt-1">
              <Input
                value={novoTitulo}
                onChange={(e) => setNovoTitulo(e.target.value)}
                placeholder="Ex.: Documento Regular 2026 (v1.0)"
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="text-sm font-medium">Texto do modelo</label>
            <div className="mt-1">
              {novoFormato === "RICH_HTML" ? (
                <>
                  {variaveisErro ? <p className="mb-2 text-sm text-red-600">{variaveisErro}</p> : null}
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-500">
                      Variaveis sao herdadas do cadastro do sistema. Apenas variaveis ativas aparecem aqui.
                    </p>
                    <button
                      type="button"
                      onClick={() => void recarregarVariaveis()}
                      className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      disabled={variaveisLoading}
                    >
                      {variaveisLoading ? "Recarregando..." : "Recarregar variaveis"}
                    </button>
                  </div>
                  <EditorRico valueHtml={novoHtml} onChangeHtml={setNovoHtml} variaveis={variaveis} />
                </>
              ) : (
                <Textarea
                  value={novoTextoMarkdown}
                  onChange={(e) => setNovoTextoMarkdown(e.target.value)}
                  rows={10}
                  placeholder="Cole aqui o texto do modelo com placeholders, ex.: {{ALUNO_NOME}}"
                />
              )}
            </div>
          </div>
        </div>
      </SystemSectionCard>

      <SystemSectionCard
        title="Modelos cadastrados"
        description="Use Editar para ajustar texto e schema no padrao do sistema."
      >
        {erro ? (
          <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
        ) : null}

        {loading ? (
          <p className="text-sm text-slate-600">Carregando...</p>
        ) : itens.length === 0 ? (
          <p className="text-sm text-slate-600">Nenhum modelo cadastrado.</p>
        ) : (
          <div className="grid gap-3">
            {itens.map((m) => {
              const formato = m.formato ?? "MARKDOWN";
              const preview =
                formato === "RICH_HTML"
                  ? (m.conteudo_html ?? m.texto_modelo_md ?? "")
                  : (m.texto_modelo_md ?? "");

              return (
                <div key={m.id} className="rounded-lg border border-slate-200 bg-white/60 p-4 shadow-sm">
                  <div className="flex flex-col gap-1">
                    <div className="text-sm font-semibold">
                      [{m.tipo_contrato}] {m.titulo} <span className="opacity-70">({m.versao})</span>
                    </div>
                    <div className="text-xs text-slate-600">
                      ID: {m.id} | Ativo: {m.ativo ? "Sim" : "Nao"} | Formato: {formato}
                    </div>
                    <div>
                      <Link className="text-sm underline" href={`/admin/config/documentos/modelos/${m.id}`}>
                        Editar
                      </Link>
                    </div>
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-slate-600">Ver texto</summary>
                    <pre className="mt-2 whitespace-pre-wrap text-sm">{preview}</pre>
                  </details>
                </div>
              );
            })}
          </div>
        )}
      </SystemSectionCard>
    </SystemPage>
  );
}
