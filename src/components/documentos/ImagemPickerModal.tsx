"use client";

import React from "react";

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

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
};

type ApiResp<T> = { ok?: boolean; data?: T; message?: string };

/* eslint-disable @next/next/no-img-element */
export function ImagemPickerModal({ open, onClose, onSelect }: Props) {
  const [imagens, setImagens] = React.useState<DocumentoImagem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [busca, setBusca] = React.useState("");

  const carregar = React.useCallback(async () => {
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

  React.useEffect(() => {
    if (!open) return;
    void carregar();
  }, [open, carregar]);

  const filtradas = React.useMemo(() => {
    const term = busca.trim().toLowerCase();
    if (!term) return imagens;
    return imagens.filter((img) => {
      const nomeOk = img.nome.toLowerCase().includes(term);
      const tagOk = (img.tags || []).some((t) => t.toLowerCase().includes(term));
      return nomeOk || tagOk;
    });
  }, [imagens, busca]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-5xl rounded-2xl border bg-white p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Banco de imagens</h2>
            <p className="text-xs text-slate-500">Selecione uma imagem para inserir no documento.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
              onClick={() => void carregar()}
              disabled={loading}
            >
              {loading ? "Carregando..." : "Recarregar"}
            </button>
            <button
              type="button"
              className="rounded-md border px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
              onClick={onClose}
            >
              Fechar
            </button>
          </div>
        </div>

        {erro ? (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {erro}
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            className="w-full max-w-sm rounded-md border px-3 py-2 text-sm"
            placeholder="Buscar por nome ou tag"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="mt-4 max-h-[60vh] overflow-auto">
          {loading ? (
            <p className="text-sm text-slate-500">Carregando imagens...</p>
          ) : filtradas.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma imagem encontrada.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtradas.map((img) => (
                <button
                  type="button"
                  key={img.imagem_id}
                  className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-slate-400"
                  onClick={() => {
                    onSelect(img.public_url);
                    onClose();
                  }}
                >
                  <div className="aspect-video w-full overflow-hidden rounded-md bg-slate-100">
                    <img src={img.public_url} alt={img.nome} className="h-full w-full object-contain" />
                  </div>
                  <div className="text-sm font-semibold">{img.nome}</div>
                  <div className="text-xs text-slate-500">
                    {(img.tags || []).length > 0 ? img.tags.join(", ") : "Sem tags"}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
