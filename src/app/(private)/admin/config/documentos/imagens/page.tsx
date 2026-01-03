"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SystemContextCard } from "@/components/system/SystemContextCard";
import { SystemHelpCard } from "@/components/system/SystemHelpCard";
import { SystemPage } from "@/components/system/SystemPage";
import { SystemSectionCard } from "@/components/system/SystemSectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DocumentoImagem = {
  imagem_id: number;
  nome: string;
  tags: string[];
  public_url: string;
  largura?: number | null;
  altura?: number | null;
  mime_type?: string | null;
  tamanho_bytes?: number | null;
  ativo?: boolean;
  created_at?: string;
};

type ApiResp<T> = { ok?: boolean; data?: T; message?: string };

/* eslint-disable @next/next/no-img-element */
export default function AdminDocumentosImagensPage() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [imagens, setImagens] = useState<DocumentoImagem[]>([]);
  const [nome, setNome] = useState("");
  const [tags, setTags] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [busca, setBusca] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/documentos/imagens?ativo=1", { cache: "no-store" });
      const json = (await res.json()) as ApiResp<DocumentoImagem[]>;
      if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao carregar imagens.");
      setImagens(json.data ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar imagens.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const imagensFiltradas = useMemo(() => {
    const term = busca.trim().toLowerCase();
    if (!term) return imagens;
    return imagens.filter((img) => {
      const nomeOk = img.nome.toLowerCase().includes(term);
      const tagOk = (img.tags || []).some((t) => t.toLowerCase().includes(term));
      return nomeOk || tagOk;
    });
  }, [imagens, busca]);

  async function enviar() {
    setErro(null);
    setOkMsg(null);
    if (!nome.trim()) {
      setErro("Nome e obrigatorio.");
      return;
    }
    if (!arquivo) {
      setErro("Selecione um arquivo.");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", arquivo);
      form.append("nome", nome.trim());
      if (tags.trim()) form.append("tags", tags.trim());

      const res = await fetch("/api/documentos/imagens/upload", {
        method: "POST",
        body: form,
      });
      const json = (await res.json()) as ApiResp<unknown>;
      if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao enviar imagem.");
      setOkMsg("Imagem enviada com sucesso.");
      setNome("");
      setTags("");
      setArquivo(null);
      if (fileRef.current) fileRef.current.value = "";
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao enviar imagem.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <SystemPage>
      <SystemContextCard
        title="Documentos - Banco de imagens"
        subtitle="Gerencie imagens publicas para inserir em modelos e cabecalhos."
      >
        <Link className="text-sm underline text-slate-600" href="/admin/config/documentos">
          Voltar ao hub de Documentos
        </Link>
      </SystemContextCard>

      <SystemHelpCard
        items={[
          "As imagens sao armazenadas no bucket documentos-imagens.",
          "Use tags para facilitar a busca no editor.",
          "O bucket deve estar publico para o editor inserir via URL.",
        ]}
      />

      <SystemSectionCard
        title="Enviar nova imagem"
        description="Cadastre imagens para uso em cabecalhos e modelos."
        footer={
          <Button onClick={() => void enviar()} disabled={uploading}>
            {uploading ? "Enviando..." : "Enviar imagem"}
          </Button>
        }
      >
        {erro ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{erro}</div>
        ) : null}
        {okMsg ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
            {okMsg}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium">Nome</label>
            <div className="mt-1">
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Logo da escola" />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Tags (separadas por virgula)</label>
            <div className="mt-1">
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="logo, escola, cabecalho" />
            </div>
          </div>
          <div className="md:col-span-3">
            <label className="text-sm font-medium">Arquivo</label>
            <div className="mt-1">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="w-full rounded-md border px-3 py-2 text-sm"
                onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
        </div>
      </SystemSectionCard>

      <SystemSectionCard title="Imagens cadastradas" description="Selecione e copie a URL publica quando precisar.">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou tag"
            className="max-w-sm"
          />
          <Button variant="secondary" onClick={() => void carregar()} disabled={loading}>
            {loading ? "Carregando..." : "Recarregar"}
          </Button>
        </div>

        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-slate-500">Carregando imagens...</p>
          ) : imagensFiltradas.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma imagem encontrada.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {imagensFiltradas.map((img) => (
                <div key={img.imagem_id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="aspect-video overflow-hidden rounded-md bg-slate-100">
                    <img src={img.public_url} alt={img.nome} className="h-full w-full object-contain" />
                  </div>
                  <div className="mt-2 text-sm font-semibold">{img.nome}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {(img.tags || []).length > 0 ? img.tags.join(", ") : "Sem tags"}
                  </div>
                  <div className="mt-2 text-xs text-slate-500 break-all">{img.public_url}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SystemSectionCard>
    </SystemPage>
  );
}
